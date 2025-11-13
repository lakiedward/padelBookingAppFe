import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ConnectInitRequest { country?: string }
export interface ConnectInitResponse { url: string }
export interface StripeStatusResponse { chargesEnabled: boolean; payoutsEnabled: boolean; requirementsCurrentlyDue: string[] }

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiBaseUrl;

  initConnect(req?: ConnectInitRequest): Observable<ConnectInitResponse> {
    return this.http.post<ConnectInitResponse>(`${this.apiBase}/api/admin/payments/connect/init`, req || {});
  }

  getStatus(): Observable<StripeStatusResponse> {
    return this.http.get<StripeStatusResponse>(`${this.apiBase}/api/admin/payments/connect/status`);
  }
}
