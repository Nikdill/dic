import { RedirectCommand, Router, Routes } from '@angular/router'
import { inject } from '@angular/core'
import { map } from 'rxjs'
import { RepetitionService } from '../../feature/training/repetition/repetition.service'
import { ListeningService } from '../../feature/training/listening/listening.service'
import { WordBuilderService } from '../../feature/training/word-builder/word-builder.service'

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
            if(list.length < 2) {
              return command
            }
            const half = Math.floor(list.length / 2);
            const words = list.slice(0, half)
            const translations = list.slice(half).sort(() => Math.random() > 0.5 ? -1 : 1)
            return words
              .map((item, index) => {
                return {
                  ...item,
                  variants: [{
                    type: 'correct' as const,
                    translation: item.translation,
                  },
                    {
                      type: 'incorrect' as const,
                      translation: translations[index].translation
                    }].sort(() => Math.random() > 0.5 ? -1 : 1)
                }
              })
          }),
        )
      }
    },
    runGuardsAndResolvers: 'always'
  },
  {
    path: 'listening',
    loadComponent: () => import('./listening/listening.component').then(m => m.ListeningComponent),
    resolve: {
      words: () => {
        const command = new RedirectCommand(inject(Router).parseUrl("/"));
        return inject(ListeningService).getWords().pipe(
          map(list => {
            return list.length < 1 ? command : list
          })
        )
      }
    },
    runGuardsAndResolvers: 'always'
  },
  {
    path: 'word-builder',
    loadComponent: () => import('./word-builder/word-builder.component').then(m => m.WordBuilderComponent),
    resolve: {
      words: () => {
        const command = new RedirectCommand(inject(Router).parseUrl("/"));
        return inject(WordBuilderService).getWords().pipe(
          map(list => {
            return list.length < 1 ? command : list
          })
        )
      }
    },
    runGuardsAndResolvers: 'always'
  }
]
