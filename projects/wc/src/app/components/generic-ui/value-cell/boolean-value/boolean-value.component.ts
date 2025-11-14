import {
  ICON_DESIGN_NEGATIVE,
  ICON_DESIGN_POSITIVE,
  ICON_NAME_NEGATIVE,
  ICON_NAME_POSITIVE,
} from './boolean-cell.constants';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { IconComponent } from '@ui5/webcomponents-ngx';

export type IconDesignType =
  | typeof ICON_DESIGN_POSITIVE
  | typeof ICON_DESIGN_NEGATIVE;

@Component({
  selector: 'wc-boolean-value',
  imports: [IconComponent],
  templateUrl: './boolean-value.component.html',
  styleUrl: './boolean-value.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BooleanValueComponent {
  boolValue = input.required<boolean>();
  iconDesign = computed<IconDesignType>(() => {
    return this.boolValue() ? ICON_DESIGN_POSITIVE : ICON_DESIGN_NEGATIVE;
  });
  iconName = computed<string>(() => {
    return this.boolValue() ? ICON_NAME_POSITIVE : ICON_NAME_NEGATIVE;
  });
}
