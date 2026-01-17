import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core'
import { AsyncPipe, NgTemplateOutlet } from '@angular/common'
import { MatIcon } from '@angular/material/icon'
import { TimerComponent } from '../repetition/timer/timer.component'
import {
  asyncScheduler,
  BehaviorSubject,
  endWith,
  filter,
  map,
  shareReplay,
  switchMap,
  take,
  takeWhile,
  tap,
} from 'rxjs'
import { RecordType, Status } from '../../../core/word.record'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { Voice } from '../../../shared/voice'
import { MatFormField, MatInput } from '@angular/material/input'
import { PlaySoundFactory } from '../repetition/play-sound'
import { WordTranslationService } from '../../../feature/training/word-translation/word-translation.service'

@Component({
  selector: 'dic-word-translation',
  templateUrl: 'word-translation.component.html',
  styleUrl: 'word-translation.component.scss',
  imports: [
    AsyncPipe,
    MatInput,
    MatFormField,
    MatIcon,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WordTranslationComponent {
  private readonly wordInputRef = viewChild<ElementRef<HTMLInputElement>>('wordInputRef')
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly wordTranslationService = inject(WordTranslationService);
  private readonly router = inject(Router);
  private readonly playSound = PlaySoundFactory();
  private readonly voice = inject(Voice);

  private readonly list$ = this.activatedRoute.data.pipe(
    map(data => data['words'] as RecordType[]),
    map(list => list || []),
    shareReplay({ refCount: true, bufferSize: 1})
  );

  protected readonly resultList$ = this.list$.pipe(
    map(list => {
      return list.map(item => {
        return {
          ...item,
          status: {
            inProgress: this.incorrectAnswersIds.has(item.id),
            new: false,
            done: this.correctAnswersIds.has(item.id)
          }
        }
      })
    })
  )

  protected readonly correctAnswersIds = new Set<string>();
  protected readonly incorrectAnswersIds = new Set<string>();
  protected readonly wordCounter$ = new BehaviorSubject(0);
  protected readonly selected = signal<{  type: 'correct' | 'incorrect', word: string; translation: string } | undefined>(undefined);

  protected readonly queue$ = this.list$.pipe(
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

  protected clickHandler(item: RecordType, inputRef: HTMLInputElement) {
    const value = inputRef.value.trim().toLowerCase();
    if(!value.length) {
      return
    }
    const isSuccess = item.word.trim().toLowerCase() === inputRef.value.trim().toLowerCase();
    if(isSuccess) {
      this.playSound('/correct.mp3').subscribe();
      this.correctAnswersIds.add(item.id);
      this.selected.set({ type: 'correct' as const, word: item.word, translation: item.translation });

    } else {
      this.playSound('/wrong.mp3').subscribe();
      this.incorrectAnswersIds.add(item.id);
      inputRef.value = item.word;
      this.selected.set({ type: 'incorrect' as const, word: item.word, translation: item.translation });
    }

    asyncScheduler.schedule(() => {
      this.wordCounter$.next(this.wordCounter$.value + 1);
      this.selected.set(undefined);
      asyncScheduler.schedule(() => {
        const input = this.wordInputRef()?.nativeElement;
        if(input) {
          input.value = '';
          input.focus();
        }

      }, 0)
    }, isSuccess ? 1500 : 2000);

    this.list$.pipe(
      take(1),
      map(list => {
        const correctIds = Array.from(this.correctAnswersIds);
        const incorrectIds = Array.from(this.incorrectAnswersIds);
        return {
          list,
          correctIds,
          incorrectIds,
        }
      }),
      filter(({ list, correctIds, incorrectIds }) => {
        return correctIds.length + incorrectIds.length === list.length
      }),
      switchMap(({ list, correctIds, incorrectIds }) => {
        return this.wordTranslationService.updateWords({
          correct: list.filter(item => correctIds.includes(item.id)),
          incorrect: list.filter(item => incorrectIds.includes(item.id)),
        })
      })
    ).subscribe()
  }

  protected playHandler(item: RecordType) {
    this.voice.play(item.word);
  }

  protected replay() {
    this.correctAnswersIds.clear();
    this.incorrectAnswersIds.clear();
    this.wordCounter$.next(0);
    this.selected.set(undefined);
    this.router.navigate(['training', 'word-translation'], { onSameUrlNavigation: 'reload' }).then();
  }
}
