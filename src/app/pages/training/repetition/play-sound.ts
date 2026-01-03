import { inject, Renderer2 } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { finalize, fromEvent, switchMap, take } from 'rxjs'


export function PlaySoundFactory() {
  const renderer2 = inject(Renderer2);
  const httpClient = inject(HttpClient);
  return (path: string)=> {
    return httpClient.get(path, { responseType: 'blob' }).pipe(
      switchMap(source => {
        const audio = renderer2.createElement('audio');
        audio.src = URL.createObjectURL(source);
        audio.play();

        return fromEvent(audio, 'ended').pipe(
          take(1),
          finalize(() => {
            URL.revokeObjectURL(audio.src);
          })
        )
      }),
    );
  }
}
