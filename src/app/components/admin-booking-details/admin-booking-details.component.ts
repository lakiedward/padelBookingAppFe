import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BookingService } from '../../services/booking.service';
import { AdminBookingDetailsResponse } from '../../models/booking.models';
import { ConvertMoneyPipe } from '../../pipes/convert-money.pipe';

@Component({
  selector: 'app-admin-booking-details',
  standalone: true,
  imports: [CommonModule, ConvertMoneyPipe],
  templateUrl: './admin-booking-details.component.html',
  styleUrl: './admin-booking-details.component.scss'
})
export class AdminBookingDetailsComponent implements OnInit {
  bookingId!: number;
  details: AdminBookingDetailsResponse | null = null;
  isLoading = true;
  error: string | null = null;
  isCancelling = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bookingService: BookingService
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : NaN;

    if (!id || Number.isNaN(id)) {
      this.error = 'Invalid booking id.';
      this.isLoading = false;
      return;
    }

    this.bookingId = id;
    this.loadDetails();
  }

  loadDetails(): void {
    this.isLoading = true;
    this.error = null;

    this.bookingService.getAdminBookingDetails(this.bookingId).subscribe({
      next: (details) => {
        this.details = details;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('[AdminBookingDetails] Failed to load booking:', err);
        this.error = err?.error?.message || err?.message || 'Failed to load booking details.';
        this.isLoading = false;
      }
    });
  }

  onBack(): void {
    this.router.navigate(['/admin']);
  }

  onCancelBooking(): void {
    if (!this.bookingId || this.isCancelling) {
      return;
    }

    const confirmed = window.confirm('Are you sure you want to cancel this booking?');
    if (!confirmed) {
      return;
    }

    this.isCancelling = true;
    this.bookingService.cancelBooking(this.bookingId).subscribe({
      next: () => {
        this.isCancelling = false;
        this.loadDetails();
      },
      error: (err) => {
        console.error('[AdminBookingDetails] Failed to cancel booking:', err);
        this.error = err?.error?.message || err?.message || 'Failed to cancel booking.';
        this.isCancelling = false;
      }
    });
  }

  copyEmail(): void {
    const email = this.details?.userEmail;
    if (!email) {
      return;
    }
    this.copyToClipboard(email);
  }

  copyPhone(): void {
    const phone = this.details?.userPhone;
    if (!phone) {
      return;
    }
    this.copyToClipboard(phone);
  }

  private copyToClipboard(value: string): void {
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).catch((err) => {
        console.error('[AdminBookingDetails] Failed to copy to clipboard', err);
      });
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand('copy');
    } catch (e) {
      console.error('[AdminBookingDetails] execCommand copy failed', e);
    }
    document.body.removeChild(textarea);
  }
}
