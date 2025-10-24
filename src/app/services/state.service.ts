import { Injectable, signal, computed } from '@angular/core';
import { User } from '../models/auth.models';
import { CourtSummaryResponse } from '../models/court.models';

/**
 * Centralized state management service using Angular signals
 * Provides reactive global state for the entire application
 *
 * Features:
 * - User authentication state
 * - Courts data cache
 * - Loading states
 * - Error handling
 * - Computed values for derived state
 */
@Injectable({
  providedIn: 'root'
})
export class StateService {
  // ==================== USER STATE ====================
  private readonly _currentUser = signal<User | null>(null);
  private readonly _isAuthenticated = signal<boolean>(false);

  // Public readonly access
  public readonly currentUser = this._currentUser.asReadonly();
  public readonly isAuthenticated = this._isAuthenticated.asReadonly();

  // Computed role checks
  public readonly isAdmin = computed(() => {
    const user = this._currentUser();
    return user ? user.roles.includes('ROLE_ADMIN') : false;
  });

  public readonly isUser = computed(() => {
    const user = this._currentUser();
    return user ? user.roles.includes('ROLE_USER') : false;
  });

  // ==================== COURTS STATE ====================
  private readonly _courts = signal<CourtSummaryResponse[]>([]);
  private readonly _courtsLoading = signal<boolean>(false);
  private readonly _courtsError = signal<string | null>(null);

  // Public readonly access
  public readonly courts = this._courts.asReadonly();
  public readonly courtsLoading = this._courtsLoading.asReadonly();
  public readonly courtsError = this._courtsError.asReadonly();

  // Computed courts count
  public readonly courtsCount = computed(() => this._courts().length);

  // ==================== GLOBAL LOADING STATE ====================
  private readonly _globalLoading = signal<boolean>(false);
  public readonly globalLoading = this._globalLoading.asReadonly();

  // ==================== USER STATE ACTIONS ====================

  /**
   * Set current user and update authentication state
   */
  setUser(user: User | null): void {
    this._currentUser.set(user);
    this._isAuthenticated.set(user !== null);
    console.log('[StateService] User updated:', user ? user.username : 'null');
  }

  /**
   * Clear user state (logout)
   */
  clearUser(): void {
    this._currentUser.set(null);
    this._isAuthenticated.set(false);
    this._courts.set([]);
    console.log('[StateService] User cleared (logout)');
  }

  /**
   * Get current user value (non-reactive)
   */
  getCurrentUserValue(): User | null {
    return this._currentUser();
  }

  // ==================== COURTS STATE ACTIONS ====================

  /**
   * Set courts data
   */
  setCourts(courts: CourtSummaryResponse[]): void {
    this._courts.set(courts);
    this._courtsError.set(null);
    console.log(`[StateService] Courts updated: ${courts.length} items`);
  }

  /**
   * Add a new court to the list
   */
  addCourt(court: CourtSummaryResponse): void {
    this._courts.update(current => [...current, court]);
    console.log('[StateService] Court added:', court.name);
  }

  /**
   * Update an existing court
   */
  updateCourt(id: number, updatedCourt: CourtSummaryResponse): void {
    this._courts.update(current =>
      current.map(court => court.id === id ? updatedCourt : court)
    );
    console.log('[StateService] Court updated:', id);
  }

  /**
   * Remove a court from the list
   */
  removeCourt(id: number): void {
    this._courts.update(current => current.filter(court => court.id !== id));
    console.log('[StateService] Court removed:', id);
  }

  /**
   * Set courts loading state
   */
  setCourtsLoading(loading: boolean): void {
    this._courtsLoading.set(loading);
  }

  /**
   * Set courts error state
   */
  setCourtsError(error: string | null): void {
    this._courtsError.set(error);
    if (error) {
      console.error('[StateService] Courts error:', error);
    }
  }

  /**
   * Clear courts state
   */
  clearCourts(): void {
    this._courts.set([]);
    this._courtsError.set(null);
    console.log('[StateService] Courts cleared');
  }

  // ==================== GLOBAL LOADING ACTIONS ====================

  /**
   * Set global loading state (for app-wide loading indicators)
   */
  setGlobalLoading(loading: boolean): void {
    this._globalLoading.set(loading);
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    const user = this._currentUser();
    return user ? user.roles.includes(role) : false;
  }

  /**
   * Get snapshot of entire state (for debugging)
   */
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
