import { ChangeDetectionStrategy, Component } from '@angular/core'
import { RouterLink, RouterLinkActive } from '@angular/router'

@Component({
  selector: 'dic-navigation',
  templateUrl: 'navigation.component.html',
  styleUrl: 'navigation.component.scss',
  imports: [
    RouterLink,
    RouterLinkActive,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavigationComponent {

}
