import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DrupalService, TrainingModule } from '../../services/drupal.service';

@Component({
  selector: 'app-modules',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatExpansionModule,
    MatListModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="modules-container">
      <section class="header-bar">
        <h1 class="header-title">Training Modules</h1>
        <p class="header-subtitle">Security Awareness Curriculum</p>
      </section>

      <div *ngIf="loading" class="loading-container">
        <mat-spinner diameter="48"></mat-spinner>
      </div>

      <div class="split-layout" *ngIf="!loading">
        <div class="hero-panel">
          <mat-icon class="hero-play-icon">play_circle</mat-icon>
          <p class="hero-text">Select a module to begin</p>
        </div>

        <div class="sidebar-panel">
          <mat-accordion multi>
            <mat-expansion-panel
              *ngFor="let group of groupedModules; let i = index"
              [expanded]="i === 0"
            >
              <mat-expansion-panel-header>
                <mat-panel-title>
                  <mat-icon class="folder-icon">folder</mat-icon>
                  <span class="category-name">{{ group.category }}</span>
                  <span class="module-count-badge">{{ group.modules.length }}</span>
                </mat-panel-title>
              </mat-expansion-panel-header>

              <mat-nav-list>
                <a
                  mat-list-item
                  *ngFor="let mod of group.modules; let j = index"
                  [routerLink]="['/modules', mod.id]"
                  class="module-item"
                >
                  <span class="mod-number-badge">{{ j + 1 }}</span>
                  <div class="mod-info">
                    <span class="mod-title">{{ mod.title }}</span>
                    <span class="mod-chips">
                      <mat-chip-set>
                        <mat-chip [class]="'difficulty-' + mod.difficulty.toLowerCase()">
                          {{ mod.difficulty }}
                        </mat-chip>
                        <mat-chip class="duration-chip">
                          <mat-icon>schedule</mat-icon>&nbsp;{{ mod.duration }}
                        </mat-chip>
                      </mat-chip-set>
                    </span>
                  </div>
                </a>
              </mat-nav-list>
            </mat-expansion-panel>
          </mat-accordion>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ── Edge-to-edge reset ── */
    :host {
      display: block;
      margin: -24px;
    }
    .modules-container {
      font-family: 'Roboto', sans-serif;
    }

    /* ── Header Bar ── */
    .header-bar {
      background: #032044;
      padding: 32px 24px 24px;
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

    /* ── Split Layout ── */
    .split-layout {
      display: grid;
      grid-template-columns: 1fr 380px;
      min-height: 500px;
    }

    /* ── Hero Panel ── */
    .hero-panel {
      background: #0C2340;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 400px;
    }
    .hero-play-icon {
      font-size: 80px;
      width: 80px;
      height: 80px;
      color: #F15A22;
    }
    .hero-text {
      font-family: 'Roboto', sans-serif;
      font-weight: 400;
      font-size: 1rem;
      color: rgba(255,255,255,0.7);
      margin-top: 16px;
    }

    /* ── Sidebar Panel ── */
    .sidebar-panel {
      background: #032044;
      padding: 16px 0;
      overflow-y: auto;
      max-height: 600px;
    }

    /* ── Accordion Overrides (dark theme) ── */
    ::ng-deep .sidebar-panel .mat-expansion-panel {
      background: transparent !important;
      box-shadow: none !important;
      color: #fff;
    }
    ::ng-deep .sidebar-panel .mat-expansion-panel-header {
      background: transparent !important;
      padding: 0 16px;
    }
    ::ng-deep .sidebar-panel .mat-expansion-panel-header-title {
      color: #fff !important;
      font-family: 'Montserrat', sans-serif;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    ::ng-deep .sidebar-panel .mat-expansion-indicator::after {
      color: #fff;
      border-color: #fff;
    }
    ::ng-deep .sidebar-panel .mat-expansion-panel-body {
      padding: 0;
    }
    .folder-icon {
      color: #fff;
    }
    .category-name {
      flex: 1;
    }
    .module-count-badge {
      background: rgba(255,255,255,0.3);
      color: #fff;
      font-family: 'Roboto', sans-serif;
      font-weight: 400;
      font-size: 0.75rem;
      padding: 2px 8px;
      border-radius: 10px;
    }

    /* ── Module list items ── */
    ::ng-deep .sidebar-panel .mat-mdc-nav-list {
      padding: 0;
    }
    ::ng-deep .sidebar-panel .mdc-list-item {
      height: auto !important;
      padding: 12px 16px !important;
      color: #fff !important;
    }
    ::ng-deep .sidebar-panel .mdc-list-item:hover {
      background: rgba(255,255,255,0.08) !important;
    }
    .module-item {
      display: flex !important;
      align-items: flex-start;
      gap: 12px;
      height: auto !important;
      padding: 12px 16px;
      text-decoration: none;
      color: #fff;
    }
    .mod-number-badge {
      background: #F15A22;
      color: #fff;
      font-family: 'Montserrat', sans-serif;
      font-weight: 700;
      font-size: 0.8rem;
      min-width: 28px;
      height: 28px;
      border-radius: 14px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .mod-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }
    .mod-title {
      color: #fff;
      font-family: 'Roboto', sans-serif;
      font-weight: 400;
      font-size: 0.95rem;
      line-height: 1.3;
    }
    .mod-chips {
      margin-top: 4px;
    }

    /* ── Chip Overrides ── */
    .difficulty-beginner { --mdc-chip-elevated-container-color: #c8e6c9; --mdc-chip-label-text-color: #333; }
    .difficulty-intermediate { --mdc-chip-elevated-container-color: #fff9c4; --mdc-chip-label-text-color: #333; }
    .difficulty-advanced { --mdc-chip-elevated-container-color: #ffcdd2; --mdc-chip-label-text-color: #333; }
    .duration-chip {
      --mdc-chip-elevated-container-color: rgba(255,255,255,0.2);
      --mdc-chip-label-text-color: #fff;
    }
    ::ng-deep .duration-chip .mat-icon {
      color: #fff;
      font-size: 16px;
    }

    /* ── Loading ── */
    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 64px;
      background: #0C2340;
      min-height: 400px;
    }
    ::ng-deep .loading-container .mat-mdc-progress-spinner circle {
      stroke: #F15A22;
    }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      .split-layout {
        grid-template-columns: 1fr;
      }
      .hero-panel {
        min-height: 200px;
      }
      .sidebar-panel {
        max-height: none;
      }
    }
    @media (max-width: 480px) {
      .header-title {
        font-size: 1.4rem;
      }
      .header-bar {
        padding: 24px 16px 16px;
      }
    }
  `],
})
export class ModulesComponent implements OnInit {
  groupedModules: { category: string; modules: TrainingModule[] }[] = [];
  loading = true;

  constructor(private drupalService: DrupalService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.drupalService.getTrainingModules().subscribe((modules) => {
      this.groupedModules = this.groupByCategory(modules);
      this.loading = false;
      this.cdr.detectChanges();
    });
  }

  private groupByCategory(
    modules: TrainingModule[]
  ): { category: string; modules: TrainingModule[] }[] {
    const map = new Map<string, TrainingModule[]>();
    for (const mod of modules) {
      const cat = mod.category || 'Uncategorized';
      if (!map.has(cat)) {
        map.set(cat, []);
      }
      map.get(cat)!.push(mod);
    }
    return Array.from(map.entries()).map(([category, modules]) => ({
      category,
      modules,
    }));
  }
}
