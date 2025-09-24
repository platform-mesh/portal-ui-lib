import { Component, input } from '@angular/core';
import { LabelDisplay } from '@platform-mesh/portal-ui-lib/models/models';

@Component({
  selector: 'wc-label-value',
  imports: [],
  templateUrl: './label-value.component.html',
  styleUrl: './label-value.component.scss',
})
export class LabelValue {
  value = input.required<unknown>();
  labelDisplay = input.required<LabelDisplay>();
}
