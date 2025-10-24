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
  description?: string | null;
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

// ========== BACKEND DTOs ==========

// Backend enum types (uppercase)
export enum BackendAvailabilityRuleType {
  WEEKLY = 'WEEKLY',
  DATE = 'DATE'
}

// Backend response interfaces
export interface CourtEquipmentResponse {
  name: string;
  pricePerHour: number;
}

export interface CourtAvailabilityRuleResponse {
  id?: number | null;
  type: BackendAvailabilityRuleType;
  weekdays?: number[] | null;
  date?: string | null; // LocalDate as string
  startTime: string;
  endTime: string;
  slotMinutes: number;
  price: number;
}

export interface CourtPhotoResponse {
  id: number;
  originalName: string | null;
  contentType: string | null;
  size: number | null;
  isPrimary: boolean;
  orderIndex: number;
  url: string;
}

export interface ActivityResponse {
  id: number;
  name: string;
  description: string | null;
  picture: string | null;
}

export interface CourtResponse {
  id: number;
  name: string;
  sport: string;
  description: string | null;
  tags: string[];
  equipment: CourtEquipmentResponse[];
  availabilityRules: CourtAvailabilityRuleResponse[];
  photos: CourtPhotoResponse[];
  picture: string | null;
  activity: ActivityResponse;
  clubId: number;
  clubName: string;
  clubLocation?: { address: string; lat: number; lng: number };
}

export interface CourtSummaryResponse {
  id: number;
  name: string;
  description: string | null;
  sport: string;
  tags: string[];
  picture: string | null;
  primaryPhotoUrl: string | null;
  activityId: number;
  activityName: string;
  clubId: number;
  clubName: string;
}

// Backend time slot response (admin)
export interface BackendTimeSlot {
  id: number;
  startTime: string; // ISO LocalDateTime
  endTime: string;   // ISO LocalDateTime
  price: number;
  available: boolean;
}

// Public available timeslot response
export interface PublicAvailableTimeSlot {
  id: number;
  courtId: number;
  courtName: string;
  activityId: number;
  activityName: string;
  startTime: string; // ISO LocalDateTime
  endTime: string;   // ISO LocalDateTime
  price: number;
  duration: number; // minutes
}