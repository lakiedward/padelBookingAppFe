import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { LoginRequest, AuthResponse, User, GoogleLoginRequest } from '../models/auth.models';
import { environment } from '../../environments/environment';
import { StateService } from './state.service';

export interface RegisterRequest {
  username: string;
  email: string;
  phoneNumber: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiBaseUrl}/api/auth`;
  private readonly apiBase = environment.apiBaseUrl;
  private readonly http = inject(HttpClient);
  private readonly stateService = inject(StateService);

  // Expose state service signals (use with $ suffix to avoid naming conflicts)
  public readonly currentUser$ = this.stateService.currentUser;
  public readonly isAuthenticated$ = this.stateService.isAuthenticated;
  public readonly isAdmin$ = this.stateService.isAdmin;
  public readonly isUser$ = this.stateService.isUser;

  constructor() {
    // Restore user from localStorage on init (SSR-safe)
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('user');
      if (stored) {
        try {
          const parsed: User = JSON.parse(stored);
          const normalized: User = {
            ...parsed,
            profileImageUrl: this.toAbsoluteUrl(parsed.profileImageUrl)
          };
          this.stateService.setUser(normalized);
          if (normalized.profileImageUrl !== parsed.profileImageUrl) {
            localStorage.setItem('user', JSON.stringify(normalized));
          }
        } catch {
          // ignore parse errors
        }
      }
    }
  }

  login(email: string, password: string): Observable<AuthResponse> {
    const loginRequest: LoginRequest = { email, password };

    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, loginRequest)
      .pipe(
        tap(response => this.handleAuthSuccess(response))
      );
  }

  loginWithGoogle(idToken: string): Observable<AuthResponse> {
    const payload: GoogleLoginRequest = { idToken };

    return this.http.post<AuthResponse>(`${this.apiUrl}/google`, payload)
      .pipe(
        tap(response => this.handleAuthSuccess(response))
      );
  }

  register(payload: { username: string; email: string; phoneNumber: string; password: string }): Observable<void> {
    return this.http
      .post<string>(`${this.apiUrl}/register`, payload, { responseType: 'text' as 'json' })
      .pipe(map(() => void 0));
  }

  private handleAuthSuccess(response: AuthResponse) {
    const user: User = {
      username: response.username,
      email: response.email,
      roles: response.roles,
      profileImageUrl: this.toAbsoluteUrl(response.profileImageUrl)
    };

    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(user));
    }

    this.stateService.setUser(user);
  }

  logout(): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    this.stateService.clearUser();
  }

  getCurrentUser(): User | null {
    return this.stateService.getCurrentUserValue();
  }

  isLoggedIn(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
      ? !!localStorage.getItem('token')
      : false;
  }

  hasRole(role: string): boolean {
    return this.stateService.hasRole(role);
  }

  /**
   * Helper method to check admin role (reads from signal)
   * For reactive UI, use isAdmin$ signal instead
   */
  isAdmin(): boolean {
    return this.stateService.isAdmin();
  }

  /**
   * Helper method to check user role (reads from signal)
   * For reactive UI, use isUser$ signal instead
   */
  isUser(): boolean {
    return this.stateService.isUser();
  }

  getToken(): string | null {
    const token = typeof window !== 'undefined' && typeof localStorage !== 'undefined'
      ? localStorage.getItem('token')
      : null;
    console.log('[AuthService] getToken() called, hasToken:', !!token, 'tokenPreview:', token ? token.substring(0, 20) + '...' : 'none');
    return token;
  }

  private toAbsoluteUrl(path?: string | null): string | undefined {
    if (!path) return undefined;
    if (/^https?:\/\//i.test(path)) return path;
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${this.apiBase}${normalized}`;
  }
}
