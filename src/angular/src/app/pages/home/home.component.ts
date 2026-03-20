import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService, SimulationResult } from '../../services/api.service';
import { GophishService, Campaign } from '../../services/gophish.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <!-- ==================== HERO SECTION ==================== -->
    <section class="hero">
      <div class="hero-overlay">
        <div class="hero-content">
          <img src="images/UTSA_logo.png" alt="UTSA Logo" class="hero-logo" />
          <h1>Protect Our Campus : Security Awareness Starts Here</h1>
          <p class="hero-subtitle">
            Empowering UT San Antonio faculty, staff, and students with the skills
            to identify and prevent cybersecurity threats.
          </p>
          <div class="hero-actions">
            <a mat-raised-button class="cta-primary" routerLink="/dashboard">View Dashboard</a>
            <a mat-stroked-button class="cta-secondary" routerLink="/modules">Start Training</a>
          </div>
        </div>
      </div>
    </section>

    <!-- ==================== VALUE PROPOSITION ==================== -->
    <section class="value-section">
      <h2 class="section-title">Why Security Awareness Matters</h2>
      <div class="value-grid">
        <mat-card class="value-card" *ngFor="let card of valueCards">
          <mat-card-content>
            <mat-icon class="value-icon">{{ card.icon }}</mat-icon>
            <h3>{{ card.title }}</h3>
            <p>{{ card.description }}</p>
          </mat-card-content>
        </mat-card>
      </div>
    </section>

    <!-- ==================== TRAINING PATHWAYS ==================== -->
    <section class="pathways-section">
      <h2 class="section-title">Training Pathways</h2>
      <p class="section-subtitle">
        Structured programs to build cybersecurity awareness across every level of the university.
      </p>
      <div class="pathways-grid">
        <mat-card
          *ngFor="let tile of pathwayTiles"
          class="pathway-card"
          [routerLink]="tile.route"
        >
          <mat-card-content>
            <mat-icon class="pathway-icon">{{ tile.icon }}</mat-icon>
            <h3>{{ tile.title }}</h3>
            <p>{{ tile.description }}</p>
            <span class="pathway-link">Explore &rarr;</span>
          </mat-card-content>
        </mat-card>
      </div>
    </section>

    <!-- ==================== KPI ROW ==================== -->
    <section class="kpi-section">
      <h2 class="section-title kpi-title">Program at a Glance</h2>
      <div *ngIf="loading" class="loading-container">
        <mat-spinner diameter="48"></mat-spinner>
      </div>
      <div *ngIf="!loading" class="kpi-grid">
        <div class="kpi-block">
          <div class="kpi-value">{{ totalQuizAttempts }}</div>
          <div class="kpi-label">Quiz Attempts</div>
        </div>
        <div class="kpi-block">
          <div class="kpi-value">{{ quizPassRate }}%</div>
          <div class="kpi-label">Quiz Pass Rate</div>
        </div>
        <div class="kpi-block">
          <div class="kpi-value">{{ totalCampaigns }}</div>
          <div class="kpi-label">Phishing Campaigns</div>
        </div>
        <div class="kpi-block">
          <div class="kpi-value">{{ phishClickRate }}%</div>
          <div class="kpi-label">Phish Click Rate</div>
        </div>
      </div>
    </section>

    <!-- ==================== FOOTER ==================== -->
    <footer class="site-footer">
      <div class="footer-links">
        <a href="javascript:void(0)">About This Pilot</a>
        <a href="javascript:void(0)">Privacy Policy</a>
        <a href="javascript:void(0)">Documentation</a>
        <a href="javascript:void(0)">Contact</a>
      </div>
      <p class="footer-attribution">TSUS Security Training — Powered by UT San Antonio</p>
      <p class="footer-copyright">&copy; 2026 Texas State University System. All rights reserved.</p>
    </footer>
  `,
  styles: [`
    /* ===== FONTS ===== */
    h1, h2, h3, .section-title { font-family: 'Montserrat', sans-serif; }
    p, a, span, div, .kpi-label { font-family: 'Roboto', sans-serif; }

    /* ===== HERO ===== */
    .hero {
      background: url('/images/UTSA_Backdrop.png') center / cover no-repeat;
      position: relative;
      min-height: 500px;
      display: flex;
    }
    .hero-overlay {
      background: linear-gradient(rgba(3, 32, 68, 0.72), rgba(3, 32, 68, 0.88));
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 64px 24px;
    }
    .hero-content {
      max-width: 780px;
      text-align: center;
    }
    .hero-logo {
      width: 240px;
      margin-bottom: 12px;
    }
    .hero h1 {
      color: #fff;
      font-size: 2.6rem;
      font-weight: 700;
      line-height: 1.2;
      margin: 0 0 16px;
    }
    .hero-subtitle {
      color: rgba(255, 255, 255, 0.9);
      font-size: 1.2rem;
      font-weight: 300;
      line-height: 1.6;
      margin: 0 0 32px;
    }
    .hero-actions {
      display: flex;
      gap: 16px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .cta-primary {
      background-color: #F15A22 !important;
      color: #fff !important;
      font-weight: 500;
      font-size: 1rem;
      padding: 0 28px;
      height: 44px;
    }
    .cta-primary:hover { background-color: #D3430D !important; }
    .cta-secondary {
      border-color: #fff !important;
      color: #fff !important;
      font-weight: 500;
      font-size: 1rem;
      padding: 0 28px;
      height: 44px;
    }
    .cta-secondary:hover { background-color: rgba(255, 255, 255, 0.12) !important; }

    /* ===== VALUE PROPOSITION ===== */
    .value-section {
      background-color: #F8F4F1;
      padding: 64px 24px;
    }
    .section-title {
      color: #032044;
      font-weight: 700;
      font-size: 2rem;
      text-align: center;
      margin: 0 0 40px;
    }
    .value-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 24px;
      max-width: 1100px;
      margin: 0 auto;
    }
    .value-card {
      text-align: center;
      padding: 8px;
    }
    .value-card mat-card-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24px 16px;
    }
    .value-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #F15A22;
      margin-bottom: 16px;
    }
    .value-card h3 {
      color: #032044;
      font-weight: 600;
      font-size: 1.15rem;
      margin: 0 0 12px;
    }
    .value-card p {
      color: rgba(0, 0, 0, 0.7);
      font-size: 0.95rem;
      line-height: 1.55;
      margin: 0;
    }

    /* ===== TRAINING PATHWAYS ===== */
    .pathways-section {
      background: #fff;
      padding: 64px 24px;
    }
    .section-subtitle {
      text-align: center;
      color: rgba(0, 0, 0, 0.6);
      font-size: 1.05rem;
      margin: -28px 0 40px;
      line-height: 1.5;
    }
    .pathways-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
      max-width: 1100px;
      margin: 0 auto;
    }
    .pathway-card {
      cursor: pointer;
      transition: box-shadow 0.2s ease, transform 0.2s ease;
      border: 1px solid #EBE6E2;
    }
    .pathway-card:hover {
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
      transform: translateY(-2px);
    }
    .pathway-card mat-card-content {
      padding: 24px 20px;
    }
    .pathway-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: #032044;
      margin-bottom: 12px;
    }
    .pathway-card h3 {
      color: #032044;
      font-weight: 600;
      font-size: 1.1rem;
      margin: 0 0 8px;
    }
    .pathway-card p {
      color: rgba(0, 0, 0, 0.65);
      font-size: 0.93rem;
      line-height: 1.5;
      margin: 0 0 12px;
    }
    .pathway-link {
      color: #F15A22;
      font-weight: 500;
      font-size: 0.9rem;
    }

    /* ===== KPI SECTION ===== */
    .kpi-section {
      background-color: #032044;
      padding: 64px 24px;
    }
    .kpi-title { color: #fff !important; }
    .loading-container {
      display: flex;
      justify-content: center;
      padding: 32px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 32px;
      max-width: 900px;
      margin: 0 auto;
      text-align: center;
    }
    .kpi-block {}
    .kpi-value {
      font-family: 'Montserrat', sans-serif;
      font-size: 3rem;
      font-weight: 700;
      color: #fff;
    }
    .kpi-label {
      font-size: 1rem;
      color: rgba(255, 255, 255, 0.8);
      margin-top: 4px;
    }

    /* ===== FOOTER ===== */
    .site-footer {
      background-color: #0C2340;
      padding: 32px 24px;
      text-align: center;
    }
    .footer-links {
      display: flex;
      justify-content: center;
      gap: 24px;
      flex-wrap: wrap;
      margin-bottom: 20px;
    }
    .footer-links a {
      color: #fff;
      text-decoration: none;
      font-size: 0.9rem;
    }
    .footer-links a:hover { text-decoration: underline; }
    .footer-attribution {
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.85rem;
      margin: 0 0 8px;
    }
    .footer-copyright {
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.8rem;
      margin: 0;
    }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 768px) {
      .hero h1 { font-size: 1.8rem; }
      .hero-subtitle { font-size: 1rem; }
      .hero { min-height: 400px; }
      .section-title { font-size: 1.6rem; }
      .kpi-value { font-size: 2.4rem; }
    }
    @media (max-width: 480px) {
      .hero h1 { font-size: 1.5rem; }
      .hero-overlay { padding: 40px 16px; }
      .hero-logo { width: 80px; }
    }
  `],
})
export class HomeComponent implements OnInit {
  loading = true;
  totalQuizAttempts = 0;
  quizPassRate = 0;
  totalCampaigns = 0;
  phishClickRate = 0;

  private quizResults: SimulationResult[] = [];
  private campaigns: Campaign[] = [];
  private dataReady = 0;

  valueCards = [
    {
      icon: 'phishing',
      title: 'Phishing Awareness Training',
      description: 'Learn to recognize phishing emails, malicious links, and social engineering tactics targeting university communities.',
    },
    {
      icon: 'science',
      title: 'Simulation-Based Learning',
      description: 'Experience realistic phishing simulations powered by GoPhish to build practical detection skills in a safe environment.',
    },
    {
      icon: 'analytics',
      title: 'Analytics & Compliance',
      description: 'Track training progress, quiz scores, and campaign results with real-time dashboards and compliance reporting.',
    },
    {
      icon: 'school',
      title: 'Academic Integration',
      description: 'Security awareness curriculum designed for higher education — tailored pathways for faculty, staff, and students.',
    },
  ];

  pathwayTiles = [
    {
      icon: 'shield',
      title: 'Foundations of Phishing Awareness',
      description: 'Core training for recognizing and reporting email-based threats.',
      route: '/modules',
    },
    {
      icon: 'psychology',
      title: 'Advanced Social Engineering',
      description: 'Deep-dive into pretexting, vishing, and multi-vector attack scenarios.',
      route: '/modules',
    },
    {
      icon: 'bar_chart',
      title: 'Executive Reporting & Analytics',
      description: 'Dashboards and reports for compliance officers and administrators.',
      route: '/results',
    },
    {
      icon: 'groups',
      title: 'Faculty & Staff Training Paths',
      description: 'Role-specific training tracks for educators and administrative staff.',
      route: '/modules',
    },
  ];

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

  private onDataLoaded(): void {
    this.dataReady++;
    if (this.dataReady < 2) return;

    this.computeKPIs();
    this.loading = false;
    this.cdr.detectChanges();
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
}
