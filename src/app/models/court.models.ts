import { SportKey } from './club.models';

export interface Court {
  id: string;
  name: string;
  sport: SportKey;
  location: string;
  tags?: string[];
  imageUrl?: string | null;
}

