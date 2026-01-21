import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core'
import { AsyncPipe } from '@angular/common'
import { MatIcon } from '@angular/material/icon'
import {
  asyncScheduler,
  BehaviorSubject, combineLatest,
  endWith,
  filter, fromEvent,
  map,
  of,
  shareReplay, Subject,
  switchMap,
  take,
  takeWhile,
  tap,
} from 'rxjs'
import { WordType } from '../../../core/word.record'
import { ActivatedRoute, Router } from '@angular/router'
import { Voice } from '../../../shared/voice'
import { ListeningService } from '../../../feature/training/listening/listening.service'
import { PlaySoundFactory } from '../../../shared/play-sound'
import { ResultsListComponent } from '../../../shared/results-list/results-list.component'
import { WordStatusComponent } from '../../../shared/word-status/word-status.component'

@Component({
  selector: 'dic-listening',
  templateUrl: 'listening.component.html',
  imports: [
    AsyncPipe,
    MatIcon,
    ResultsListComponent,
    WordStatusComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(click)': 'wordInputRef()?.nativeElement?.focus()'
  }
})
export class ListeningComponent {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly listeningService = inject(ListeningService);
  private readonly router = inject(Router);
  private readonly playSound = PlaySoundFactory();
  private readonly voice = inject(Voice);
  private readonly documentRef = inject(DOCUMENT);
  protected readonly wordInputRef = viewChild<ElementRef<HTMLDivElement>>('wordInputRef');
  protected readonly focusSubject = new Subject<void>();
  private readonly incorrectWords = new BehaviorSubject<WordType[]>([]);

  protected readonly visualViewportHeight$ = this.focusSubject.pipe(
      switchMap(() => {
        return this.documentRef.defaultView?.visualViewport
          ? fromEvent(this.documentRef.defaultView.visualViewport, 'resize')
            .pipe(
              map(e => (e.currentTarget as VisualViewport).height),
              endWith(undefined)
            )
          : of(undefined)
      })
    ).pipe(
      shareReplay({ refCount: true, bufferSize: 1})
    )

  protected readonly top$ = this.focusSubject.pipe(
    switchMap(() => {
      return this.documentRef.defaultView?.visualViewport
        ? fromEvent(this.documentRef.defaultView.visualViewport, 'scroll')
          .pipe(
            map(e => {
               return this.documentRef.defaultView?.scrollY || 0;
              },
            ),
            endWith(undefined)
          )
        : of(undefined)
    })
  ).pipe(
    shareReplay({ refCount: true, bufferSize: 1})
  )

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
  protected readonly selected = signal<{
    type: 'correct' | 'incorrect';
    word: string;
    translation: string
  } | undefined
  >(undefined);

  protected readonly queue$ = combineLatest({
                                  list: this.list$,
                                  incorrectWords: this.incorrectWords
                              })
  .pipe(
    map(({ list, incorrectWords }) => list.concat(incorrectWords)),
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

  protected enterHandler($event: Event, item: WordType, inputRef: HTMLDivElement) {
    $event.preventDefault();
    return this.clickHandler(item, inputRef);
  }

  protected clickHandler(item: WordType, inputRef: HTMLDivElement) {
    const value = inputRef.innerText.trim().toLowerCase();

    if(!value.length) {
      return
    }
    const isSuccess = item.word.trim().toLowerCase() === inputRef.innerText.trim().toLowerCase();
    if(isSuccess) {
      this.playSound('/correct.mp3').subscribe();
      this.correctAnswersIds.add(item.id);
      this.selected.set({ type: 'correct' as const, word: item.word, translation: item.translation });

    } else {
      this.playSound('/wrong.mp3').subscribe();
      this.incorrectAnswersIds.add(item.id);
      inputRef.innerText = item.word;
      this.selected.set({ type: 'incorrect' as const, word: item.word, translation: item.translation });
      this.incorrectWords.next(this.incorrectWords.value.concat(item));
    }
    inputRef.innerText = '';
    inputRef.focus();
    asyncScheduler.schedule(() => {
      this.wordCounter$.next(this.wordCounter$.value + 1);
      this.selected.set(undefined);
    }, isSuccess ? 1500 : 3000);

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
        return this.listeningService.updateWords({
          correct: list.filter(item => !incorrectIds.includes(item.id)),
          incorrect: list.filter(item => incorrectIds.includes(item.id)),
        })
      })
    ).subscribe()
  }

  protected playHandler(item: WordType) {
    this.voice.play(item.word);
  }

  protected replay() {
    this.correctAnswersIds.clear();
    this.incorrectAnswersIds.clear();
    this.wordCounter$.next(0);
    this.selected.set(undefined);
    this.router.navigate(['training', 'listening'], { onSameUrlNavigation: 'reload' }).then();
  }

  protected exit() {
    this.router.navigate(['training']).then();
  }
}
