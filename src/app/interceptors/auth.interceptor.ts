import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

// Use environment config
const API_BASE = environment.apiBaseUrl;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();

  // Only attach to our backend requests
  const isApiCall = typeof req.url === 'string' && req.url.startsWith(API_BASE);

  console.log('[AuthInterceptor]', {
    url: req.url,
    isApiCall,
    hasToken: !!token,
    tokenPreview: token ? token.substring(0, 20) + '...' : 'none'
  });

  if (token && isApiCall) {
    const authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
    console.log('[AuthInterceptor] Added Authorization header');
    return next(authReq);
  }

  if (isApiCall && !token) {
    console.warn('[AuthInterceptor] API call without token!');
  }

  return next(req);
};

