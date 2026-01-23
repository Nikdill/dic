import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  inject, OnDestroy, Renderer2,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core'
import { AsyncPipe } from '@angular/common'
import { MatIcon } from '@angular/material/icon'
import {
  asyncScheduler,
  BehaviorSubject,
  combineLatest, distinctUntilChanged,
  endWith,
  filter,
  fromEvent,
  map,
  of,
  shareReplay,
  Subject,
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
import { WordsListComponent } from '../../../shared/words-list/words-list.component'
import { WordStatusComponent } from '../../../shared/word-status/word-status.component'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ListeningPageService, ListeningPageType } from './listening-page.service'
import { query } from 'firebase/firestore'
import { ResultActionsComponent } from '../components/result-actions/result-actions.component'
import { ResultLayoutComponent } from '../components/result-layout/result-layout.component'

@Component({
  selector: 'dic-listening',
  templateUrl: 'listening.component.html',
  imports: [
    AsyncPipe,
    MatIcon,
    WordsListComponent,
    WordStatusComponent,
    ResultActionsComponent,
    ResultLayoutComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ListeningPageService],
  host: {
    '(click)': 'wordInputRef()?.nativeElement?.focus()',
  }
})
export class ListeningComponent implements OnDestroy {

  private readonly router = inject(Router);
  private readonly documentRef = inject(DOCUMENT);
  private readonly renderer2 = inject(Renderer2);
  private readonly voice = inject(Voice);
  protected readonly wordInputRef = viewChild<ElementRef<HTMLDivElement>>('wordInputRef');
  protected readonly focusSubject = new Subject<void>();
  protected readonly listeningPageService = inject(ListeningPageService);

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

  constructor() {
    const visualViewport = this.documentRef.defaultView?.visualViewport;
    if(!visualViewport) {
      return;
    }

    this.renderer2.setStyle(this.documentRef.documentElement, 'touch-action', 'none')
    this.renderer2.setStyle(this.documentRef.documentElement, '-ms-touch-action', 'none')

    this.renderer2.setStyle(this.documentRef.body, 'touch-action', 'none')
    this.renderer2.setStyle(this.documentRef.body, '-ms-touch-action', 'none')

    fromEvent(visualViewport, 'scroll').pipe(
      takeUntilDestroyed()
    ).subscribe(() => {
      this.documentRef.defaultView?.scrollTo(0, 0);
    })

    this.listeningPageService.page$.pipe(
      takeUntilDestroyed(),
      map(state => state.current),
      distinctUntilChanged(),
    ).subscribe(current => {
        if(current) {
          this.voice.play(current.word);
        }
    })

    this.listeningPageService.page$.pipe(
      takeUntilDestroyed(),
    ).subscribe(state => {
      if(!state.selected) {
        const input = this.wordInputRef()?.nativeElement;
        if(input) {
          input.innerText = '';
        }
      }
    })
  }

  ngOnDestroy() {
    this.renderer2.removeStyle(this.documentRef.documentElement, 'touch-action')
    this.renderer2.removeStyle(this.documentRef.documentElement, '-ms-touch-action')
    this.renderer2.removeStyle(this.documentRef.body, 'touch-action')
    this.renderer2.removeStyle(this.documentRef.body, '-ms-touch-action')
  }

  protected enterHandler($event: Event, state: ListeningPageType, inputRef: HTMLDivElement) {
    $event.preventDefault();
    return this.listeningPageService.select(state, inputRef);
  }

  protected playHandler(item: WordType) {
    this.voice.play(item.word);
  }
}
