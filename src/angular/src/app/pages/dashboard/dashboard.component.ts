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
      <h2>Compliance Dashboard</h2>

      <div *ngIf="loading" class="loading-container">
        <mat-spinner diameter="48"></mat-spinner>
      </div>

      <div *ngIf="!loading" class="dashboard-grid">
        <!-- KPI Row -->
        <div class="kpi-row">
          <mat-card class="kpi-card">
            <mat-card-content>
              <mat-icon class="kpi-icon" color="primary">quiz</mat-icon>
              <div class="kpi-value">{{ totalQuizAttempts }}</div>
              <div class="kpi-label">Quiz Attempts</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="kpi-card">
            <mat-card-content>
              <mat-icon class="kpi-icon" style="color:#4caf50">check_circle</mat-icon>
              <div class="kpi-value">{{ quizPassRate }}%</div>
              <div class="kpi-label">Quiz Pass Rate</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="kpi-card">
            <mat-card-content>
              <mat-icon class="kpi-icon" style="color:#ff9800">campaign</mat-icon>
              <div class="kpi-value">{{ totalCampaigns }}</div>
              <div class="kpi-label">Phishing Campaigns</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="kpi-card">
            <mat-card-content>
              <mat-icon class="kpi-icon" style="color:#f44336">warning</mat-icon>
              <div class="kpi-value">{{ phishClickRate }}%</div>
              <div class="kpi-label">Phish Click Rate</div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Charts Row -->
        <div class="charts-row">
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
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container { }
    .loading-container {
      display: flex; justify-content: center; padding: 64px;
    }
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .kpi-card mat-card-content {
      display: flex; flex-direction: column; align-items: center; padding: 16px 0;
    }
    .kpi-icon { font-size: 36px; width: 36px; height: 36px; }
    .kpi-value { font-size: 32px; font-weight: 600; margin: 8px 0 4px; }
    .kpi-label { font-size: 14px; color: rgba(0,0,0,0.54); }
    .charts-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 24px;
    }
    .chart-card { min-height: 300px; }
    .chart-card canvas { max-height: 320px; }
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
          backgroundColor: ['#ef5350', '#ff7043', '#ffa726', '#66bb6a', '#42a5f5'],
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
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
        case 'Sending': return '#90caf9';
        case 'Email Sent': return '#64b5f6';
        case 'Email Opened': return '#fff176';
        case 'Clicked Link': return '#ffb74d';
        case 'Submitted Data': return '#ef5350';
        default: return '#bdbdbd';
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
          legend: { position: 'bottom' },
        },
      },
    });
  }
}
