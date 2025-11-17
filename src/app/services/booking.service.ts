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

  /**
   * Create a new booking
   * Requires authentication (ROLE_USER)
   */
  createBooking(timeSlotId: number): Observable<BookingSummaryResponse> {
    const request: CreateBookingRequest = { timeSlotId };
    return this.http.post<BookingSummaryResponse>(
      `${this.apiBase}/api/bookings`,
      request,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * ADMIN: Get detailed information for a specific booking (requires ROLE_ADMIN)
   */
  getAdminBookingDetails(bookingId: number): Observable<AdminBookingDetailsResponse> {
    return this.http.get<AdminBookingDetailsResponse>(
      `${this.apiBase}/api/admin/bookings/${bookingId}/details`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Get all bookings for the current user
   */
  getMyBookings(): Observable<BookingSummaryResponse[]> {
    return this.http.get<BookingSummaryResponse[]>(
      `${this.apiBase}/api/bookings/mine`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Get upcoming bookings for the current user
   */
  getMyUpcomingBookings(): Observable<BookingSummaryResponse[]> {
    return this.http.get<BookingSummaryResponse[]>(
      `${this.apiBase}/api/bookings/mine/upcoming`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Cancel a booking
   */
  cancelBooking(bookingId: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.apiBase}/api/bookings/${bookingId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Get a specific booking by ID
   */
  getBookingById(bookingId: number): Observable<BookingSummaryResponse> {
    return this.http.get<BookingSummaryResponse>(
      `${this.apiBase}/api/bookings/${bookingId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * ADMIN: Get all bookings (requires ROLE_ADMIN)
   */
  getAllBookings(): Observable<AdminBookingResponse[]> {
    return this.http.get<AdminBookingResponse[]>(
      `${this.apiBase}/api/admin/bookings`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * ADMIN: Get bookings for a specific court (requires ROLE_ADMIN)
   */
  getBookingsByCourtId(courtId: number): Observable<AdminBookingResponse[]> {
    return this.http.get<AdminBookingResponse[]>(
      `${this.apiBase}/api/admin/bookings/court/${courtId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * ADMIN: Get reschedule options for a booking and date across all courts of the same sport
   */
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

  /**
   * ADMIN: Reschedule a booking to a new time slot
   */
  rescheduleBooking(
    bookingId: number,
    newTimeSlotId: number
  ): Observable<AdminBookingResponse> {
    return this.http.put<AdminBookingResponse>(
      `${this.apiBase}/api/admin/bookings/${bookingId}/reschedule`,
      { newTimeSlotId }
    );
  }

  /**
   * ADMIN: Mark a booking as paid in cash.
   * Uses the admin-only endpoint and returns refreshed booking details.
   */
  markBookingPaidCash(bookingId: number): Observable<AdminBookingDetailsResponse> {
    return this.http.post<AdminBookingDetailsResponse>(
      `${this.apiBase}/api/admin/bookings/${bookingId}/payment/cash`,
      {}
    );
  }

  /**
   * Helper to get authorization headers with JWT token.
   * Kept for backward compatibility but made SSR-safe and non-throwing.
   * NOTE: The auth interceptor already attaches the Authorization header,
   * so this is only used to add JSON content type when needed.
   */
  private getAuthHeaders(): HttpHeaders {
    // Guard against SSR / non-browser environments
    const hasWindow = typeof window !== 'undefined';
    const hasLocalStorage = hasWindow && typeof localStorage !== 'undefined';

    if (!hasLocalStorage) {
      // In non-browser environments, just return basic JSON headers.
      return new HttpHeaders({
        'Content-Type': 'application/json'
      });
    }

    let token: string | null = null;
    try {
      token = localStorage.getItem('token');
    } catch {
      // Swallow storage errors and fall back to no auth header
    }

    if (!token) {
      console.warn('[BookingService] No token found when building auth headers');
      return new HttpHeaders({
        'Content-Type': 'application/json'
      });
    }

    console.log('[BookingService] Token found when building auth headers, length:', token.length);
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }
}
