import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { FirestoreService } from '../../core/firestore/firestore.service'
import { RepetitionComponent } from './repetition/repetition.component'

@Component({
  selector: 'dic-training',
  templateUrl: 'training.component.html',
  imports: [
    RepetitionComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingComponent {

}
