import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  difficulty: string;
  duration: string;
  category: string;
}

@Injectable({
  providedIn: 'root',
})
export class DrupalService {
  private baseUrl = environment.drupalBaseUrl;

  constructor(private http: HttpClient) {}

  getTrainingModules(): Observable<TrainingModule[]> {
    return this.http
      .get<any>(`${this.baseUrl}/jsonapi/node/training_module?include=field_category`)
      .pipe(map((response) => this.mapModules(response)));
  }

  getTrainingModule(id: string): Observable<TrainingModule> {
    return this.http
      .get<any>(`${this.baseUrl}/jsonapi/node/training_module/${id}?include=field_category`)
      .pipe(map((response) => this.mapModule(response.data, response.included || [])));
  }

  getQuizFields(webformId: string): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/webform_rest/${webformId}/fields?_format=json`
    );
  }

  private mapModules(response: any): TrainingModule[] {
    const included = response.included || [];
    return (response.data || []).map((item: any) => this.mapModule(item, included));
  }

  private mapModule(item: any, included: any[]): TrainingModule {
    const attrs = item.attributes;
    const categoryRef = item.relationships?.field_category?.data;
    let category = 'Uncategorized';
    if (categoryRef) {
      const term = included.find(
        (inc: any) => inc.type === categoryRef.type && inc.id === categoryRef.id
      );
      if (term) {
        category = term.attributes.name;
      }
    }
    return {
      id: item.id,
      title: attrs.title,
      description: attrs.field_description || '',
      videoUrl: attrs.field_video_url || '',
      difficulty: attrs.field_difficulty || '',
      duration: attrs.field_duration || '',
      category,
    };
  }
}
