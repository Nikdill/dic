import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavigationComponent } from './shared/navigation/navigation.component'

@Component({
  selector: 'dic-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  host: {
    class: 'block min-h-full bg-gray-800'
  }
})
export class App {
  protected readonly title = signal('dic');
}
