import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

import { FadeUpDirective } from '../../../shared/directives/fade-up.directive';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FadeUpDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  authService = inject(AuthService);


}
