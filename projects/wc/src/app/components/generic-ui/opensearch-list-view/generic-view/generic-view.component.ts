import { ResourceField } from '@openmfp/ngx';
import { executeButtonAction } from '../../../../utils/field-definition.utils';
import { ResourceLogo } from '../../resource-logo/resource-logo.component';
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
import {
  FieldDefinition,
  GenericResource,
} from '@platform-mesh/portal-ui-lib/models';
import { ResourceNodeContext } from '@platform-mesh/portal-ui-lib/services';

export type ViewType = 'detailView' | 'listView';

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
    NgTemplateOutlet,
    ResourceLogo,
    Button,
    ResourceField,
  ],
  templateUrl: './generic-view.component.html',
  styleUrl: './generic-view.component.scss',
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericView<T extends GenericResource> {
  view = input.required<ViewType>();
  LuigiClient = input.required<LuigiClient>();
  context = input.required<ResourceNodeContext>();
  resource = input<T>();
  defaultTitle = input<string>();
  defaultDescription = input<string>();

  resourceDefinition = computed(() => this.context().resourceDefinition);
  resourceTitleDefinition = computed(
    () => this.resourceDefinition()?.ui?.[this.view()]?.resourceTitle,
  );
  resourceDescriptionDefinition = computed(
    () => this.resourceDefinition()?.ui?.[this.view()]?.resourceDescription,
  );
  viewActions = computed(() =>
    (this.resourceDefinition()?.ui?.[this.view()]?.actions ?? []).filter(
      (a) => a.uiSettings?.displayAs === 'button',
    ),
  );

  buttonAction(event: MouseEvent, field: FieldDefinition) {
    event.stopPropagation();
    executeButtonAction(this.LuigiClient(), field, this.resource());
  }
}
