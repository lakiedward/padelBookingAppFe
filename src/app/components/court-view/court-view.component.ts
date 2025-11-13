import { Component, EventEmitter, OnInit, Output, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CourtService } from '../../services/court.service';
import { CourtSummaryResponse, CourtResponse, CourtAvailabilityRuleResponse, BackendAvailabilityRuleType } from '../../models/court.models';
import { forkJoin } from 'rxjs';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

type Tone = 'green' | 'blue' | 'gray';

interface TimeSlot {
  label: string;
  note?: string;
  price?: string;
  tone?: Tone;
  startHHmm?: string;
  endHHmm?: string;
}

interface DaySchedule {
  day: string; // e.g., "Mon 08"
  slots: TimeSlot[];
  dateStr: string;
}

interface CourtPanelData {
  id: number;
  title: string;
  subtitle: string;
  price: string;
  imageUrl?: string | null;
  status?: 'Active' | 'Inactive';
  tags: string[];
  sport: string;
  availabilityRules: CourtAvailabilityRuleResponse[];
  schedules: DaySchedule[];
}

@Component({
  selector: 'app-court-view',
  standalone: true,
  imports: [CommonModule, ConfirmDialogModule],
  templateUrl: './court-view.component.html',
  styleUrl: './court-view.component.scss',
  providers: [ConfirmationService]
})
export class CourtViewComponent implements OnInit {
  activeTab = signal<'courts'>('courts');

  @Output() addCourt = new EventEmitter<void>();
  @Output() editCourt = new EventEmitter<number>();

  courts: CourtPanelData[] = [];
  isLoading = false;
  loadError: string | null = null;

  constructor(
    private courtService: CourtService,
    private cdr: ChangeDetectorRef,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    // Load courts after a brief delay to ensure component is fully mounted
    // This fixes the "need to click twice" issue with *ngIf mounting/unmounting
    setTimeout(() => {
      console.log('[CourtView] ngOnInit - Loading courts after delay');
      this.loadCourts();
    }, 100);
  }

