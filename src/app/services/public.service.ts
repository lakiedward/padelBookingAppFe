import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { CourtSummaryResponse, PublicAvailableTimeSlot, CourtResponse } from '../models/court.models';
import { SlotsForDateResponse } from '../models/booking.models';
import { EventSummaryResponse } from '../models/event.models';
import { ClubDetails } from '../models/club.models';

@Injectable({ providedIn: 'root' })
export class PublicService {
  private apiBase = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getPublicCourts(): Observable<CourtSummaryResponse[]> {
    return this.http.get<CourtSummaryResponse[]>(`${this.apiBase}/api/public/courts`);
  }
  
  getPublicClubs(): Observable<ClubDetails[]> {
    return this.http.get<ClubDetails[]>(`${this.apiBase}/api/public/clubs`).pipe(
      map(clubs => clubs.map(club => ({
        ...club,
        profileImageUrl: this.toAbsoluteUrl(club.profileImageUrl),
        wallpaperImageUrl: this.toAbsoluteUrl(club.wallpaperImageUrl)
      })))
    );
  }

  getPublicClubById(clubId: number): Observable<ClubDetails> {
    return this.http.get<ClubDetails>(`${this.apiBase}/api/public/clubs/${clubId}`).pipe(
      map(club => ({
        ...club,
        profileImageUrl: this.toAbsoluteUrl(club.profileImageUrl),
        wallpaperImageUrl: this.toAbsoluteUrl(club.wallpaperImageUrl)
      }))
    );
  }

  getAvailableTimeSlotsByCourt(courtId: number): Observable<PublicAvailableTimeSlot[]> {
    return this.http.get<PublicAvailableTimeSlot[]>(`${this.apiBase}/api/public/timeslots/available/court/${courtId}`);
  }

  getPublicCourtById(courtId: number): Observable<CourtResponse> {
    return this.http.get<CourtResponse>(`${this.apiBase}/api/public/courts/${courtId}`);
  }

  getAllTimeSlotsByCourtAndDate(courtId: number, date: string): Observable<SlotsForDateResponse> {
    const params = new HttpParams().set('date', date);
    return this.http.get<SlotsForDateResponse>(`${this.apiBase}/api/public/courts/${courtId}/slots`, { params });
  }

  getPublicEvents(): Observable<EventSummaryResponse[]> {
    return this.http.get<EventSummaryResponse[]>(`${this.apiBase}/api/public/events`);
  }

  getPublicCourtsByClubId(clubId: string | number): Observable<CourtSummaryResponse[]> {
    return this.http.get<CourtSummaryResponse[]>(`${this.apiBase}/api/public/clubs/${clubId}/courts`);
  }

  getPublicEventsByClubId(clubId: string | number): Observable<EventSummaryResponse[]> {
    return this.http.get<EventSummaryResponse[]>(`${this.apiBase}/api/public/clubs/${clubId}/events`);
  }

  getPublicEventById(eventId: string | number): Observable<EventSummaryResponse> {
    return this.http.get<EventSummaryResponse>(`${this.apiBase}/api/public/events/${eventId}`);
  }

  getClubProfileImageUrl(clubId: string | number): string {
    return `${this.apiBase}/api/public/clubs/${clubId}/profile-image`;
  }

  getClubWallpaperImageUrl(clubId: string | number): string {
    return `${this.apiBase}/api/public/clubs/${clubId}/wallpaper-image`;
  }

  getCourtPhotoUrl(courtId: number): string {
    return `${this.apiBase}/api/public/courts/photos/${courtId}`;
  }

  toAbsoluteUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${this.apiBase}${normalized}`;
  }
}
