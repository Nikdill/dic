import { ChangeDetectionStrategy, Component, DestroyRef, DOCUMENT, inject } from '@angular/core'
import { MatIcon } from '@angular/material/icon'
import { MatFormField, MatInput, MatLabel } from '@angular/material/input'
import {
  MatActionList,
  MatListItem,
  MatListItemIcon,
  MatListItemLine,
  MatListItemTitle,
} from '@angular/material/list'
import { FirestoreService } from '../../core/firestore/firestore.service'
import { AsyncPipe } from '@angular/common'
import { BehaviorSubject, bufferCount, combineLatest, filter, fromEvent, map } from 'rxjs'
import { MatButton } from '@angular/material/button'
import { Dialog, DialogModule } from '@angular/cdk/dialog'
import { AddNewWordDialogComponent } from './add-new-word-dialog/add-new-word-dialog.component'
import { DicPlayButtonComponent } from './play-button/dic-play-button.component'
import { ScrollingModule } from '@angular/cdk/scrolling'

@Component({
  selector: 'dic-vocabulary',
  templateUrl: 'vocabulary.component.html',
  imports: [
    MatFormField,
    MatLabel,
    MatInput,
    AsyncPipe,
    MatListItem,
    MatButton,
    MatListItemTitle,
    MatListItemLine,
    DialogModule,
    MatListItemIcon,
    DicPlayButtonComponent,
    ScrollingModule,
    MatIcon,
    MatActionList,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VocabularyComponent {
  private readonly dialog = inject(Dialog);
  protected readonly firestoreService = inject(FirestoreService);
  protected readonly listOfWords$ = this.firestoreService.listOfWords$;
  protected readonly wordsCount$ = this.firestoreService.wordsCount$;
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
              && current.scrollY > current.scrollHeight - (current.scrollHeight * 0.2) - windowRef.innerHeight
          })
        )
        .subscribe(() => {
          this.firestoreService.nextPage();
        })
      this.destroyRef.onDestroy(() => {
        subscription.unsubscribe()
      });
    }
  }

  protected next() {
    this.firestoreService.nextPage();
  }

  protected onInput(event: Event) {
    this.firestoreService.search((event.currentTarget as HTMLInputElement).value);
  }

  protected addNewWord(inputElement: HTMLInputElement) {
    this.dialog.open(AddNewWordDialogComponent, {
      minWidth: '300px',
      data: {
        inputValue: inputElement.value.trim().toLowerCase()
      }
    });
    inputElement.value = '';
  }
}
