import { BooleanValueComponent } from './boolean-value/boolean-value.component';
import { LinkValueComponent } from './link-value/link-value.component';
import { SecretValueComponent } from './secret-value/secret-value.component';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import { LuigiClient } from '@luigi-project/client/luigi-element';
import {
  FieldDefinition,
  LabelDisplay,
} from '@platform-mesh/portal-ui-lib/models/models';
import { Resource } from '@platform-mesh/portal-ui-lib/models/models/resource';
import { getResourceValueByJsonPath } from '@platform-mesh/portal-ui-lib/utils/utils';
import '@ui5/webcomponents-icons/dist/copy.js';
import '@ui5/webcomponents-icons/dist/hide.js';
import '@ui5/webcomponents-icons/dist/show.js';
import { IconComponent } from '@ui5/webcomponents-ngx';

@Component({
  selector: 'value-cell',
  standalone: true,
  imports: [
    IconComponent,
    BooleanValueComponent,
    LinkValueComponent,
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

  uiSettings = computed(() => this.fieldDefinition().uiSettings);
  displayAs = computed(() => this.uiSettings()?.displayAs);
  withCopyButton = computed(() => this.uiSettings()?.withCopyButton);
  labelDisplay = computed(() =>
    this.normalizeLabelDisplay(this.uiSettings()?.labelDisplay),
  );

  isBoolLike = computed(() => this.boolValue() !== undefined);
  isUrlValue = computed(() => this.checkValidUrl(this.stringValue()));
  testId = computed(() => `value-cell-${this.fieldDefinition().property}`);

  boolValue = computed(() => this.normalizeBoolean(this.value()));
  stringValue = computed(() => this.normalizeString(this.value()));
  isVisible = signal(false);

  toggleVisibility(e: Event): void {
    e.stopPropagation();
    this.isVisible.set(!this.isVisible());
  }

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
