import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

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

  onBook() {
    // Placeholder for action; can emit event in future
    // eslint-disable-next-line no-console
    console.log('Book Court clicked:', this.title);
  }
}
