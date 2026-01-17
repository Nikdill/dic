import { RedirectCommand, Router, Routes } from '@angular/router'
import { inject } from '@angular/core'
import { map } from 'rxjs'
import { RepetitionService } from '../../feature/training/repetition/repetition.service'
import { WordTranslationService } from '../../feature/training/word-translation/word-translation.service'

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
        return inject(RepetitionService).getWords().pipe(
          map(list => {
            return list.length < 1 ? command : list
          })
        )
      }
    },
    runGuardsAndResolvers: 'always'
  },
  {
    path: 'word-translation',
    loadComponent: () => import('./word-translation/word-translation.component').then(m => m.WordTranslationComponent),
    resolve: {
      words: () => {
        const command = new RedirectCommand(inject(Router).parseUrl("/"));
        return inject(WordTranslationService).getWords().pipe(
          map(list => {
            return list.length < 1 ? command : list
          })
        )
      }
    },
    runGuardsAndResolvers: 'always'
  }
]
