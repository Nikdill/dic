import { ChangeDetectionStrategy, Component, DOCUMENT, inject, input } from '@angular/core'

@Component({
  selector: 'button[dicPlayButton]',
  templateUrl: 'dic-play-button.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(click)': 'clickHandler()'
  }
})
export class DicPlayButtonComponent {
  private readonly documentRef = inject(DOCUMENT);
  readonly text = input.required<string>();

  protected clickHandler() {
    const utterance = new SpeechSynthesisUtterance();
    utterance.text = this.text();
    utterance.lang = 'en-US'; // Язык
    utterance.rate = 0.8;
    utterance.pitch = 0.9; // Высота тона (0 - 1)
    utterance.volume = 1.0; // Громкость (0 - 1)
    this.documentRef.defaultView?.speechSynthesis.speak(utterance);
// // Запустить озвучку
//   window.speechSynthesis.speak(utterance);
  }

}
