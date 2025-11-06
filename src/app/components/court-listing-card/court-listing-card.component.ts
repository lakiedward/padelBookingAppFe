import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-court-listing-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './court-listing-card.component.html',
  styleUrl: './court-listing-card.component.scss'
})
export class CourtListingCardComponent {
  @Input() image = '';
  @Input() emoji = '';
  @Input() title = '';
  @Input() club = '';
  @Input() location = '';
  @Input() price = '';
  @Input() unit = 'per hour';
  @Input() tags: string[] = [];
  @Input() availableDate = '';
  @Input() slots: string[] = [];
  @Input() mode: 'booking' | 'reservation' = 'booking'; // 'booking' for browse, 'reservation' for calendar
  @Output() cardClick = new EventEmitter<void>();

  handleCardClick() {
    this.cardClick.emit();
  }

  onPrimaryAction(event: Event) {
    event.stopPropagation();
    this.cardClick.emit();
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.cardClick.emit();
    }
  }
}
