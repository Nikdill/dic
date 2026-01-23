import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { RouterLink } from '@angular/router'

@Component({
  selector: 'dic-result-actions',
  templateUrl: 'result-actions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
  ],
  host: {
    class: 'flex flex-col gap-2 w-full items-center',
  },
})
export class ResultActionsComponent {
  readonly continueLink = input.required<string>();
  readonly exitLink = input.required<string>();
}
