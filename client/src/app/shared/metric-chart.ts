import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  viewChild,
} from '@angular/core';
import { Chart } from 'chart.js/auto';

@Component({
  selector: 'app-metric-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure>
      <figcaption>{{ caption() }}</figcaption>
      <canvas #canvas role="img" [attr.aria-label]="caption()"></canvas>
      <ul class="sr-only">
        @for (point of points(); track point.label) {
          <li>{{ point.label }}: {{ point.value }}</li>
        }
      </ul>
    </figure>
  `,
  styles: `
    :host {
      display: block;
    }
    figure {
      margin: 0;
    }
    canvas {
      width: 100%;
      height: 280px;
    }
  `,
})
export class MetricChart {
  readonly caption = input('Chart');
  readonly kind = input<'line' | 'bar'>('line');
  readonly labels = input.required<readonly string[]>();
  readonly values = input.required<readonly number[]>();
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  readonly points = computed(() =>
    this.labels().map((label, index) => ({ label, value: this.values()[index] ?? 0 })),
  );

  constructor() {
    effect((onCleanup) => {
      const element = this.canvas()?.nativeElement;
      const labels = [...this.labels()];
      const values = [...this.values()];
      const kind = this.kind();
      const caption = this.caption();
      if (!element || labels.length === 0) {
        return;
      }
      const color =
        getComputedStyle(document.documentElement).getPropertyValue('--mat-sys-primary').trim() ||
        '#1d4ed8';
      const chart = new Chart(element, {
        type: kind,
        data: {
          labels,
          datasets: [
            {
              label: caption,
              data: values,
              borderColor: color,
              backgroundColor: color,
              tension: 0.25,
              pointRadius: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? false : undefined,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { maxTicksLimit: 6 } },
            y: { beginAtZero: true },
          },
        },
      });
      onCleanup(() => chart.destroy());
    });
  }
}
