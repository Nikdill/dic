import { RedirectCommand, Router, Routes } from '@angular/router'
import { FirestoreService } from '../../core/firestore/firestore.service'
import { inject } from '@angular/core'
import { map } from 'rxjs'

export const TRAINING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./training.component').then(m => m.TrainingComponent),
  },
  {
    path: 'repetition',
    loadComponent: () => import('./repetition/repetition.component').then(m => m.RepetitionComponent),
    resolve: {
      words: () => {
        const command = new RedirectCommand(inject(Router).parseUrl("/"));
        return inject(FirestoreService).getWordsForRepetition().pipe(
          map(list => {
            return list.length < 10 ? command : list
          })
        )
      }
    },
    runGuardsAndResolvers: 'always'
  }
]
