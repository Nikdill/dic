import { ChangeDetectionStrategy, Component, DestroyRef, DOCUMENT, inject } from '@angular/core'
import { MatIcon } from '@angular/material/icon'
import { AsyncPipe } from '@angular/common'
import { bufferCount, filter, fromEvent, map } from 'rxjs'
import { Dialog, DialogModule } from '@angular/cdk/dialog'
import { AddNewWordDialogComponent } from './add-new-word-dialog/add-new-word-dialog.component'
import { DicPlayButtonComponent } from './play-button/dic-play-button.component'
import { ScrollingModule } from '@angular/cdk/scrolling'
import { VocabularyService } from '../../feature/vocabulary/vocabulary.service'
import { NavigationComponent } from '../../shared/navigation/navigation.component'
import { WordStatusComponent } from '../../shared/word-status/word-status.component'
import { WordsListComponent } from '../../shared/words-list/words-list.component'
import { LayoutComponent } from '../../shared/layout/layout.component'

@Component({
  selector: 'dic-vocabulary',
  templateUrl: 'vocabulary.component.html',
  imports: [
    AsyncPipe,
    DialogModule,
    ScrollingModule,
    NavigationComponent,
    WordStatusComponent,
    WordsListComponent,
    LayoutComponent,
    MatIcon,
    DicPlayButtonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block min-h-full'
  }
})
export class VocabularyComponent {
  private readonly dialog = inject(Dialog);
  protected readonly vocabularyService = inject(VocabularyService);
  protected readonly listOfWords$ = this.vocabularyService.listOfWords$;
  protected readonly wordsCount$ = this.vocabularyService.wordsCount$;
  protected readonly documentRef  = inject(DOCUMENT);
  protected readonly destroyRef  = inject(DestroyRef);
  constructor() {
    if(this.documentRef.defaultView) {
      const windowRef = this.documentRef.defaultView;
      const subscription = fromEvent(windowRef, 'scroll')
        .pipe(
          map(() => {
          const scrollHeight = Math.max(
            this.documentRef.body.scrollHeight,
            this.documentRef.documentElement.scrollHeight,
            this.documentRef.body.offsetHeight,
            this.documentRef.documentElement.offsetHeight,
            this.documentRef.body.clientHeight,
            this.documentRef.documentElement.clientHeight
          );

          const scrollY = this.documentRef.defaultView?.scrollY || 0;

          return {
            scrollHeight,
            scrollY
          }
        }),
          bufferCount(2,1),
          filter(([prev, current]) => {
            return prev.scrollY < current.scrollY
              && current.scrollY > current.scrollHeight - windowRef.innerHeight - 300
          })
        )
        .subscribe(() => {
          this.vocabularyService.nextPage();
        })
      this.destroyRef.onDestroy(() => {
        subscription.unsubscribe()
      });
    }
  }

  protected onInput(event: Event) {
    this.vocabularyService.search((event.currentTarget as HTMLDivElement).innerText);
  }

  protected onEnter(event: Event, inputElement: HTMLDivElement) {
    event.preventDefault();
    this.addNewWord(inputElement);
  }


  protected addNewWord(inputElement: HTMLDivElement) {
    this.dialog.open(AddNewWordDialogComponent, {
      minWidth: '300px',
      data: {
        inputValue: inputElement.innerText.trim().toLowerCase()
      }
    }).componentRef?.onDestroy(() => {
      this.vocabularyService.search('');
      inputElement.innerText = '';
    });
  }
}
