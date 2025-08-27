import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoginRequest, AuthResponse, User } from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'https://padelbookingappbe-production.up.railway.app/api/auth';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
  }

  login(email: string, password: string): Observable<AuthResponse> {
    const loginRequest: LoginRequest = { email, password };

    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, loginRequest)
      .pipe(
        tap(response => {
          if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
            localStorage.setItem('token', response.token);
          }
          const user: User = {
            username: response.username,
            email: response.email,
            roles: response.roles,
            profileImageUrl: response.profileImageUrl
          };
          this.currentUserSubject.next(user);
        })
      );
  }

  logout(): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem('token');
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

  getToken(): string | null {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
      ? localStorage.getItem('token')
      : null;
  }
}
