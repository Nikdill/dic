import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DOCUMENT,
  HostListener,
  inject,
  input,
  output,
  signal,
} from '@angular/core'
import { RecordType } from '../../../../core/word.record'
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
    class: 'block',
    '(window:keydown)': 'globalClick($event)'
  }
})
export class WordComponent {
  private attempts = 4;
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
  protected readonly selectedLetters = signal<string[]>([]);
  protected readonly selectedLettersSync = signal<string[]>([]);
  protected readonly incorrectLetterIndexs = signal<number[]>([]);
  protected readonly correctLetterIndexs = signal<number[]>([]);

  protected readonly letters = computed(() => {
    const mixedWord = this.mixedWord();
    const selectedLetters = this.selectedLetters();

    return mixedWord.filter(letter => !selectedLetters.includes(letter))
  });

  protected readonly wordTitle = computed(() => {
    return this.selectedLettersSync().join('');
  })

  readonly word = input.required<RecordType>();
  readonly correctChange = output<string>();
  readonly incorrectChange = output<string>();
  readonly doneChange = output<void>();

  protected letterClick(letter: string, index: number) {
    const newLetters = this.selectedLettersSync().concat(letter);
    const isCorrect = this.word().word.trim().toLowerCase().startsWith(newLetters.join(''));
    if(isCorrect) {
      this.selectedLettersSync.set(newLetters);
      this.correctLetterIndexs.update(indexes => indexes.concat(index));
      asyncScheduler.schedule(() => {
        if(newLetters.length === this.mixedWord().length) {
          this.doneChange.emit();
        }
        this.correctChange.emit(letter);
        this.correctLetterIndexs.set([]);
        this.selectedLetters.set(newLetters);
      }, 500);
    } else {
      this.incorrectLetterIndexs.update(indexes => indexes.concat(index));;
      this.attempts--;
      asyncScheduler.schedule(() => {
        if(this.attempts <= 0) {
          this.incorrectChange.emit(letter);
        }
        this.incorrectLetterIndexs.set([]);
      }, 500);
    }
  }

  protected globalClick(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    const index = this.letters().findIndex(letter => letter === key);
    if(index !== -1) {
      this.letterClick(key, index);
    }
  }
}
