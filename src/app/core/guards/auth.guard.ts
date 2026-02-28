import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isLoggedIn()) {
        return true;
    }

    // If we are currently in the middle of a sign-in process, wait for it
    if (authService.loading() || authService.isSigningIn()) {
        return new Promise<boolean>((resolve) => {
            const check = setInterval(() => {
                // Keep waiting as long as we are still loading OR signing in
                if (!authService.loading() && !authService.isSigningIn()) {
                    clearInterval(check);
                    if (authService.isLoggedIn()) {
                        resolve(true);
                    } else {
                        router.navigate(['/login']);
                        resolve(false);
                    }
                }
            }, 50);
        });
    }

    router.navigate(['/login']);
    return false;
};
