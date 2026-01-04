import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface JoinEventRequest {
  paymentMethod?: 'CARD' | 'CASH';
}

export interface JoinEventResponse {
  success: boolean;
  message: string;
}

export interface UserEventParticipation {
  id: number;
  eventId: number;
  eventName: string;
  format: string;
  sportKey: string;
  startDate: string;
  endDate: string;
  clubName: string;
  coverImageUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private apiBase = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  joinEvent(eventId: number, paymentMethod?: 'CARD' | 'CASH'): Observable<JoinEventResponse> {
    const body: JoinEventRequest = paymentMethod ? { paymentMethod } : {};
    return this.http.post<JoinEventResponse>(
      `${this.apiBase}/api/user/events/${eventId}/join`,
      body,
      { headers: this.getAuthHeaders() }
    );
  }

  getMyEvents(): Observable<UserEventParticipation[]> {
    return this.http.get<UserEventParticipation[]>(
      `${this.apiBase}/api/user/events/my-events`,
      { headers: this.getAuthHeaders() }
    );
  }

  private getAuthHeaders(): HttpHeaders {
    const hasWindow = typeof window !== 'undefined';
    const hasLocalStorage = hasWindow && typeof localStorage !== 'undefined';

    if (!hasLocalStorage) {
      return new HttpHeaders({
        'Content-Type': 'application/json'
      });
    }

    let token: string | null = null;
    try {
      token = localStorage.getItem('token');
    } catch {}

    if (!token) {
      return new HttpHeaders({
        'Content-Type': 'application/json'
      });
    }

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }
}
