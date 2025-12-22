import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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

  getCourts(): Observable<CourtSummaryResponse[]> {
    return this.http.get<CourtSummaryResponse[]>(this.courtsUrl);
  }

  getCourtById(id: number): Observable<CourtResponse> {
    return this.http.get<CourtResponse>(`${this.courtsUrl}/${id}`);
  }

  createCourt(details: CourtCreateRequest, images?: File[]): Observable<CourtResponse> {
    const formData = this.buildCourtFormData(details, images);
    return this.http.post<CourtResponse>(this.courtsUrl, formData);
  }

  updateCourt(id: number, details: CourtCreateRequest, images?: File[]): Observable<CourtResponse> {
    const formData = this.buildCourtFormData(details, images);
    return this.http.put<CourtResponse>(`${this.courtsUrl}/${id}`, formData);
  }

  deleteCourt(id: number): Observable<any> {
    return this.http.delete(`${this.courtsUrl}/${id}`);
  }

  deleteCourtPhoto(photoId: number): Observable<any> {
    return this.http.delete(`${this.courtsUrl}/photos/${photoId}`);
  }

  getTimeSlotsByRange(
    courtId: number,
    startTimeISO: string,
    endTimeISO: string,
    availableOnly = false
  ): Observable<import('../models/court.models').BackendTimeSlot[]> {
    const params = new HttpParams()
      .set('startTime', startTimeISO)
      .set('endTime', endTimeISO)
      .set('availableOnly', String(availableOnly));
    const url = `${this.apiBase}/api/admin/slots/timeslots/court/${courtId}/range`;
    return this.http.get<import('../models/court.models').BackendTimeSlot[]>(url, { params });
  }

  private buildCourtFormData(details: CourtCreateRequest, images?: File[]): FormData {
    const formData = new FormData();
    
    const backendDetails = {
      name: details.name,
      sport: details.sport,
      description: details.description || null,
      tags: details.tags,
      equipment: details.equipment.map(this.mapEquipmentToBackend),
      rules: details.rules.map(this.mapRuleToBackend)
    };

    formData.append('details', JSON.stringify(backendDetails));

    if (images && images.length > 0) {
      images.forEach(image => {
        formData.append('images', image);
      });
    }

    return formData;
  }

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

  private mapEquipmentToBackend(equipment: EquipmentItem): CourtEquipmentResponse {
    return {
      name: equipment.name,
      pricePerHour: equipment.pricePerHour
    };
  }

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

    return {
      ...baseRule,
      type: 'weekly',
      weekdays: []
    };
  }

  mapEquipmentToFrontend(equipment: CourtEquipmentResponse): EquipmentItem {
    return {
      name: equipment.name,
      pricePerHour: equipment.pricePerHour
    };
  }

  private generateRuleId(): string {
    return 'rule_' + Math.random().toString(36).slice(2, 10);
  }

  toAbsoluteUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${this.apiBase}${normalized}`;
  }
}
