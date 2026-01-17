import { ChangeDetectionStrategy, Component } from '@angular/core'
import { RouterLink } from '@angular/router'
import { NavigateButtonComponent } from '../../shared/navigate-button/navigate-button.component'
import { NavigationComponent } from '../../shared/navigation/navigation.component'

@Component({
  selector: 'dic-training',
  templateUrl: 'training.component.html',
  imports: [
    RouterLink,
    NavigateButtonComponent,
    NavigationComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingComponent {

}
