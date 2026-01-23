import { inject, Injectable } from '@angular/core'
import {
  delay,
  of,
  shareReplay, startWith,
  switchMap,
} from 'rxjs'
import { WordType } from '../../../core/word.record'
import { WordBuilderService } from '../../../feature/training/word-builder/word-builder.service'
import { PageService, PageState } from '../page.service'

export type WordBuilderPageType = {
  words: WordType[];
  queue: WordType[];
  current: WordType | undefined;
  selected: {
    type: 'correct' | 'incorrect';
    word: string;
    translation: string;
  } | undefined;
  incorrectIds: Set<string>;
}

@Injectable()
export class WordBuilderPageService extends PageService<WordBuilderPageType> {
  private readonly wordBuilderService = inject(WordBuilderService);

  readonly page$ = this.pageState$.pipe(
    switchMap(([prevState, currentState]) => {
      if(!currentState.selected || !prevState) {
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

  select(state: WordBuilderPageType, args: { type: 'correct' | 'incorrect' | 'mistake' }) {
    if(state.selected || !state.current) {
      return
    }
      const queue = state.queue.slice(0);
      const incorrectIds = state.incorrectIds;

      let selected: WordBuilderPageType['selected'];

     switch (args.type) {
       case "correct":
         selected = { type: 'correct' as const, word: state.current.word, translation: state.current.translation };
         break;
       case "incorrect":
         incorrectIds.add(state.current.id);
         queue.push({ ...state.current });
         selected = { type: 'incorrect' as const, word: state.current.word, translation: state.current.translation };
         break;
       case "mistake":
         incorrectIds.add(state.current.id);
         selected = { type: 'correct' as const, word: state.current.word, translation: state.current.translation };
     }

      const current = queue.shift();

      this.setState({
        ...state,
        queue,
        current,
        selected: selected,
      });

      if(!current) {
        this.wordBuilderService.updateWords({
          correct: state.words.filter(item => !incorrectIds.has(item.id)),
          incorrect: state.words.filter(item => incorrectIds.has(item.id)),
        }).subscribe()
      }
  }

  protected override activatedRouteStateMap(state: PageState<WordType>): WordBuilderPageType {
      return {
        ...state,
        selected: undefined,
      }
  }
}
