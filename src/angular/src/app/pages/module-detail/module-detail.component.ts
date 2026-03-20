import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DrupalService, TrainingModule } from '../../services/drupal.service';

@Component({
  selector: 'app-module-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="detail-container" *ngIf="mod; else loading">
      <section class="header-bar">
        <a routerLink="/modules" class="back-link">
          <mat-icon class="back-icon">arrow_back</mat-icon> Back to Modules
        </a>
        <h1 class="header-title">{{ mod.title }}</h1>
        <p class="header-subtitle">{{ mod.category }}</p>
      </section>

      <section class="content-area">
        <div class="meta-row">
          <mat-chip-set>
            <mat-chip [class]="'difficulty-' + mod.difficulty.toLowerCase()">
              {{ mod.difficulty }}
            </mat-chip>
            <mat-chip class="meta-chip">
              <mat-icon>schedule</mat-icon>&nbsp;{{ mod.duration }}
            </mat-chip>
            <mat-chip class="meta-chip">
              <mat-icon>category</mat-icon>&nbsp;{{ mod.category }}
            </mat-chip>
          </mat-chip-set>
        </div>

        <div class="video-frame" *ngIf="safeVideoUrl">
          <div class="video-wrapper">
            <iframe
              [src]="safeVideoUrl"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
            ></iframe>
          </div>
        </div>

        <mat-card class="description-card">
          <mat-card-content>
            <h3 class="card-title">About This Module</h3>
            <p class="card-text">{{ mod.description }}</p>
          </mat-card-content>
        </mat-card>
      </section>
    </div>

    <ng-template #loading>
      <div class="loading-container">
        <mat-spinner diameter="48"></mat-spinner>
      </div>
    </ng-template>
  `,
  styles: [`
    /* ── Edge-to-edge reset ── */
    :host {
      display: block;
      margin: -24px;
    }
    .detail-container {
      font-family: 'Roboto', sans-serif;
    }

    /* ── Header Bar ── */
    .header-bar {
      background: #032044;
      padding: 32px 24px 24px;
    }
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #F15A22;
      font-family: 'Montserrat', sans-serif;
      font-weight: 600;
      font-size: 0.9rem;
      text-decoration: none;
      margin-bottom: 12px;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0;
    }
    .back-link:hover {
      opacity: 0.85;
    }
    .back-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .header-title {
      font-family: 'Montserrat', sans-serif;
      font-weight: 700;
      font-size: 1.8rem;
      color: #FFFFFF;
      margin: 0 0 8px 0;
    }
    .header-subtitle {
      font-family: 'Roboto', sans-serif;
      font-weight: 300;
      font-size: 1rem;
      color: rgba(255,255,255,0.7);
      margin: 0;
    }

    /* ── Content Area ── */
    .content-area {
      background: #F8F4F1;
      padding: 24px;
    }

    /* ── Meta Chips ── */
    .meta-row {
      margin: 0 0 24px;
    }
    .difficulty-beginner { --mdc-chip-elevated-container-color: #c8e6c9; --mdc-chip-label-text-color: #333; }
    .difficulty-intermediate { --mdc-chip-elevated-container-color: #fff9c4; --mdc-chip-label-text-color: #333; }
    .difficulty-advanced { --mdc-chip-elevated-container-color: #ffcdd2; --mdc-chip-label-text-color: #333; }
    .meta-chip {
      --mdc-chip-elevated-container-color: #EBE6E2;
      --mdc-chip-label-text-color: #032044;
    }
    ::ng-deep .meta-chip .mat-icon {
      color: #032044;
      font-size: 16px;
    }

    /* ── Video Frame ── */
    .video-frame {
      background: #0C2340;
      padding: 16px;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.12);
      margin-bottom: 24px;
    }
    .video-wrapper {
      position: relative;
      padding-bottom: 56.25%;
      height: 0;
      overflow: hidden;
      border-radius: 12px;
    }
    .video-wrapper iframe {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border-radius: 12px;
    }

    /* ── Description Card ── */
    .description-card {
      background: #FFFFFF;
      border: 1px solid #EBE6E2;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
    ::ng-deep .description-card .mat-mdc-card-content {
      padding: 24px;
    }
    .card-title {
      font-family: 'Montserrat', sans-serif;
      font-weight: 600;
      font-size: 1.1rem;
      color: #032044;
      margin: 0 0 12px 0;
    }
    .card-text {
      font-family: 'Roboto', sans-serif;
      font-weight: 400;
      color: #032044;
      line-height: 1.6;
      margin: 0;
    }

    /* ── Loading ── */
    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 64px;
      min-height: 400px;
      background: #F8F4F1;
    }
    ::ng-deep .loading-container .mat-mdc-progress-spinner circle {
      stroke: #F15A22;
    }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      .header-bar {
        padding: 24px 16px 20px;
      }
      .content-area {
        padding: 16px;
      }
      .video-frame {
        padding: 8px;
      }
    }
    @media (max-width: 480px) {
      .header-title {
        font-size: 1.4rem;
      }
    }
  `],
})
export class ModuleDetailComponent implements OnInit {
  mod: TrainingModule | null = null;
  safeVideoUrl: SafeResourceUrl | null = null;

  constructor(
    private route: ActivatedRoute,
    private drupalService: DrupalService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.drupalService.getTrainingModule(id).subscribe((mod) => {
      this.mod = mod;
      if (mod.videoUrl) {
        this.safeVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
          this.toEmbedUrl(mod.videoUrl)
        );
      }
      this.cdr.detectChanges();
    });
  }

  private toEmbedUrl(url: string): string {
    // Convert YouTube watch URLs to embed URLs
    const ytMatch = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/
    );
    if (ytMatch) {
      return `https://www.youtube.com/embed/${ytMatch[1]}`;
    }
    // Convert Vimeo URLs to embed URLs
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    return url;
  }
}
