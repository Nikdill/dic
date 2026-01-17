import { Router, Routes } from '@angular/router';
import { inject } from '@angular/core'
import { AuthService } from './core/auth/auth.service'
import { map, take } from 'rxjs'
function authGuard(redirectPath: string) {
  return () => {
    const router = inject(Router);
    return inject(AuthService).auth$.pipe(take(1), map(auth => {
      return auth ? true : router.parseUrl(redirectPath)
    }))
  }
}

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
    path: 'import',
    loadComponent: () => import('./pages/import-words/import-words.component').then(m => m.ImportWordsComponent),
    canActivate: [
      authGuard('')
    ]
  },
  {
    path: 'vocabulary',
    loadComponent: () => import('./pages/vocabulary/vocabulary.component').then(m => m.VocabularyComponent),
    canActivate: [
      authGuard('')
    ]
  },
  {
    path: 'training',
    loadChildren: () => import('./pages/training/training-routes').then(m => m.TRAINING_ROUTES),
    canActivate: [
      authGuard('')
    ],
  }
];
