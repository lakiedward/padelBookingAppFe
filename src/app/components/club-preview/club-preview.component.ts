import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClubDetails, SportKey } from '../../models/club.models';
import { CourtSummaryResponse, CourtResponse, BackendAvailabilityRuleType } from '../../models/court.models';
import { CourtListingCardComponent } from '../court-listing-card/court-listing-card.component';
import { CourtService } from '../../services/court.service';
import { Time24Pipe } from '../../pipes/time24.pipe';
import { sportEmoji } from '../../utils/sport-emoji.util';

interface CourtListingData {
  id: string;
  image: string;
  emoji: string;
  title: string;
  club: string;
  location: string;
  price: string;
  unit: string;
  tags: string[];
  availableDate: string;
  slots: string[];
  sport: SportKey;
}

@Component({
  selector: 'app-club-preview',
  standalone: true,
  imports: [CommonModule, CourtListingCardComponent],
  templateUrl: './club-preview.component.html',
  styleUrl: './club-preview.component.scss'
})
export class ClubPreviewComponent implements OnInit {
  @Input() details!: ClubDetails;
  @Output() editRequested = new EventEmitter<void>();
  @Output() deleteRequested = new EventEmitter<void>();
  @Output() editCourtsRequested = new EventEmitter<void>();
  @Output() manageBookingRequested = new EventEmitter<number>();

  activeCourtFilter = signal<'all' | SportKey>('all');
  realCourts = signal<CourtListingData[]>([]);
  isLoadingCourts = signal(false);
  courtsLoadError = signal<string | null>(null);
  
  private time24Pipe = new Time24Pipe();

  constructor(private courtService: CourtService) {}

  ngOnInit(): void {
    console.log('[ClubPreview] ngOnInit called - loading courts');
    console.log('[ClubPreview] Club details:', this.details);
    console.log('[ClubPreview] Club sports:', this.details?.sports);
    console.log('[ClubPreview] Active filter:', this.activeCourtFilter());
    this.loadRealCourts();
  }

  private loadRealCourts(): void {
    this.isLoadingCourts.set(true);
    this.courtsLoadError.set(null);
    
    this.courtService.getCourts().subscribe({
      next: (courts) => {
        console.log('[ClubPreview] Real courts loaded:', courts);
        console.log('[ClubPreview] Number of courts:', courts.length);
        
        if (courts.length === 0) {
          this.realCourts.set([]);
          this.isLoadingCourts.set(false);
          return;
        }
        
        // Load full details for each court to get availability rules
        const detailRequests = courts.map(court => 
          this.courtService.getCourtById(court.id)
        );
        
        // Use forkJoin to load all court details in parallel
        import('rxjs').then(rxjs => {
          rxjs.forkJoin(detailRequests).subscribe({
            next: (detailedCourts) => {
              console.log('[ClubPreview] Court details loaded:', detailedCourts);
              const mappedCourts = detailedCourts.map(c => this.mapCourtDetailsToListing(c));
              console.log('[ClubPreview] Mapped courts:', mappedCourts);
              this.realCourts.set(mappedCourts);
              this.isLoadingCourts.set(false);
            },
            error: (err) => {
              console.error('[ClubPreview] Failed to load court details:', err);
              // Fallback to summary data without prices/slots
              const mappedCourts = courts.map(c => this.mapCourtSummaryToCourt(c));
              this.realCourts.set(mappedCourts);
              this.isLoadingCourts.set(false);
            }
          });
        });
      },
      error: (err) => {
        console.error('[ClubPreview] Failed to load courts:', err);
        this.courtsLoadError.set('Failed to load courts');
        this.isLoadingCourts.set(false);
        this.realCourts.set([]);
      }
    });
  }

  private mapCourtSummaryToCourt(summary: CourtSummaryResponse): CourtListingData {
    const location = this.details?.locations?.[0]?.address || this.details?.name || 'Club Location';
    
    // Ensure imageUrl is always a string (never null)
    let imageUrl = 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=1200&auto=format&fit=crop';
    if (summary.primaryPhotoUrl) {
      const absoluteUrl = this.courtService.toAbsoluteUrl(summary.primaryPhotoUrl);
      if (absoluteUrl) {
        imageUrl = absoluteUrl;
      }
    }
    
    const emoji = sportEmoji(summary.sport as any);
    
    // Fallback data when full details are not available
    const price = 'N/A';
    const availableDate = 'N/A';
    const slots: string[] = [];

    return {
      id: String(summary.id),
      image: imageUrl,
      emoji: emoji,
      title: summary.name,
      club: summary.clubName,
      location: location,
      price: price,
      unit: 'per hour',
      tags: summary.tags || [],
      availableDate: availableDate,
      slots: slots,
      sport: summary.sport as SportKey
    };
  }

  private mapCourtDetailsToListing(court: CourtResponse): CourtListingData {
    const location = this.details?.locations?.[0]?.address || this.details?.name || 'Club Location';
    
    // Get image URL
    let imageUrl = 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=1200&auto=format&fit=crop';
    if (court.photos && court.photos.length > 0) {
      const primaryPhoto = court.photos.find(p => p.isPrimary) || court.photos[0];
      if (primaryPhoto && primaryPhoto.url) {
        const absoluteUrl = this.courtService.toAbsoluteUrl(primaryPhoto.url);
        if (absoluteUrl) {
          imageUrl = absoluteUrl;
        }
      }
    }
    
    const emoji = sportEmoji(court.sport as any);
    
    // Extract pricing and availability from rules
    const { price, availableDate, slots } = this.extractAvailabilityInfo(court);

    return {
      id: String(court.id),
      image: imageUrl,
      emoji: emoji,
      title: court.name,
      club: court.clubName,
      location: location,
      price: price,
      unit: 'per slot',
      tags: court.tags || [],
      availableDate: availableDate,
      slots: slots,
      sport: court.sport as SportKey
    };
  }

