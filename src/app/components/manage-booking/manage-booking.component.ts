import { CommonModule } from '@angular/common';
import { Component, computed, signal, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { BookingService } from '../../services/booking.service';
import { CourtService } from '../../services/court.service';
import { CourtSummaryResponse } from '../../models/court.models';
import { AdminBookingResponse, RescheduleCourtOptionsResponse, RescheduleTimeSlotOptionResponse } from '../../models/booking.models';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { FormsModule } from '@angular/forms';
import { Time24Pipe } from '../../pipes/time24.pipe';
import { ConvertMoneyPipe } from '../../pipes/convert-money.pipe';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

type ViewMode = 'month' | 'week' | 'day';

type AdminBooking = {
  id: string;
  courtId: number;
  date: string;
  start: string;
  end: string;
  club: string;
  court: string;
  sport: string;
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
  sport: string;
}

interface SportOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-manage-booking',
  standalone: true,
  imports: [CommonModule, Select, DatePicker, FormsModule, Time24Pipe, ConvertMoneyPipe, ConfirmDialogModule],
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

  isLoading = signal(true);
  allCourts = signal<CourtOption[]>([]);
  sports = signal<SportOption[]>([]);
  selectedSport = signal<string | null>(null);
  courts = computed(() => {
    const sport = this.selectedSport();
    if (!sport) return [];
    return this.allCourts().filter(c => c.sport === sport);
  });
  selectedCourtId = signal<number | null>(null);
  @Input() preselectCourtId: number | null = null;
  private pendingPreselectId: number | null = null;

  anchor = signal(new Date());
  viewMode = signal<ViewMode>('month');
  bookings = signal<AdminBooking[]>([]);
  selectedBooking = signal<AdminBooking | null>(null);
  showBookingModal = signal(false);

  rescheduleDate = signal<string | null>(null);
  rescheduleOptions = signal<RescheduleCourtOptionsResponse[] | null>(null);
  rescheduleLoading = signal(false);
  rescheduleError = signal<string | null>(null);

  isMarkingPaidCash = signal(false);

  ngOnInit(): void {
    if (window.innerWidth <= 1023) {
      this.viewMode.set('week');
    }
    this.loadCourts();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['preselectCourtId']) {
      const val: number | null = changes['preselectCourtId'].currentValue ?? null;
      if (val != null) {
        const exists = this.allCourts().some(c => c.value === val);
        if (exists) {
          const court = this.allCourts().find(c => c.value === val);
          if (court) {
            this.selectedSport.set(court.sport);
            this.selectedCourtId.set(val);
            this.loadBookingsForCourt(val);
          }
        } else {
          this.pendingPreselectId = val;
        }
      }
    }
  }

  private loadCourts(): void {
    this.isLoading.set(true);

    this.courtService.getCourts().subscribe({
      next: (courts: CourtSummaryResponse[]) => {
        const courtOptions: CourtOption[] = courts.map(court => ({
          label: `${court.name} - ${court.sport}`,
          value: court.id,
          sport: court.sport
        }));
        this.allCourts.set(courtOptions);

        const uniqueSports = Array.from(new Set(courtOptions.map(c => c.sport)));
        const sportOptions: SportOption[] = uniqueSports.map(sport => ({
          label: sport,
          value: sport
        }));
        this.sports.set(sportOptions);

        const pre = this.preselectCourtId ?? this.pendingPreselectId;
        if (pre != null) {
          const match = courtOptions.find(c => c.value === pre);
          if (match) {
            this.selectedSport.set(match.sport);
            this.selectedCourtId.set(match.value);
            this.loadBookingsForCourt(match.value);
            this.pendingPreselectId = null;
          }
        } else if (sportOptions.length > 0) {
          this.selectedSport.set(sportOptions[0].value);
        }
        
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  onSportChange(event: any): void {
    const sport = event.value;
    this.selectedSport.set(sport);
    this.selectedCourtId.set(null);
    this.bookings.set([]);
    
    const courtsForSport = this.courts();
    if (courtsForSport.length > 0) {
      this.selectedCourtId.set(courtsForSport[0].value);
      this.loadBookingsForCourt(courtsForSport[0].value);
    }
  }

  onCourtChange(event: any): void {
    const courtId = event.value;
    this.selectedCourtId.set(courtId);
    if (courtId) {
      this.loadBookingsForCourt(courtId);
    }
  }

  private loadBookingsForCourt(courtId: number): void {
    this.isLoading.set(true);

    this.bookingService.getBookingsByCourtId(courtId).subscribe({
      next: (bookings: AdminBookingResponse[]) => {

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
            currency: 'EUR',
          };
        });

        this.bookings.set(adminBookings);
        this.isLoading.set(false);
      },
      error: () => {
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

  readonly eventsByDay = computed<Record<string, string[]>>(() => {
    const m: Record<string, string[]> = {};
    for (const b of this.bookings()) {
      (m[b.date] ??= []).push(`${b.sport} ${b.court} ${b.start}`);
    }
    return m;
  });

  setView(mode: ViewMode) {
    this.viewMode.set(mode);
  }

  onDayClick(date: Date) {
    this.anchor.set(date);
    this.viewMode.set('day');
  }

  openBooking(booking: AdminBooking) {
    this.selectedBooking.set(booking);
    this.showBookingModal.set(true);

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
      error: () => {
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
          currency: 'EUR',
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
          this.closeBooking();
        }

        this.rescheduleLoading.set(false);
        this.rescheduleOptions.set(null);
        this.rescheduleError.set(null);
      },
      error: () => {
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
          error: () => {
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

  goToDate(date: Date | null) {
    if (!date) return;
    this.anchor.set(new Date(date.getFullYear(), date.getMonth(), date.getDate()));
  }

  get anchorDate(): Date {
    return this.anchor();
  }

  readonly headline = computed(() => {
    const a = this.anchor();
    const mode = this.viewMode();
    return mode === 'month'
      ? this.niceMonthYear(this.startOfMonth(a))
      : mode === 'week'
      ? this.weekRangeLabel(a)
      : this.niceDayLong(a);
  });

  readonly monthMatrix = computed(() => {
    const a = this.anchor();
    return this.buildCalendarMatrix(a.getFullYear(), a.getMonth());
  });

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
    
    for (let i = mondayIndex - 1; i >= 0; i--) {
      cells.push({ date: new Date(year, month0 - 1, daysInPrev - i), inCurrent: false });
    }
    
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(year, month0, d), inCurrent: true });
    }
    
    const remainder = cells.length % 7;
    if (remainder > 0) {
      const daysToAdd = 7 - remainder;
      for (let i = 1; i <= daysToAdd; i++) {
        cells.push({ date: new Date(year, month0 + 1, i), inCurrent: false });
      }
    }
    
    return cells;
  }
}
