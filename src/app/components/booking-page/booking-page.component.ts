import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AppHeaderComponent } from '../shared/app-header/app-header.component';
import { BookingService } from '../../services/booking.service';
import { PublicService } from '../../services/public.service';
import { BookingSummaryResponse } from '../../models/booking.models';
import { CourtResponse } from '../../models/court.models';

type PaymentMethod = 'cash' | 'card';

interface SlotDetails {
  timeSlotId: number;
  courtId: number;
  courtName: string;
  sport: string;
  activityName: string;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
}

@Component({
  selector: 'app-booking-page',
  standalone: true,
  imports: [CommonModule, FormsModule, AppHeaderComponent],
  templateUrl: './booking-page.component.html',
  styleUrl: './booking-page.component.scss'
})
export class BookingPageComponent implements OnInit {
  isLoading = true;
  bookingError: string | null = null;
  isSubmitting = false;

  selectedPaymentMethod: PaymentMethod = 'cash';
  slotDetails?: SlotDetails;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bookingService: BookingService,
    private publicService: PublicService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('[BookingPage] ngOnInit START');
    const timeSlotIdParam = this.route.snapshot.paramMap.get('timeSlotId');
    const courtIdParam = this.route.snapshot.queryParamMap.get('courtId');
    const date = this.route.snapshot.queryParamMap.get('date');
    const start = this.route.snapshot.queryParamMap.get('start');
    const end = this.route.snapshot.queryParamMap.get('end');
    const price = this.route.snapshot.queryParamMap.get('price');

    console.log('[BookingPage] Route params:', {
      timeSlotIdParam,
      courtIdParam,
      date,
      start,
      end,
      price
    });

    if (!timeSlotIdParam || !courtIdParam || !date || !start || !end || !price) {
      console.error('[BookingPage] Missing params!', { timeSlotIdParam, courtIdParam, date, start, end, price });
      this.bookingError = 'Missing booking information. Please try again.';
      this.isLoading = false;
      return;
    }

    const timeSlotId = Number(timeSlotIdParam);
    const courtId = Number(courtIdParam);
    const priceNum = Number(price);

    console.log('[BookingPage] Parsed params:', { timeSlotId, courtId, priceNum });
    console.log('[BookingPage] Calling getPublicCourtById...');

    // Load court details to get full information
    this.publicService.getPublicCourtById(courtId).subscribe({
      next: (court: CourtResponse) => {
        console.log('[BookingPage] Court details received:', court);
        this.slotDetails = {
          timeSlotId,
          courtId,
          courtName: court.name,
          sport: court.sport,
          activityName: court.activity.name,
          date,
          startTime: start,
          endTime: end,
          price: priceNum
        };
        console.log('[BookingPage] slotDetails set:', this.slotDetails);
        this.isLoading = false;
        console.log('[BookingPage] isLoading set to false');
        this.cdr.detectChanges();
        console.log('[BookingPage] detectChanges called');
      },
      error: (err) => {
        console.error('[BookingPage] Error loading court details:', err);
        this.bookingError = 'Failed to load booking information. Please try again.';
        this.isLoading = false;
        console.log('[BookingPage] isLoading set to false (error)');
        this.cdr.detectChanges();
        console.log('[BookingPage] detectChanges called (error)');
      }
    });

    console.log('[BookingPage] ngOnInit END (async call started)');
  }

  onSelectPaymentMethod(method: PaymentMethod): void {
    if (method === 'cash') {
      this.selectedPaymentMethod = method;
    }
    // Card is disabled for now
  }

  onConfirmBooking(): void {
    if (!this.slotDetails) return;
    if (this.selectedPaymentMethod === 'card') {
      this.bookingError = 'Card payment is coming soon. Please select Cash payment.';
      return;
    }

    this.isSubmitting = true;
    this.bookingError = null;

    this.bookingService.createBooking(this.slotDetails.timeSlotId).subscribe({
      next: (booking: BookingSummaryResponse) => {
        console.log('Booking successful:', booking);
        this.isSubmitting = false;
        // Navigate to calendar with success message
        this.router.navigate(['/calendar'], {
          queryParams: { bookingSuccess: 'true' }
        });
      },
      error: (err) => {
        console.error('Error creating booking:', err);
        this.bookingError = err.error?.error || err.message || 'Failed to create booking. Please try again.';
        this.isSubmitting = false;
      }
    });
  }

  onCancel(): void {
    if (this.slotDetails) {
      this.router.navigate(['/user/court', this.slotDetails.courtId]);
    } else {
      this.router.navigate(['/user']);
    }
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatTime(time: string): string {
    // Time is in HH:mm format (24h)
    return time;
  }
}
