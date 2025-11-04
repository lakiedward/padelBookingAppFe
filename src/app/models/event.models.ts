import { SportKey } from './club.models';
import { CourtSummaryResponse } from './court.models';

// ========== ENUMS ==========

export enum EventType {
  TOURNAMENT = 'TOURNAMENT',
  LEAGUE = 'LEAGUE',
  SOCIAL = 'SOCIAL',
  TRAINING = 'TRAINING'
}

export enum EventStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum EventFormat {
  // Padel formats
  AMERICANO = 'AMERICANO',
  MEXICANO = 'MEXICANO',
  MIXED_AMERICANO = 'MIXED_AMERICANO',
  TEAM_AMERICANO = 'TEAM_AMERICANO',
  PADEL_GROUPS = 'PADEL_GROUPS',
  PADEL_KNOCKOUT = 'PADEL_KNOCKOUT',
  KING_OF_COURT = 'KING_OF_COURT',

  // Tennis formats
  ROUND_ROBIN = 'ROUND_ROBIN',
  SINGLE_ELIMINATION = 'SINGLE_ELIMINATION',
  DOUBLE_ELIMINATION = 'DOUBLE_ELIMINATION',
  GROUPS_KNOCKOUT = 'GROUPS_KNOCKOUT'
}

// ========== FORMAT DEFINITIONS BY SPORT ==========

export const PADEL_FORMATS: EventFormat[] = [
  EventFormat.AMERICANO,
  EventFormat.MEXICANO,
  EventFormat.MIXED_AMERICANO,
  EventFormat.TEAM_AMERICANO,
  EventFormat.PADEL_GROUPS,
  EventFormat.PADEL_KNOCKOUT,
  EventFormat.KING_OF_COURT
];

export const TENNIS_FORMATS: EventFormat[] = [
  EventFormat.ROUND_ROBIN,
  EventFormat.SINGLE_ELIMINATION,
  EventFormat.DOUBLE_ELIMINATION,
  EventFormat.GROUPS_KNOCKOUT
];

// Helper function to get formats by sport
export function getFormatsForSport(sportKey: SportKey): EventFormat[] {
  const normalizedSport = sportKey.toLowerCase();
  switch (normalizedSport) {
    case 'padel':
      return PADEL_FORMATS;
    case 'tennis':
      return TENNIS_FORMATS;
    default:
      return [];
  }
}

// Helper function to get display name for format
export function getFormatDisplayName(format: EventFormat): string {
  const displayNames: Record<EventFormat, string> = {
    [EventFormat.AMERICANO]: 'Americano',
    [EventFormat.MEXICANO]: 'Mexicano',
    [EventFormat.MIXED_AMERICANO]: 'Mixed Americano',
    [EventFormat.TEAM_AMERICANO]: 'Team Americano',
    [EventFormat.PADEL_GROUPS]: 'Groups',
    [EventFormat.PADEL_KNOCKOUT]: 'Knockout',
    [EventFormat.KING_OF_COURT]: 'King of the Court',
    [EventFormat.ROUND_ROBIN]: 'Round Robin',
    [EventFormat.SINGLE_ELIMINATION]: 'Single Elimination',
    [EventFormat.DOUBLE_ELIMINATION]: 'Double Elimination',
    [EventFormat.GROUPS_KNOCKOUT]: 'Groups + Knockout'
  };
  return displayNames[format] || format;
}

// Helper function to get display name for event type
export function getEventTypeDisplayName(type: EventType): string {
  const displayNames: Record<EventType, string> = {
    [EventType.TOURNAMENT]: 'Tournament',
    [EventType.LEAGUE]: 'League',
    [EventType.SOCIAL]: 'Social',
    [EventType.TRAINING]: 'Training'
  };
  return displayNames[type] || type;
}

// Helper function to get display name for status
export function getStatusDisplayName(status: EventStatus): string {
  const displayNames: Record<EventStatus, string> = {
    [EventStatus.DRAFT]: 'Draft',
    [EventStatus.PUBLISHED]: 'Published',
    [EventStatus.ONGOING]: 'Ongoing',
    [EventStatus.COMPLETED]: 'Completed',
    [EventStatus.CANCELLED]: 'Cancelled'
  };
  return displayNames[status] || status;
}

