import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

// Adjust this to use a central config if introduced later
const API_BASE = 'https://padelbookingappbe-production.up.railway.app';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();

  // Only attach to our backend requests
  const isApiCall = typeof req.url === 'string' && req.url.startsWith(API_BASE);

  if (token && isApiCall) {
    const authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
    return next(authReq);
  }

  return next(req);
};

