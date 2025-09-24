import { BooleanValueComponent } from './boolean-value/boolean-value.component';
import { LinkValueComponent } from './link-value/link-value.component';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { LabelDisplay } from '@platform-mesh/portal-ui-lib/models/models';
import { LabelValue } from "./label-value/label-value.component";

@Component({
  selector: 'value-cell',
  standalone: true,
  imports: [BooleanValueComponent, LinkValueComponent, LabelValue],
  templateUrl: './value-cell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ValueCellComponent {
  value = input<unknown>();
  labelDisplay = input<LabelDisplay>();

  isLabelValue = computed(() => this.labelDisplay() !== undefined);
  isBoolLike = computed(() => this.boolValue() !== undefined);
  isUrlValue = computed(() => this.checkValidUrl(this.stringValue()));

  boolValue = computed(() => this.normalizeBoolean(this.value()));
  stringValue = computed(() => this.normalizeString(this.value()));

  private normalizeBoolean(value: unknown): boolean | undefined {
    const normalizedValue = value?.toString()?.toLowerCase();
    if (normalizedValue === 'true') {
      return true;
    }
    if (normalizedValue === 'false') {
      return false;
    }
    return undefined;
  }

  private normalizeString(value: unknown): string | undefined {
    if (typeof value !== 'string' || !value.trim()) {
      return undefined;
    }

    return value;
  }

  private checkValidUrl(value: string | undefined): boolean {
    if (!value) {
      return false;
    }

    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }
}