// ========== REQUEST DTOs ==========

export interface CreateEventRequest {
  name: string;
  description?: string | null;
  eventType: string; // EventType as string
  sportKey: string;  // SportKey as string
  format: string;    // EventFormat as string
  startDate: string; // yyyy-MM-dd
  endDate: string;   // yyyy-MM-dd
  registrationDeadline?: string | null; // yyyy-MM-dd
  maxParticipants?: number | null;
  price?: number | null;
  courtIds: number[];
}

export interface UpdateEventRequest extends CreateEventRequest {
  status: string; // EventStatus as string
}

// ========== RESPONSE DTOs ==========

export interface EventResponse {
  id: number;
  name: string;
  description: string | null;
  eventType: string;
  sportKey: string;
  format: string;
  startDate: string; // yyyy-MM-dd
  endDate: string;   // yyyy-MM-dd
  registrationDeadline: string | null;
  maxParticipants: number | null;
  currentParticipants: number;
  price: number | null;
  status: string;
  coverImageUrl: string | null;
  courts: CourtSummaryResponse[];
  clubId: number;
  clubName: string;
  createdAt: string; // ISO LocalDateTime
  updatedAt: string; // ISO LocalDateTime
}

export interface EventSummaryResponse {
  id: number;
  name: string;
  description: string | null;
  eventType: string;
  sportKey: string;
  format: string;
  startDate: string; // yyyy-MM-dd
  endDate: string;   // yyyy-MM-dd
  maxParticipants: number | null;
  currentParticipants: number;
  price: number | null;
  status: string;
  coverImageUrl: string | null;
  courtCount: number;
  clubId: number;
  clubName: string;
}

// ========== UI MODELS ==========

// For displaying events in panels/cards
export interface EventPanelData {
  id: number;
  name: string;
  description: string | null;
  eventType: EventType;
  sportKey: SportKey;
  format: EventFormat;
  startDate: Date;
  endDate: Date;
  registrationDeadline: Date | null;
  maxParticipants: number | null;
  currentParticipants: number;
  price: number | null;
  status: EventStatus;
  coverImageUrl: string | null;
  courtCount: number;
  clubName: string;
}

// Convert backend response to UI model
export function eventSummaryToPanelData(summary: EventSummaryResponse): EventPanelData {
  return {
    id: summary.id,
    name: summary.name,
    description: summary.description,
    eventType: summary.eventType as EventType,
    sportKey: summary.sportKey as SportKey,
    format: summary.format as EventFormat,
    startDate: new Date(summary.startDate),
    endDate: new Date(summary.endDate),
    registrationDeadline: null, // Not in summary
    maxParticipants: summary.maxParticipants,
    currentParticipants: summary.currentParticipants,
    price: summary.price,
    status: summary.status as EventStatus,
    coverImageUrl: summary.coverImageUrl,
    courtCount: summary.courtCount,
    clubName: summary.clubName
  };
}

// For event details
export interface EventDetailsData extends EventPanelData {
  courts: CourtSummaryResponse[];
  registrationDeadline: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Convert backend response to UI details model
export function eventResponseToDetailsData(response: EventResponse): EventDetailsData {
  return {
    id: response.id,
    name: response.name,
    description: response.description,
    eventType: response.eventType as EventType,
    sportKey: response.sportKey as SportKey,
    format: response.format as EventFormat,
    startDate: new Date(response.startDate),
    endDate: new Date(response.endDate),
    registrationDeadline: response.registrationDeadline ? new Date(response.registrationDeadline) : null,
    maxParticipants: response.maxParticipants,
    currentParticipants: response.currentParticipants,
    price: response.price,
    status: response.status as EventStatus,
    coverImageUrl: response.coverImageUrl,
    courtCount: response.courts.length,
    clubName: response.clubName,
    courts: response.courts,
    createdAt: new Date(response.createdAt),
    updatedAt: new Date(response.updatedAt)
  };
}
