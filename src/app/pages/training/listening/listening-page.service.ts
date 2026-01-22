import { ElementRef, inject, Injectable, viewChild } from '@angular/core'
import {
  asyncScheduler, bufferCount,
  combineLatest, delay,
  distinctUntilChanged,
  filter,
  map,
  merge,
  Observable, of, scan,
  shareReplay, startWith,
  Subject, switchMap, take,
  tap,
} from 'rxjs'
import { WordType } from '../../../core/word.record'
import { ActivatedRoute } from '@angular/router'
import { Voice } from '../../../shared/voice'
import { PlaySoundFactory } from '../../../shared/play-sound'
import { ListeningService } from '../../../feature/training/listening/listening.service'

type ListeningType = {
  words: WordType[];
  queue: WordType[];
  current: WordType | undefined;
  selected: {
    type: 'correct' | 'incorrect';
    word: string;
    translation: string
  } | undefined;
  incorrectIds: Set<string>;
}

@Injectable()
export class ListeningPageService {
  private readonly listeningService = inject(ListeningService);
  private readonly voice = inject(Voice);
  private readonly playSound = PlaySoundFactory();
  private readonly words$: Observable<ListeningType> = inject(ActivatedRoute).data.pipe(
    map(data => data['words'] as WordType[]),
    filter(list => !!list.length),
    map(words => {
      const current = words.slice(0,1).shift();
      const queue = words.slice(1);
      return {
        words,
        queue,
        current,
        selected: undefined,
        incorrectIds: new Set<string>()
      }
    }),
    shareReplay({ refCount: true, bufferSize: 1})
  );

  private readonly listeningState = new Subject<ListeningType>();


  readonly listeningState$ = merge(
    this.words$,
    this.listeningState
  ).pipe(
    shareReplay({ refCount: true, bufferSize: 1})
  );

  readonly resultList$ = this.listeningState$.pipe(
    map(({ incorrectIds, words }) => {
      return words.map(item => {
        return {
          ...item,
          status: {
            inProgress: incorrectIds.has(item.id),
            new: false,
            done: !incorrectIds.has(item.id),
          }
        }
      })
    })
  )

  readonly queue$ = this.listeningState$.pipe(
    distinctUntilChanged((a, b) => a.current === b.current),
    startWith(undefined),
    bufferCount(2, 1),
    filter((state): state is [ListeningType | undefined, ListeningType] => !!state[1]),
    switchMap(([prevState, currentState]) => {
      if(!currentState.selected) {
        return of(currentState)
      }
      const newState = {
        ...currentState,
        selected: undefined
      }

      const oldState = {
        ...prevState,
        selected: currentState.selected
      }

      return of(newState).pipe(
        delay(currentState.selected.type === 'correct' ? 1500 : 3000),
        startWith(oldState)
      )
    }),
    shareReplay({ refCount: true, bufferSize: 1})
  )

  clickHandler(item: WordType, inputRef: HTMLDivElement) {
    const value = inputRef.innerText.trim().toLowerCase();
    if(!value.length) {
      return
    }
    this.queue$.pipe(
      take(1),
      filter(state => {
        return !state.selected
      })
    ).subscribe(state => {
      const isSuccess = item.word.trim().toLowerCase() === inputRef.innerText.trim().toLowerCase();
      const queue = state.queue.slice(0);
      const incorrectIds = state.incorrectIds;

      if(isSuccess) {
        this.playSound('/correct.mp3').subscribe();
      } else {
        this.playSound('/wrong.mp3').subscribe();
      }
      inputRef.focus();

      if(!isSuccess) {
        incorrectIds.add(item.id);
        queue.push({ ...item });
      }

      const current = queue.shift();

      this.listeningState.next({
        ...state,
        queue,
        current,
        selected: { type: isSuccess ? 'correct' : 'incorrect' as const, word: item.word, translation: item.translation }
      });

      if(!current) {
        this.listeningService.updateWords({
          correct: state.words.filter(item => !incorrectIds.has(item.id)),
          incorrect: state.words.filter(item => incorrectIds.has(item.id)),
        }).subscribe()
      }

    })
  }
}
