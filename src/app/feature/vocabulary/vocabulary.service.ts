import { inject, Injectable } from '@angular/core'
import {
  BehaviorSubject,
  catchError,
  debounceTime,
  distinctUntilChanged, from,
  map, Observable,
  of, scan,
  shareReplay, skip,
  startWith,
  switchMap, take,
} from 'rxjs'
import { AuthService } from '../../core/auth/auth.service'
import {
  collection,
  doc, getCountFromServer,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc, startAfter,
  updateDoc,
  where,
} from 'firebase/firestore'
import { FIREBASE_FIRE_STORE } from '../../core/firebase/firebase-app'
import { mapDoc, WordType, WordTypeRaw, StatusType } from '../../core/word.record'

@Injectable({
  providedIn: 'root'
})
export class VocabularyService {
  private lockNextPage = false;
  private readonly cache = new Map<string, WordType[][]>();
  private readonly page = new BehaviorSubject(1);
  private readonly searchValue = new BehaviorSubject('');

  private readonly authService = inject(AuthService);
  private readonly firestore = inject(FIREBASE_FIRE_STORE);

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
              skip(1),
              startWith(0),
              scan((sum, count) => sum + count, startCount),
              map(value => value < 0 ? 0 : value)
            )
          })
        )
        : of(0)
    }),
    shareReplay(1)
  );

  readonly listOfWords$: Observable<WordType[] | null> = this.authService.auth$.pipe(
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

          return new Observable<(WordTypeRaw & { id: string })[]>(
            subscriber => {
              onSnapshot(
                query(
                  collection(this.firestore, "users", auth.uid, "vocabulary"),
                  orderBy('createdAt', 'desc'),
                  limit(1)
                ),
                result => {
                  const list = result.docs
                    .map(doc => ({...doc.data() as WordTypeRaw, id: doc.id}))

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

  nextPage() {
    if(!this.lockNextPage) {
      this.page.next(this.page.value + 1);
      this.lockNextPage = true;
    }
  }

  search(value: string) {
    this.searchValue.next(value);
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
            status: StatusType.NEW,
            createdAt: Date.now()
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
              {...result, createdAt: result.createdAt }
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
        .map(doc => (mapDoc({ ...doc.data() as WordTypeRaw, id: doc.id })))


      valueFromCache.push(result);

      this.cache.set(args.uid, valueFromCache);
    }


    return this.cache.get(args.uid)?.flat(1) || [];
  }

  private searchWords(args: {uid: string; word: string }) {
    return new Promise<(WordTypeRaw & { id: string})[]>(resolve => {
      return onSnapshot(
        query(
          collection(this.firestore, "users", args.uid, "vocabulary"),
          where('word', '>=', args.word.trim().toLowerCase()),
          where('word', '<=', args.word.trim().toLowerCase() + '\uf8ff'),
          orderBy('word'),
        ),
        result => resolve(result.docs.map(doc => ({ ...doc.data() as WordTypeRaw, id: doc.id }))),
        (error: unknown) => {
          console.error(error);
          resolve([])
        },
        () => resolve([])
      )
    })
  }
}
