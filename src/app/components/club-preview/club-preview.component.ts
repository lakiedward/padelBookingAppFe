import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClubDetails, SportKey } from '../../models/club.models';
import { Court } from '../../models/court.models';
import { CourtCardComponent } from '../court-card/court-card.component';

@Component({
  selector: 'app-club-preview',
  standalone: true,
  imports: [CommonModule, CourtCardComponent],
  templateUrl: './club-preview.component.html',
  styleUrl: './club-preview.component.scss'
})
export class ClubPreviewComponent {
  @Input() details!: ClubDetails;
  @Output() editRequested = new EventEmitter<void>();

  activeCourtFilter = signal<'all' | SportKey>('all');

  setCourtFilter(v: 'all' | SportKey) {
    this.activeCourtFilter.set(v);
  }

  trackByIndex(index: number) { return index; }

  private buildDemoCourts(): Court[] {
    const loc = this.details?.locations?.[0]?.address || 'Main Sports Complex';
    const courts: Court[] = [];
    for (const s of this.details?.sports || []) {
      const title = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
      courts.push({ id: `${s}-1`, name: `Main ${title} Court`, sport: s, location: loc, tags: ['Outdoor', 'Standard'] });
      if (s === 'padel') {
        courts.push(
          { id: 'padel-2', name: 'Indoor Padel Court', sport: 'padel', location: `${loc} - Indoor Hall`, tags: ['Indoor', 'Glass Walls'] },
          { id: 'padel-3', name: 'West Padel Court', sport: 'padel', location: `${loc} - West Wing`, tags: ['Outdoor', 'Synthetic Clay'] },
        );
      }
      if (s === 'tennis') {
        courts.push({ id: 'tennis-2', name: 'Center Tennis Court', sport: 'tennis', location: loc, tags: ['Outdoor', 'Hard Court'] });
      }
    }
    return courts;
  }

  @Output() editCourtsRequested = new EventEmitter<void>();
  onEditCourts() { this.editCourtsRequested.emit(); }

  courtsBySport(s: SportKey | 'all'): Court[] {
    const all = this.buildDemoCourts();
    if (s === 'all') return all;
    return all.filter(c => c.sport === s);
  }

  onEditCourt(court: Court) {
    console.log('Edit court clicked:', court);
    this.onEditCourts();
  }
}
