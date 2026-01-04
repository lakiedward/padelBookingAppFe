import { SportKey } from './club.models';
import { CourtSummaryResponse } from './court.models';

export enum EventStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export type ParticipationType = 'INDIVIDUAL' | 'TEAM';

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

export interface CreateEventRequest {
  name: string;
  description?: string | null;
  sportKey: string;
  format: string;
  startDate: string;
  endDate: string;
  registrationDeadline?: string | null;
  participationType: ParticipationType;
  numberOfTeams?: number | null;
  playersPerTeam?: number | null;
  maxParticipants?: number | null;
  price?: number | null;
  courtIds: number[];
  status?: string;
}

export interface UpdateEventRequest extends CreateEventRequest {
  status: string;
}

export interface EventResponse {
  id: number;
  name: string;
  description: string | null;
  sportKey: string;
  format: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string | null;
  participationType: ParticipationType;
  numberOfTeams: number | null;
  playersPerTeam: number | null;
  maxParticipants: number | null;
  currentParticipants: number;
  price: number | null;
  currency?: string | null;
  status: string;
  coverImageUrl: string | null;
  courts: CourtSummaryResponse[];
  clubId: number;
  clubName: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventSummaryResponse {
  id: number;
  name: string;
  description: string | null;
  sportKey: string;
  format: string;
  startDate: string;
  endDate: string;
  participationType: ParticipationType;
  numberOfTeams: number | null;
  playersPerTeam: number | null;
  maxParticipants: number | null;
  currentParticipants: number;
  price: number | null;
  currency?: string | null;
  status: string;
  coverImageUrl: string | null;
  courtCount: number;
  clubId: number;
  clubName: string;
}

export interface EventPanelData {
  id: number;
  name: string;
  description: string | null;
  sportKey: SportKey;
  format: string;
  startDate: Date;
  endDate: Date;
  registrationDeadline: Date | null;
  participationType: ParticipationType;
  numberOfTeams: number | null;
  playersPerTeam: number | null;
  maxParticipants: number | null;
  currentParticipants: number;
  price: number | null;
  currency?: string | null;
  status: EventStatus;
  coverImageUrl: string | null;
  courtCount: number;
  clubName: string;
}

export function eventSummaryToPanelData(summary: EventSummaryResponse): EventPanelData {
  return {
    id: summary.id,
    name: summary.name,
    description: summary.description,
    sportKey: summary.sportKey as SportKey,
    format: summary.format,
    startDate: new Date(summary.startDate),
    endDate: new Date(summary.endDate),
    registrationDeadline: null,
    participationType: summary.participationType || 'INDIVIDUAL',
    numberOfTeams: summary.numberOfTeams,
    playersPerTeam: summary.playersPerTeam,
    maxParticipants: summary.maxParticipants,
    currentParticipants: summary.currentParticipants,
    price: summary.price,
    currency: summary.currency,
    status: summary.status as EventStatus,
    coverImageUrl: summary.coverImageUrl,
    courtCount: summary.courtCount,
    clubName: summary.clubName
  };
}

export interface EventDetailsData extends EventPanelData {
  courts: CourtSummaryResponse[];
  registrationDeadline: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function eventResponseToDetailsData(response: EventResponse): EventDetailsData {
  return {
    id: response.id,
    name: response.name,
    description: response.description,
    sportKey: response.sportKey as SportKey,
    format: response.format,
    startDate: new Date(response.startDate),
    endDate: new Date(response.endDate),
    registrationDeadline: response.registrationDeadline ? new Date(response.registrationDeadline) : null,
    participationType: response.participationType || 'INDIVIDUAL',
    numberOfTeams: response.numberOfTeams,
    playersPerTeam: response.playersPerTeam,
    maxParticipants: response.maxParticipants,
    currentParticipants: response.currentParticipants,
    price: response.price,
    currency: response.currency,
    status: response.status as EventStatus,
    coverImageUrl: response.coverImageUrl,
    courtCount: response.courts.length,
    clubName: response.clubName,
    courts: response.courts,
    createdAt: new Date(response.createdAt),
    updatedAt: new Date(response.updatedAt)
  };
}
