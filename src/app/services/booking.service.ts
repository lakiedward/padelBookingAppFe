import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CreateBookingRequest,
  BookingSummaryResponse,
  AdminBookingResponse,
  RescheduleCourtOptionsResponse,
  AdminBookingDetailsResponse
} from '../models/booking.models';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private apiBase = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  createBooking(timeSlotId: number): Observable<BookingSummaryResponse> {
    const request: CreateBookingRequest = { timeSlotId };
    return this.http.post<BookingSummaryResponse>(
      `${this.apiBase}/api/bookings`,
      request,
      { headers: this.getAuthHeaders() }
    );
  }

  getAdminBookingDetails(bookingId: number): Observable<AdminBookingDetailsResponse> {
    return this.http.get<AdminBookingDetailsResponse>(
      `${this.apiBase}/api/admin/bookings/${bookingId}/details`,
      { headers: this.getAuthHeaders() }
    );
  }

  getMyBookings(): Observable<BookingSummaryResponse[]> {
    return this.http.get<BookingSummaryResponse[]>(
      `${this.apiBase}/api/bookings/mine`,
      { headers: this.getAuthHeaders() }
    );
  }

  getMyUpcomingBookings(): Observable<BookingSummaryResponse[]> {
    return this.http.get<BookingSummaryResponse[]>(
      `${this.apiBase}/api/bookings/mine/upcoming`,
      { headers: this.getAuthHeaders() }
    );
  }

  cancelBooking(bookingId: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.apiBase}/api/bookings/${bookingId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  getBookingById(bookingId: number): Observable<BookingSummaryResponse> {
    return this.http.get<BookingSummaryResponse>(
      `${this.apiBase}/api/bookings/${bookingId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  getAllBookings(): Observable<AdminBookingResponse[]> {
    return this.http.get<AdminBookingResponse[]>(
      `${this.apiBase}/api/admin/bookings`,
      { headers: this.getAuthHeaders() }
    );
  }

  getBookingsByCourtId(courtId: number): Observable<AdminBookingResponse[]> {
    return this.http.get<AdminBookingResponse[]>(
      `${this.apiBase}/api/admin/bookings/court/${courtId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  getRescheduleOptions(
    bookingId: number,
    date: string
  ): Observable<RescheduleCourtOptionsResponse[]> {
    return this.http.get<RescheduleCourtOptionsResponse[]>(
      `${this.apiBase}/api/admin/bookings/reschedule-options`,
      {
        params: {
          bookingId: bookingId.toString(),
          date
        }
      }
    );
  }

  rescheduleBooking(
    bookingId: number,
    newTimeSlotId: number
  ): Observable<AdminBookingResponse> {
    return this.http.put<AdminBookingResponse>(
      `${this.apiBase}/api/admin/bookings/${bookingId}/reschedule`,
      { newTimeSlotId }
    );
  }

  markBookingPaidCash(bookingId: number): Observable<AdminBookingDetailsResponse> {
    return this.http.post<AdminBookingDetailsResponse>(
      `${this.apiBase}/api/admin/bookings/${bookingId}/payment/cash`,
      {}
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
    } catch {
    }

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
