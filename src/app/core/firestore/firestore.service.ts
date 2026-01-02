import { inject, Injectable } from '@angular/core'
import { collection, query, getCountFromServer, getDocs, updateDoc, onSnapshot, writeBatch, orderBy, doc, startAfter, startAt, endAt, limit, setDoc, where } from "firebase/firestore";
import { FIREBASE_FIRE_STORE } from '../firebase/firebase-app'
import { AuthService } from '../auth/auth.service'
import {
  BehaviorSubject, catchError, Observable, of, shareReplay, switchMap, take, combineLatest, map,
  distinctUntilChanged, debounceTime, startWith, from, scan, tap, zip,
} from 'rxjs';


type RecordTypeRaw = {
  word: string;
  translations: string[];
  status: 0 | 1 | 2;
  createdAt: number;
};

type RecordType = {
  id: string;
  word: string;
  translations: string[];
  translation: string;
  status: 'new' | 'inProgress' | 'done';
  createdAt: number;
}

function mapDoc(doc: RecordTypeRaw & { id: string }) {
  return {
    id: doc.id,
    word: doc.word,
    translations: doc.translations,
    status: ({0: 'new', 1: 'inProgress', 2: 'done'} as const)[doc.status],
    translation: doc.translations.join('; '),
    createdAt: doc.createdAt
  }
}

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private readonly firestore = inject(FIREBASE_FIRE_STORE);
  private readonly authService = inject(AuthService);
  private lockNextPage = false;
  private readonly page = new BehaviorSubject(1);
  private readonly searchValue = new BehaviorSubject('');

  private readonly cache = new Map<string, RecordType[][]>();

  readonly wordsCount$ = this.authService.auth$.pipe(
    switchMap(user => {

      return user
        ? from(getCountFromServer(
            query(collection(this.firestore, "users", user.uid, "vocabulary"))
          ).then(snapshot => {
            return snapshot.data().count
        })).pipe(
          switchMap(startCount => {
            return new Observable<number>(
              subscriber => {
                onSnapshot(
                  query(
                    collection(this.firestore, "users", user.uid, "vocabulary"),
                    orderBy('createdAt', 'desc'),
                    limit(1)
                  ),
                  result => {

                    subscriber.next(result.docChanges().filter(change => change.type === 'added').length);
                  })
              }
            ).pipe(
              scan((sum, count) => sum + count, startCount),
              map(value => value < 0 ? 0 : value)
            )
          })
        )
        : of(0)
    }),
    shareReplay(1)
  );

  readonly listOfWords$ = this.authService.auth$.pipe(
    switchMap(auth => {
      if(!auth) {
        return of(null)
      }

      return this.searchValue.pipe(
          debounceTime(500),
          distinctUntilChanged(),
          map(value => (value || '').trim().toLowerCase()),
          startWith(''),
        ).pipe(
          switchMap(searchValue => {
            if (searchValue.length) {
              return this.searchWords({uid: auth.uid, word: searchValue}).then(words => {

                return words.map(mapDoc)
              })
            }

            return new Observable<(RecordTypeRaw & { id: string })[]>(
              subscriber => {
                onSnapshot(
                  query(
                    collection(this.firestore, "users", auth.uid, "vocabulary"),
                    orderBy('createdAt', 'desc'),
                    limit(1)
                  ),
                  result => {
                    const list = result.docs
                      .map(doc => ({...doc.data() as RecordTypeRaw, id: doc.id}))

                    subscriber.next(list);
                  })
              }
            ).pipe(
              map(result => result.map(mapDoc)),
              switchMap(firstWords => {

                return this.page.pipe(
                  switchMap(page => {
                    return this.getWords({ uid: auth.uid, page, startAfterCreatedAt: firstWords[firstWords.length - 1]?.createdAt })
                  }),
                  map(words => {
                    this.lockNextPage = false;
                    return firstWords.concat(words)
                  })
                )
              })
            )
          })
        )
    }),
    catchError(e=> {
      console.error(e);
      return of(null)
    }),
    shareReplay(1)
  )

  addWordsToList(args: { word: string; translations: string[]; status: number; createdAt: number }[]) {
    const params = args.map(item => {
      return {
        word: item.word.trim().toLowerCase(),
        translations: item.translations.map(translation => translation.trim().toLowerCase()),
        status: item.status,
        createdAt: item.createdAt
      }
    }) ;

    return this.authService.auth$.pipe(
      take(1),
      switchMap(auth => {
        if(!auth) {
          return of(undefined);
        }

        return Promise.all(
          [
            params.slice(0, 1000),
            params.slice(1000),
          ].map(chunk => {
            const batch = writeBatch(this.firestore);
            chunk.forEach(item => {
              const docRef = doc(collection(this.firestore, "users", auth.uid, "vocabulary"))
              batch.set(docRef, item);
            });
            return batch.commit();
          })
        )
      })
    )
  }

  search(value: string) {
    this.searchValue.next(value);
  }


  nextPage() {
    if(!this.lockNextPage) {
      this.page.next(this.page.value + 1);
      this.lockNextPage = true;
    }
  }

  addWordToList(args: { word: string; translation?: string; translations?: string[] }) {
    const params = {
      word: args.word.trim().toLowerCase(),
      translation: args.translation?.trim().toLowerCase() || args.translations?.join(';') || ''
    };

    if(!params.word.length || !params.translation.length) {
      return of(undefined);
    }

      return this.authService.auth$.pipe(
        take(1),
        switchMap(auth => {
          if(!auth) {
            return of(undefined)
          }

          return this.searchWords({ uid: auth.uid, word: params.word }).then(foundWords => {
            const foundWord = foundWords.pop();
            let result = {
              word: params.word,
              translations: [params.translation],
              status: 0,
              createdAt: 0
            };
            if(foundWord && foundWord.translations.includes(params.translation)) {
              return undefined;
            }

            if(foundWord) {
              return updateDoc(
                doc(collection(this.firestore, "users", auth.uid, "vocabulary"), foundWord.id),
                { translations: foundWord.translations.concat(params.translation) }
              );
            } else {
              return setDoc(
                doc(collection(this.firestore, "users", auth.uid, "vocabulary")),
                {...result, createdAt: result.createdAt || Date.now() }
              );
            }
          }).then(() => {
            const buffer = this.cache.get(auth.uid);
            if(buffer) {
              buffer.shift();
              this.cache.set(auth.uid, buffer);
            }
            this.search('');
          })
        }),
    )
  }

  private async getWords(args: { page: number; uid: string; startAfterCreatedAt?: number }) {

    const valueFromCache = this.cache.get(args.uid) || [];

    if(valueFromCache[args.page - 1]) {
      return valueFromCache.slice(0, args.page).flat(1);
    }

    let startAfterCreatedAt: number | undefined;

    if(valueFromCache.length === 0) {
      startAfterCreatedAt = args.startAfterCreatedAt
    }
    const prevPageResult = valueFromCache[args.page - 2];
    if(prevPageResult?.length) {
      startAfterCreatedAt = prevPageResult[prevPageResult.length - 1].createdAt
    }

    if(startAfterCreatedAt) {
      const resultRaw = await getDocs(query(
        collection(this.firestore, "users", args.uid, "vocabulary"),
        orderBy('createdAt', 'desc'),
        ...(startAfterCreatedAt ? [startAfter(startAfterCreatedAt)] : []),
        limit(30)
      ));


      const result = resultRaw.docs
        .map(doc => (mapDoc({ ...doc.data() as RecordTypeRaw, id: doc.id })))


      valueFromCache.push(result);

      this.cache.set(args.uid, valueFromCache);
    }


     return this.cache.get(args.uid)?.flat(1) || [];
  }

  getWordsForRepetition(): Observable<RecordType[]> {
    return this.authService.auth$.pipe(
      switchMap(
        auth => {
          if(!auth) {
            return of([]);
          }

          return zip([
            getDocs(query(
              collection(this.firestore, "users", auth.uid, "vocabulary"),
              orderBy('createdAt'),
              limit(1)
            )),
            getDocs(query(
              collection(this.firestore, "users", auth.uid, "vocabulary"),
              orderBy('createdAt', 'desc'),
              limit(1)
            ))
          ]).pipe(
            switchMap(([first, last]) => {
              const firstCreatedAt = first.docs.map(item => (item.data()as RecordTypeRaw).createdAt)[0];
              const lastCreatedAt = last.docs.map(item => (item.data() as RecordTypeRaw).createdAt)[0];
              if (!firstCreatedAt || !lastCreatedAt) {
                return of([])
              }
              const diff = lastCreatedAt - firstCreatedAt;
              const startAfterCreatedAt = Math.floor(Math.random() * diff) + firstCreatedAt;
              return getDocs(query(
                collection(this.firestore, "users", auth.uid, "vocabulary"),
                orderBy('createdAt'),
                where('status', '==', 2),
                startAfter(startAfterCreatedAt),
                limit(60)
              )).then(result => {

                return result.docs.map(doc => mapDoc({ ...doc.data() as RecordTypeRaw, id: doc.id }))
              })
            })
          )
        }
      )
    )
  }

  private searchWords(args: {uid: string; word: string }) {
    return new Promise<(RecordTypeRaw & { id: string})[]>(resolve => {
      return onSnapshot(
          query(
            collection(this.firestore, "users", args.uid, "vocabulary"),
            where('word', '>=', args.word.trim().toLowerCase()),
            where('word', '<=', args.word.trim().toLowerCase() + '\uf8ff'),
            orderBy('word'),
          ),
          result => resolve(result.docs.map(doc => ({ ...doc.data() as RecordTypeRaw, id: doc.id }))),
          (error: unknown) => {
            console.error(error);
            resolve([])
          },
          () => resolve([])
        )
    })
  }
}
