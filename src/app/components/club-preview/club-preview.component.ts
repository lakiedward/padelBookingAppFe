import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClubDetails } from '../../models/club.models';

@Component({
  selector: 'app-club-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './club-preview.component.html',
  styleUrl: './club-preview.component.scss'
})
export class ClubPreviewComponent {
  @Input() details!: ClubDetails;
  @Output() editRequested = new EventEmitter<void>();

  // Courts filter state (All / Padel / Tennis)
  activeCourtFilter = signal<'all' | 'padel' | 'tennis'>('all');

  setCourtFilter(v: 'all' | 'padel' | 'tennis') {
    this.activeCourtFilter.set(v);
  }

  trackByIndex(index: number) { return index; }
}
