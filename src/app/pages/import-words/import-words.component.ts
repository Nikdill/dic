import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { MatFormField, MatInput, MatLabel } from '@angular/material/input'
import { MatCard, MatCardActions, MatCardContent } from '@angular/material/card'
import { MatButton } from '@angular/material/button'
import { ImportWordsService } from '../../feature/import-words/import-words.service'

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
  protected readonly importWordsService = inject(ImportWordsService);


  protected addWords(textAreaElement: HTMLTextAreaElement) {
    let words: { word: string; translations: string[]; status: number; createdAt: number }[] = [];
    try {
      words = JSON.parse(textAreaElement.value);
    } catch (e: unknown) {
      console.error(e);
    }
    if(words.length) {
      this.importWordsService.addWordsToList(words).subscribe(() => {
        textAreaElement.value = '';
      });
    }
  }
}
