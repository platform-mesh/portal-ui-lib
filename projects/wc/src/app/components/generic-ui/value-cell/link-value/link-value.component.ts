import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LinkComponent } from '@ui5/webcomponents-ngx';

@Component({
  selector: 'wc-link-value',
  imports: [LinkComponent],
  templateUrl: './link-value.component.html',
  styleUrl: './link-value.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinkValueComponent {
  urlValue = input.required<string>();

  public stopPropagation(event: Event) {
    event.stopPropagation();
  }
}
