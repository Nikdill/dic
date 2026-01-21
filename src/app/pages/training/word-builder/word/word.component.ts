import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DOCUMENT,
  HostListener,
  inject,
  input, OnChanges,
  output,
  signal, SimpleChange, SimpleChanges,
} from '@angular/core'
import { WordType } from '../../../../core/word.record'
import { asyncScheduler, fromEvent } from 'rxjs'

function mix(value: string[], result: string[] = []): string[] {
  const valueCopy = value.slice(0);
  if(!valueCopy.length) {
    return result;
  }
  const item = valueCopy.splice(Math.floor(Math.random() * valueCopy.length), 1)[0];
  if(item) {
    result.push(item)
  }

  return mix(valueCopy, result);
}

@Component({
  selector: 'dic-word',
  templateUrl: 'word.component.html',
  styleUrl: 'word.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col max-w-100 w-full items-center text-white',
    '(window:keydown)': 'globalClick($event)'
  }
})
export class WordComponent implements OnChanges {
  protected attempts = signal(4);
  protected doneCorrect = signal(false);
  protected doneIncorrect = signal(false);
  protected readonly mixedWord = computed(() => {
    return mix(this.word().word.split('').map((item, index, array) =>
      item
        .split('')
        .every(subItem => subItem == ' ')
        && (index !== 0 || index !== array.length - 1)
          ? ' '
          :  item.trim().toLowerCase()

    ))
  });
  protected readonly selectedLetterIndexes = signal<number[]>([]);
  protected readonly selectedLetterIndexesSync = signal<number[]>([]);
  protected readonly incorrectLetterIndexs = signal<number[]>([]);
  protected readonly correctLetterIndexs = signal<number[]>([]);

  protected readonly wordTitle = computed(() => {
    const mixedWord = this.mixedWord();
    return this.selectedLetterIndexesSync().map(index => mixedWord[index]).join('');
  })

  readonly word = input.required<WordType>();
  readonly doneChange = output<{ type: 'correct' | 'incorrect' | 'mistake' }>();

  ngOnChanges(changes: SimpleChanges<WordComponent>) {
    if(changes.word) {
      this.attempts.set(4);
      this.selectedLetterIndexesSync.set([]);
      this.doneCorrect.set(false);
      this.doneIncorrect.set(false);
      this.selectedLetterIndexes.set([]);
    }
  }

  protected letterClick(index: number) {
    if(this.attempts() === 0) {
      return
    }
    const newLetterIndexes = this.selectedLetterIndexesSync().concat(index);
    const newLetters = newLetterIndexes.map(index => this.mixedWord()[index]).filter(Boolean);
    const isCorrect = this.word().word.trim().toLowerCase().startsWith(newLetters.join(''));
    if(!isCorrect) {
      this.attempts.update(attemptsState => attemptsState - 1);
    }
    const isDone = isCorrect ? newLetterIndexes.length === this.mixedWord().length : this.attempts() === 0;
    const attempts = this.attempts();

    if(isCorrect) {
      this.selectedLetterIndexesSync.set(newLetterIndexes);
      this.correctLetterIndexs.update(indexes => indexes.concat(index));
      if(isDone) {
        this.attempts.set(0);
      }
    } else {
      this.incorrectLetterIndexs.update(indexes => indexes.concat(index));
      if(isDone) {
        const { indexes } = this.word().word.trim().toLowerCase().split('').reduce<{mixedWord: string[]; indexes: number[]}>(({mixedWord, indexes}, letter) => {
          const index = mixedWord.findIndex((item, index) => item === letter && !indexes.includes(index));
          if(index !== -1) {
            indexes.push(index)
          }

          return {
            mixedWord,
            indexes
          }
        }, {
          mixedWord: this.mixedWord().slice(0),
          indexes: [],
        })

        this.selectedLetterIndexesSync.set(indexes);
      }
    }

    asyncScheduler.schedule(() => {
      if(isCorrect) {
        this.correctLetterIndexs.set([]);
        this.selectedLetterIndexes.update(indexes => indexes.concat(index));
      } else {
        this.incorrectLetterIndexs.set([]);
      }
      if(isDone) {
        let type: 'incorrect' | 'mistake' | 'correct';
        if(attempts === 4) {
          type = 'correct' as const;
        } else if(attempts === 0) {
          type = 'incorrect' as const;
        } else {
          type = 'mistake' as const;;
        }

        this.doneChange.emit({
          type,
        });
        this.doneCorrect.set(type === 'correct' || type === 'mistake');
        this.doneIncorrect.set(type === 'incorrect');
      }
    }, 200);


  }

  protected globalClick(event: KeyboardEvent) {
    const key = event.key.toLowerCase();

    const index = this.mixedWord()
      .findIndex(
        (letter, index) => letter === key && !this.selectedLetterIndexesSync().includes(index)
      );
    if(index !== -1) {
      this.letterClick(index);
    }
  }
}
