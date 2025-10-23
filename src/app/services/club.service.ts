import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ClubDetails } from '../models/club.models';

export interface ClubLocationDto {
  address: string;
  lat: number;
  lng: number;
}

export interface ClubDetailsRequest {
  name: string;
  email: string;
  phone: string;
  description?: string | null;
  locations: ClubLocationDto[];
  sports: string[];
}

export interface ClubDetailsResponse {
  id: number;
  name: string;
  email: string;
  phone: string;
  description: string | null;
  locations: ClubLocationDto[];
  sports: string[];
  profileImageUrl?: string | null;
  wallpaperImageUrl?: string | null;
  updatedAt: string; // ISO string from backend LocalDateTime
}

@Injectable({ providedIn: 'root' })
export class ClubService {
  lastSaved = signal<ClubDetails | null>(null);

  // Base API (align with AuthService target)
  private apiBase = 'https://padelbookingappbe-production.up.railway.app';
  private adminClubUrl = `${this.apiBase}/api/admin/club`;

  constructor(private http: HttpClient) {}

  // GET /api/admin/club
  getMyClub(): Observable<ClubDetails> {
    return this.http
      .get<ClubDetailsResponse>(this.adminClubUrl)
      .pipe(map((res) => this.toClubDetails(res)));
  }

  // POST /api/admin/club/create (multipart)
  createClub(details: ClubDetailsRequest, profileImage?: File | null, wallpaperImage?: File | null): Observable<ClubDetails> {
    const fd = this.buildFormData(details, profileImage, wallpaperImage);
    return this.http
      .post<ClubDetailsResponse>(`${this.adminClubUrl}/create`, fd)
      .pipe(map((res) => this.toClubDetails(res)));
  }

  // PUT /api/admin/club (multipart)
  updateClub(details: ClubDetailsRequest, profileImage?: File | null, wallpaperImage?: File | null): Observable<ClubDetails> {
    const fd = this.buildFormData(details, profileImage, wallpaperImage);
    return this.http
      .put<ClubDetailsResponse>(this.adminClubUrl, fd)
      .pipe(map((res) => this.toClubDetails(res)));
  }

  // DELETE /api/admin/club
  deleteClub(): Observable<void> {
    return this.http.delete<void>(this.adminClubUrl);
  }

  // Helpers
  private buildFormData(details: ClubDetailsRequest, profileImage?: File | null, wallpaperImage?: File | null): FormData {
    const fd = new FormData();
    fd.append('details', JSON.stringify(details));
    if (profileImage) fd.append('profileImage', profileImage);
    if (wallpaperImage) fd.append('wallpaperImage', wallpaperImage);
    return fd;
  }

  private toClubDetails(res: ClubDetailsResponse): ClubDetails {
    const mapped: ClubDetails = {
      id: String(res.id),
      name: res.name,
      email: res.email,
      phone: res.phone,
      description: res.description,
      locations: res.locations,
      sports: (res.sports || []) as any,
      profileImageUrl: this.toAbsoluteUrl(res.profileImageUrl),
      wallpaperImageUrl: this.toAbsoluteUrl(res.wallpaperImageUrl),
      updatedAt: typeof res.updatedAt === 'string' ? res.updatedAt : String(res.updatedAt as any)
    };
    this.lastSaved.set(mapped);
    return mapped;
  }


  private toAbsoluteUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${this.apiBase}${normalized}`;
  }

}
