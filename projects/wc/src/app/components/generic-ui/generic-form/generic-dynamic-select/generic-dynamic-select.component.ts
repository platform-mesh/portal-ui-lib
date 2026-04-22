import { SelectOption } from '../form-field-definition';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewEncapsulation,
  input,
  output,
  signal,
} from '@angular/core';
import { Option } from '@fundamental-ngx/ui5-webcomponents/option';
import { Select } from '@fundamental-ngx/ui5-webcomponents/select';

@Component({
  selector: 'pm-generic-dynamic-select',
  standalone: true,
  imports: [Select, Option],
  templateUrl: './generic-dynamic-select.component.html',
  styleUrls: ['./generic-dynamic-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.ShadowDom,
})
export class GenericDynamicSelect implements OnInit {
  readonly loadValues = input.required<() => Promise<SelectOption[]>>();
  readonly value = input<string>('');
  readonly required = input<boolean>(false);
  readonly valueState = input<
    'None' | 'Positive' | 'Critical' | 'Negative' | 'Information'
  >('None');
  readonly disabled = input<boolean>(false);

  readonly change = output<Event>();
  readonly input = output<Event>();
  readonly blur = output<void>();

  readonly options = signal<SelectOption[]>([]);

  ngOnInit(): void {
    this.loadValues()().then((values) => this.options.set(values));
  }
}
