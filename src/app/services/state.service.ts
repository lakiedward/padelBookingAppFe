import { Injectable, signal, computed } from '@angular/core';
import { User } from '../models/auth.models';
import { CourtSummaryResponse } from '../models/court.models';

@Injectable({
  providedIn: 'root'
})
export class StateService {
  private readonly _currentUser = signal<User | null>(null);
  private readonly _isAuthenticated = signal<boolean>(false);

  public readonly currentUser = this._currentUser.asReadonly();
  public readonly isAuthenticated = this._isAuthenticated.asReadonly();

  public readonly isAdmin = computed(() => {
    const user = this._currentUser();
    return user ? user.roles.includes('ROLE_ADMIN') : false;
  });

  public readonly isUser = computed(() => {
    const user = this._currentUser();
    return user ? user.roles.includes('ROLE_USER') : false;
  });

  private readonly _courts = signal<CourtSummaryResponse[]>([]);
  private readonly _courtsLoading = signal<boolean>(false);
  private readonly _courtsError = signal<string | null>(null);

  public readonly courts = this._courts.asReadonly();
  public readonly courtsLoading = this._courtsLoading.asReadonly();
  public readonly courtsError = this._courtsError.asReadonly();

  public readonly courtsCount = computed(() => this._courts().length);

  private readonly _globalLoading = signal<boolean>(false);
  public readonly globalLoading = this._globalLoading.asReadonly();

  setUser(user: User | null): void {
    this._currentUser.set(user);
    this._isAuthenticated.set(user !== null);
  }

  clearUser(): void {
    this._currentUser.set(null);
    this._isAuthenticated.set(false);
    this._courts.set([]);
  }

  getCurrentUserValue(): User | null {
    return this._currentUser();
  }

  setCourts(courts: CourtSummaryResponse[]): void {
    this._courts.set(courts);
    this._courtsError.set(null);
  }

  addCourt(court: CourtSummaryResponse): void {
    this._courts.update(current => [...current, court]);
  }

  updateCourt(id: number, updatedCourt: CourtSummaryResponse): void {
    this._courts.update(current =>
      current.map(court => court.id === id ? updatedCourt : court)
    );
  }

  removeCourt(id: number): void {
    this._courts.update(current => current.filter(court => court.id !== id));
  }

  setCourtsLoading(loading: boolean): void {
    this._courtsLoading.set(loading);
  }

  setCourtsError(error: string | null): void {
    this._courtsError.set(error);
  }

  clearCourts(): void {
    this._courts.set([]);
    this._courtsError.set(null);
  }

  setGlobalLoading(loading: boolean): void {
    this._globalLoading.set(loading);
  }

  hasRole(role: string): boolean {
    const user = this._currentUser();
    return user ? user.roles.includes(role) : false;
  }

  getStateSnapshot() {
    return {
      user: this._currentUser(),
      isAuthenticated: this._isAuthenticated(),
      isAdmin: this.isAdmin(),
      isUser: this.isUser(),
      courtsCount: this.courtsCount(),
      courtsLoading: this._courtsLoading(),
      courtsError: this._courtsError(),
      globalLoading: this._globalLoading()
    };
  }
}
