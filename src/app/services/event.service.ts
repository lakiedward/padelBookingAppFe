import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  EventResponse,
  EventSummaryResponse,
  CreateEventRequest,
  UpdateEventRequest
} from '../models/event.models';

@Injectable({ providedIn: 'root' })
export class EventService {
  private apiBase = environment.apiBaseUrl;
  private eventsUrl = `${this.apiBase}/api/admin/events`;

  constructor(private http: HttpClient) {}

  getEvents(): Observable<EventSummaryResponse[]> {
    return this.http.get<EventSummaryResponse[]>(this.eventsUrl);
  }

  getEventById(id: number): Observable<EventResponse> {
    return this.http.get<EventResponse>(`${this.eventsUrl}/${id}`);
  }

  getEventsBySport(sportKey: string): Observable<EventSummaryResponse[]> {
    return this.http.get<EventSummaryResponse[]>(`${this.eventsUrl}/sport/${sportKey}`);
  }

  createEvent(details: CreateEventRequest, coverImage?: File): Observable<EventResponse> {
    const formData = this.buildEventFormData(details, coverImage);
    return this.http.post<EventResponse>(this.eventsUrl, formData);
  }

  updateEvent(id: number, details: UpdateEventRequest, coverImage?: File): Observable<EventResponse> {
    const formData = this.buildEventFormData(details, coverImage, true);
    return this.http.put<EventResponse>(`${this.eventsUrl}/${id}`, formData);
  }

  deleteEvent(id: number): Observable<any> {
    return this.http.delete(`${this.eventsUrl}/${id}`);
  }

  private buildEventFormData(
    details: CreateEventRequest | UpdateEventRequest,
    coverImage?: File,
    isUpdate: boolean = false
  ): FormData {
    const formData = new FormData();

    const backendDetails = {
      name: details.name,
      description: details.description || null,
      eventType: details.eventType,
      sportKey: details.sportKey,
      format: details.format,
      startDate: this.formatDate(details.startDate),
      endDate: this.formatDate(details.endDate),
      registrationDeadline: details.registrationDeadline ? this.formatDate(details.registrationDeadline) : null,
      maxParticipants: details.maxParticipants,
      price: details.price,
      courtIds: details.courtIds,
      ...(isUpdate && 'status' in details ? { status: (details as UpdateEventRequest).status } : {})
    };

    formData.append('details', JSON.stringify(backendDetails));

    if (coverImage) {
      formData.append('coverImage', coverImage);
    }

    return formData;
  }

  private formatDate(dateValue: string | Date): string {
    if (typeof dateValue === 'string') {
      return dateValue;
    }
    const d = dateValue;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  toAbsoluteUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${this.apiBase}${normalized}`;
  }
}
