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
  @Input() mode: 'booking' | 'reservation' = 'booking';
  @Input() isAdmin = false;
  @Output() cardClick = new EventEmitter<void>();

  imageError = false;
  fallbackImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"%3E%3Crect fill="%231a2332" width="400" height="300"/%3E%3Ctext fill="%238aa0b5" font-family="system-ui" font-size="18" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Image Available%3C/text%3E%3C/svg%3E';

  handleCardClick() {
    this.cardClick.emit();
  }

  onImageError() {
    this.imageError = true;
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
