import { Injectable, signal } from '@angular/core';
import { ClubDetails } from '../models/club.models';

@Injectable({ providedIn: 'root' })
export class ClubService {
  // Holds the last saved club details in-memory only (no persistence)
  lastSaved = signal<ClubDetails | null>(null);

  constructor() {}

  saveClub(details: ClubDetails): void {
    // Do not persist to localStorage or any storage. Just keep it in memory and log.
    this.lastSaved.set(details);
    console.log('Club details (non-persistent):', details);
  }
}
