import { Component, EventEmitter, OnInit, Output, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CourtService } from '../../services/court.service';
import { CourtSummaryResponse, CourtResponse, CourtAvailabilityRuleResponse, BackendAvailabilityRuleType } from '../../models/court.models';
import { forkJoin } from 'rxjs';

type Tone = 'green' | 'blue' | 'gray';

interface TimeSlot {
  label: string;
  note?: string;
  price?: string;
  tone?: Tone;
}

interface DaySchedule {
  day: string; // e.g., "Mon 08"
  slots: TimeSlot[];
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
  imports: [CommonModule],
  templateUrl: './court-view.component.html',
  styleUrl: './court-view.component.scss'
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
    private cdr: ChangeDetectorRef
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
            this.courts = detailedCourts.map(c => this.mapCourtToPanel(c));
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
    if (!confirm(`Are you sure you want to delete "${courtName}"?`)) {
      return;
    }

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

  private mapCourtToPanel(court: CourtResponse): CourtPanelData {
    // TODO: Load photos properly through HttpClient with Authorization
    // For now, don't load images to avoid 403 errors
    const imageUrl = null;

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
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const schedules: DaySchedule[] = [];
    
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + i);
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const label = `${dayNames[dayOfWeek]} ${String(currentDate.getDate()).padStart(2, '0')}`;
      
      // Find applicable rules for this day
      const applicableRules = this.getApplicableRules(rules, currentDate, dayOfWeek);
      
      // Generate time slots from rules
      const slots = this.generateTimeSlotsFromRules(applicableRules);
      
      schedules.push({ day: label, slots });
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
}
