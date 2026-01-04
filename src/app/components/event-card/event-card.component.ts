import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConvertMoneyPipe } from '../../pipes/convert-money.pipe';
import { PublicService } from '../../services/public.service';
import {
  EventPanelData,
  EventStatus,
  getStatusDisplayName
} from '../../models/event.models';
import { SportKey } from '../../models/club.models';

@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [CommonModule, ConvertMoneyPipe],
  templateUrl: './event-card.component.html',
  styleUrls: ['./event-card.component.scss']
})
export class EventCardComponent {
  @Input() event!: EventPanelData;
  @Input() isAuthenticated: boolean = false;
  @Input() isJoined: boolean = false;
  @Output() cardClick = new EventEmitter<number>();
  @Output() viewDetailsClick = new EventEmitter<number>();

  constructor(private readonly publicService: PublicService) {}

  protected formatDateRange(event: EventPanelData): string {
    const start = event.startDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short'
    });
    const end = event.endDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short'
    });
    return `${start} – ${end}`;
  }

  protected formatEventFormat(event: EventPanelData): string {
    return event.format;
  }

  protected formatStatus(event: EventPanelData): string {
    return getStatusDisplayName(event.status);
  }

  protected cardStatusClass(event: EventPanelData): string {
    switch (event.status) {
      case EventStatus.PUBLISHED:
      case EventStatus.ONGOING:
        return 'badge--primary';
      case EventStatus.COMPLETED:
        return 'badge--muted';
      case EventStatus.CANCELLED:
        return 'badge--danger';
      default:
        return 'badge--warning';
    }
  }

  protected coverImageUrl(event: EventPanelData): string | null {
    return this.publicService.toAbsoluteUrl(event.coverImageUrl);
  }

  protected sportIcon(sportKey: SportKey): string | null {
    const sportName = sportKey.toLowerCase().trim();
    
    const sportMap: { [key: string]: string } = {
      'tennis': 'assets/icons/tennis.svg',
      'padel': 'assets/icons/padel.svg',
      'football': 'assets/icons/football.svg',
      'soccer': 'assets/icons/football.svg',
      'basketball': 'assets/icons/basketball.svg',
      'volleyball': 'assets/icons/volleyball.svg',
      'badminton': 'assets/icons/badminton.svg',
      'squash': 'assets/icons/squash.svg',
      'handball': 'assets/icons/handball.svg',
      'pingpong': 'assets/icons/pingpong.svg',
      'ping pong': 'assets/icons/pingpong.svg',
      'table tennis': 'assets/icons/pingpong.svg',
      'table-tennis': 'assets/icons/pingpong.svg'
    };
    
    return sportMap[sportName] || null;
  }

  onCardClick(): void {
    this.cardClick.emit(this.event.id);
  }

  onViewDetailsClick(event: Event): void {
    event.stopPropagation();
    this.viewDetailsClick.emit(this.event.id);
  }
}
