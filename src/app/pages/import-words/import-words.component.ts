import { ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core'
import { MatFormField, MatInput, MatLabel } from '@angular/material/input'
import { Dialog, DIALOG_DATA } from '@angular/cdk/dialog'
import { MatCard, MatCardActions, MatCardContent } from '@angular/material/card'
import { MatButton } from '@angular/material/button'
import { BehaviorSubject } from 'rxjs'
import { FirestoreService } from '../../core/firestore/firestore.service'

@Component({
  selector: 'dic-import-words-dialog',
  templateUrl: 'import-words.component.html',
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
export class ImportWordsComponent {
  protected readonly firestoreService = inject(FirestoreService);


  protected addWords(textAreaElement: HTMLTextAreaElement) {
    let words: { word: string; translations: string[]; status: number; createdAt: number }[] = [];
    try {
      words = JSON.parse(textAreaElement.value);
      words = words.map(item => ({ ...item, status: 0}))
    } catch (e: unknown) {
      console.error(e);
    }
    if(words.length) {
      this.firestoreService.addWordsToList(words).subscribe(() => {
        textAreaElement.value = '';
      });
    }
  }
}
