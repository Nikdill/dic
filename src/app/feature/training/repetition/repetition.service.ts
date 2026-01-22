import { inject, Injectable } from '@angular/core'
import { Observable, of, switchMap, take } from 'rxjs'
import { collection, doc, getDocs, limit, orderBy, query, where, writeBatch } from 'firebase/firestore'
import { AuthService } from '../../../core/auth/auth.service'
import { FIREBASE_FIRE_STORE } from '../../../core/firebase/firebase-app'
import { mapDoc, WordType, WordTypeRaw, StatusType, Status } from '../../../core/word.record'

@Injectable({ providedIn: 'root' })
export class RepetitionService {
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

          const status = (Object.values(StatusType) as StatusType[]).reduce((
            (status, itemStatus) => Status.addStatus(status, itemStatus))
          );
          return getDocs(query(
            collection(this.firestore, "users", auth.uid, "vocabulary"),
            orderBy('updatedAt'),
            where('status', '==', status),
            limit(60)
          )).then(result => {

            return result.docs.map(doc => mapDoc({ ...doc.data() as WordTypeRaw, id: doc.id }))
          })
        }
      )
    )
  }

  updateWords(args: { correct: {  id: string }[]; incorrect: {  id: string }[]}) {
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
            const docRef = doc(collection(this.firestore, "users", auth.uid, "vocabulary"), item.id)
            batch.update(docRef, { updatedAt });
          });
          args.incorrect.forEach(item => {
            const docRef = doc(collection(this.firestore, "users", auth.uid, "vocabulary"), item.id)
            batch.update(docRef, { updatedAt, status: StatusType.NEW });
          });
          return batch.commit();
        }
      )
    )
  }
}
