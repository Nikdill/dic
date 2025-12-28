import { Router, Routes } from '@angular/router';
import { inject } from '@angular/core'
import { AuthService } from './core/auth/auth.service'
import { map, take } from 'rxjs'

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/auth/auth.component').then(m => m.AuthComponent),
    canActivate: [
      () => {
        const router = inject(Router);
        return inject(AuthService).auth$.pipe(take(1), map(auth => {
          return auth ? router.parseUrl('/vocabulary') : true
        }))
      }
    ]
  },
  {
    path: 'vocabulary',
    loadComponent: () => import('./pages/vocabulary/vocabulary.component').then(m => m.VocabularyComponent),
    canActivate: [
      () => {
        const router = inject(Router);
        return inject(AuthService).auth$.pipe(take(1), map(auth => {
          return auth ? true : router.parseUrl('')
        }))
      }
    ]
  }
];
