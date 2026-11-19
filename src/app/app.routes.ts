import { Routes } from '@angular/router';
import { Acerca } from './pages/acerca/acerca';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'products' },
  {
    path: 'products',
    loadComponent: () => import('./pages/acerca/products/products').then((m) => m.Products),
  },
  {
    path: 'users',
    loadComponent: () => import('./pages/users/users').then((m) => m.Users),
  },
  {
    path: 'posts',
    loadComponent: () => import('./pages/posts/posts').then((m) => m.PostsPage),
  },
  { path: 'acerca', component: Acerca },
  { path: '**', redirectTo: 'products' },
];
