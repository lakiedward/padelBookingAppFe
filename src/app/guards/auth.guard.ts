import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard pentru protecția rutelor care necesită autentificare.
 * Redirecționează utilizatorii neautentificați către /auth.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    console.warn('[authGuard] User not authenticated, redirecting to /auth');
    return router.createUrlTree(['/auth']);
  }

  return true;
};
