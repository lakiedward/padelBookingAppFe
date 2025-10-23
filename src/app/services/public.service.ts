import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CourtSummaryResponse, PublicAvailableTimeSlot, CourtResponse } from '../models/court.models';

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
}
