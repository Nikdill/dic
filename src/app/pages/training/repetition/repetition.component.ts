import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import {
  asyncScheduler,
  BehaviorSubject, distinctUntilChanged, endWith, filter,
  map,
  shareReplay,
  switchMap, take, takeWhile,
  tap,
} from 'rxjs'
import { AsyncPipe } from '@angular/common'
import { MatIcon } from '@angular/material/icon'
import { TimerComponent } from './timer/timer.component'
import { Voice } from '../../../shared/voice'
import { ActivatedRoute, Router } from '@angular/router'
import { RepetitionService } from '../../../feature/training/repetition/repetition.service'
import { WordType } from '../../../core/word.record'
import { PlaySoundFactory } from '../../../shared/play-sound'
import { WordsListComponent } from '../../../shared/words-list/words-list.component'
import { WordStatusComponent } from '../../../shared/word-status/word-status.component'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { RepetitionPageService } from './repetition-page.service'
import { ResultActionsComponent } from '../components/result-actions/result-actions.component'
import { ResultLayoutComponent } from '../components/result-layout/result-layout.component'

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
    WordsListComponent,
    WordStatusComponent,
    ResultActionsComponent,
    ResultLayoutComponent,
  ],
  providers: [RepetitionPageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RepetitionComponent {
  private readonly voice = inject(Voice);
  private readonly router = inject(Router);
  protected readonly repetitionPageService = inject(RepetitionPageService);

  constructor() {
    this.repetitionPageService.page$.pipe(
      takeUntilDestroyed(),
      map(state => state.current),
      distinctUntilChanged(),
    ).subscribe(current => {
      if(current) {
        this.voice.play(current.word);
      }
    });
  }
}
