import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DrupalService } from '../../services/drupal.service';
import { ApiService } from '../../services/api.service';

interface QuizQuestion {
  key: string;
  title: string;
  type: string;
  required: boolean;
  options: { key: string; label: string }[];
}

// Answer key from create_quiz_webform.php: Q1=c, Q2=c, Q3=b, Q4=b, Q5=b
const ANSWER_KEY: Record<string, string> = {
  question_1: 'c',
  question_2: 'c',
  question_3: 'b',
  question_4: 'b',
  question_5: 'b',
};

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatRadioModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatChipsModule,
    MatButtonModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="quiz-container">
      <h2>Phishing Awareness Quiz</h2>

      <mat-card class="info-banner" *ngIf="!loading && !error && !submitted">
        <mat-card-content>
          <mat-icon>school</mat-icon>
          <span>Answer all questions, then submit to see your score. This quiz was authored in Drupal Webforms and rendered dynamically via the webform_rest API.</span>
        </mat-card-content>
      </mat-card>

      <mat-card class="result-banner" *ngIf="submitted" [ngClass]="scorePercent >= 80 ? 'result-pass' : 'result-fail'">
        <mat-card-content>
          <mat-icon>{{ scorePercent >= 80 ? 'check_circle' : 'cancel' }}</mat-icon>
          <div>
            <strong>Score: {{ correctCount }} / {{ questions.length }} ({{ scorePercent }}%)</strong>
            <span *ngIf="scorePercent >= 80"> &mdash; Passed!</span>
            <span *ngIf="scorePercent < 80"> &mdash; Please review the training materials and try again.</span>
          </div>
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
        <mat-card *ngFor="let q of questions; let i = index" class="question-card"
          [ngClass]="{'correct': submitted && isCorrect(q.key), 'incorrect': submitted && !isCorrect(q.key) && answers[q.key]}">
          <mat-card-header>
            <mat-card-title>{{ i + 1 }}. {{ q.title }}</mat-card-title>
            <mat-chip-set>
              <mat-chip *ngIf="q.required" color="accent" highlighted>Required</mat-chip>
              <mat-chip *ngIf="submitted && isCorrect(q.key)" class="chip-correct">
                <mat-icon>check</mat-icon> Correct
              </mat-chip>
              <mat-chip *ngIf="submitted && !isCorrect(q.key) && answers[q.key]" class="chip-incorrect">
                <mat-icon>close</mat-icon> Incorrect
              </mat-chip>
            </mat-chip-set>
          </mat-card-header>
          <mat-card-content>
            <!-- Radios -->
            <mat-radio-group *ngIf="q.type === 'radios' || q.type === 'select'"
              [(ngModel)]="answers[q.key]"
              [disabled]="submitted">
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
                [disabled]="submitted"
                class="quiz-option"
              >
                {{ opt.label }}
              </mat-checkbox>
            </div>

            <!-- Textfield / textarea placeholder -->
            <p *ngIf="q.type === 'textfield' || q.type === 'textarea'" class="text-placeholder">
              <mat-icon>edit</mat-icon> Free-text response field
            </p>
          </mat-card-content>
        </mat-card>

        <div class="submit-row" *ngIf="!submitted">
          <button mat-raised-button color="primary" (click)="submitQuiz()"
            [disabled]="submitting || !allAnswered()">
            <mat-icon>send</mat-icon> Submit Quiz
          </button>
          <span *ngIf="!allAnswered()" class="hint">Answer all questions to submit.</span>
        </div>

        <div class="submit-row" *ngIf="submitted">
          <button mat-raised-button color="accent" (click)="resetQuiz()">
            <mat-icon>refresh</mat-icon> Retake Quiz
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .info-banner {
      margin-bottom: 24px;
      background-color: #e3f2fd;
    }
    .info-banner mat-card-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .result-banner {
      margin-bottom: 24px;
    }
    .result-banner mat-card-content {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 16px;
    }
    .result-pass {
      background-color: #c8e6c9;
    }
    .result-fail {
      background-color: #ffcdd2;
    }
    .question-card {
      margin-bottom: 16px;
    }
    .question-card.correct {
      border-left: 4px solid #4caf50;
    }
    .question-card.incorrect {
      border-left: 4px solid #f44336;
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
    .chip-correct { --mdc-chip-elevated-container-color: #c8e6c9; }
    .chip-incorrect { --mdc-chip-elevated-container-color: #ffcdd2; }
    .submit-row {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-top: 24px;
    }
    .hint {
      color: rgba(0, 0, 0, 0.54);
      font-style: italic;
    }
  `],
})
export class QuizComponent implements OnInit {
  questions: QuizQuestion[] = [];
  answers: Record<string, string> = {};
  loading = true;
  submitting = false;
  submitted = false;
  error: string | null = null;
  correctCount = 0;
  scorePercent = 0;

  constructor(
    private drupalService: DrupalService,
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.drupalService.getQuizFields('phishing_awareness_quiz').subscribe({
      next: (fields) => {
        this.questions = this.parseFields(fields);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Could not load quiz fields. Ensure the Drupal webform_rest module is enabled and the webform exists.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  allAnswered(): boolean {
    return this.questions
      .filter((q) => q.type === 'radios' || q.type === 'select')
      .every((q) => !!this.answers[q.key]);
  }

  isCorrect(key: string): boolean {
    return ANSWER_KEY[key] !== undefined && this.answers[key] === ANSWER_KEY[key];
  }

  submitQuiz(): void {
    this.correctCount = Object.keys(ANSWER_KEY).filter((k) => this.answers[k] === ANSWER_KEY[k]).length;
    this.scorePercent = Math.round((this.correctCount / Object.keys(ANSWER_KEY).length) * 100);
    this.submitting = true;

    this.apiService.postResult({
      userId: 'demo-user',
      campaignId: 'phishing_awareness_quiz',
      score: this.scorePercent,
      completedAt: new Date().toISOString(),
    }).subscribe({
      next: () => {
        this.submitted = true;
        this.submitting = false;
        this.snackBar.open(`Score saved: ${this.scorePercent}%`, 'OK', { duration: 4000 });
        this.cdr.detectChanges();
      },
      error: () => {
        // Still show score even if save fails (POC — .NET API may not be reachable in dev)
        this.submitted = true;
        this.submitting = false;
        this.snackBar.open('Score calculated but could not save to server.', 'OK', { duration: 4000 });
        this.cdr.detectChanges();
      },
    });
  }

  resetQuiz(): void {
    this.answers = {};
    this.submitted = false;
    this.correctCount = 0;
    this.scorePercent = 0;
    this.cdr.detectChanges();
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
