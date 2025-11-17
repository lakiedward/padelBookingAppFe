import { CommonModule } from '@angular/common';
import { Component, computed, signal, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { BookingService } from '../../services/booking.service';
import { CourtService } from '../../services/court.service';
import { CourtSummaryResponse } from '../../models/court.models';
import { AdminBookingResponse, RescheduleCourtOptionsResponse, RescheduleTimeSlotOptionResponse } from '../../models/booking.models';
import { Select } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { Time24Pipe } from '../../pipes/time24.pipe';
import { ConvertMoneyPipe } from '../../pipes/convert-money.pipe';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

type ViewMode = 'month' | 'week' | 'day';

type AdminBooking = {
  id: string;
  courtId: number;
  date: string;   // YYYY-MM-DD
  start: string;  // HH:MM
  end: string;    // HH:MM
  club: string;
  court: string;
  sport: string;  // emoji or short
  city?: string;
  username: string;
  userId: number;
  userEmail?: string | null;
  userPhone?: string | null;
  paymentType?: string | null;
  price: number;
  currency?: string | null;
};

interface CourtOption {
  label: string;
  value: number;
}

@Component({
  selector: 'app-manage-booking',
  standalone: true,
  imports: [CommonModule, Select, FormsModule, Time24Pipe, ConvertMoneyPipe, ConfirmDialogModule],
  templateUrl: './manage-booking.component.html',
  styleUrl: './manage-booking.component.scss',
  providers: [ConfirmationService]
})
export class ManageBookingComponent implements OnInit, OnChanges {
  constructor(
    private bookingService: BookingService,
    private courtService: CourtService,
    private router: Router,
    private confirmationService: ConfirmationService
  ) {}

  // State
  isLoading = signal(true);
  courts = signal<CourtOption[]>([]);
  selectedCourtId = signal<number | null>(null);
  @Input() preselectCourtId: number | null = null;
  private pendingPreselectId: number | null = null;

  anchor = signal(new Date());
  viewMode = signal<ViewMode>('month');
  bookings = signal<AdminBooking[]>([]);
  selectedBooking = signal<AdminBooking | null>(null);
  showBookingModal = signal(false);

  // Reschedule state
  rescheduleDate = signal<string | null>(null); // YYYY-MM-DD
  rescheduleOptions = signal<RescheduleCourtOptionsResponse[] | null>(null);
  rescheduleLoading = signal(false);
  rescheduleError = signal<string | null>(null);

  // Payment operations
  isMarkingPaidCash = signal(false);

  ngOnInit(): void {
    this.loadCourts();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['preselectCourtId']) {
      const val: number | null = changes['preselectCourtId'].currentValue ?? null;
      if (val != null) {
        // If courts are already loaded, apply immediately; else store pending
        const exists = this.courts().some(c => c.value === val);
        if (exists) {
          this.selectedCourtId.set(val);
          this.loadBookingsForCourt(val);
        } else {
          this.pendingPreselectId = val;
        }
      }
    }
  }

  private loadCourts(): void {
    console.log('[ManageBooking] Loading courts...');
    this.isLoading.set(true);

    this.courtService.getCourts().subscribe({
      next: (courts: CourtSummaryResponse[]) => {
        console.log('[ManageBooking] Courts loaded:', courts);
        const courtOptions = courts.map(court => ({
          label: `${court.name} - ${court.sport}`,
          value: court.id
        }));
        this.courts.set(courtOptions);

        // Apply preselection if provided and present in options
        const pre = this.preselectCourtId ?? this.pendingPreselectId;
        const match = pre != null ? courtOptions.find(c => c.value === pre) : undefined;
        if (match) {
          this.selectedCourtId.set(match.value);
          this.loadBookingsForCourt(match.value);
          this.pendingPreselectId = null;
        } else if (courtOptions.length > 0) {
          // Fallback: auto-select first
          this.selectedCourtId.set(courtOptions[0].value);
          this.loadBookingsForCourt(courtOptions[0].value);
        } else {
          this.isLoading.set(false);
        }
      },
      error: (err) => {
        console.error('[ManageBooking] Error loading courts:', err);
        this.isLoading.set(false);
      }
    });
  }

  onCourtChange(event: any): void {
    const courtId = event.value;
    console.log('[ManageBooking] Court changed to:', courtId);
    this.selectedCourtId.set(courtId);
    if (courtId) {
      this.loadBookingsForCourt(courtId);
    }
  }

  private loadBookingsForCourt(courtId: number): void {
    console.log('[ManageBooking] Loading bookings for court:', courtId);
    this.isLoading.set(true);

    this.bookingService.getBookingsByCourtId(courtId).subscribe({
      next: (bookings: AdminBookingResponse[]) => {
        console.log('[ManageBooking] Bookings received:', bookings);

        // Transform backend AdminBookingResponse to AdminBooking format
        const adminBookings: AdminBooking[] = bookings.map((booking) => {
          const startDateTime = new Date(booking.startTime);
          const endDateTime = new Date(booking.endTime);

          return {
            id: booking.id.toString(),
            courtId: booking.courtId,
            date: this.formatDateToKey(startDateTime),
            start: this.formatTimeToHHMM(startDateTime),
            end: this.formatTimeToHHMM(endDateTime),
            club: 'Club',
            court: booking.courtName,
            sport: this.getSportEmoji(booking.activityName),
            username: booking.username,
            userId: booking.userId,
            userEmail: booking.userEmail ?? undefined,
            userPhone: booking.userPhone ?? undefined,
            paymentType: booking.paymentType ?? 'Card',
            price: booking.price,
            currency: booking.currency ?? 'EUR',
          };
        });

        this.bookings.set(adminBookings);
        console.log('[ManageBooking] Bookings set:', adminBookings);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('[ManageBooking] Error loading bookings:', err);
        this.bookings.set([]);
        this.isLoading.set(false);
      }
    });
  }

  private formatDateToKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private formatTimeToHHMM(date: Date): string {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  private getSportEmoji(activityName: string): string {
    const emojiMap: Record<string, string> = {
      'tennis': '🎾',
      'padel': '🏓',
      'basketball': '🏀',
      'volleyball': '🏐',
      'football': '⚽',
      'soccer': '⚽'
    };

    const normalized = activityName.toLowerCase();
    return emojiMap[normalized] || '🎯';
  }

  // Derived helpers
  readonly eventsByDay = computed<Record<string, string[]>>(() => {
    const m: Record<string, string[]> = {};
    for (const b of this.bookings()) {
      (m[b.date] ??= []).push(`${b.sport} ${b.court} ${b.start}`);
    }
    return m;
  });

  // View mode handlers
  setView(mode: ViewMode) {
    console.log('[ManageBooking] setView called', { mode });
    this.viewMode.set(mode);
  }

  onDayClick(date: Date) {
    this.anchor.set(date);
    this.viewMode.set('day');
  }

  // Booking details modal
  openBooking(booking: AdminBooking) {
    this.selectedBooking.set(booking);
    this.showBookingModal.set(true);

    // Initialize reschedule state
    this.rescheduleDate.set(booking.date);
    this.rescheduleOptions.set(null);
    this.rescheduleError.set(null);
    this.rescheduleLoading.set(false);
  }

  openBookingFullPage(booking: AdminBooking | null) {
    const b = booking ?? this.selectedBooking();
    if (!b) {
      return;
    }

    const idNum = Number(b.id);
    if (!idNum || Number.isNaN(idNum)) {
      return;
    }

    this.router.navigate(['/admin', 'bookings', idNum]);
  }

  closeBooking() {
    this.showBookingModal.set(false);
    this.selectedBooking.set(null);
    this.rescheduleOptions.set(null);
    this.rescheduleError.set(null);
    this.rescheduleLoading.set(false);
  }

  onRescheduleDateChange(event: Event) {
    const input = event.target as HTMLInputElement | null;
    const value = input?.value || '';
    this.rescheduleDate.set(value || null);
  }

  loadRescheduleOptions() {
    const booking = this.selectedBooking();
    if (!booking) {
      return;
    }

    const date = this.rescheduleDate() || booking.date;
    if (!date) {
      this.rescheduleError.set('Please select a date for rescheduling.');
      return;
    }

    this.rescheduleLoading.set(true);
    this.rescheduleError.set(null);

    this.bookingService.getRescheduleOptions(Number(booking.id), date).subscribe({
      next: (groups: RescheduleCourtOptionsResponse[]) => {
        this.rescheduleOptions.set(groups);
        this.rescheduleLoading.set(false);
      },
      error: (err) => {
        console.error('[ManageBooking] Error loading reschedule options:', err);
        this.rescheduleError.set('Could not load reschedule options.');
        this.rescheduleLoading.set(false);
      }
    });
  }

  rescheduleToSlot(slot: RescheduleTimeSlotOptionResponse) {
    const booking = this.selectedBooking();
    if (!booking) {
      return;
    }

    this.rescheduleLoading.set(true);
    this.bookingService.rescheduleBooking(Number(booking.id), slot.timeSlotId).subscribe({
      next: (updated) => {
        const startDateTime = new Date(updated.startTime);
        const endDateTime = new Date(updated.endTime);

        const updatedBooking: AdminBooking = {
          id: updated.id.toString(),
          courtId: updated.courtId,
          date: this.formatDateToKey(startDateTime),
          start: this.formatTimeToHHMM(startDateTime),
          end: this.formatTimeToHHMM(endDateTime),
          club: 'Club',
          court: updated.courtName,
          sport: this.getSportEmoji(updated.activityName),
          username: updated.username,
          userId: updated.userId,
          userEmail: updated.userEmail ?? undefined,
          userPhone: updated.userPhone ?? undefined,
          paymentType: updated.paymentType ?? 'Card',
          price: updated.price,
          currency: updated.currency ?? 'EUR',
        };

        const currentCourtId = this.selectedCourtId();
        const currentList = this.bookings();
        const filtered = currentList.filter(b => b.id !== booking.id);

        if (currentCourtId != null && updatedBooking.courtId === currentCourtId) {
          filtered.push(updatedBooking);
        }

        this.bookings.set(filtered);

        if (currentCourtId != null && updatedBooking.courtId === currentCourtId) {
          this.selectedBooking.set(updatedBooking);
        } else {
          // Booking moved to another court; close modal in current view
          this.closeBooking();
        }

        this.rescheduleLoading.set(false);
        this.rescheduleOptions.set(null);
        this.rescheduleError.set(null);
      },
      error: (err) => {
        console.error('[ManageBooking] Error rescheduling booking:', err);
        this.rescheduleError.set('Failed to reschedule booking.');
        this.rescheduleLoading.set(false);
      }
    });
  }

  onMarkPaidCash() {
    const b = this.selectedBooking();
    if (!b || this.isMarkingPaidCash()) {
      return;
    }

    const idNum = Number(b.id);
    if (!idNum || Number.isNaN(idNum)) {
      return;
    }

    this.confirmationService.confirm({
      header: 'Mark as paid (cash)',
      message: 'This will mark this booking as paid in cash. Continue?',
      icon: 'pi pi-exclamation-triangle',
      rejectLabel: 'Cancel',
      acceptLabel: 'Mark as paid',
      accept: () => {
        this.isMarkingPaidCash.set(true);
        this.bookingService.markBookingPaidCash(idNum).subscribe({
          next: (details) => {
            const list = this.bookings();
            const updatedList = list.map(item =>
              item.id === b.id
                ? { ...item, paymentType: details.paymentType ?? 'CASH' }
                : item
            );
            this.bookings.set(updatedList);

            this.selectedBooking.set({
              ...b,
              paymentType: details.paymentType ?? 'CASH'
            });

            this.isMarkingPaidCash.set(false);
          },
          error: (err) => {
            console.error('[ManageBooking] Error marking booking as paid cash:', err);
            this.isMarkingPaidCash.set(false);
          }
        });
      }
    });
  }

  goPrev() {
    const a = this.anchor();
    const mode = this.viewMode();
    this.anchor.set(mode === 'month'
      ? new Date(a.getFullYear(), a.getMonth() - 1, 1)
      : mode === 'week'
      ? this.addDays(a, -7)
      : this.addDays(a, -1)
    );
  }

  goNext() {
    const a = this.anchor();
    const mode = this.viewMode();
    this.anchor.set(mode === 'month'
      ? new Date(a.getFullYear(), a.getMonth() + 1, 1)
      : mode === 'week'
      ? this.addDays(a, +7)
      : this.addDays(a, +1)
    );
  }

  goToday() {
    const t = new Date();
    this.anchor.set(new Date(t.getFullYear(), t.getMonth(), t.getDate()));
  }

  // Headline
  readonly headline = computed(() => {
    const a = this.anchor();
    const mode = this.viewMode();
    return mode === 'month'
      ? this.niceMonthYear(this.startOfMonth(a))
      : mode === 'week'
      ? this.weekRangeLabel(a)
      : this.niceDayLong(a);
  });

  // Month grid
  readonly monthMatrix = computed(() => {
    const a = this.anchor();
    return this.buildCalendarMatrix(a.getFullYear(), a.getMonth());
  });

  // Weeks in month
  getWeeksInMonth(): { date: Date; inCurrent: boolean }[][] {
    const matrix = this.monthMatrix();
    const weeks: { date: Date; inCurrent: boolean }[][] = [];

    for (let i = 0; i < matrix.length; i += 7) {
      weeks.push(matrix.slice(i, i + 7));
    }

    return weeks;
  }

  formatWeekRange(week: { date: Date; inCurrent: boolean }[]): string {
    const firstDay = week[0].date;
    const lastDay = week[6].date;

    const firstMonth = firstDay.toLocaleDateString('en-US', { month: 'short' });
    const lastMonth = lastDay.toLocaleDateString('en-US', { month: 'short' });

    if (firstMonth === lastMonth) {
      return `${firstMonth} ${firstDay.getDate()}-${lastDay.getDate()}`;
    } else {
      return `${firstMonth} ${firstDay.getDate()} - ${lastMonth} ${lastDay.getDate()}`;
    }
  }

  // Week/day derived
  readonly weekDays = computed(() => {
    const start = this.startOfWeekMon(this.anchor());
    return Array.from({ length: 7 }, (_, i) => this.addDays(start, i));
  });

  bookingsByDay(date: Date): AdminBooking[] {
    const key = this.toDateKey(date);
    return this.bookings()
      .filter(b => b.date === key)
      .sort((a, b) => a.start.localeCompare(b.start));
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    });
  }

  formatDateKeyToLong(key: string): string {
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(y, (m || 1) - 1, d || 1);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  // ===================
  // Date helpers
  // ===================
  readonly WD_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  weekdayShort(d: Date) { return this.WD_LABELS[d.getDay()]; }
  toDateKey(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }
  addDays(date: Date, n: number) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
  startOfWeekMon(date: Date) { const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()); const dow = d.getDay(); const offset = (dow + 6) % 7; return this.addDays(d, -offset); }
  endOfWeekMon(date: Date) { return this.addDays(this.startOfWeekMon(date), 6); }
  startOfMonth(date: Date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
  niceMonthYear(d: Date) { return d.toLocaleString('en-US', { month: 'long', year: 'numeric' }); }
  niceDayLong(d: Date) { return d.toLocaleString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
  weekRangeLabel(d: Date) {
    const a = this.startOfWeekMon(d); const b = this.endOfWeekMon(d);
    const sameMonth = a.getMonth() === b.getMonth();
    const mA = a.toLocaleString('en-US', { month: 'short' });
    const mB = b.toLocaleString('en-US', { month: 'short' });
    return sameMonth ? `${mA} ${a.getDate()}–${b.getDate()}, ${b.getFullYear()}` : `${mA} ${a.getDate()} – ${mB} ${b.getDate()}, ${b.getFullYear()}`;
  }
  buildCalendarMatrix(year: number, month0: number) {
    const first = new Date(year, month0, 1);
    const daysInMonth = new Date(year, month0 + 1, 0).getDate();
    const daysInPrev = new Date(year, month0, 0).getDate();
    const mondayIndex = (first.getDay() + 6) % 7;
    const cells: { date: Date; inCurrent: boolean }[] = [];
    for (let i = mondayIndex - 1; i >= 0; i--) cells.push({ date: new Date(year, month0 - 1, daysInPrev - i), inCurrent: false });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(year, month0, d), inCurrent: true });
    while (cells.length < 42) { const nextIndex = cells.length - (mondayIndex + daysInMonth) + 1; cells.push({ date: new Date(year, month0 + 1, nextIndex), inCurrent: false }); }
    return cells;
  }
}
