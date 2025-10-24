import { BooleanValueComponent } from './boolean-value/boolean-value.component';
import { LabelValue } from './label-value/label-value.component';
import { LinkValueComponent } from './link-value/link-value.component';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { LabelDisplay } from '@platform-mesh/portal-ui-lib/models/models';

@Component({
  selector: 'value-cell',
  standalone: true,
  imports: [BooleanValueComponent, LinkValueComponent, LabelValue],
  templateUrl: './value-cell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ValueCellComponent {
  value = input<unknown>();
  labelDisplay = input<LabelDisplay | boolean>();
  displayAsPlainText = input<boolean>(false);

  isLabelValue = computed(() => this.labelDisplayValue() !== undefined);
  isBoolLike = computed(() => this.boolValue() !== undefined);
  isUrlValue = computed(() => this.checkValidUrl(this.stringValue()));

  boolValue = computed(() => this.normalizeBoolean(this.value()));
  stringValue = computed(() => this.normalizeString(this.value()));
  labelDisplayValue = computed(() =>
    this.normalizeLabelDisplay(this.labelDisplay()),
  );

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

  private normalizeLabelDisplay(value: unknown): LabelDisplay | undefined {
    if (typeof value === 'object' && value !== null) {
      return value;
    }

    if (value) {
      return {};
    }

    return undefined;
  }
}
