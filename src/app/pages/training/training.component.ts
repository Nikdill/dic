import { ChangeDetectionStrategy, Component } from '@angular/core'
import { RouterLink } from '@angular/router'
import { NavigateButtonComponent } from '../../shared/navigate-button/navigate-button.component'
import { NavigationComponent } from '../../shared/navigation/navigation.component'
import { LayoutComponent } from '../../shared/layout/layout.component'

@Component({
  selector: 'dic-training',
  templateUrl: 'training.component.html',
  imports: [
    RouterLink,
    NavigateButtonComponent,
    NavigationComponent,
    LayoutComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block min-h-full'
  }
})
export class TrainingComponent {

}
