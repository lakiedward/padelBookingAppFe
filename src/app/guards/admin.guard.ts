import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard pentru protecția rutelor care necesită rol de ADMIN.
 * Verifică autentificare + rol ROLE_ADMIN.
 * Redirecționează:
 * - utilizatorii neautentificați → /auth
 * - utilizatorii autentificați fără rol admin → /user
 */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    console.warn('[adminGuard] User not authenticated, redirecting to /auth');
    return router.createUrlTree(['/auth']);
  }

  if (!auth.isAdmin()) {
    console.warn('[adminGuard] User is not admin, redirecting to /user');
    return router.createUrlTree(['/user']);
  }

  return true;
};
