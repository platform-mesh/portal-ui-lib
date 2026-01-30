import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';
import { LinkComponent } from '@ui5/webcomponents-ngx';

@Component({
  selector: 'pm-link-value',
  imports: [LinkComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './link-value.component.html',
  styleUrl: './link-value.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinkValueComponent {
  urlValue = input.required<string>();
  testId = input<string>('link-value-link');

  public stopPropagation(event: Event) {
    event.stopPropagation();
  }
}
