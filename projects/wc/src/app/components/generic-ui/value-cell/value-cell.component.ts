import { evaluateCssRules } from '../../../utils/cssRules.engine';
import { BooleanValue } from './boolean-value/boolean-value.component';
import { LinkValue } from './link-value/link-value.component';
import { SecretValue } from './secret-value/secret-value.component';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import { Icon } from '@fundamental-ngx/ui5-webcomponents';
import { LuigiClient } from '@luigi-project/client/luigi-element';
import { FieldDefinition } from '@platform-mesh/portal-ui-lib/models/models';
import { Resource } from '@platform-mesh/portal-ui-lib/models/models/resource';
import { getResourceValueByJsonPath } from '@platform-mesh/portal-ui-lib/utils/utils';

@Component({
  selector: 'pm-value-cell',
  imports: [Icon, BooleanValue, LinkValue, SecretValue],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
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
  labelDisplay = computed(() => this.uiSettings()?.labelDisplay);
  cssCustomization = computed(() => this.uiSettings()?.cssCustomization);
  tooltipIcon = computed(() => this.uiSettings()?.tooltipIcon);
  cssRules = computed(() =>
    evaluateCssRules(this.value(), this.uiSettings()?.cssRules),
  );
  cssStyles = computed(() => ({
    ...this.cssCustomization(),
    ...this.cssRules(),
  }));

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
