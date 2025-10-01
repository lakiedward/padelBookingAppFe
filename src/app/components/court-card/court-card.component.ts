import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Court } from '../../models/court.models';

@Component({
  selector: 'app-court-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './court-card.component.html',
  styleUrl: './court-card.component.scss'
})
export class CourtCardComponent {
  @Input({ required: true }) court!: Court;
  @Output() edit = new EventEmitter<Court>();

  onEditClick() {
    this.edit.emit(this.court);
  }
}

