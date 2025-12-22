import { SportKey } from './club.models';

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface RuleBase {
  id: string;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  price: number;
}

export interface WeeklyRule extends RuleBase {
  type: 'weekly';
  weekdays: Weekday[];
}

export interface DateRule extends RuleBase {
  type: 'date';
  date: string;
}

export type AvailabilityRule = WeeklyRule | DateRule;

export interface EquipmentItem {
  name: string;
  pricePerHour: number;
}

export interface CourtCreateRequest {
  name: string;
  sport: SportKey;
  description?: string | null;
  tags: string[];
  rules: AvailabilityRule[];
  equipment: EquipmentItem[];
}

export interface CourtCreatePayload extends CourtCreateRequest {
  images?: File[];
}

export interface Court {
  id: string;
  name: string;
  sport: SportKey;
  location: string;
  tags?: string[];
  imageUrl?: string | null;
}

export enum BackendAvailabilityRuleType {
  WEEKLY = 'WEEKLY',
  DATE = 'DATE'
}

export interface CourtEquipmentResponse {
  name: string;
  pricePerHour: number;
  currency?: string;
}

export interface CourtAvailabilityRuleResponse {
  id?: number | null;
  type: BackendAvailabilityRuleType;
  weekdays?: number[] | null;
  date?: string | null;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  price: number;
  currency?: string;
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

export interface BackendTimeSlot {
  id: number;
  startTime: string;
  endTime: string;
  price: number;
  available: boolean;
}

export interface PublicAvailableTimeSlot {
  id: number;
  courtId: number;
  courtName: string;
  activityId: number;
  activityName: string;
  startTime: string;
  endTime: string;
  price: number;
  duration: number;
  currency?: string;
}