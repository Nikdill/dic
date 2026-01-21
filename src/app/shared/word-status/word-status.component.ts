import { ChangeDetectionStrategy, Component, input } from '@angular/core'

@Component({
  selector: 'dic-word-status',
  templateUrl: 'word-status.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'rounded-full w-4 h-4 shrink-0',
    '[class.bg-gray-200]':"status().new",
    '[class.bg-yellow-200]':"status().inProgress",
    '[class.bg-green-300]':"status().done"
  }
})
export class WordStatusComponent {
  readonly status = input.required<{ inProgress?: boolean; done?: boolean; new?: boolean }>()
}
