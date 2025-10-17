import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  CourtResponse,
  CourtSummaryResponse,
  CourtCreateRequest,
  AvailabilityRule,
  BackendAvailabilityRuleType,
  CourtAvailabilityRuleResponse,
  EquipmentItem,
  CourtEquipmentResponse
} from '../models/court.models';

@Injectable({ providedIn: 'root' })
export class CourtService {
  private apiBase = environment.apiBaseUrl;
  private courtsUrl = `${this.apiBase}/api/admin/courts`;

  constructor(private http: HttpClient) {}

  // GET /api/admin/courts - Get all courts for current admin
  getCourts(): Observable<CourtSummaryResponse[]> {
    console.log('[CourtService] getCourts() - Making request to:', this.courtsUrl);
    return this.http.get<CourtSummaryResponse[]>(this.courtsUrl);
  }

  // GET /api/admin/courts/{id} - Get specific court details
  getCourtById(id: number): Observable<CourtResponse> {
    return this.http.get<CourtResponse>(`${this.courtsUrl}/${id}`);
  }

  // POST /api/admin/courts - Create new court
  createCourt(details: CourtCreateRequest, images?: File[]): Observable<CourtResponse> {
    const formData = this.buildCourtFormData(details, images);
    return this.http.post<CourtResponse>(this.courtsUrl, formData);
  }

  // PUT /api/admin/courts/{id} - Update existing court
  updateCourt(id: number, details: CourtCreateRequest, images?: File[]): Observable<CourtResponse> {
    const formData = this.buildCourtFormData(details, images);
    return this.http.put<CourtResponse>(`${this.courtsUrl}/${id}`, formData);
  }

  // DELETE /api/admin/courts/{id} - Delete court
  deleteCourt(id: number): Observable<any> {
    return this.http.delete(`${this.courtsUrl}/${id}`);
  }

  // DELETE /api/admin/courts/photos/{photoId} - Delete court photo
  deleteCourtPhoto(photoId: number): Observable<any> {
    return this.http.delete(`${this.courtsUrl}/photos/${photoId}`);
  }

  // ========== HELPER METHODS ==========

  // Build FormData for multipart request
  private buildCourtFormData(details: CourtCreateRequest, images?: File[]): FormData {
    const formData = new FormData();
    
    // Convert frontend model to backend DTO
    const backendDetails = {
      name: details.name,
      sport: details.sport,
      description: details.description || null,
      tags: details.tags,
      equipment: details.equipment.map(this.mapEquipmentToBackend),
      rules: details.rules.map(this.mapRuleToBackend)
    };

    formData.append('details', JSON.stringify(backendDetails));

    // Add images if provided
    if (images && images.length > 0) {
      images.forEach(image => {
        formData.append('images', image);
      });
    }

    return formData;
  }

  // Map frontend rule to backend rule
  private mapRuleToBackend(rule: AvailabilityRule): any {
    const baseRule = {
      type: rule.type === 'weekly' ? BackendAvailabilityRuleType.WEEKLY : BackendAvailabilityRuleType.DATE,
      startTime: rule.startTime,
      endTime: rule.endTime,
      slotMinutes: rule.slotMinutes,
      price: rule.price
    };

    if (rule.type === 'weekly') {
      return {
        ...baseRule,
        weekdays: rule.weekdays
      };
    } else {
      return {
        ...baseRule,
        date: rule.date
      };
    }
  }

  // Map frontend equipment to backend equipment
  private mapEquipmentToBackend(equipment: EquipmentItem): CourtEquipmentResponse {
    return {
      name: equipment.name,
      pricePerHour: equipment.pricePerHour
    };
  }

  // Map backend rule to frontend rule
  mapRuleToFrontend(rule: CourtAvailabilityRuleResponse): AvailabilityRule {
    const baseRule = {
      id: rule.id ? String(rule.id) : this.generateRuleId(),
      startTime: rule.startTime,
      endTime: rule.endTime,
      slotMinutes: rule.slotMinutes,
      price: rule.price
    };

    if (rule.type === BackendAvailabilityRuleType.WEEKLY && rule.weekdays) {
      return {
        ...baseRule,
        type: 'weekly',
        weekdays: rule.weekdays as any
      };
    } else if (rule.type === BackendAvailabilityRuleType.DATE && rule.date) {
      return {
        ...baseRule,
        type: 'date',
        date: rule.date
      };
    }

    // Fallback to weekly with empty weekdays
    return {
      ...baseRule,
      type: 'weekly',
      weekdays: []
    };
  }

  // Map backend equipment to frontend equipment
  mapEquipmentToFrontend(equipment: CourtEquipmentResponse): EquipmentItem {
    return {
      name: equipment.name,
      pricePerHour: equipment.pricePerHour
    };
  }

  // Generate unique rule ID for frontend
  private generateRuleId(): string {
    return 'rule_' + Math.random().toString(36).slice(2, 10);
  }

  // Helper to convert relative URLs to absolute
  toAbsoluteUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${this.apiBase}${normalized}`;
  }
}

