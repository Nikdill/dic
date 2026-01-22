import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  input, output, signal,
} from '@angular/core'

@Component({
  selector: 'dic-timer',
  templateUrl: 'timer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative flex items-center justify-center',
    '[style.width.px]':"(radius() + strokeWidth() / 2)* 2",
    '[style.height.px]': "(radius() + strokeWidth() / 2) * 2"
  },
})
export class TimerComponent implements AfterViewInit {
  private readonly  circumference = computed(() => {
    return 2 * Math.PI * this.radius()
  });

  private startTime: number | undefined;

  protected readonly offset = signal('')

  readonly radius = input(90);

  readonly strokeWidth = input(4);

  readonly duration = input.required<number>();

  ngAfterViewInit() {
    requestAnimationFrame(this.animate.bind(this));

  }

  private animate(timestamp: number) {
    if (!this.startTime) this.startTime = timestamp;
    const elapsed = timestamp - this.startTime;
    const progress = Math.min(elapsed / this.duration(), 1);

    // Анимация круга
    const offset = -1 * (this.circumference() - (this.circumference() - (progress * this.circumference())));
    // this.circleRef().nativeElement.style.strokeDashoffset = ;

    this.offset.set(offset.toString())
    if (progress < 1) {
      requestAnimationFrame(this.animate.bind(this))
    } else {
      this.offset.set('');
    }
  }
}
