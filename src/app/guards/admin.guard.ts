import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    console.warn('[adminGuard] User not authenticated, redirecting to /auth');
    return router.createUrlTree(['/auth']);
  }

  if (!auth.isAdmin()) {
    console.warn('[adminGuard] User is not admin, redirecting to /courts');
    return router.createUrlTree(['/courts']);
  }

  return true;
};
