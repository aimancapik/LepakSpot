import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const decide = () => {
        if (authService.currentUser()?.isAdmin) return true;
        router.navigate(['/home']);
        return false;
    };

    if (!authService.loading()) return decide();

    return new Promise<boolean>((resolve) => {
        const check = setInterval(() => {
            if (!authService.loading()) {
                clearInterval(check);
                resolve(decide());
            }
        }, 50);
    });
};
