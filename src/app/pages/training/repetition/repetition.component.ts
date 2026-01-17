import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import {
  asyncScheduler,
  BehaviorSubject, endWith, filter,
  map,
  shareReplay,
  switchMap, take, takeWhile,
  tap,
} from 'rxjs'
import { AsyncPipe } from '@angular/common'
import { PlaySoundFactory } from './play-sound'
import { MatIcon } from '@angular/material/icon'
import { TimerComponent } from './timer/timer.component'
import { Voice } from '../../../shared/voice'
import { ActivatedRoute, Router } from '@angular/router'
import { RepetitionService } from '../../../feature/training/repetition/repetition.service'
import { RecordType } from '../../../core/word.record'

type WordItemType = {
  id: string;
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
    TimerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RepetitionComponent {
  private readonly repetitionService = inject(RepetitionService);
  private readonly playSound = PlaySoundFactory();
  private readonly voice = inject(Voice);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly list$ = this.activatedRoute.data.pipe(
    map(data => data['words'] as RecordType[]),
    map(list => list || []),
    shareReplay({ refCount: true, bufferSize: 1})
  );

  protected readonly wordCounter$ = new BehaviorSubject(0);
  protected readonly wordLeftCounter$ = this.wordCounter$.pipe(
    switchMap(counter => {

      return this.list$.pipe(
        take(1),
        map(list => Math.floor(list.length / 2) - counter),
      )
    }),
    shareReplay({ refCount: true, bufferSize: 1 })
  );

  protected readonly correctAnswersIds = new Set<string>();
  protected readonly incorrectAnswersIds = new Set<string>();

  protected readonly selected = signal<WordItemType['variants'][number] | undefined>(undefined);
  protected readonly timeEnded = signal(false);



  protected readonly queue$ = this.list$.pipe(
        map(list => {
          const half = Math.floor(list.length / 2);
          const words = list.slice(0, half)
          const translations = list.slice(half).sort(() => Math.random() > 0.5 ? -1 : 1)
          return words
            .map((item, index) => {
              return {
                id: item.id,
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
            map(counter => list.at(counter)),
            takeWhile(Boolean),
            endWith(undefined)
          )
        }),
        tap(item => {
          if(item) {
            this.voice.play(item.word);
          }
        }),
    shareReplay({ refCount: true, bufferSize: 1})
  )

  protected selectVariant(item: WordItemType, variant: WordItemType['variants'][number]) {
    this.selected.set(variant);
    asyncScheduler.schedule(() => {
      this.wordCounter$.next(this.wordCounter$.value + 1);
      this.selected.set(undefined);
      this.timeEnded.set(false);
    }, 1000);
    if(this.timeEnded()) {
      this.incorrectAnswersIds.add(item.id);
    }
    if(variant.type === 'correct') {
      this.correctAnswersIds.add(item.id);
      this.playSound('/correct.mp3').subscribe();
    }

    if(variant.type === 'incorrect') {
      this.incorrectAnswersIds.add(item.id);
      this.playSound('/wrong.mp3').subscribe();
    }



    this.list$.pipe(
      take(1),
      map(list => {
        const correctIds = Array.from(this.correctAnswersIds);
        const incorrectIds = Array.from(this.incorrectAnswersIds);
        return {
          correctIds,
          incorrectIds,
          listLength: Math.floor(list.length / 2)
        }
      }),
      filter(({ listLength, correctIds, incorrectIds }) => {
        return correctIds.length + incorrectIds.length === listLength
      }),
      switchMap(({ correctIds, incorrectIds }) => {
        return this.repetitionService.updateWords({
          correct: correctIds,
          incorrect: incorrectIds
        })
      })
    ).subscribe()
  }


  protected replay() {
    this.correctAnswersIds.clear();
    this.incorrectAnswersIds.clear();
    this.wordCounter$.next(0);
    this.selected.set(undefined);
    this.timeEnded.set(false);
    this.router.navigate(['training'], { onSameUrlNavigation: 'reload' }).then();
  }
}
