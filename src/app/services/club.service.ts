import { Injectable } from '@angular/core';
import { ClubDetails } from '../models/club.models';

@Injectable({ providedIn: 'root' })
export class ClubService {
  saveClub(details: ClubDetails): void {
    try {
      console.log(JSON.stringify(details));
    } catch (e) {
      console.warn('Failed to persist club details', e);
    }
  }
}
