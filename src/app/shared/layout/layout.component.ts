import { ChangeDetectionStrategy, Component } from '@angular/core'

@Component({
  selector: 'dic-layout',
  templateUrl: 'layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block px-2 max-w-260 m-auto min-h-full'
  }
})
export class LayoutComponent {}
