import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CampaignResult {
  id: string;
  status: string;
  ip: string;
  latitude: number;
  longitude: number;
  send_date: string;
  reported: boolean;
  modified_date: string;
  email: string;
  first_name: string;
  last_name: string;
  position: string;
}

export interface Campaign {
  id: number;
  name: string;
  created_date: string;
  launch_date: string;
  send_by_date: string;
  completed_date: string;
  status: string;
  results: CampaignResult[];
  url: string;
}

@Injectable({
  providedIn: 'root',
})
export class GophishService {
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getCampaigns(): Observable<Campaign[]> {
    return this.http.get<Campaign[]>(`${this.baseUrl}/api/campaigns`);
  }

  getCampaign(id: number): Observable<Campaign> {
    return this.http.get<Campaign>(`${this.baseUrl}/api/campaigns/${id}`);
  }

  getCampaignResults(id: number): Observable<CampaignResult[]> {
    return this.http.get<CampaignResult[]>(`${this.baseUrl}/api/campaigns/${id}/results`);
  }
}
