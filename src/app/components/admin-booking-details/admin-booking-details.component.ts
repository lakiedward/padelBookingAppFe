import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BookingService } from '../../services/booking.service';
import {
  AdminBookingDetailsResponse,
  RescheduleCourtOptionsResponse,
  RescheduleTimeSlotOptionResponse
} from '../../models/booking.models';
import { ConvertMoneyPipe } from '../../pipes/convert-money.pipe';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-admin-booking-details',
  standalone: true,
  imports: [CommonModule, ConvertMoneyPipe, ConfirmDialogModule],
  templateUrl: './admin-booking-details.component.html',
  styleUrl: './admin-booking-details.component.scss',
  providers: [ConfirmationService]
})
export class AdminBookingDetailsComponent implements OnInit {
  bookingId!: number;
  details: AdminBookingDetailsResponse | null = null;
  isLoading = true;
  error: string | null = null;
  isCancelling = false;

  // Reschedule state (mirrors ManageBooking modal behaviour)
  rescheduleDate: string | null = null; // YYYY-MM-DD
  rescheduleOptions: RescheduleCourtOptionsResponse[] | null = null;
  rescheduleLoading = false;
  rescheduleError: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bookingService: BookingService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef
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

    try {
      this.bookingService.getAdminBookingDetails(this.bookingId).subscribe({
        next: (details) => {
          this.details = details;
          this.isLoading = false;

          // Initialise reschedule date with booking date
          const start = new Date(details.startTime);
          if (!Number.isNaN(start.getTime())) {
            this.rescheduleDate = this.formatDateToKey(start);
          }

          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('[AdminBookingDetails] Failed to load booking (HTTP error):', err);
          this.error = err?.error?.message || err?.message || 'Failed to load booking details.';
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
    } catch (err: any) {
      console.error('[AdminBookingDetails] Failed to load booking (sync error):', err);
      this.error = err?.message || 'Failed to load booking details.';
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  onBack(): void {
    this.router.navigate(['/admin']);
  }

  onCancelBooking(): void {
    if (!this.bookingId || this.isCancelling) {
      return;
    }

    this.confirmationService.confirm({
      header: 'Cancel Booking',
      message: 'Are you sure you want to cancel this booking? This action cannot be undone.',
      icon: 'pi pi-exclamation-triangle',
      rejectLabel: 'Keep booking',
      acceptLabel: 'Cancel booking',
      accept: () => {
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
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  // ============ Reschedule logic (ported from ManageBooking modal) ============

  onRescheduleDateChange(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const value = input?.value || '';
    this.rescheduleDate = value || null;
  }

  loadRescheduleOptions(): void {
    if (!this.bookingId || !this.details || this.rescheduleLoading) {
      return;
    }

    const date =
      this.rescheduleDate ||
      this.formatDateToKey(new Date(this.details.startTime));

    if (!date) {
      this.rescheduleError = 'Please select a date for rescheduling.';
      this.cdr.detectChanges();
      return;
    }

    this.rescheduleLoading = true;
    this.rescheduleError = null;
    this.rescheduleOptions = null;

    this.bookingService.getRescheduleOptions(this.bookingId, date).subscribe({
      next: (groups: RescheduleCourtOptionsResponse[]) => {
        this.rescheduleOptions = groups;
        this.rescheduleLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[AdminBookingDetails] Error loading reschedule options:', err);
        this.rescheduleError = 'Could not load reschedule options.';
        this.rescheduleLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  rescheduleToSlot(slot: RescheduleTimeSlotOptionResponse): void {
    if (!this.bookingId || this.rescheduleLoading) {
      return;
    }

    this.rescheduleLoading = true;
    this.rescheduleError = null;

    this.bookingService.rescheduleBooking(this.bookingId, slot.timeSlotId).subscribe({
      next: () => {
        // After a successful reschedule, reload full details so UI stays in sync
        this.rescheduleLoading = false;
        this.rescheduleOptions = null;
        this.rescheduleError = null;
        this.loadDetails();
      },
      error: (err) => {
        console.error('[AdminBookingDetails] Error rescheduling booking:', err);
        this.rescheduleError = err?.error?.message || err?.message || 'Failed to reschedule booking.';
        this.rescheduleLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ============ Clipboard helpers ============

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

  private formatDateToKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
