import { ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core'
import { MatFormField, MatInput, MatLabel } from '@angular/material/input'
import { DIALOG_DATA } from '@angular/cdk/dialog'
import { MatCard, MatCardActions, MatCardContent } from '@angular/material/card'
import { MatButton } from '@angular/material/button'
import { BehaviorSubject } from 'rxjs'
import { FirestoreService } from '../../../core/firestore/firestore.service'

@Component({
  selector: 'dic-add-new-word-dialog',
  templateUrl: 'add-new-word-dialog.component.html',
  imports: [
    MatFormField,
    MatInput,
    MatLabel,
    MatCard,
    MatCardActions,
    MatButton,
    MatCardContent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddNewWordDialogComponent {
  private readonly wordInputRef = viewChild.required<ElementRef<HTMLInputElement>>('wordInputRef');
  private readonly translationInputRef = viewChild.required<ElementRef<HTMLInputElement>>('translationInputRef');
  protected readonly data = inject<{ inputValue: string }>(DIALOG_DATA);
  protected readonly firestoreService = inject(FirestoreService);

  protected addNewWord() {
    this.firestoreService.addWordToList({
      word: this.wordInputRef().nativeElement.value,
      translation: this.translationInputRef().nativeElement.value,
    }).subscribe(() => {
      this.wordInputRef().nativeElement.value = '';
      this.translationInputRef().nativeElement.value = '';
    })
  }
}
