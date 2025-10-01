export interface ClubLocation {
  address: string;
  lat: number;
  lng: number;
}

export type SportKey =
  | 'tennis'
  | 'padel'
  | 'football'
  | 'basketball'
  | 'volleyball'
  | 'badminton'
  | 'squash'
  | 'pingpong'
  | 'handball';

export const SPORT_OPTIONS: SportKey[] = [
  'tennis',
  'padel',
  'football',
  'basketball',
  'volleyball',
  'badminton',
  'squash',
  'pingpong',
  'handball'
];

export interface ClubDetails {
  id?: string;
  name: string;
  email: string;
  phone: string;
  description?: string | null;
  locations: ClubLocation[];
  sports: SportKey[];
  profileImageUrl?: string | null;
  wallpaperImageUrl?: string | null;
  updatedAt: string;
}
