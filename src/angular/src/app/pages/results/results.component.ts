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
      <!-- Navy Header Block: branded header + tab bar -->
      <div class="navy-header-block">
        <div class="header-section">
          <h1 class="header-title">Simulation Results</h1>
          <p class="header-subtitle">Quiz Scores &amp; Phishing Campaign Analytics</p>
        </div>

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

                <div class="table-wrapper">
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
              </div>

              <div class="refresh-row">
                <button mat-stroked-button class="refresh-btn" (click)="loadResults()" [disabled]="loading">
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
                    <div class="campaign-stats">
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

                    <div class="table-wrapper campaign-table-wrapper">
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
                    </div>
                  </mat-card-content>
                </mat-card>
              </div>

              <div class="refresh-row">
                <button mat-stroked-button class="refresh-btn" (click)="loadCampaigns()" [disabled]="campaignsLoading">
                  <mat-icon>refresh</mat-icon> Refresh
                </button>
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>
      </div>
    </div>
  `,
  styles: [`
    /* ===== FONTS ===== */
    h1, .header-title { font-family: 'Montserrat', sans-serif; }
    p, span, .stat-label, .header-subtitle { font-family: 'Roboto', sans-serif; }

    /* ===== LAYOUT ===== */
    .results-container {
      margin: -24px;
    }

    /* ===== NAVY HEADER BLOCK ===== */
    .navy-header-block {
      background: #032044;
    }
    .header-section {
      padding: 32px 24px 16px;
    }
    .header-title {
      font-weight: 700;
      font-size: 1.8rem;
      color: #FFFFFF;
      margin: 0 0 8px 0;
    }
    .header-subtitle {
      font-weight: 300;
      font-size: 1rem;
      color: rgba(255,255,255,0.7);
      margin: 0;
    }

    /* ===== TAB STYLING ===== */
    ::ng-deep .navy-header-block .mat-mdc-tab-labels {
      background: transparent;
    }
    ::ng-deep .navy-header-block .mat-mdc-tab .mdc-tab__text-label {
      color: rgba(255,255,255,0.6);
      font-family: 'Montserrat', sans-serif;
      font-weight: 600;
      font-size: 0.9rem;
    }
    ::ng-deep .navy-header-block .mat-mdc-tab.mdc-tab--active .mdc-tab__text-label {
      color: #FFFFFF;
    }
    ::ng-deep .navy-header-block .mat-mdc-tab:hover .mdc-tab__text-label,
    ::ng-deep .navy-header-block .mat-mdc-tab:focus .mdc-tab__text-label,
    ::ng-deep .navy-header-block .mat-mdc-tab.mdc-tab--active:hover .mdc-tab__text-label,
    ::ng-deep .navy-header-block .mat-mdc-tab.mdc-tab--active:focus .mdc-tab__text-label {
      color: #F15A22;
    }
    ::ng-deep .navy-header-block .mat-mdc-tab-header {
      border-bottom: none;
    }
    ::ng-deep .navy-header-block .mdc-tab-indicator__content--underline {
      border-color: #F15A22 !important;
    }

    /* ===== TAB BODY ===== */
    .tab-body {
      background: #F8F4F1;
      padding: 24px;
    }

    /* ===== LOADING ===== */
    .loading-container {
      display: flex;
      justify-content: center;
      padding: 64px;
    }
    ::ng-deep .mat-mdc-progress-spinner circle {
      stroke: #F15A22;
    }

    /* ===== EMPTY & ERROR STATES ===== */
    .empty-container mat-card,
    .error-container mat-card {
      background: #F8F4F1;
      border-radius: 12px;
      border-left: 4px solid #EBE6E2;
      box-shadow: none;
    }
    .error-container mat-card {
      border-left-color: #f44336;
    }
    .error-container mat-card-content,
    .empty-container mat-card-content {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: 'Roboto', sans-serif;
      color: #032044;
    }
    .empty-container mat-icon {
      color: #D5CFC8;
    }

    /* ===== QUIZ SUMMARY KPI ROW (Phase 2) ===== */
    .summary-card {
      background: #0C2340 !important;
      border-radius: 12px;
      box-shadow: none !important;
      margin-bottom: 0;
    }
    ::ng-deep .summary-card .mdc-card {
      background: #0C2340;
    }
    .summary-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      padding: 8px 0;
    }
    .summary-stats .stat {
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 12px;
      background: transparent;
      padding: 24px 16px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .summary-stats .stat-value {
      font-family: 'Montserrat', sans-serif;
      font-weight: 700;
      font-size: 2.5rem;
      line-height: 1.1;
      color: #F15A22;
    }
    .summary-stats .stat-label {
      font-family: 'Roboto', sans-serif;
      font-weight: 400;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #FFFFFF;
      margin-top: 8px;
    }

    /* ===== TABLE STYLING (Phase 3) ===== */
    .table-wrapper {
      background: #FFFFFF;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      border: 1px solid #EBE6E2;
      margin-top: 24px;
    }
    .campaign-table-wrapper {
      margin-top: 16px;
    }
    .results-table {
      width: 100%;
    }
    ::ng-deep .results-table .mat-mdc-header-row {
      background: #EBE6E2;
    }
    ::ng-deep .results-table .mat-mdc-header-cell {
      font-family: 'Montserrat', sans-serif;
      font-weight: 600;
      font-size: 0.85rem;
      text-transform: uppercase;
      color: #032044;
    }
    ::ng-deep .results-table .mat-mdc-cell {
      font-family: 'Roboto', sans-serif;
      font-weight: 400;
      font-size: 0.9rem;
      color: #032044;
    }
    ::ng-deep .results-table .mat-mdc-row:hover {
      background: #F8F4F1;
    }

    /* ===== CHIPS ===== */
    .chip-pass {
      --mdc-chip-elevated-container-color: #c8e6c9;
      border-radius: 16px;
      font-family: 'Roboto', sans-serif;
      font-weight: 500;
      font-size: 0.8rem;
    }
    .chip-fail {
      --mdc-chip-elevated-container-color: #ffcdd2;
      border-radius: 16px;
      font-family: 'Roboto', sans-serif;
      font-weight: 500;
      font-size: 0.8rem;
    }
    .chip-status-sending, .chip-status-in-progress {
      --mdc-chip-elevated-container-color: #fff3e0;
      border-radius: 16px;
      font-family: 'Roboto', sans-serif;
      font-weight: 500;
      font-size: 0.75rem;
    }
    .chip-status-completed {
      --mdc-chip-elevated-container-color: #c8e6c9;
      border-radius: 16px;
      font-family: 'Roboto', sans-serif;
      font-weight: 500;
      font-size: 0.75rem;
    }
    .chip-status-email-sent {
      --mdc-chip-elevated-container-color: #e3f2fd;
      border-radius: 16px;
      font-family: 'Roboto', sans-serif;
      font-weight: 500;
      font-size: 0.75rem;
    }
    .chip-status-email-opened {
      --mdc-chip-elevated-container-color: #fff9c4;
      border-radius: 16px;
      font-family: 'Roboto', sans-serif;
      font-weight: 500;
      font-size: 0.75rem;
    }
    .chip-status-clicked-link {
      --mdc-chip-elevated-container-color: #ffe0b2;
      border-radius: 16px;
      font-family: 'Roboto', sans-serif;
      font-weight: 500;
      font-size: 0.75rem;
    }
    .chip-status-submitted-data {
      --mdc-chip-elevated-container-color: #ffcdd2;
      border-radius: 16px;
      font-family: 'Roboto', sans-serif;
      font-weight: 500;
      font-size: 0.75rem;
    }

    /* ===== CAMPAIGN CARDS (Phase 4) ===== */
    .campaign-card {
      background: #FFFFFF;
      border-radius: 12px;
      border: 1px solid #EBE6E2;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      margin-bottom: 24px;
      padding: 24px;
    }
    ::ng-deep .campaign-card .mat-mdc-card-title {
      font-family: 'Montserrat', sans-serif;
      font-weight: 600;
      font-size: 1.2rem;
      color: #032044;
    }
    ::ng-deep .campaign-card .mat-mdc-card-subtitle {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: 'Roboto', sans-serif;
      font-weight: 400;
      font-size: 0.9rem;
      color: rgba(0,0,0,0.54);
    }
    .campaign-stats {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
      text-align: center;
      margin-bottom: 16px;
    }
    .campaign-stats .stat {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .campaign-stats .stat-value {
      font-family: 'Montserrat', sans-serif;
      font-weight: 700;
      font-size: 1.5rem;
      line-height: 1.1;
      color: #F15A22;
    }
    .campaign-stats .stat-label {
      font-family: 'Roboto', sans-serif;
      font-weight: 400;
      font-size: 0.75rem;
      text-transform: uppercase;
      color: #032044;
      margin-top: 4px;
    }

    /* ===== REFRESH BUTTON (Phase 5) ===== */
    .refresh-row {
      margin-top: 24px;
      margin-bottom: 8px;
      display: flex;
      justify-content: flex-end;
    }
    .refresh-btn {
      border: 2px solid #F15A22 !important;
      color: #F15A22 !important;
      background: transparent !important;
      font-family: 'Montserrat', sans-serif;
      font-weight: 600;
      border-radius: 8px;
      padding: 0 20px;
    }

    /* ===== RESPONSIVE (Phase 6) ===== */
    @media (max-width: 1024px) {
      .campaign-stats {
        grid-template-columns: repeat(3, 1fr);
      }
    }
    @media (max-width: 768px) {
      .header-title { font-size: 1.4rem; }
      .summary-stats {
        grid-template-columns: 1fr;
      }
      .summary-stats .stat-value { font-size: 2rem; }
      .campaign-stats {
        grid-template-columns: repeat(2, 1fr);
      }
      .campaign-stats .stat-value { font-size: 1.2rem; }
      .table-wrapper { overflow-x: auto; }
    }
    @media (max-width: 480px) {
      .campaign-stats {
        grid-template-columns: repeat(2, 1fr);
      }
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
