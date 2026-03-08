import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { DrupalService } from '../../services/drupal.service';

interface QuizQuestion {
  key: string;
  title: string;
  type: string;
  required: boolean;
  options: { key: string; label: string }[];
}

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatRadioModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatChipsModule,
  ],
  template: `
    <div class="quiz-container">
      <h2>Phishing Awareness Quiz</h2>

      <mat-card class="preview-banner" *ngIf="!loading && !error">
        <mat-card-content>
          <mat-icon>visibility</mat-icon>
          <span>Read-only preview &mdash; this quiz was built in Drupal Webforms and rendered here via the webform_rest API.</span>
        </mat-card-content>
      </mat-card>

      <div *ngIf="loading" class="loading-container">
        <mat-spinner diameter="48"></mat-spinner>
      </div>

      <div *ngIf="error" class="error-container">
        <mat-card>
          <mat-card-content>
            <mat-icon color="warn">error</mat-icon>
            <span>{{ error }}</span>
          </mat-card-content>
        </mat-card>
      </div>

      <div *ngIf="!loading && !error" class="questions-list">
        <mat-card *ngFor="let q of questions; let i = index" class="question-card">
          <mat-card-header>
            <mat-card-title>{{ i + 1 }}. {{ q.title }}</mat-card-title>
            <mat-chip-set *ngIf="q.required">
              <mat-chip color="accent" highlighted>Required</mat-chip>
            </mat-chip-set>
          </mat-card-header>
          <mat-card-content>
            <!-- Radios -->
            <mat-radio-group *ngIf="q.type === 'radios'" [disabled]="true">
              <mat-radio-button
                *ngFor="let opt of q.options"
                [value]="opt.key"
                class="quiz-option"
              >
                {{ opt.label }}
              </mat-radio-button>
            </mat-radio-group>

            <!-- Checkboxes -->
            <div *ngIf="q.type === 'checkboxes'" class="checkbox-group">
              <mat-checkbox
                *ngFor="let opt of q.options"
                [disabled]="true"
                class="quiz-option"
              >
                {{ opt.label }}
              </mat-checkbox>
            </div>

            <!-- Select (render as radio for read-only) -->
            <mat-radio-group *ngIf="q.type === 'select'" [disabled]="true">
              <mat-radio-button
                *ngFor="let opt of q.options"
                [value]="opt.key"
                class="quiz-option"
              >
                {{ opt.label }}
              </mat-radio-button>
            </mat-radio-group>

            <!-- Textfield / textarea placeholder -->
            <p *ngIf="q.type === 'textfield' || q.type === 'textarea'" class="text-placeholder">
              <mat-icon>edit</mat-icon> Free-text response field
            </p>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .preview-banner {
      margin-bottom: 24px;
      background-color: #e3f2fd;
    }
    .preview-banner mat-card-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .question-card {
      margin-bottom: 16px;
    }
    .question-card mat-card-header {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .quiz-option {
      display: block;
      margin: 8px 0;
    }
    .checkbox-group {
      display: flex;
      flex-direction: column;
    }
    .text-placeholder {
      color: rgba(0, 0, 0, 0.54);
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .loading-container {
      display: flex;
      justify-content: center;
      padding: 64px;
    }
    .error-container mat-card-content {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #c62828;
    }
  `],
})
export class QuizComponent implements OnInit {
  questions: QuizQuestion[] = [];
  loading = true;
  error: string | null = null;

  constructor(private drupalService: DrupalService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.drupalService.getQuizFields('phishing_awareness_quiz').subscribe({
      next: (fields) => {
        this.questions = this.parseFields(fields);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = 'Could not load quiz fields. Ensure the Drupal webform_rest module is enabled and the webform exists.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private parseFields(fields: any): QuizQuestion[] {
    return Object.entries(fields)
      .filter(([key, _]) => !key.startsWith('actions'))
      .map(([key, field]: [string, any]) => {
        const options = field['#options']
          ? Object.entries(field['#options']).map(([k, v]: [string, any]) => ({
              key: k,
              label: typeof v === 'string' ? v : String(v),
            }))
          : [];
        return {
          key,
          title: field['#title'] || key,
          type: field['#type'] || 'textfield',
          required: !!field['#required'],
          options,
        };
      });
  }
}
