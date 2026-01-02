import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { FirestoreService } from '../../../core/firestore/firestore.service'
import { BehaviorSubject, map, shareReplay, switchMap, tap } from 'rxjs'
import { AsyncPipe, JsonPipe } from '@angular/common'
import { MatButton } from '@angular/material/button'

// function getRandomIndexes(max: number, count: number, buffer: number[] = []) {
//   if(count === buffer.length) {
//     return buffer;
//   }
//
//   let result = Math.floor(Math.random() * max);
//   if(buffer.includes(result)) {
//     return getRandomIndexes(max, count, buffer);
//   } else {
//     buffer.push(result);
//   }
//
//   if(buffer.length === count) {
//     return buffer;
//   } else {
//     return getRandomIndexes(max, count, buffer);
//   }
// }

function getRandomIndex(max: number, exclude: number[]) {
  const index = Math.floor(Math.random() * max);
  if(exclude.includes(index)) {
    return getRandomIndex(max, exclude)
  }
  return index;
}

type WordItemType = {
  word: string;
  variants: {
    type: 'correct' | 'incorrect';
    translation: string;
  }[]
}

@Component({
  selector: 'dic-repetition',
  templateUrl: 'repetition.component.html',
  imports: [
    AsyncPipe,
    MatButton,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RepetitionComponent {
  private readonly firestoreService = inject(FirestoreService);

  private readonly wordCounter$ = new BehaviorSubject(0);

  protected readonly correctAnswersCounter$ = new BehaviorSubject(0);
  protected readonly incorrectAnswersCounter$ = new BehaviorSubject(0);

  protected readonly queue$ = this.firestoreService.getWordsForRepetition().pipe(
    map(list => list || []),
    map(list => {
      const words = list.slice(0, 30)
      const translations = list.slice(30).sort(() => Math.random() > 0.5 ? -1 : 1)
      return words
        .map((item, index) => {
          return {
            word: item.word,
            variants: [{
              type: 'correct' as const,
              translation: item.translation,
            },
            {
              type: 'incorrect' as const,
              translation: translations[index].translation
            }].sort(() => Math.random() > 0.5 ? -1 : 1)
          }
        })
    }),
    switchMap(list => {

      return this.wordCounter$.pipe(
        map(counter => list.at(counter))
      )
    }),
    shareReplay({ refCount: true, bufferSize: 1})
  )


  protected selectVariant(variant: WordItemType['variants'][number]) {
    this.wordCounter$.next(this.wordCounter$.value + 1);
    if(variant.type === 'correct') {
      this.correctAnswersCounter$.next(this.correctAnswersCounter$.value + 1);
    }

    if(variant.type === 'incorrect') {
      this.incorrectAnswersCounter$.next(this.incorrectAnswersCounter$.value + 1);
    }
  }

}
