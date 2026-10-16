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
    ],
  },
];
