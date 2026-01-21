import { ChangeDetectionStrategy, Component, input, output, TemplateRef } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'

@Component({
  selector: 'dic-results-list',
  templateUrl: 'results-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgTemplateOutlet,
  ],
  host: {
    class: 'w-full flex flex-col gap-4 h-full pb-4'
  }
})
export class ResultsListComponent<T extends { id: string | number }> {
  readonly list = input.required<T[]>();
  readonly titleTemplate = input.required<TemplateRef<{ item: T }>>();
  readonly subTitleTemplate = input.required<TemplateRef<{ item: T }>>();
  readonly liRightContentTemplate = input<TemplateRef<{ item: T }>>();

  readonly replayChange = output<void>();
  readonly exitChange = output<void>();
}