  loadCourts() {
    console.log('[CourtView] loadCourts() called');
    this.isLoading = true;
    this.loadError = null;
    this.cdr.detectChanges();
    
    this.courtService.getCourts().subscribe({
      next: (courts) => {
        console.log('[CourtView] Courts summary loaded:', courts);
        
        if (courts.length === 0) {
          this.courts = [];
          this.isLoading = false;
          this.cdr.detectChanges();
          return;
        }

        // Load full details for each court to get availability rules
        const detailRequests = courts.map(court => 
          this.courtService.getCourtById(court.id)
        );

        forkJoin(detailRequests).subscribe({
          next: (detailedCourts) => {
            console.log('[CourtView] Court details loaded:', detailedCourts);
            this.courts = detailedCourts.map(c => {
              const panel = this.mapCourtToPanel(c);
              console.log(`[CourtView] Court "${panel.title}" - Image URL:`, panel.imageUrl);
              return panel;
            });
            // Prices are already available from availabilityRules in court details
            // No need to fetch time slots separately
            this.isLoading = false;
            console.log('[CourtView] Courts array length:', this.courts.length);
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('[CourtView] Failed to load court details:', err);
            this.loadError = 'Failed to load court details';
            this.isLoading = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: (err) => {
        console.error('[CourtView] Failed to load courts:', err);
        this.loadError = 'Failed to load courts';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onAddCourtClick() { this.addCourt.emit(); }

  onEditCourt(courtId: number) {
    // Emit event with court ID for parent to handle
    this.editCourt.emit(courtId);
  }

  onDeleteCourt(courtId: number, courtName: string) {
    this.confirmationService.confirm({
      header: 'Delete Court',
      message: `Are you sure you want to delete "${courtName}"? This action cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      rejectLabel: 'Cancel',
      acceptLabel: 'Delete',
      accept: () => {
        this.courtService.deleteCourt(courtId).subscribe({
          next: () => {
            console.log('Court deleted successfully');
            this.loadCourts(); // Refresh the list
          },
          error: (err) => {
            console.error('Failed to delete court:', err);
            alert('Failed to delete court: ' + (err.error?.error || err.message));
          }
        });
      }
    });
  }

  private mapCourtToPanel(court: CourtResponse): CourtPanelData {
    // Load primary photo or first available photo from backend
    let imageUrl: string | null = null;
    
    if (court.photos && court.photos.length > 0) {
      // Priority 1: Find primary photo
      const primaryPhoto = court.photos.find(p => p.isPrimary);
      if (primaryPhoto && primaryPhoto.url) {
        imageUrl = this.courtService.toAbsoluteUrl(primaryPhoto.url);
      } else {
        // Priority 2: Use first photo
        const firstPhoto = court.photos[0];
        if (firstPhoto && firstPhoto.url) {
          imageUrl = this.courtService.toAbsoluteUrl(firstPhoto.url);
        }
      }
    }

    // Build subtitle from tags
    const tags = Array.isArray(court.tags) ? court.tags : [];
    const subtitle = tags.length > 0 
      ? tags.join(' • ')
      : court.sport;

    // Get minimum price from availability rules
    const prices = court.availabilityRules.map(rule => rule.price);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;

    // Generate 7-day calendar for this court
    const schedules = this.build7DayCalendar(court.availabilityRules);

    return {
      id: court.id,
      title: court.name,
      subtitle,
      price: minPrice > 0 ? `€${minPrice}` : 'N/A',
      imageUrl,
      status: 'Active',
      tags,
      sport: court.sport,
      availabilityRules: court.availabilityRules,
      schedules
    };
  }

  private build7DayCalendar(rules: CourtAvailabilityRuleResponse[]): DaySchedule[] {
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const schedules: DaySchedule[] = [];
    
    // Find Monday of current week
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    let mondayOffset = 0;
    
    if (currentDay === 0) {
      // If today is Sunday, Monday was 6 days ago
      mondayOffset = -6;
    } else {
      // Otherwise, Monday was (currentDay - 1) days ago
      mondayOffset = -(currentDay - 1);
    }
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    
    // Generate 7 days starting from Monday
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(monday);
      currentDate.setDate(monday.getDate() + i);
      const label = `${dayNames[i]} ${String(currentDate.getDate()).padStart(2, '0')}`;
      const dateStr = this.formatDate(currentDate);
      
      // Find applicable rules for this day
      const dayOfWeek = (i + 1) % 7; // Monday=1, Tuesday=2, ..., Sunday=0
      const applicableRules = this.getApplicableRules(rules, currentDate, dayOfWeek);
      
      // Generate time slots from rules
      const slots = this.generateTimeSlotsFromRules(applicableRules);
      
      schedules.push({ day: label, slots, dateStr });
    }
    
    return schedules;
  }

  private getApplicableRules(
    rules: CourtAvailabilityRuleResponse[], 
    date: Date, 
    dayOfWeek: number
  ): CourtAvailabilityRuleResponse[] {
    const dateString = this.formatDate(date);
    const applicable: CourtAvailabilityRuleResponse[] = [];
    
    for (const rule of rules) {
      if (rule.type === BackendAvailabilityRuleType.DATE && rule.date === dateString) {
        // Specific date rule takes precedence
        applicable.push(rule);
      } else if (rule.type === BackendAvailabilityRuleType.WEEKLY && 
                 rule.weekdays && 
                 rule.weekdays.includes(dayOfWeek)) {
        // Weekly rule applies to this day of week
        applicable.push(rule);
      }
    }
    
    return applicable;
  }

  private generateTimeSlotsFromRules(rules: CourtAvailabilityRuleResponse[]): TimeSlot[] {
    if (rules.length === 0) {
      return [];
    }

    // Group rules by time range and price to combine similar slots
    const slotMap = new Map<string, TimeSlot>();
    const tones: Tone[] = ['green', 'blue', 'gray'];
    let toneIndex = 0;

    for (const rule of rules) {
      const key = `${rule.startTime}-${rule.endTime}-${rule.price}`;
      
      if (!slotMap.has(key)) {
        slotMap.set(key, {
          label: `${rule.startTime} – ${rule.endTime}`,
          note: `every ${rule.slotMinutes} min`,
          price: `€${rule.price}`,
          tone: tones[toneIndex % tones.length]
          , startHHmm: rule.startTime
          , endHHmm: rule.endTime
        });
        toneIndex++;
      }
    }

    return Array.from(slotMap.values());
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  trackByIndex(index: number) { return index; }

  // ===== DEPRECATED: Prices now come from availabilityRules in court details =====
  // This method is no longer needed since CourtResponse includes availabilityRules with prices
  // Keeping for reference in case we need to fetch actual booked time slots in the future
  /*
  private populatePricesForCourt(court: CourtPanelData) {
    if (!court.schedules || court.schedules.length === 0) return;

    const startDateStr = court.schedules[0].dateStr;
    const endDateStr = court.schedules[court.schedules.length - 1].dateStr;
    const startISO = `${startDateStr}T00:00:00`;
    const endISO = `${endDateStr}T23:59:59`;

    console.log(`[CourtView] Fetching time slots for court ${court.id}:`, { startISO, endISO });

    this.courtService.getTimeSlotsByRange(court.id, startISO, endISO, true).subscribe({
      next: (tslots) => {
        console.log(`[CourtView] Time slots received for court ${court.id}:`, tslots);
        const byDay = new Map<string, { hhmm: string; price: number }[]>();
        for (const t of tslots) {
          const dayKey = t.startTime.substring(0, 10);
          const hhmm = t.startTime.substring(11, 16);
          const arr = byDay.get(dayKey) || [];
          arr.push({ hhmm, price: t.price });
          byDay.set(dayKey, arr);
        }

        for (const day of court.schedules) {
          const items = byDay.get(day.dateStr) || [];
          if (items.length === 0) continue;
          for (const slot of day.slots) {
            if (!slot.startHHmm || !slot.endHHmm) continue;
            const startM = this.hhmmToMinutes(slot.startHHmm);
            const endM = this.hhmmToMinutes(slot.endHHmm);
            let minPrice: number | undefined;
            for (const i of items) {
              const m = this.hhmmToMinutes(i.hhmm);
              if (m >= startM && m < endM) {
                minPrice = minPrice === undefined ? i.price : Math.min(minPrice, i.price);
              }
            }
            if (minPrice !== undefined) {
              slot.price = `€${minPrice}`;
            }
          }
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(`[CourtView] Failed to fetch timeslot prices for court ${court.id}:`, err);
        console.error('[CourtView] Error details:', {
          status: err.status,
          statusText: err.statusText,
          message: err.message,
          error: err.error
        });
        // Continue without prices - don't block the UI
      }
    });
  }
  */

  private hhmmToMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }
}
