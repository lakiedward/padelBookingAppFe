import { SportKey } from './club.models';

// Weekday number, Sunday = 0
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// Availability rules
export interface RuleBase {
  id: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  slotMinutes: number;
  price: number;
}

export interface WeeklyRule extends RuleBase {
  type: 'weekly';
  weekdays: Weekday[]; // e.g. [1] for Monday
}

export interface DateRule extends RuleBase {
  type: 'date';
  date: string; // yyyy-MM-dd
}

export type AvailabilityRule = WeeklyRule | DateRule;

// Equipment available for rent/use on a court
export interface EquipmentItem {
  name: string;
  pricePerHour: number;
}


// Create/update payloads (frontend model)
export interface CourtCreateRequest {
  name: string;
  sport: SportKey;
  tags: string[];
  rules: AvailabilityRule[];
  equipment: EquipmentItem[];
}

export interface CourtCreatePayload extends CourtCreateRequest {
  images?: File[]; // sent via multipart like club media
}

// Court entity used for display (public/admin)
export interface Court {
  id: string;
  name: string;
  sport: SportKey;
  location: string;
  tags?: string[];
  imageUrl?: string | null;
}
