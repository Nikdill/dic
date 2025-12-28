import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import {
  MatAccordion,
  MatExpansionPanel, MatExpansionPanelDescription,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion'
import { MatIcon } from '@angular/material/icon'
import { MatFormField, MatInput, MatLabel } from '@angular/material/input'
import {
  MatActionList,
  MatList,
  MatListItem,
  MatListItemIcon,
  MatListItemLine,
  MatListItemTitle,
} from '@angular/material/list'
import { FirestoreService } from '../../core/firestore/firestore.service'
import { AsyncPipe } from '@angular/common'
import { BehaviorSubject, combineLatest, map, ReplaySubject } from 'rxjs'
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
  protected readonly inputValue = new BehaviorSubject('');
  protected readonly listOfWords$ = this.firestoreService.listOfWords$.pipe(map(list => {
    return list?.map(item => ({ ...item, translation: item.translations.join('; ')}))
  }));

  protected isShowAddBtn$ = combineLatest({
    inputValue: this.inputValue,
    list: this.firestoreService.listOfWords$
  }).pipe(
    map(({ list, inputValue}) => {
      return !!inputValue.length && !list?.some(item => item.word.trim().toLowerCase().startsWith(inputValue.trim().toLowerCase()))
    })
  );

  onInput(event: Event) {
    this.inputValue.next((event.currentTarget as HTMLInputElement).value.trim())
  }

  addNewWord() {
    this.dialog.open(AddNewWordDialogComponent, {
      minWidth: '300px',
      data: {
        inputValue: this.inputValue.value
      }
    })
  }

  protected trackByFn(_: number, item: { id: string }) {
    return item.id
  }
}
