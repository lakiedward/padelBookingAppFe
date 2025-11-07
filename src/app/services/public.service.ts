import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CourtSummaryResponse, PublicAvailableTimeSlot, CourtResponse } from '../models/court.models';
import { SlotsForDateResponse } from '../models/booking.models';
import { EventSummaryResponse } from '../models/event.models';

@Injectable({ providedIn: 'root' })
export class PublicService {
  private apiBase = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getPublicCourts(): Observable<CourtSummaryResponse[]> {
    return this.http.get<CourtSummaryResponse[]>(`${this.apiBase}/api/public/courts`);
  }

  getAvailableTimeSlotsByCourt(courtId: number): Observable<PublicAvailableTimeSlot[]> {
    return this.http.get<PublicAvailableTimeSlot[]>(`${this.apiBase}/api/public/timeslots/available/court/${courtId}`);
  }

  getPublicCourtById(courtId: number): Observable<CourtResponse> {
    return this.http.get<CourtResponse>(`${this.apiBase}/api/public/courts/${courtId}`);
  }

  /**
   * Get ALL time slots (available + unavailable) for a court on a specific date
   * Used to show which slots are free and which are occupied
   */
  getAllTimeSlotsByCourtAndDate(courtId: number, date: string): Observable<SlotsForDateResponse> {
    const params = new HttpParams().set('date', date);
    return this.http.get<SlotsForDateResponse>(`${this.apiBase}/api/public/courts/${courtId}/slots`, { params });
  }

  getPublicEvents(): Observable<EventSummaryResponse[]> {
    return this.http.get<EventSummaryResponse[]>(`${this.apiBase}/api/public/events`);
  }

  toAbsoluteUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${this.apiBase}${normalized}`;
  }
}
