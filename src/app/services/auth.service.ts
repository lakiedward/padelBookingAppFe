import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { LoginRequest, AuthResponse, User } from '../models/auth.models';

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
  private apiUrl = 'https://padelbookingappbe-production.up.railway.app/api/auth';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    // Restore user from localStorage on init (SSR-safe)
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('user');
      if (stored) {
        try {
          const parsed: User = JSON.parse(stored);
          this.currentUserSubject.next(parsed);
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

  register(payload: { username: string; email: string; phoneNumber: string; password: string }): Observable<void> {
    return this.http
      .post<string>(`${this.apiUrl}/register`, payload, { responseType: 'text' as 'json' })
      .pipe(map(() => void 0));
  }

  private handleAuthSuccess(response: AuthResponse) {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem('token', response.token);
      const user: User = {
        username: response.username,
        email: response.email,
        roles: response.roles,
        profileImageUrl: response.profileImageUrl
      };
      localStorage.setItem('user', JSON.stringify(user));
      this.currentUserSubject.next(user);
      return;
    }
    // Non-browser fallback
    const user: User = {
      username: response.username,
      email: response.email,
      roles: response.roles,
      profileImageUrl: response.profileImageUrl
    };
    this.currentUserSubject.next(user);
  }

  logout(): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    this.currentUserSubject.next(null);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
      ? !!localStorage.getItem('token')
      : false;
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user ? user.roles.includes(role) : false;
  }

  isAdmin(): boolean {
    return this.hasRole('ROLE_ADMIN');
  }

  isUser(): boolean {
    return this.hasRole('ROLE_USER');
  }

  getToken(): string | null {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
      ? localStorage.getItem('token')
      : null;
  }
}
