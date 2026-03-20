import { Component, OnInit, ChangeDetectorRef, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Chart, registerables } from 'chart.js';
import { ApiService, SimulationResult } from '../../services/api.service';
import { GophishService, Campaign } from '../../services/gophish.service';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="dashboard-container">
      <!-- Navy block: Header + KPI -->
      <section class="navy-block">
        <div class="header-section">
          <h1 class="header-title">Compliance Dashboard</h1>
          <p class="header-subtitle">Security Training Program Performance</p>
        </div>

        <div *ngIf="loading" class="loading-container">
          <mat-spinner diameter="48"></mat-spinner>
        </div>

        <div *ngIf="!loading" class="kpi-section">
          <div class="kpi-grid">
            <div class="stat-block">
              <mat-icon class="stat-icon">quiz</mat-icon>
              <div class="stat-value">{{ totalQuizAttempts }}</div>
              <div class="stat-label">Quiz Attempts</div>
            </div>
            <div class="stat-block">
              <mat-icon class="stat-icon">check_circle</mat-icon>
              <div class="stat-value">{{ quizPassRate }}%</div>
              <div class="stat-label">Quiz Pass Rate</div>
            </div>
            <div class="stat-block">
              <mat-icon class="stat-icon">campaign</mat-icon>
              <div class="stat-value">{{ totalCampaigns }}</div>
              <div class="stat-label">Phishing Campaigns</div>
            </div>
            <div class="stat-block">
              <mat-icon class="stat-icon">warning</mat-icon>
              <div class="stat-value">{{ phishClickRate }}%</div>
              <div class="stat-label">Phish Click Rate</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Charts section -->
      <section *ngIf="!loading" class="charts-section">
        <div class="charts-grid">
          <mat-card class="chart-card">
            <mat-card-header>
              <mat-card-title>Quiz Score Distribution</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <canvas #quizChart></canvas>
            </mat-card-content>
          </mat-card>

          <mat-card class="chart-card">
            <mat-card-header>
              <mat-card-title>Phishing Campaign Results</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <canvas #phishChart></canvas>
            </mat-card-content>
          </mat-card>
        </div>
      </section>
    </div>
  `,
  styles: [`
    /* ===== FONTS ===== */
    h1, .header-title { font-family: 'Montserrat', sans-serif; }
    p, div, .stat-label, .header-subtitle { font-family: 'Roboto', sans-serif; }

    /* ===== LAYOUT ===== */
    .dashboard-container {
      margin: -24px;
    }

    /* ===== NAVY BLOCK (Header + KPIs) ===== */
    .navy-block {
      background: #032044;
    }
    .header-section {
      padding: 32px 24px 24px;
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

    /* ===== LOADING ===== */
    .loading-container {
      display: flex;
      justify-content: center;
      padding: 64px;
    }
    ::ng-deep .loading-container .mat-mdc-progress-spinner circle {
      stroke: #F15A22;
    }

    /* ===== KPI SECTION ===== */
    .kpi-section {
      padding: 0 24px 32px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    .stat-block {
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 12px;
      padding: 24px 16px;
      text-align: center;
      background: transparent;
    }
    .stat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
      color: #FFFFFF;
      margin-bottom: 8px;
    }
    .stat-value {
      font-family: 'Montserrat', sans-serif;
      font-weight: 700;
      font-size: 2.5rem;
      line-height: 1.1;
      color: #F15A22;
    }
    .stat-label {
      font-weight: 400;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #FFFFFF;
      margin-top: 8px;
    }

    /* ===== CHARTS SECTION ===== */
    .charts-section {
      background: #F8F4F1;
      padding: 32px 24px;
    }
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 24px;
    }
    .chart-card {
      background: #FFFFFF;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      min-height: 300px;
    }
    .chart-card mat-card-content {
      padding: 16px;
    }
    .chart-card canvas {
      max-height: 320px;
    }
    ::ng-deep .chart-card .mat-mdc-card-header {
      padding: 16px 16px 0;
    }
    ::ng-deep .chart-card .mat-mdc-card-title {
      font-family: 'Montserrat', sans-serif;
      font-weight: 600;
      font-size: 1.1rem;
      color: #032044;
    }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 768px) {
      .header-title { font-size: 1.4rem; }
      .stat-value { font-size: 2rem; }
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
      .charts-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 480px) {
      .kpi-grid { grid-template-columns: 1fr; }
      .charts-grid { grid-template-columns: minmax(280px, 1fr); }
    }
  `],
})
export class DashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('quizChart') quizChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('phishChart') phishChartRef!: ElementRef<HTMLCanvasElement>;

  loading = true;
  totalQuizAttempts = 0;
  quizPassRate = 0;
  totalCampaigns = 0;
  phishClickRate = 0;

  private quizResults: SimulationResult[] = [];
  private campaigns: Campaign[] = [];
  private dataReady = 0;

  constructor(
    private apiService: ApiService,
    private gophishService: GophishService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.apiService.getScores().subscribe({
      next: (data) => { this.quizResults = data; this.onDataLoaded(); },
      error: () => this.onDataLoaded(),
    });
    this.gophishService.getCampaigns().subscribe({
      next: (data) => { this.campaigns = data; this.onDataLoaded(); },
      error: () => this.onDataLoaded(),
    });
  }

  ngAfterViewInit(): void {}

  private onDataLoaded(): void {
    this.dataReady++;
    if (this.dataReady < 2) return;

    this.computeKPIs();
    this.loading = false;
    this.cdr.detectChanges();

    // Charts need the canvas to be in the DOM (loading=false triggers *ngIf)
    setTimeout(() => this.renderCharts(), 0);
  }

  private computeKPIs(): void {
    this.totalQuizAttempts = this.quizResults.length;
    if (this.quizResults.length > 0) {
      const passed = this.quizResults.filter(r => r.score >= 80).length;
      this.quizPassRate = Math.round((passed / this.quizResults.length) * 100);
    }
    this.totalCampaigns = this.campaigns.length;
    const allResults = this.campaigns.flatMap(c => c.results || []);
    if (allResults.length > 0) {
      const clicked = allResults.filter(r =>
        r.status === 'Clicked Link' || r.status === 'Submitted Data'
      ).length;
      this.phishClickRate = Math.round((clicked / allResults.length) * 100);
    }
  }

  private renderCharts(): void {
    this.renderQuizChart();
    this.renderPhishChart();
  }

  private renderQuizChart(): void {
    if (!this.quizChartRef) return;
    const buckets = [0, 0, 0, 0, 0]; // 0-20, 21-40, 41-60, 61-80, 81-100
    this.quizResults.forEach(r => {
      if (r.score <= 20) buckets[0]++;
      else if (r.score <= 40) buckets[1]++;
      else if (r.score <= 60) buckets[2]++;
      else if (r.score <= 80) buckets[3]++;
      else buckets[4]++;
    });

    new Chart(this.quizChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'],
        datasets: [{
          label: 'Number of Attempts',
          data: buckets,
          backgroundColor: ['#D5CFC8', '#C8DCFF', '#0C2340', '#032044', '#F15A22'],
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1, font: { family: "'Roboto', sans-serif" } } },
          x: { ticks: { font: { family: "'Roboto', sans-serif" } } },
        },
      },
    });
  }

  private renderPhishChart(): void {
    if (!this.phishChartRef) return;
    const allResults = this.campaigns.flatMap(c => c.results || []);
    const statusCounts: Record<string, number> = {};
    allResults.forEach(r => {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    });

    const labels = Object.keys(statusCounts);
    const data = Object.values(statusCounts);
    const colors = labels.map(s => {
      switch (s) {
        case 'Sending': return '#C8DCFF';
        case 'Email Sent': return '#D5CFC8';
        case 'Email Opened': return '#EBE6E2';
        case 'Clicked Link': return '#F15A22';
        case 'Submitted Data': return '#032044';
        default: return '#F8F4F1';
      }
    });

    new Chart(this.phishChartRef.nativeElement, {
      type: 'pie',
      data: {
        labels,
        datasets: [{ data, backgroundColor: colors }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { font: { family: "'Roboto', sans-serif" } } },
        },
      },
    });
  }
}
