import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const wildcardRedirectGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/auth']);
  }

  if (auth.isAdmin()) {
    return router.createUrlTree(['/admin']);
  }

  return router.createUrlTree(['/courts']);
};
