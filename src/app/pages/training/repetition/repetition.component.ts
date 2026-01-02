import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { FirestoreService } from '../../../core/firestore/firestore.service'
import { map, shareReplay } from 'rxjs'
import { AsyncPipe, JsonPipe } from '@angular/common'

function getRandomIndexes(max: number, count: number, buffer: number[] = []) {
  if(count === buffer.length) {
    return buffer;
  }

  let result = Math.floor(Math.random() * max);
  if(buffer.includes(result)) {
    return getRandomIndexes(max, count, buffer);
  } else {
    buffer.push(result);
  }

  if(buffer.length === count) {
    return buffer;
  } else {
    return getRandomIndexes(max, count, buffer);
  }
}

@Component({
  selector: 'dic-repetition',
  templateUrl: 'repetition.component.html',
  imports: [
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RepetitionComponent {
  private readonly firestoreService = inject(FirestoreService);
  protected readonly listOfWords$ = this.firestoreService.listOfWords$;

  protected readonly queue$ = this.listOfWords$.pipe(
    map(list => list || []),
    map(list => {
      const indexes = getRandomIndexes(list.length - 1, 30);
      const translationIndexes = getRandomIndexes(list.length - 1, 60, indexes);
      return indexes
        .map(index => list.slice(index, index + 1))
        .flat(1)
        .map(item => {
          const index = translationIndexes.pop() || -1;
          return {
            word: item.word,
            variants: {
              correct: item.translation,
              incorrect: list.slice(index, index + 1)[0].translation
            }
          }
        })
    }),
    shareReplay({ refCount: true, bufferSize: 1})
  )


}
