import { Component, EventEmitter, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  id: string;
  title: string;
  subtitle: string;
  price: string;
  imageUrl?: string | null;
  status?: 'Active' | 'Inactive';
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

  courts: CourtPanelData[] = [
    {
      id: 'c1',
      title: 'Court 1',
      subtitle: 'Indoor • Hard court',
      price: '€50',
      imageUrl: null,
      status: 'Active'
    },
    {
      id: 'c2',
      title: 'VXVCXCV',
      subtitle: 'Indoor • Hard court',
      price: '€50',
      imageUrl: null,
      status: 'Active'
    }
  ];

  days: DaySchedule[] = [];

  ngOnInit(): void {
    this.days = this.build7DayCalendar();
  }

  onAddCourtClick() { this.addCourt.emit(); }

  private build7DayCalendar(): DaySchedule[] {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const schedules: DaySchedule[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const label = `${dayNames[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}`;
      const slots: TimeSlot[] = (i === 1 || i === 2 || i === 3 || i === 4 || i === 5)
        ? [
            { label: '08:00 – 10:00', note: 'every 60 min', price: '€50', tone: 'green' },
            { label: '10:00 – 22:00', note: 'every 60 min', price: '€50', tone: 'blue' },
          ]
        : [];
      schedules.push({ day: label, slots });
    }
    return schedules;
  }

  trackByIndex(index: number) { return index; }
}
