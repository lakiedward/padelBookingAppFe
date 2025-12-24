import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AppHeaderComponent } from '../shared/app-header/app-header.component';
import { ConvertMoneyPipe } from '../../pipes/convert-money.pipe';
import { BookingService } from '../../services/booking.service';
import { PublicService } from '../../services/public.service';
import { BookingSummaryResponse } from '../../models/booking.models';
import { PaymentsService } from '../../services/payments.service';
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
  currency?: string;
}

@Component({
  selector: 'app-booking-page',
  standalone: true,
  imports: [CommonModule, FormsModule, AppHeaderComponent, ConvertMoneyPipe],
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
    private paymentsService: PaymentsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const timeSlotIdParam = this.route.snapshot.paramMap.get('timeSlotId');
    const courtIdParam = this.route.snapshot.queryParamMap.get('courtId');
    const date = this.route.snapshot.queryParamMap.get('date');
    const start = this.route.snapshot.queryParamMap.get('start');
    const end = this.route.snapshot.queryParamMap.get('end');
    const price = this.route.snapshot.queryParamMap.get('price');
    const currency = this.route.snapshot.queryParamMap.get('currency');

    if (!timeSlotIdParam || !courtIdParam || !date || !start || !end || !price) {
      this.bookingError = 'Missing booking information. Please try again.';
      this.isLoading = false;
      return;
    }

    const timeSlotId = Number(timeSlotIdParam);
    const courtId = Number(courtIdParam);
    const priceNum = Number(price);

    this.publicService.getPublicCourtById(courtId).subscribe({
      next: (court: CourtResponse) => {
        this.slotDetails = {
          timeSlotId,
          courtId,
          courtName: court.name,
          sport: court.sport,
          activityName: court.activity.name,
          date,
          startTime: start,
          endTime: end,
          price: priceNum,
          currency: 'EUR'
        };
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.bookingError = 'Failed to load booking information. Please try again.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });

  }

  onSelectPaymentMethod(method: PaymentMethod): void {
    this.selectedPaymentMethod = method;
  }

  onConfirmBooking(): void {
    if (!this.slotDetails) return;

    this.isSubmitting = true;
    this.bookingError = null;

    if (this.selectedPaymentMethod === 'card') {
      this.paymentsService.createCheckoutSession(this.slotDetails.timeSlotId).subscribe({
        next: (res) => {
          window.location.href = res.url;
        },
        error: (err) => {
          this.bookingError = err.error?.message || err.error?.error || err.message || 'Failed to start checkout.';
          this.isSubmitting = false;
        }
      });
      return;
    }

    this.bookingService.createBooking(this.slotDetails.timeSlotId).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/calendar'], {
          queryParams: { bookingSuccess: 'true' }
        });
      },
      error: (err) => {
        this.bookingError = err.error?.message || err.error?.error || err.message || 'Failed to create booking. Please try again.';
        this.isSubmitting = false;
      }
    });
  }

  onCancel(): void {
    if (this.slotDetails) {
      this.router.navigate(['/court', this.slotDetails.courtId]);
    } else {
      this.router.navigate(['/courts']);
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
    return time;
  }
}
