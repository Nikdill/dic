import { ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core'
import { AsyncPipe, NgTemplateOutlet } from '@angular/common'
import { MatIcon } from '@angular/material/icon'
import { TimerComponent } from '../repetition/timer/timer.component'
import { BehaviorSubject, endWith, map, shareReplay, switchMap, takeWhile, tap } from 'rxjs'
import { RecordType } from '../../../core/word.record'
import { ActivatedRoute } from '@angular/router'
import { Voice } from '../../../shared/voice'
import { MatFormField, MatInput } from '@angular/material/input'
import { PlaySoundFactory } from '../repetition/play-sound'

@Component({
  selector: 'dic-word-translation',
  templateUrl: 'word-translation.component.html',
  styleUrl: 'word-translation.component.scss',
  imports: [
    AsyncPipe,
    MatInput,
    MatFormField,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WordTranslationComponent {
  private readonly wordInputRef = viewChild<ElementRef<HTMLInputElement>>('wordInputRef')
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly playSound = PlaySoundFactory();
  private readonly voice = inject(Voice);
  private readonly list$ = this.activatedRoute.data.pipe(
    map(data => data['words'] as RecordType[]),
    map(list => list || []),
    shareReplay({ refCount: true, bufferSize: 1})
  );

  protected readonly wordCounter$ = new BehaviorSubject(0);

  protected readonly queue$ = this.list$.pipe(
    switchMap(list => {
      return this.wordCounter$.pipe(
        map(counter => list.at(counter)),
        takeWhile(Boolean),
        endWith(undefined)
      )
    }),
    tap(item => {
      if(item) {
        this.voice.play(item.word);
      }
    }),
    shareReplay({ refCount: true, bufferSize: 1})
  )

  clickHandler(item: RecordType, inputRef: HTMLInputElement) {
    const isSuccess = item.translations.find(translation => translation.trim().toLowerCase() === inputRef.value.trim().toLowerCase());
    this.wordCounter$.next(this.wordCounter$.value + 1);
    if(isSuccess) {
      this.playSound('/correct.mp3').subscribe();
    } else {
      this.playSound('/wrong.mp3').subscribe();
    }
    inputRef.value = '';
    inputRef.focus();
  }
}
