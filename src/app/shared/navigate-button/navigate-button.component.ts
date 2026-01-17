import { ChangeDetectionStrategy, Component } from '@angular/core'

@Component({
  selector: 'dic-navigate-button',
  templateUrl: 'navigate-button.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex items-center justify-center rounded-xl text-3xl p-10'
  }
})
export class NavigateButtonComponent {}
