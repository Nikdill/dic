import { inject, Injectable } from '@angular/core'
import { Observable, of, switchMap, take } from 'rxjs'
import { mapDoc, WordType, WordTypeRaw, Status, StatusType } from '../../../core/word.record'
import { collection, doc, getDocs, limit, orderBy, query, where, writeBatch } from 'firebase/firestore'
import { AuthService } from '../../../core/auth/auth.service'
import { FIREBASE_FIRE_STORE } from '../../../core/firebase/firebase-app'

@Injectable({
  providedIn: 'root'
})
export class WordBuilderService {
  private readonly authService = inject(AuthService);
  private readonly firestore = inject(FIREBASE_FIRE_STORE);

  getWords(): Observable<WordType[]> {
    return this.authService.auth$.pipe(
      take(1),
      switchMap(
        auth => {
          if(!auth) {
            return of([]);
          }

          return getDocs(query(
            collection(this.firestore, "users", auth.uid, "vocabulary"),
            orderBy('updatedAt'),
            where('status', 'in', Object.values(StatusType)
              .filter(status => ![StatusType.WORD_BUILDER as number].includes(status))),
            limit(10)
          )).then(result => {
            return result.docs.map(doc => mapDoc({ ...doc.data() as WordTypeRaw, id: doc.id }))
          })
        }
      )
    )
  }

  updateWords(args: { incorrect: WordType[]; correct: WordType[]}) {
    return this.authService.auth$.pipe(
      take(1),
      switchMap(
        auth => {
          if(!auth) {
            return of(undefined);
          }

          const batch = writeBatch(this.firestore);
          const updatedAt = Date.now();
          args.correct.forEach(item => {
            const docRef = doc(collection(this.firestore, "users", auth.uid, "vocabulary"), item.id);

            batch.update(docRef, { updatedAt, status: Status.addStatus(item.status.value, StatusType.WORD_BUILDER) });
          });
          args.incorrect.forEach(item => {
            const docRef = doc(collection(this.firestore, "users", auth.uid, "vocabulary"), item.id);

            batch.update(docRef, { updatedAt });
          });
          return batch.commit();
        }
      )
    )
  }
}
