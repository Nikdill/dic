import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { AuthService } from '../../core/auth/auth.service'
import { Router } from '@angular/router'

@Component({
  selector: 'dic-auth',
  templateUrl: 'auth.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'fixed inset-0 flex items-center justify-center'
  }
})
export class AuthComponent {
  private readonly router = inject(Router);
  protected readonly authService = inject(AuthService);

  protected signIn() {
    this.authService.googleSignIn().then(() => {
      this.router.navigateByUrl('/vocabulary');
    });
  }
}
