import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { AsyncPipe } from '@angular/common'
import { MatIcon } from '@angular/material/icon'
import {
  asyncScheduler,
  BehaviorSubject, combineLatest,
  endWith,
  filter,
  map,
  shareReplay, Subject,
  switchMap,
  take,
  takeWhile,
} from 'rxjs'
import { WordStatus, WordType } from '../../../core/word.record'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { Voice } from '../../../shared/voice'
import { ListeningService } from '../../../feature/training/listening/listening.service'
import { PlaySoundFactory } from '../../../shared/play-sound'
import { WordComponent } from './word/word.component'
import { WordBuilderService } from '../../../feature/training/word-builder/word-builder.service'
import { ResultsListComponent } from '../../../shared/results-list/results-list.component'
import { WordStatusComponent } from '../../../shared/word-status/word-status.component'

@Component({
  selector: 'dic-word-builder',
  templateUrl: 'word-builder.component.html',
  imports: [
    AsyncPipe,
    WordComponent,
    ResultsListComponent,
    WordStatusComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WordBuilderComponent {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly wordBuilderService = inject(WordBuilderService);
  private readonly router = inject(Router);
  private readonly voice = inject(Voice);
  private readonly incorrectWords = new BehaviorSubject<WordType[]>([]);


  private readonly list$ = this.activatedRoute.data.pipe(
    map(data => data['words'] as WordType[]),
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

  protected readonly queue$ = combineLatest({
      list: this.list$,
      incorrectWords: this.incorrectWords
    }).pipe(
      map(({ list, incorrectWords }) => list.concat(incorrectWords)),
    switchMap(list => {
      return this.wordCounter$.pipe(
        map(counter => list.at(counter)),
        takeWhile(Boolean),
        endWith(undefined)
      )
    }),
    shareReplay({ refCount: true, bufferSize: 1})
  )

  protected clickHandler(item: WordType, isSuccess: boolean) {
    if(isSuccess) {
      this.correctAnswersIds.add(item.id);
      this.selected.set({ type: 'correct' as const, word: item.word, translation: item.translation });

    } else {
      this.incorrectAnswersIds.add(item.id);
      this.incorrectWords.next(this.incorrectWords.value.concat(item));
      this.selected.set({ type: 'incorrect' as const, word: item.word, translation: item.translation });
    }
    this.voice.play(item.word);
    asyncScheduler.schedule(() => {
      this.wordCounter$.next(this.wordCounter$.value + 1);
      this.selected.set(undefined);
    }, 1500);

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
        return correctIds.length === list.length
      }),
      switchMap(({ list, incorrectIds }) => {
        return this.wordBuilderService.updateWords({
          correct: list.filter(item => !incorrectIds.includes(item.id)),
          incorrect: list.filter(item => incorrectIds.includes(item.id)),
        })
      })
    ).subscribe()
  }

  protected replay() {
    this.correctAnswersIds.clear();
    this.incorrectAnswersIds.clear();
    this.wordCounter$.next(0);
    this.selected.set(undefined);
    this.router.navigate(['training', 'word-builder'], { onSameUrlNavigation: 'reload' }).then();
  }

  protected exit() {
    this.router.navigate(['training']).then();
  }
}
