import { inject, Injectable } from '@angular/core'
import {
  bufferCount,
  distinctUntilChanged,
  filter,
  map,
  merge,
  of,
  shareReplay,
  startWith,
  Subject,
  switchMap,
} from 'rxjs'
import { ActivatedRoute } from '@angular/router'

export type PageState<Word> = {
  incorrectIds: Set<string>;
  words: Word[];
  queue: Word[];
  current: Word | undefined
};

@Injectable()
export abstract class PageService<State extends PageState<Word>, Word extends { id: string } = { id: string }> {
  protected readonly activatedRouteState$ = inject(ActivatedRoute).data.pipe(
    map(data => data['words'] as Word[]),
    map(words => {
      const current = words.slice(0,1).shift();
      const queue = words.slice(1);
      return this.activatedRouteStateMap({
        words,
        queue,
        current,
        incorrectIds: new Set<string>()
      })
    }),
    shareReplay({ refCount: true, bufferSize: 1})
  );

  private readonly state = new Subject<State>();

  private readonly state$ = merge(
    this.activatedRouteState$,
    this.state
  ).pipe(
    shareReplay({ refCount: true, bufferSize: 1})
  );

  readonly resultList$ = this.state$.pipe(
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
    }),
    shareReplay({ refCount: true, bufferSize: 1})
  )

  readonly pageState$ = this.state$.pipe(
    distinctUntilChanged((a, b) => a.current === b.current),
    startWith(undefined),
    bufferCount(2, 1),
    filter((state): state is [State | undefined, State] => !!state[1]),
    shareReplay({ refCount: true, bufferSize: 1})
  );

  protected setState(state: State) {
    this.state.next(state);
  }

  protected abstract activatedRouteStateMap(state: PageState<Word>): State
}
