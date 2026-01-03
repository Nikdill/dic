import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { FirestoreService } from '../../../core/firestore/firestore.service'
import {
  asyncScheduler,
  BehaviorSubject, filter,
  finalize,
  map,
  NEVER,
  Observable,
  shareReplay, startWith,
  switchMap,
  takeWhile,
  timer,
} from 'rxjs'
import { AsyncPipe } from '@angular/common'
import { PlaySoundFactory } from './play-sound'
import { MatIcon } from '@angular/material/icon'

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
    MatIcon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RepetitionComponent {
  private readonly firestoreService = inject(FirestoreService);
  private readonly playSound = PlaySoundFactory();

  private readonly wordCounter$ = new BehaviorSubject(0);
  protected readonly wordLeftCounter$ = this.wordCounter$.pipe(
    map(value => 30 - value),
    shareReplay({ refCount: true, bufferSize: 1 })
  );

  protected readonly correctAnswersCounter$ = new BehaviorSubject(0);
  protected readonly incorrectAnswersCounter$ = new BehaviorSubject(0);

  protected readonly selected = signal<WordItemType['variants'][number] | undefined>(undefined);

  protected readonly timer$ =

    this.wordCounter$.pipe(
      filter(Boolean),
      switchMap(() => {
        return timer(0, 1000).pipe(
          map(count => 7 - count),
          takeWhile(value => value >= 0),
          startWith(7),
        )
      })
    );

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


  protected async selectVariant(variant: WordItemType['variants'][number]) {
    this.selected.set(variant);
    asyncScheduler.schedule(() => {
      this.wordCounter$.next(this.wordCounter$.value + 1);
      this.selected.set(undefined);
    }, 1000);
    if(variant.type === 'correct') {
      this.correctAnswersCounter$.next(this.correctAnswersCounter$.value + 1);
      this.playSound('/correct.mp3').subscribe();
    }

    if(variant.type === 'incorrect') {
      this.incorrectAnswersCounter$.next(this.incorrectAnswersCounter$.value + 1);
      this.playSound('/wrong.mp3').subscribe();
    }
  }

}
