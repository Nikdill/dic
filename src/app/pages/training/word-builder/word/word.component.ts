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
  readonly correctChange = output<string>();
  readonly incorrectChange = output<string>();
  readonly doneChange = output<void>();

  ngOnChanges(changes: SimpleChanges<WordComponent>) {
    if(changes.word) {
      this.attempts.set(4);
      this.selectedLetterIndexesSync.set([]);
      this.doneCorrect.set(false);
      this.doneIncorrect.set(false);
      this.selectedLetterIndexes.set([]);
    }
  }

  protected letterClick(letter: string, index: number) {
    if(this.attempts() === 0) {
      return
    }
    const newLetterIndexes = this.selectedLetterIndexesSync().concat(index);
    const newLetters = newLetterIndexes.map(index => this.mixedWord()[index]).filter(Boolean);
    const isCorrect = this.word().word.trim().toLowerCase().startsWith(newLetters.join(''));
    if(isCorrect) {
      this.selectedLetterIndexesSync.set(newLetterIndexes);
      this.correctLetterIndexs.update(indexes => indexes.concat(index));
      const isDone = newLetterIndexes.length === this.mixedWord().length;
      if(isDone) {
        this.attempts.set(0);
      }
      asyncScheduler.schedule(() => {
        if(isDone) {
          this.doneChange.emit();
          this.doneCorrect.set(true);
        }
        this.correctChange.emit(letter);
        this.correctLetterIndexs.set([]);
        this.selectedLetterIndexes.update(indexes => indexes.concat(index));
      }, 200);
    } else {

      this.incorrectLetterIndexs.update(indexes => indexes.concat(index));

      this.attempts.update(attempts => attempts - 1);

      const isDone = this.attempts() === 0;

      if(isDone) {
        this.doneIncorrect.set(true);
        this.selectedLetterIndexesSync.set(this.word().word.trim().split('').map((_, index) => index));
      }

      asyncScheduler.schedule(() => {
        if(isDone) {
          this.incorrectChange.emit(letter);
        }
        this.incorrectLetterIndexs.set([]);
      }, 200);
    }
  }

  protected globalClick(event: KeyboardEvent) {
    const key = event.key.toLowerCase();

    const index = this.mixedWord()
      .findIndex(
        (letter, index) => letter === key && !this.selectedLetterIndexesSync().includes(index)
      );
    if(index !== -1) {
      this.letterClick(key, index);
    }
  }
}
