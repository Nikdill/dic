import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { AsyncPipe } from '@angular/common'
import { MatIcon } from '@angular/material/icon'
import {
  asyncScheduler,
  BehaviorSubject, combineLatest, distinctUntilChanged,
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
import { WordBuilderPageService } from './word-builder-page.service'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'

@Component({
  selector: 'dic-word-builder',
  templateUrl: 'word-builder.component.html',
  imports: [
    AsyncPipe,
    WordComponent,
    ResultsListComponent,
    WordStatusComponent,
  ],
  providers: [WordBuilderPageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WordBuilderComponent {
  private readonly router = inject(Router);
  private readonly voice = inject(Voice);
  protected readonly wordBuilderPageService = inject(WordBuilderPageService);

  constructor() {
    this.wordBuilderPageService.page$.pipe(
      takeUntilDestroyed(),
      map(state => state.current),
      distinctUntilChanged(),
    ).subscribe(current => {
      if(current) {
        this.voice.play(current.word);
      }
    })
  }

  protected replay() {
    this.router.navigate(['training', 'word-builder'], { onSameUrlNavigation: 'reload' }).then();
  }

  protected exit() {
    this.router.navigate(['training']).then();
  }
}
