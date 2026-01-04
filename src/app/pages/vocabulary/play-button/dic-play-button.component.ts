import { ChangeDetectionStrategy, Component, DOCUMENT, inject, input } from '@angular/core'
import { Voice } from '../../../shared/voice'

@Component({
  selector: 'button[dicPlayButton]',
  templateUrl: 'dic-play-button.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(click)': 'clickHandler()'
  }
})
export class DicPlayButtonComponent {
  private readonly voice = inject(Voice);
  readonly text = input.required<string>();

  protected clickHandler() {
    this.voice.play(this.text());
  }

}
