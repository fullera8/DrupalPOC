import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { ApiService, SimulationResult } from '../../services/api.service';
import { GophishService, Campaign, CampaignResult } from '../../services/gophish.service';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatTabsModule,
  ],
  template: `
    <div class="results-container">
      <h2>Simulation Results</h2>

      <mat-tab-group>
        <!-- TAB 1: Quiz Results (from .NET API) -->
        <mat-tab label="Quiz Scores">
          <div class="tab-body">
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

            <div *ngIf="!loading && !error && results.length === 0" class="empty-container">
              <mat-card>
                <mat-card-content>
                  <mat-icon>inbox</mat-icon>
                  <span>No results yet. Complete a quiz to see scores here.</span>
                </mat-card-content>
              </mat-card>
            </div>

            <div *ngIf="!loading && !error && results.length > 0">
              <mat-card class="summary-card">
                <mat-card-content>
                  <div class="summary-stats">
                    <div class="stat">
                      <span class="stat-value">{{ results.length }}</span>
                      <span class="stat-label">Total Attempts</span>
                    </div>
                    <div class="stat">
                      <span class="stat-value">{{ averageScore }}%</span>
                      <span class="stat-label">Average Score</span>
                    </div>
                    <div class="stat">
                      <span class="stat-value">{{ passRate }}%</span>
                      <span class="stat-label">Pass Rate (&ge;80%)</span>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>

              <table mat-table [dataSource]="results" class="results-table">
                <ng-container matColumnDef="userId">
                  <th mat-header-cell *matHeaderCellDef>User</th>
                  <td mat-cell *matCellDef="let r">{{ r.userId }}</td>
                </ng-container>
                <ng-container matColumnDef="campaignId">
                  <th mat-header-cell *matHeaderCellDef>Campaign / Quiz</th>
                  <td mat-cell *matCellDef="let r">{{ r.campaignId }}</td>
                </ng-container>
                <ng-container matColumnDef="score">
                  <th mat-header-cell *matHeaderCellDef>Score</th>
                  <td mat-cell *matCellDef="let r">
                    <mat-chip [ngClass]="r.score >= 80 ? 'chip-pass' : 'chip-fail'">
                      {{ r.score }}%
                    </mat-chip>
                  </td>
                </ng-container>
                <ng-container matColumnDef="completedAt">
                  <th mat-header-cell *matHeaderCellDef>Completed</th>
                  <td mat-cell *matCellDef="let r">{{ r.completedAt | date:'medium' }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
              </table>
            </div>

            <div class="refresh-row">
              <button mat-stroked-button (click)="loadResults()" [disabled]="loading">
                <mat-icon>refresh</mat-icon> Refresh
              </button>
            </div>
          </div>
        </mat-tab>

        <!-- TAB 2: GoPhish Campaigns -->
        <mat-tab label="Phishing Campaigns">
          <div class="tab-body">
            <div *ngIf="campaignsLoading" class="loading-container">
              <mat-spinner diameter="48"></mat-spinner>
            </div>

            <div *ngIf="campaignsError" class="error-container">
              <mat-card>
                <mat-card-content>
                  <mat-icon color="warn">error</mat-icon>
                  <span>{{ campaignsError }}</span>
                </mat-card-content>
              </mat-card>
            </div>

            <div *ngIf="!campaignsLoading && !campaignsError && campaigns.length === 0" class="empty-container">
              <mat-card>
                <mat-card-content>
                  <mat-icon>inbox</mat-icon>
                  <span>No phishing campaigns found. Seed GoPhish to see campaigns here.</span>
                </mat-card-content>
              </mat-card>
            </div>

            <div *ngIf="!campaignsLoading && !campaignsError && campaigns.length > 0">
              <mat-card *ngFor="let c of campaigns" class="campaign-card">
                <mat-card-header>
                  <mat-card-title>{{ c.name }}</mat-card-title>
                  <mat-card-subtitle>
                    <mat-chip [ngClass]="'chip-status-' + c.status.toLowerCase().replace(' ', '-')">
                      {{ c.status }}
                    </mat-chip>
                    &nbsp; Launched: {{ c.launch_date | date:'medium' }}
                  </mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                  <div class="summary-stats">
                    <div class="stat">
                      <span class="stat-value">{{ c.results.length }}</span>
                      <span class="stat-label">Targets</span>
                    </div>
                    <div class="stat">
                      <span class="stat-value">{{ countStatus(c.results, 'Email Sent') + countStatus(c.results, 'Sending') }}</span>
                      <span class="stat-label">Emails Sent</span>
                    </div>
                    <div class="stat">
                      <span class="stat-value">{{ countStatus(c.results, 'Email Opened') }}</span>
                      <span class="stat-label">Opened</span>
                    </div>
                    <div class="stat">
                      <span class="stat-value">{{ countStatus(c.results, 'Clicked Link') }}</span>
                      <span class="stat-label">Clicked Link</span>
                    </div>
                    <div class="stat">
                      <span class="stat-value">{{ countStatus(c.results, 'Submitted Data') }}</span>
                      <span class="stat-label">Submitted Data</span>
                    </div>
                  </div>

                  <table mat-table [dataSource]="c.results" class="results-table campaign-results-table">
                    <ng-container matColumnDef="name">
                      <th mat-header-cell *matHeaderCellDef>Name</th>
                      <td mat-cell *matCellDef="let r">{{ r.first_name }} {{ r.last_name }}</td>
                    </ng-container>
                    <ng-container matColumnDef="email">
                      <th mat-header-cell *matHeaderCellDef>Email</th>
                      <td mat-cell *matCellDef="let r">{{ r.email }}</td>
                    </ng-container>
                    <ng-container matColumnDef="position">
                      <th mat-header-cell *matHeaderCellDef>Position</th>
                      <td mat-cell *matCellDef="let r">{{ r.position }}</td>
                    </ng-container>
                    <ng-container matColumnDef="status">
                      <th mat-header-cell *matHeaderCellDef>Status</th>
                      <td mat-cell *matCellDef="let r">
                        <mat-chip [ngClass]="getStatusClass(r.status)">{{ r.status }}</mat-chip>
                      </td>
                    </ng-container>
                    <ng-container matColumnDef="send_date">
                      <th mat-header-cell *matHeaderCellDef>Send Date</th>
                      <td mat-cell *matCellDef="let r">{{ r.send_date | date:'medium' }}</td>
                    </ng-container>
                    <tr mat-header-row *matHeaderRowDef="campaignColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: campaignColumns;"></tr>
                  </table>
                </mat-card-content>
              </mat-card>
            </div>

            <div class="refresh-row">
              <button mat-stroked-button (click)="loadCampaigns()" [disabled]="campaignsLoading">
                <mat-icon>refresh</mat-icon> Refresh
              </button>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .results-container { }
    .tab-body { padding: 24px 0; }
    .loading-container {
      display: flex;
      justify-content: center;
      padding: 64px;
    }
    .error-container mat-card-content,
    .empty-container mat-card-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .error-container mat-card-content { color: #c62828; }
    .summary-card, .campaign-card {
      margin-bottom: 24px;
    }
    .summary-stats {
      display: flex;
      gap: 48px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .stat {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .stat-value {
      font-size: 32px;
      font-weight: 500;
      color: #1976d2;
    }
    .stat-label {
      font-size: 14px;
      color: rgba(0, 0, 0, 0.54);
    }
    .results-table {
      width: 100%;
    }
    .campaign-results-table {
      margin-top: 16px;
    }
    .chip-pass { --mdc-chip-elevated-container-color: #c8e6c9; }
    .chip-fail { --mdc-chip-elevated-container-color: #ffcdd2; }
    .chip-status-sending, .chip-status-in-progress {
      --mdc-chip-elevated-container-color: #fff3e0;
    }
    .chip-status-completed {
      --mdc-chip-elevated-container-color: #c8e6c9;
    }
    .chip-status-email-sent {
      --mdc-chip-elevated-container-color: #e3f2fd;
    }
    .chip-status-email-opened {
      --mdc-chip-elevated-container-color: #fff9c4;
    }
    .chip-status-clicked-link {
      --mdc-chip-elevated-container-color: #ffe0b2;
    }
    .chip-status-submitted-data {
      --mdc-chip-elevated-container-color: #ffcdd2;
    }
    .refresh-row {
      margin-top: 24px;
      display: flex;
      justify-content: flex-end;
    }
  `],
})
export class ResultsComponent implements OnInit {
  results: SimulationResult[] = [];
  displayedColumns = ['userId', 'campaignId', 'score', 'completedAt'];
  loading = true;
  error: string | null = null;
  averageScore = 0;
  passRate = 0;

