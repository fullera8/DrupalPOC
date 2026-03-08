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
      <a mat-button routerLink="/modules" class="back-link">
        <mat-icon>arrow_back</mat-icon> Back to Modules
      </a>

      <h2>{{ mod.title }}</h2>

      <div class="meta-row">
        <mat-chip-set>
          <mat-chip [class]="'difficulty-' + mod.difficulty.toLowerCase()">
            {{ mod.difficulty }}
          </mat-chip>
          <mat-chip>
            <mat-icon>schedule</mat-icon>&nbsp;{{ mod.duration }}
          </mat-chip>
          <mat-chip>
            <mat-icon>category</mat-icon>&nbsp;{{ mod.category }}
          </mat-chip>
        </mat-chip-set>
      </div>

      <div class="video-wrapper" *ngIf="safeVideoUrl">
        <iframe
          [src]="safeVideoUrl"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      </div>

      <mat-card class="description-card">
        <mat-card-content>
          <p>{{ mod.description }}</p>
        </mat-card-content>
      </mat-card>
    </div>

    <ng-template #loading>
      <div class="loading-container">
        <mat-spinner diameter="48"></mat-spinner>
      </div>
    </ng-template>
  `,
  styles: [`
    .detail-container {
    }
    .back-link {
      margin-bottom: 8px;
    }
    .meta-row {
      margin: 12px 0 24px;
    }
    .video-wrapper {
      position: relative;
      padding-bottom: 56.25%;
      height: 0;
      overflow: hidden;
      margin-bottom: 24px;
      border-radius: 8px;
    }
    .video-wrapper iframe {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
    .description-card {
      margin-top: 16px;
    }
    .difficulty-beginner { --mdc-chip-elevated-container-color: #c8e6c9; }
    .difficulty-intermediate { --mdc-chip-elevated-container-color: #fff9c4; }
    .difficulty-advanced { --mdc-chip-elevated-container-color: #ffcdd2; }
    .loading-container {
      display: flex;
      justify-content: center;
      padding: 64px;
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
