import { executeButtonAction } from '../../../utils/field-definition.utils';
import { ResourceLogo } from '../resource-logo/resource-logo.component';
import { ValueCellComponent } from '../value-cell/value-cell.component';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
} from '@angular/core';
import { DynamicPage } from '@fundamental-ngx/ui5-webcomponents-fiori/dynamic-page';
import { DynamicPageHeader } from '@fundamental-ngx/ui5-webcomponents-fiori/dynamic-page-header';
import { DynamicPageTitle } from '@fundamental-ngx/ui5-webcomponents-fiori/dynamic-page-title';
import { Button } from '@fundamental-ngx/ui5-webcomponents/button';
import { Text } from '@fundamental-ngx/ui5-webcomponents/text';
import { Title } from '@fundamental-ngx/ui5-webcomponents/title';
import { Toolbar } from '@fundamental-ngx/ui5-webcomponents/toolbar';
import { LuigiClient } from '@luigi-project/client/luigi-element';
import { FieldDefinition, Resource } from '@platform-mesh/portal-ui-lib/models';
import { ResourceNodeContext } from '@platform-mesh/portal-ui-lib/services';

@Component({
  selector: 'pm-generic-view',
  standalone: true,
  imports: [
    DynamicPage,
    DynamicPageTitle,
    Title,
    Text,
    Toolbar,
    DynamicPageHeader,
    ValueCellComponent,
    NgTemplateOutlet,
    ResourceLogo,
    Button,
  ],
  templateUrl: './generic-view.component.html',
  styleUrl: './generic-view.component.scss',
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericView {
  LuigiClient = input.required<LuigiClient>();
  context = input.required<ResourceNodeContext>();
  resource = input<Resource>();
  defaultTitle = input<string>();
  defaultDescription = input<string>();

  resourceDefinition = computed(() => this.context().resourceDefinition);
  resourceTitleDefinition = computed(
    () => this.resourceDefinition()?.ui?.detailView?.resourceTitle,
  );
  resourceDescriptionDefinition = computed(
    () => this.resourceDefinition()?.ui?.detailView?.resourceDescription,
  );
  viewActions = computed(() =>
    (this.resourceDefinition()?.ui?.detailView?.actions ?? []).filter(
      (a) => a.uiSettings?.displayAs === 'button',
    ),
  );

  buttonAction(event: any, field: FieldDefinition) {
    event.stopPropagation();
    executeButtonAction(this.LuigiClient(), field, this.resource());
  }
}
