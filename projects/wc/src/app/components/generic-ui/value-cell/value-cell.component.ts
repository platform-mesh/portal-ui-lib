import { BooleanValueComponent } from './boolean-value/boolean-value.component';
import { LabelValue } from './label-value/label-value.component';
import { LinkValueComponent } from './link-value/link-value.component';
import { SecretValueComponent } from './secret-value/secret-value.component';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { LuigiClient } from '@luigi-project/client/luigi-element';
import {
  FieldDefinition,
  LabelDisplay,
} from '@platform-mesh/portal-ui-lib/models/models';
import { Resource } from '@platform-mesh/portal-ui-lib/models/models/resource';
import { getResourceValueByJsonPath } from '@platform-mesh/portal-ui-lib/utils/utils';
import '@ui5/webcomponents-icons/dist/copy.js';
import { IconComponent } from '@ui5/webcomponents-ngx';

@Component({
  selector: 'value-cell',
  standalone: true,
  imports: [
    IconComponent,
    BooleanValueComponent,
    LinkValueComponent,
    LabelValue,
    SecretValueComponent,
  ],
  templateUrl: './value-cell.component.html',
  styleUrls: ['./value-cell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ValueCellComponent {
  fieldDefinition = input.required<FieldDefinition>();
  resource = input.required<Resource>();
  LuigiClient = input.required<LuigiClient>();

  value = computed(() =>
    getResourceValueByJsonPath(this.resource(), this.fieldDefinition()),
  );
  labelDisplay = computed(() => this.fieldDefinition().labelDisplay);
  displayAsSecret = computed(() => this.fieldDefinition().displayAsSecret);
  withCopyButton = computed(() => this.fieldDefinition().withCopyButton);
  displayAsPlainText = computed(
    () => this.fieldDefinition().displayAsPlainText,
  );

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

  public copyValue(event: Event) {
    event.stopPropagation();
    navigator.clipboard.writeText(this.value() || '');
    this.LuigiClient().uxManager().showAlert({
      text: 'Copied to clipboard',
      type: 'success',
      closeAfter: 2000,
    });
  }
}
