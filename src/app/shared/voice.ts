import { DOCUMENT, inject, Injectable } from '@angular/core'

@Injectable({ providedIn: 'root' })
export class Voice {
  private readonly documentRef = inject(DOCUMENT);
  play(text: string) {
    const utterance = new SpeechSynthesisUtterance();
    utterance.text = text;
    utterance.lang = 'en-US'; // Язык
    utterance.rate = 0.8;
    utterance.pitch = 0.9; // Высота тона (0 - 1)
    utterance.volume = 1.0; // Громкость (0 - 1)
    this.documentRef.defaultView?.speechSynthesis.speak(utterance);
  }
}
