import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../../shared/components/toast/toast.service';

/** Allows both authenticated users AND guests. Blocks only if fully unauthenticated. */
export const authOrGuestGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.currentUser() || authService.isGuest()) return true;

    if (authService.loading()) {
        return new Promise<boolean>((resolve) => {
            const check = setInterval(() => {
                if (!authService.loading()) {
                    clearInterval(check);
                    if (authService.currentUser() || authService.isGuest()) {
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

/** Requires a real account. Sends guests to login with a toast. */
export const authOnlyGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const toastService = inject(ToastService);

    if (authService.currentUser()) return true;

    if (authService.isGuest()) {
        toastService.show('Sign in to access this feature 🔐', 'error');
        router.navigate(['/login']);
        return false;
    }

    if (authService.loading()) {
        return new Promise<boolean>((resolve) => {
            const check = setInterval(() => {
                if (!authService.loading()) {
                    clearInterval(check);
                    if (authService.currentUser()) {
                        resolve(true);
                    } else {
                        if (authService.isGuest()) {
                            toastService.show('Sign in to access this feature 🔐', 'error');
                        }
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
