import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/shell').then((module) => module.Shell),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/dashboard/dashboard-page').then((module) => module.DashboardPage),
      },
      {
        path: 'endpoints',
        loadComponent: () =>
          import('./features/endpoints/endpoint-list-page').then((module) => module.EndpointListPage),
      },
      {
        path: 'endpoints/new',
        loadComponent: () =>
          import('./features/endpoints/endpoint-form-page').then((module) => module.EndpointFormPage),
      },
      {
        path: 'endpoints/:id',
        loadComponent: () =>
          import('./features/endpoints/endpoint-form-page').then((module) => module.EndpointFormPage),
      },
      {
        path: 'monitoring/:id',
        loadComponent: () =>
          import('./features/monitoring/monitoring-page').then((module) => module.MonitoringPage),
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./features/analytics/analytics-page').then((module) => module.AnalyticsPage),
      },
      {
        path: 'alerts',
        loadComponent: () => import('./features/alerts/alerts-page').then((module) => module.AlertsPage),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings-page').then((module) => module.SettingsPage),
      },
    ],
  },
];
