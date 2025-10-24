import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CreateBookingRequest,
  BookingSummaryResponse
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
   * Helper to get authorization headers with JWT token
   */
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('No authentication token found');
    }
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }
}
