import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { FirestoreService, RecordType } from '../../../core/firestore/firestore.service'
import {
  asyncScheduler,
  BehaviorSubject,
  map,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs'
import { AsyncPipe } from '@angular/common'
import { PlaySoundFactory } from './play-sound'
import { MatIcon } from '@angular/material/icon'
import { TimerComponent } from './timer/timer.component'
import { Voice } from '../../../shared/voice'
import { ActivatedRoute, Router } from '@angular/router'

type WordItemType = {
  id: string;
  word: string;
  variants: {
    type: 'correct' | 'incorrect';
    translation: string;
  }[]
}

const WORDS_COUNT = 30;

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
  private readonly firestoreService = inject(FirestoreService);
  private readonly playSound = PlaySoundFactory();
  private readonly voice = inject(Voice);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);

  protected readonly wordCounter$ = new BehaviorSubject(0);
  protected readonly wordLeftCounter$ = this.wordCounter$.pipe(
    map(value => WORDS_COUNT - value),
    shareReplay({ refCount: true, bufferSize: 1 })
  );

  protected readonly correctAnswersIds = new Set<string>();
  protected readonly incorrectAnswersIds = new Set<string>();

  protected readonly selected = signal<WordItemType['variants'][number] | undefined>(undefined);
  protected readonly timeEnded = signal(false);

  protected readonly queue$ = this.wordCounter$.pipe(
    switchMap(counter => {
      return this.activatedRoute.data.pipe(
        map(data => data['words'] as RecordType[]),
        map(list => list || []),
        map(list => {
          const words = list.slice(0, WORDS_COUNT)
          const translations = list.slice(WORDS_COUNT).sort(() => Math.random() > 0.5 ? -1 : 1)
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
        map(list => list.at(counter)),
        tap(item => {
          if(item) {
            this.voice.play(item.word);
          }
        })
        )

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

    const correctIds = Array.from(this.correctAnswersIds);
    const incorrectIds = Array.from(this.incorrectAnswersIds);
    if(correctIds.length + incorrectIds.length === WORDS_COUNT) {
      this.firestoreService.updateRepetitionWords({
        correct: correctIds,
        incorrect: incorrectIds
      }).subscribe()
    }
  }


  protected replay() {

    this.router.navigate(['training'], { onSameUrlNavigation: 'reload' }).then(() => {
      this.wordCounter$.next(0);
      this.correctAnswersIds.clear();
      this.incorrectAnswersIds.clear();
      this.selected.set(undefined);
      this.timeEnded.set(false);
    })
  }
}
