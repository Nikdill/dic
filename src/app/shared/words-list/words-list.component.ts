import { ChangeDetectionStrategy, Component, input, TemplateRef } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'

@Component({
  selector: 'ul[dicWordsList]',
  templateUrl: 'words-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgTemplateOutlet,
  ],
  host: {
    class: 'flex flex-col gap-4 w-full text-base pe-2'
  }
})
export class WordsListComponent<T extends { id: string | number }> {
  readonly list = input.required<T[]>();
  readonly titleTemplate = input.required<TemplateRef<{ item: T }>>();
  readonly subTitleTemplate = input.required<TemplateRef<{ item: T }>>();
  readonly liLeftTemplateContent = input<TemplateRef<{ item: T }>>();
  readonly liRightContentTemplate = input<TemplateRef<{ item: T }>>();
}
