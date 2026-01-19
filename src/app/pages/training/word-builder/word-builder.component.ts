import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { AsyncPipe } from '@angular/common'
import { MatIcon } from '@angular/material/icon'
import {
  asyncScheduler,
  BehaviorSubject,
  endWith,
  filter,
  map,
  shareReplay, Subject,
  switchMap,
  take,
  takeWhile,
} from 'rxjs'
import { RecordType } from '../../../core/word.record'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { Voice } from '../../../shared/voice'
import { ListeningService } from '../../../feature/training/listening/listening.service'
import { PlaySoundFactory } from '../../../shared/play-sound'
import { WordComponent } from './word/word.component'

@Component({
  selector: 'dic-word-builder',
  templateUrl: 'word-builder.component.html',
  imports: [
    AsyncPipe,
    MatIcon,
    RouterLink,
    WordComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WordBuilderComponent {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly listeningService = inject(ListeningService);
  private readonly router = inject(Router);
  private readonly playSound = PlaySoundFactory();
  private readonly voice = inject(Voice);
  protected readonly focusSubject = new Subject<void>();


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
    shareReplay({ refCount: true, bufferSize: 1})
  )

  protected clickHandler(item: RecordType, isSuccess: boolean) {
    if(isSuccess) {
      this.playSound('/correct.mp3').subscribe();
      this.correctAnswersIds.add(item.id);
      this.selected.set({ type: 'correct' as const, word: item.word, translation: item.translation });

    } else {
      this.playSound('/wrong.mp3').subscribe();
      this.incorrectAnswersIds.add(item.id);
      this.selected.set({ type: 'incorrect' as const, word: item.word, translation: item.translation });
    }
    asyncScheduler.schedule(() => {
      this.wordCounter$.next(this.wordCounter$.value + 1);
      this.selected.set(undefined);
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
        return this.listeningService.updateWords({
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
    this.router.navigate(['training', 'word-builder'], { onSameUrlNavigation: 'reload' }).then();
  }
}
