import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SimulationResult {
  id?: number;
  userId: string;
  campaignId: string;
  score: number;
  completedAt: string;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  postResult(result: SimulationResult): Observable<SimulationResult> {
    return this.http.post<SimulationResult>(`${this.baseUrl}/api/results`, result);
  }

  getScores(): Observable<SimulationResult[]> {
    return this.http.get<SimulationResult[]>(`${this.baseUrl}/api/scores`);
  }
}