  private extractAvailabilityInfo(court: CourtResponse): { price: string; availableDate: string; slots: string[] } {
    const rules = court.availabilityRules || [];
    
    if (rules.length === 0) {
      return {
        price: 'N/A',
        availableDate: 'No availability set',
        slots: []
      };
    }

    // Get minimum price from all rules
    const prices = rules.map(r => r.price);
    const minPrice = Math.min(...prices);
    const price = `€${minPrice}`;

    // Get today's availability
    const today = new Date();
    const todayDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const todayDateStr = this.formatDate(today);

    // Find rules applicable for today
    const todayRules = rules.filter(rule => {
      if (rule.type === BackendAvailabilityRuleType.DATE && rule.date === todayDateStr) {
        return true;
      }
      if (rule.type === BackendAvailabilityRuleType.WEEKLY && 
          rule.weekdays && 
          rule.weekdays.includes(todayDayOfWeek)) {
        return true;
      }
      return false;
    });

    if (todayRules.length > 0) {
      // Generate sample slots from today's rules (show first 3-4 slots)
      const sampleSlots: string[] = [];
      let totalSlots = 0;

      for (const rule of todayRules) {
        const slots = this.generateSlotsFromRule(rule);
        totalSlots += slots.length;
        
        // Add first few slots to samples
        if (sampleSlots.length < 3) {
          const remaining = 3 - sampleSlots.length;
          sampleSlots.push(...slots.slice(0, remaining));
        }
      }

      // Add "+X more" if there are more slots
      if (totalSlots > 3) {
        sampleSlots.push(`+${totalSlots - 3} more`);
      }

      return {
        price,
        availableDate: todayDateStr,
        slots: sampleSlots
      };
    }

    // Check for tomorrow or next available day
    for (let i = 1; i <= 7; i++) {
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + i);
      const futureDayOfWeek = futureDate.getDay();
      const futureDateStr = this.formatDate(futureDate);

      const futureRules = rules.filter(rule => {
        if (rule.type === BackendAvailabilityRuleType.DATE && rule.date === futureDateStr) {
          return true;
        }
        if (rule.type === BackendAvailabilityRuleType.WEEKLY && 
            rule.weekdays && 
            rule.weekdays.includes(futureDayOfWeek)) {
          return true;
        }
        return false;
      });

      if (futureRules.length > 0) {
        
        // Generate sample slots
        const sampleSlots: string[] = [];
        let totalSlots = 0;

        for (const rule of futureRules) {
          const slots = this.generateSlotsFromRule(rule);
          totalSlots += slots.length;
          
          if (sampleSlots.length < 3) {
            const remaining = 3 - sampleSlots.length;
            sampleSlots.push(...slots.slice(0, remaining));
          }
        }

        if (totalSlots > 3) {
          sampleSlots.push(`+${totalSlots - 3} more`);
        }

        return {
          price,
          availableDate: futureDateStr,
          slots: sampleSlots
        };
      }
    }

    // No availability in the next 7 days
    return {
      price,
      availableDate: '',
      slots: []
    };
  }

  private generateSlotsFromRule(rule: any): string[] {
    const slots: string[] = [];
    const startParts = rule.startTime.split(':');
    const endParts = rule.endTime.split(':');
    
    const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
    const slotDuration = rule.slotMinutes || 60;

    let currentMinutes = startMinutes;
    while (currentMinutes + slotDuration <= endMinutes) {
      const hours = Math.floor(currentMinutes / 60);
      const minutes = currentMinutes % 60;
      const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      slots.push(this.time24Pipe.transform(timeStr));
      currentMinutes += slotDuration;
    }

    return slots;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  

  setCourtFilter(v: 'all' | SportKey) {
    this.activeCourtFilter.set(v);
  }

  trackByIndex(index: number) { return index; }

  onEditCourts() { this.editCourtsRequested.emit(); }

  onCourtCardClick(c: CourtListingData) {
    const idNum = Number(c.id);
    if (!Number.isNaN(idNum)) {
      this.manageBookingRequested.emit(idNum);
    }
  }

  courtsBySport(s: SportKey | 'all'): CourtListingData[] {
    const all = this.realCourts();
    console.log('[ClubPreview] courtsBySport called with:', s);
    console.log('[ClubPreview] All courts:', all);
    if (s === 'all') return all;
    const filtered = all.filter(c => c.sport === s);
    console.log('[ClubPreview] Filtered courts:', filtered);
    return filtered;
  }

  // Get unique sports from actual courts
  getUniqueSportsFromCourts(): SportKey[] {
    const courts = this.realCourts();
    const sportsSet = new Set<SportKey>();
    courts.forEach(c => sportsSet.add(c.sport));
    const uniqueSports = Array.from(sportsSet);
    console.log('[ClubPreview] Unique sports from courts:', uniqueSports);
    return uniqueSports;
  }
}
