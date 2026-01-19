import { ChangeDetectionStrategy, Component, DOCUMENT, inject, signal } from '@angular/core'
import { AsyncPipe } from '@angular/common'
import { MatIcon } from '@angular/material/icon'
import {
  asyncScheduler,
  BehaviorSubject,
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
import { RecordType } from '../../../core/word.record'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { Voice } from '../../../shared/voice'
import { ListeningService } from '../../../feature/training/listening/listening.service'
import { PlaySoundFactory } from '../../../shared/play-sound'

@Component({
  selector: 'dic-listening',
  templateUrl: 'listening.component.html',
  imports: [
    AsyncPipe,
    MatIcon,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListeningComponent {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly listeningService = inject(ListeningService);
  private readonly router = inject(Router);
  private readonly playSound = PlaySoundFactory();
  private readonly voice = inject(Voice);
  private readonly documentRef = inject(DOCUMENT);
  protected readonly focusSubject = new Subject<void>();

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
  protected readonly selected = signal<{
    type: 'correct' | 'incorrect';
    word: string;
    translation: string
  } | undefined
  >({ type: 'correct', word: 'very long word with a lot letters', translation: 'очень длинное слово с большим количеством букв'});

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


  protected clickHandler(item: RecordType, inputRef: HTMLDivElement) {
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
    }
    inputRef.innerText = '';
    inputRef.focus();
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
    this.router.navigate(['training', 'listening'], { onSameUrlNavigation: 'reload' }).then();
  }
}