  campaigns: Campaign[] = [];
  campaignColumns = ['name', 'email', 'position', 'status', 'send_date'];
  campaignsLoading = true;
  campaignsError: string | null = null;

  constructor(
    private apiService: ApiService,
    private gophishService: GophishService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadResults();
    this.loadCampaigns();
  }

  loadResults(): void {
    this.loading = true;
    this.error = null;
    this.apiService.getScores().subscribe({
      next: (data) => {
        this.results = data;
        this.calculateStats();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Could not load results. Ensure the .NET API is running and accessible.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadCampaigns(): void {
    this.campaignsLoading = true;
    this.campaignsError = null;
    this.gophishService.getCampaigns().subscribe({
      next: (data) => {
        this.campaigns = data;
        this.campaignsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.campaignsError = 'Could not load campaigns. GoPhish API may not be accessible.';
        this.campaignsLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  countStatus(results: any[], status: string): number {
    return results.filter((r) => r.status === status).length;
  }

  getStatusClass(status: string): string {
    return 'chip-status-' + status.toLowerCase().replace(/ /g, '-');
  }

  private calculateStats(): void {
    if (this.results.length === 0) {
      this.averageScore = 0;
      this.passRate = 0;
      return;
    }
    const total = this.results.reduce((sum, r) => sum + r.score, 0);
    this.averageScore = Math.round(total / this.results.length);
    const passed = this.results.filter((r) => r.score >= 80).length;
    this.passRate = Math.round((passed / this.results.length) * 100);
  }
}
