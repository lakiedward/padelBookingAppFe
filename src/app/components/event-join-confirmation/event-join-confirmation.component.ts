import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ConvertMoneyPipe } from '../../pipes/convert-money.pipe';
import { PublicService } from '../../services/public.service';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { eventSummaryToPanelData } from '../../models/event.models';

type PaymentMethod = 'cash' | 'card';

interface EventJoinDetails {
  eventId: number;
  eventName: string;
  eventType: string;
  format: string;
  sport: string;
  startDate: Date;
  endDate: Date;
  registrationDeadline?: Date;
  price: number;
  maxParticipants?: number;
  currentParticipants: number;
  clubName?: string;
  coverImageUrl?: string;
}

@Component({
  selector: 'app-event-join-confirmation',
  standalone: true,
  imports: [CommonModule, FormsModule, ConvertMoneyPipe],
  templateUrl: './event-join-confirmation.component.html',
  styleUrl: './event-join-confirmation.component.scss'
})
export class EventJoinConfirmationComponent implements OnInit {
  isLoading = true;
  joinError: string | null = null;
  isSubmitting = false;

  selectedPaymentMethod: PaymentMethod = 'cash';
  eventDetails?: EventJoinDetails;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private publicService: PublicService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      const eventId = this.route.snapshot.paramMap.get('id');
      this.router.navigate(['/auth'], {
        queryParams: { returnUrl: `/events/${eventId}/join` }
      });
      return;
    }

    const eventIdParam = this.route.snapshot.paramMap.get('id');

    if (!eventIdParam) {
      this.joinError = 'Missing event information. Please try again.';
      this.isLoading = false;
      return;
    }

    const eventId = Number(eventIdParam);
    this.loadEventDetails(eventId);
  }

  private loadEventDetails(eventId: number): void {
    this.isLoading = true;
    this.publicService.getPublicEventById(eventId).subscribe({
      next: (eventSummary) => {
        const eventData = eventSummaryToPanelData(eventSummary);

        this.eventDetails = {
          eventId: eventSummary.id,
          eventName: eventSummary.name,
          eventType: eventSummary.eventType,
          format: eventSummary.format,
          sport: eventSummary.sportKey,
          startDate: eventData.startDate,
          endDate: eventData.endDate,
          registrationDeadline: eventData.registrationDeadline || undefined,
          price: eventSummary.price !== null ? eventSummary.price : 0,
          maxParticipants: eventSummary.maxParticipants || undefined,
          currentParticipants: eventSummary.currentParticipants,
          coverImageUrl: eventSummary.coverImageUrl || undefined
        };

        if (eventSummary.clubId) {
          this.loadClubName(eventSummary.clubId);
        }

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.joinError = 'Failed to load event information. Please try again.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private loadClubName(clubId: number): void {
    this.publicService.getPublicClubById(clubId).subscribe({
      next: (club) => {
        if (this.eventDetails) {
          this.eventDetails.clubName = club.name;
          this.cdr.detectChanges();
        }
      },
      error: () => {
        console.error('Failed to load club details');
      }
    });
  }

  onSelectPaymentMethod(method: PaymentMethod): void {
    this.selectedPaymentMethod = method;
  }

  onConfirmJoin(): void {
    if (!this.eventDetails) return;

    this.isSubmitting = true;
    this.joinError = null;

    const paymentMethod = this.eventDetails.price > 0
      ? (this.selectedPaymentMethod === 'card' ? 'CARD' : 'CASH')
      : undefined;

    this.userService.joinEvent(this.eventDetails.eventId, paymentMethod).subscribe({
      next: () => {
        this.router.navigate(['/calendar']);
      },
      error: (error) => {
        this.joinError = error.error?.message || 'Failed to join event. Please try again.';
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  onCancel(): void {
    if (this.eventDetails) {
      this.router.navigate(['/events', this.eventDetails.eventId]);
    } else {
      this.router.navigate(['/events']);
    }
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatDateRange(): string {
    if (!this.eventDetails) return '';

    const start = this.eventDetails.startDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const end = this.eventDetails.endDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    return `${start} – ${end}`;
  }

  getEventTypeDisplay(): string {
    if (!this.eventDetails) return '';
    return this.eventDetails.eventType.replace(/_/g, ' ');
  }

  getFormatDisplay(): string {
    if (!this.eventDetails) return '';
    return this.eventDetails.format.replace(/_/g, ' ');
  }

  getSpotsRemaining(): number {
    if (!this.eventDetails || !this.eventDetails.maxParticipants) return 0;
    return this.eventDetails.maxParticipants - this.eventDetails.currentParticipants;
  }

  isFree(): boolean {
    return this.eventDetails?.price === 0;
  }
}
