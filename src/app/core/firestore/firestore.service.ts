import { inject, Injectable } from '@angular/core'
import { collection, query, getDocs, setDoc, writeBatch, doc } from "firebase/firestore";
import { FIREBASE_FIRE_STORE } from '../firebase/firebase-app'
import { AuthService } from '../auth/auth.service'
import { catchError, of, shareReplay, switchMap, take, zip } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private readonly firestore = inject(FIREBASE_FIRE_STORE);
  private readonly authService = inject(AuthService);

  readonly listOfWords$ = this.authService.auth$.pipe(
    switchMap(auth => {
      return auth ? getDocs(query(collection(this.firestore, "users", auth.uid, "vocabulary"))).then(result => {
        return result.docs
          .map(doc => ({ ...doc.data(), id: doc.id }) as {
            id: string;
            word: string;
            translations: string[];
            status: 0 | 1 | 2
          })
          .map(doc => ({
            id: doc.id,
            word: doc.word,
            translations: doc.translations,
            status: ({0: 'new', 1: 'inProgress', 2: 'done'} as const)[doc.status]
        })).flat(1)
      }) : of(null);
    }),
    catchError(e=> {
      console.error(e);
      return of(null)
    }),
    shareReplay(1)
  )

  addWordsToList(args: { word: string; translations: string[]; status: number }[]) {
    const params = args.map(item => {
      return {
        word: item.word.trim().toLowerCase(),
        translations: item.translations.map(translation => translation.trim().toLowerCase()),
        status: item.status
      }
    }) ;

    return this.listOfWords$.pipe(
      switchMap(list => {
        let result = params.map(paramsItem => {
          const foundWord = list?.find(item => item.word === paramsItem.word);
          if(foundWord) {
            const newTranslations = paramsItem.translations.filter(translation => !foundWord.translations.includes(translation))

            return {
              ...paramsItem,
              translations: foundWord.translations.concat(newTranslations)
            }
          } else {
            return paramsItem
          }

        });


        return this.authService.auth$.pipe(
          take(1),
          switchMap(auth => {
            if(!auth) {
              return of(undefined);
            }

            const batch = writeBatch(this.firestore);

            result.forEach(item => {
              const docRef = doc(collection(this.firestore, "users", auth.uid, "vocabulary"))
              batch.set(docRef, item);
            });

            return batch.commit();
          })
        )
      })
    )
  }

  addWordToList(args: { word: string; translation?: string; translations?: string[] }) {
    const params = {
      word: args.word.trim().toLowerCase(),
      translation: args.translation?.trim().toLowerCase() || args.translations?.join(';') || ''
    };

    if(!params.word.length || !params.translation.length) {
      return of(undefined);
    }

    return this.listOfWords$.pipe(
      switchMap(list => {
        let result = {
          word: params.word,
          translations: [params.translation],
          status: 0
        };

        const foundWord = list?.find(item => item.word === args.word);
        if(foundWord && !foundWord.translations.includes(params.translation)) {
          result = {
            word: foundWord.word,
            status: {'new': 0, 'inProgress': 1, 'done': 2}[foundWord.status],
            translations: result.translations.concat(params.translation)
          }
        }
        return this.authService.auth$.pipe(
          take(1),
          switchMap(auth => {
            return auth ? setDoc(
              doc(collection(this.firestore, "users", auth.uid, "vocabulary")),
              result
            ): of(undefined);
          })
        )
      })
    )
  }


}
