import { executeButtonAction } from '../../../utils/field-definition.utils';
import { CreateResourceModal } from '../create-resource-modal/create-resource-modal.component';
import { ResourceLogo } from '../resource-logo/resource-logo.component';
import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  inject,
  input,
  viewChild,
} from '@angular/core';
import {
  DynamicPage,
  DynamicPageHeader,
  DynamicPageTitle,
} from '@fundamental-ngx/ui5-webcomponents-fiori';
import { Title } from '@fundamental-ngx/ui5-webcomponents/title';
import { Toolbar } from '@fundamental-ngx/ui5-webcomponents/toolbar';
import { ToolbarButton } from '@fundamental-ngx/ui5-webcomponents/toolbar-button';
import { LuigiClient } from '@luigi-project/client/luigi-element';
import { ResourceField, ResourceFieldButtonClickEvent } from '@openmfp/ngx';
import {
  PlatformMeshFieldDefinition,
  Resource,
} from '@platform-mesh/portal-ui-lib/models';
import {
  ResourceNodeContext,
  ResourceService,
} from '@platform-mesh/portal-ui-lib/services';
import { resourceActionAllowed } from '@platform-mesh/portal-ui-lib/utils';

@Component({
  selector: 'pm-search-list-dynamic-page',
  standalone: true,
  templateUrl: './search-list-dynamic-page.component.html',
  styleUrl: './search-list-dynamic-page.component.scss',
  encapsulation: ViewEncapsulation.Emulated,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DynamicPage,
    DynamicPageTitle,
    DynamicPageHeader,
    Title,
    Toolbar,
    ToolbarButton,
    ResourceLogo,
    ResourceField,
    CreateResourceModal,
  ],
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

  actions = computed<PlatformMeshFieldDefinition[]>(
    () => this.resourceDefinition()?.ui?.listView?.actions ?? [],
  );

  hasUiCreateViewFields = computed(
    () => !!this.resourceDefinition()?.ui?.createView?.fields?.length,
  );

  createFields = computed<PlatformMeshFieldDefinition[]>(
    () => this.resourceDefinition()?.ui?.createView?.fields ?? [],
  );

  canCreate = computed(() => this.canDo('create'));

  private resourceService = inject(ResourceService);
  private createModal = viewChild<CreateResourceModal>('createModal');

  openCreateModal(): void {
    void this.createModal()?.open();
  }

  onCreateSubmit(value: Resource): void {
    const resourceDefinition = this.resourceDefinition();
    if (!resourceDefinition) return;
    this.resourceService
      .create(value, resourceDefinition, this.context())
      .subscribe({
        next: (result) => {
          this.createModal()?.close();
          // TODO(#593): refresh the list once the table is added (re-run OpenSearch query)
          console.debug('Resource created', result);
        },
      });
  }

  genericActionHandler(event: ResourceFieldButtonClickEvent<Resource>): void {
    // TODO(#593): refresh the list once the table is added (re-run OpenSearch query)
    executeButtonAction(
      this.LuigiClient(),
      event.field,
      event.resource,
      (data: any) => {},
    );
  }

  canDo(action: string | undefined): boolean {
    if (!action) {
      return true;
    }

    return resourceActionAllowed(
      this.context().portalPermissions,
      this.resourceDefinition()?.permissionsDefinition?.resource,
      action,
    );
  }
}
