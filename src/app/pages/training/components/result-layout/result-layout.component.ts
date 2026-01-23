import { ChangeDetectionStrategy, Component } from '@angular/core'

@Component({
  selector: 'dic-result-layout',
  templateUrl: 'result-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col w-full max-w-160 h-full'
  }
})
export class ResultLayoutComponent {}
