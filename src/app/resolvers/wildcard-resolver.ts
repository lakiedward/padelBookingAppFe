import { inject } from '@angular/core';
import { ResolveFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { of } from 'rxjs';

export const wildcardResolver: ResolveFn<boolean> = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    router.navigate(['/auth']);
  } else if (auth.isAdmin()) {
    router.navigate(['/admin']);
  } else {
    router.navigate(['/courts']);
  }

  return of(true);
};
