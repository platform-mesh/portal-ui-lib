import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
} from '@angular/core';
import {
  DynamicPage,
  DynamicPageHeader,
  DynamicPageTitle,
} from '@fundamental-ngx/ui5-webcomponents-fiori';
import { Title } from '@fundamental-ngx/ui5-webcomponents/title';
import { LuigiClient } from '@luigi-project/client/luigi-element';
import { ResourceNodeContext } from '@platform-mesh/portal-ui-lib/services';

@Component({
  selector: 'pm-search-list-dynamic-page',
  standalone: true,
  templateUrl: './search-list-dynamic-page.component.html',
  encapsulation: ViewEncapsulation.Emulated,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DynamicPage, DynamicPageTitle, DynamicPageHeader, Title],
})
export class SearchListDynamicPage {
  LuigiClient = input.required<LuigiClient>();
  context = input.required<ResourceNodeContext>();

  resourceDefinition = computed(() => this.context().resourceDefinition);

  resourceTitleDefinition = computed(
    () =>
      this.resourceDefinition()?.ui?.listView?.resourceTitle?.label ??
      this.resourceDefinition()?.entityCollection ??
      '',
  );

  resourceDescriptionDefinition = computed(
    () =>
      this.resourceDefinition()?.ui?.listView?.resourceDescription?.label ??
      `This page displays the created ${this.resourceDefinition()?.entityCollection} in your environment`,
  );
}
