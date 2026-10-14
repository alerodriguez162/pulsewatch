import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import type {
  DashboardResponse,
  Endpoint,
  EndpointDraft,
  Incident,
  ProbeObservation,
  ProbeResult,
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);

  dashboard() {
    return this.http.get<DashboardResponse>('/api/dashboard');
  }

  listEndpoints() {
    return this.http.get<Endpoint[]>('/api/endpoints');
  }

  getEndpoint(id: string) {
    return this.http.get<Endpoint>(`/api/endpoints/${id}`);
  }

  createEndpoint(draft: EndpointDraft) {
    return this.http.post<Endpoint>('/api/endpoints', draft);
  }

  updateEndpoint(id: string, draft: EndpointDraft) {
    return this.http.patch<Endpoint>(`/api/endpoints/${id}`, draft);
  }

  deleteEndpoint(id: string) {
    return this.http.delete<void>(`/api/endpoints/${id}`);
  }

  history(id: string) {
    return this.http.get<ProbeResult[]>(`/api/endpoints/${id}/history`);
  }

  check(id: string) {
    return this.http.post<ProbeObservation>(`/api/endpoints/${id}/check`, {});
  }

  incidents(endpointId?: string) {
    const params = endpointId ? { endpointId } : undefined;
    return this.http.get<Incident[]>('/api/incidents', { params });
  }
}
