import { inject, Injectable } from '@angular/core'
import {
  delay,
  distinctUntilChanged,
  of,
  shareReplay, startWith,
  switchMap,
} from 'rxjs'
import { RepetitionService } from '../../../feature/training/repetition/repetition.service'
import { PlaySoundFactory } from '../../../shared/play-sound'
import { WordType } from '../../../core/word.record'
import { PageService, PageState } from '../page.service'

export type RepetitionWordType = {
  variants: {
    type: 'correct' | 'incorrect';
    translation: string;
  }[]
} & WordType;

export type RepetitionPageType = {
  words: RepetitionWordType[];
  queue: RepetitionWordType[];
  current: RepetitionWordType | undefined;
  timer: number | undefined;
  selected: RepetitionWordType['variants'][number] | undefined;
  incorrectIds: Set<string>;
}

@Injectable()
export class RepetitionPageService extends PageService<RepetitionPageType> {
  private readonly playSound = PlaySoundFactory();
  private readonly repetitionService = inject(RepetitionService);

  readonly page$ = this.pageState$.pipe(
    switchMap(([prevState, currentState]) => {
      if(!currentState.selected || !currentState.current || !prevState) {
        return of(currentState)
      }
      const newState = {
        ...currentState,
        selected: undefined,
        timer: 4000,
      }

      const oldState = {
        ...prevState,
        selected: currentState.selected
      }

      return of(newState).pipe(
        delay(1000),
        switchMap(state => of({ ...state, timer: 0})
          .pipe(
            delay(state.timer),
            startWith(state)
          )
        ),
        startWith(oldState)
      )
    }),
    distinctUntilChanged(),
    shareReplay({ refCount: true, bufferSize: 1})
  )

  select(
    state: RepetitionPageType,
    variant: RepetitionWordType['variants'][number],
  ) {
    if(state.selected || !state.current) {
      return
    }
    const queue = state.queue.slice(0);
    const incorrectIds = state.incorrectIds;

    if(state.timer === 0 || variant.type === 'incorrect') {
      incorrectIds.add(state.current.id);
      queue.push({ ...state.current })
    }
    if(variant.type === 'correct') {
      this.playSound('/correct.mp3').subscribe();
    }

    if(variant.type === 'incorrect') {
      this.playSound('/wrong.mp3').subscribe();
    }

    const current = queue.shift();

      this.setState({
        ...state,
        queue,
        current,
        selected: variant,
      });

      if(!current) {
        this.repetitionService.updateWords({
          correct: state.words.filter(item => !incorrectIds.has(item.id)),
          incorrect: state.words.filter(item => incorrectIds.has(item.id)),
        }).subscribe()
      }
  }

  protected activatedRouteStateMap(state: PageState<RepetitionWordType>) {
    return {
      ...state,
      selected: undefined,
      timer: undefined,
    }
  }
}
