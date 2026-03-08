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
      <h2>Training Modules</h2>

      <div *ngIf="loading" class="loading-container">
        <mat-spinner diameter="48"></mat-spinner>
      </div>

      <mat-accordion *ngIf="!loading" multi>
        <mat-expansion-panel
          *ngFor="let group of groupedModules"
          [expanded]="true"
        >
          <mat-expansion-panel-header>
            <mat-panel-title>
              <mat-icon>folder</mat-icon>&nbsp;{{ group.category }}
              <span class="module-count">({{ group.modules.length }})</span>
            </mat-panel-title>
          </mat-expansion-panel-header>

          <mat-nav-list>
            <a
              mat-list-item
              *ngFor="let mod of group.modules"
              [routerLink]="['/modules', mod.id]"
              class="module-item"
            >
              <mat-icon matListItemIcon>play_circle</mat-icon>
              <span matListItemTitle>{{ mod.title }}</span>
              <span matListItemLine class="module-meta">
                <mat-chip-set>
                  <mat-chip [class]="'difficulty-' + mod.difficulty.toLowerCase()">
                    {{ mod.difficulty }}
                  </mat-chip>
                  <mat-chip>
                    <mat-icon>schedule</mat-icon>&nbsp;{{ mod.duration }}
                  </mat-chip>
                </mat-chip-set>
              </span>
            </a>
          </mat-nav-list>
        </mat-expansion-panel>
      </mat-accordion>
    </div>
  `,
  styles: [`
    .modules-container {
    }
    .module-count {
      margin-left: 8px;
      color: rgba(0, 0, 0, 0.54);
      font-weight: 400;
    }
    .module-item {
      height: auto !important;
      padding: 8px 0;
    }
    .module-meta {
      margin-top: 4px;
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
