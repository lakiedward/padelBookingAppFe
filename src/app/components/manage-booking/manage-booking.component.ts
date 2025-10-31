import { CommonModule } from '@angular/common';
import { Component, computed, signal, OnInit } from '@angular/core';
import { BookingService } from '../../services/booking.service';
import { CourtService } from '../../services/court.service';
import { CourtSummaryResponse } from '../../models/court.models';
import { BookingSummaryResponse } from '../../models/booking.models';
import { Select } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { Time24Pipe } from '../../pipes/time24.pipe';

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
  userEmail: string;
  userPhone: string;
  paymentType: string;
  price: number;
};

interface CourtOption {
  label: string;
  value: number;
}

@Component({
  selector: 'app-manage-booking',
  standalone: true,
  imports: [CommonModule, Select, FormsModule, Time24Pipe],
  templateUrl: './manage-booking.component.html',
  styleUrl: './manage-booking.component.scss'
})
export class ManageBookingComponent implements OnInit {
  constructor(
    private bookingService: BookingService,
    private courtService: CourtService
  ) {}

  // State
  isLoading = signal(true);
  courts = signal<CourtOption[]>([]);
  selectedCourtId = signal<number | null>(null);

  anchor = signal(new Date());
  viewMode = signal<ViewMode>('month');
  bookings = signal<AdminBooking[]>([]);
  selectedBooking = signal<AdminBooking | null>(null);
  showBookingModal = signal(false);

  ngOnInit(): void {
    this.loadCourts();
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

        // Auto-select first court if available
        if (courtOptions.length > 0) {
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
      next: (bookings: BookingSummaryResponse[]) => {
        console.log('[ManageBooking] Bookings received:', bookings);

        // Transform backend BookingSummaryResponse to AdminBooking format
        const adminBookings: AdminBooking[] = bookings.map((booking, index) => {
          const startDateTime = new Date(booking.startTime);
          const endDateTime = new Date(booking.endTime);

          // TODO: Update backend to return AdminBookingResponse with full user details
          return {
            id: booking.id.toString(),
            courtId: booking.courtId,
            date: this.formatDateToKey(startDateTime),
            start: this.formatTimeToHHMM(startDateTime),
            end: this.formatTimeToHHMM(endDateTime),
            club: 'Club',
            court: booking.courtName,
            sport: this.getSportEmoji(booking.activityName),
            username: `User ${booking.id}`, // Placeholder - backend should provide actual username
            userId: booking.id, // Placeholder - should be actual userId
            userEmail: `user${booking.id}@example.com`, // Placeholder
            userPhone: `+40 7${String(index).padStart(2, '0')} ${String(booking.id).padStart(3, '0')} ${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`, // Placeholder
            paymentType: ['Card', 'Cash', 'Online'][index % 3], // Placeholder
            price: booking.price,
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
  }

  closeBooking() {
    this.showBookingModal.set(false);
    this.selectedBooking.set(null);
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
