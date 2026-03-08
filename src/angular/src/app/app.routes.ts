import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ModulesComponent } from './pages/modules/modules.component';
import { ModuleDetailComponent } from './pages/module-detail/module-detail.component';
import { QuizComponent } from './pages/quiz/quiz.component';
import { ResultsComponent } from './pages/results/results.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'modules', component: ModulesComponent },
  { path: 'modules/:id', component: ModuleDetailComponent },
  { path: 'quiz', component: QuizComponent },
  { path: 'results', component: ResultsComponent },
];
