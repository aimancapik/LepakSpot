import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';
import { Cafe } from '../../../core/models/cafe.model';

@Component({
  selector: 'app-cafe-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cafe-card.component.html',
  styleUrl: './cafe-card.component.scss',
})
export class CafeCardComponent {
  cafe = input.required<Cafe>();
}
