import { inject, Injectable } from '@angular/core'
import { collection,writeBatch, doc } from "firebase/firestore";
import {
  of,
  switchMap,
  take,
} from 'rxjs';
import { FIREBASE_FIRE_STORE } from '../../core/firebase/firebase-app'
import { AuthService } from '../../core/auth/auth.service'

@Injectable({
  providedIn: 'root'
})
export class ImportWordsService {
  private readonly firestore = inject(FIREBASE_FIRE_STORE);
  private readonly authService = inject(AuthService);

  addWordsToList(args: { word: string; translations: string[]; status: number; createdAt: number }[]) {
    const params = args.map(item => {
      return {
        word: item.word.trim().toLowerCase(),
        translations: item.translations.map(translation => translation.trim().toLowerCase()),
        status: item.status,
        createdAt: item.createdAt,
        updatedAt: item.createdAt,
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
}
