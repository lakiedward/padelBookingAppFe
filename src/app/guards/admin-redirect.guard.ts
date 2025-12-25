import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminRedirectGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn() && auth.isAdmin()) {
    console.warn('[adminRedirectGuard] Admin user trying to access user route, redirecting to /admin');
    return router.createUrlTree(['/admin']);
  }

  return true;
};
