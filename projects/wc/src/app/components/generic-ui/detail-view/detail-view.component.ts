import { processFields } from '../../../utils/proccess-fields';
import { CreateResourceModal } from '../list-view/create-resource-modal/create-resource-modal.component';
import { DeleteResourceModal } from '../list-view/delete-resource-confirmation-modal/delete-resource-modal.component';
import { ValueCellComponent } from '../value-cell/value-cell.component';
import {
  KubeConfigTemplateProps,
  kubeConfigTemplate,
} from './kubeconfig-template';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { DynamicPage } from '@fundamental-ngx/ui5-webcomponents-fiori/dynamic-page';
import { DynamicPageHeader } from '@fundamental-ngx/ui5-webcomponents-fiori/dynamic-page-header';
import { DynamicPageTitle } from '@fundamental-ngx/ui5-webcomponents-fiori/dynamic-page-title';
import { Label } from '@fundamental-ngx/ui5-webcomponents/label';
import { Text } from '@fundamental-ngx/ui5-webcomponents/text';
import { Title } from '@fundamental-ngx/ui5-webcomponents/title';
import { Toolbar } from '@fundamental-ngx/ui5-webcomponents/toolbar';
import { ToolbarButton } from '@fundamental-ngx/ui5-webcomponents/toolbar-button';
import { LuigiClient } from '@luigi-project/client/luigi-element';
import { FieldDefinition, Resource } from '@platform-mesh/portal-ui-lib/models';
import {
  AccountInfoService,
  ErrorHandlerService,
  GatewayService,
  ResourceNodeContext,
  ResourceRequestParams,
  ResourceService,
} from '@platform-mesh/portal-ui-lib/services';
import {
  generateGraphQLFields,
  getResourceValueByJsonPath,
  replaceDotsAndHyphensWithUnderscores,
} from '@platform-mesh/portal-ui-lib/utils';
import { firstValueFrom } from 'rxjs';
import { tap } from 'rxjs/operators';

@Component({
  selector: 'pm-detail-view',
  standalone: true,
  imports: [
    DynamicPage,
    DynamicPageTitle,
    Title,
    Text,
    Toolbar,
    ToolbarButton,
    DynamicPageHeader,
    Label,
    ValueCellComponent,
    CreateResourceModal,
    DeleteResourceModal,
    NgTemplateOutlet,
  ],
  templateUrl: './detail-view.component.html',
  styleUrl: './detail-view.component.scss',
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailView {
  private resourceService = inject(ResourceService);
  private accountInfoService = inject(AccountInfoService);
  private gatewayService = inject(GatewayService);
  private errorHandlerService = inject(ErrorHandlerService);
  protected readonly getResourceValueByJsonPath = getResourceValueByJsonPath;
  private createModal = viewChild<CreateResourceModal>('createModal');
  private deleteModal = viewChild<DeleteResourceModal>('deleteModal');

  LuigiClient = input.required<LuigiClient>();
  context = input.required<ResourceNodeContext>();
  resource = signal<Resource | undefined>(undefined);

  resourceDefinition = computed(() => this.context().resourceDefinition);
  resourceFields = computed(
    () => this.resourceDefinition()?.ui?.detailView?.fields ?? [],
  );
  resourceId = computed(() => this.context().resourceId);
  workspacePath = computed(() =>
    this.gatewayService.resolveKcpPath(this.context()),
  );
  viewFields = computed(() => processFields(this.resourceFields()));
  showDownloadKubeconfig = computed(
    () =>
      this.resourceDefinition()?.ui?.detailView?.showDownloadKubeconfig ??
      false,
  );
  isDownloadingKubeConfig = signal(false);
  resourceTitleDefinition = computed(
    () => this.resourceDefinition()?.ui?.detailView?.resourceTitle,
  );
  resourceDescriptionDefinition = computed(
    () => this.resourceDefinition()?.ui?.detailView?.resourceDescription,
  );

  constructor() {
    effect(() => {
      this.readResource();
    });
  }

  private readResource(): void {
    const resourceDefinition = this.getResourceDefinition();
    const fields = this.getDetailViewQueryFields();

    const params: ResourceRequestParams = {
      kind: resourceDefinition.kind,
      version: resourceDefinition.version,
      group: replaceDotsAndHyphensWithUnderscores(resourceDefinition.group),
    };

    const resourceId = this.resourceId();
    if (!resourceId) {
      this.LuigiClient().uxManager().showAlert({
        text: 'Resource ID is not defined',
        type: 'error',
      });

      throw new Error('Resource ID is not defined');
    }

    this.resourceService
      .read(
        resourceId,
        params,
        fields,
        this.context(),
        params.kind.toLowerCase() === 'account',
      )
      .pipe(
        tap((resource) => {
          if (resource?.metadata?.deletionTimestamp) {
            this.errorHandlerService.handleResourcePendingDeletion(resource);
          }
        }),
      )
      .subscribe({
        next: (result) => this.resource.set(result),
        error: (error) => this.errorHandlerService.handleError(error),
      });
  }

  navigateToParent() {
    const parentNavigationContext =
      this.context().parentNavigationContexts?.at(-1);
    if (!parentNavigationContext) {
      this.LuigiClient().uxManager().showAlert({
        text: 'Parent navigation context is not defined',
        type: 'error',
      });

      throw new Error('Parent navigation context is not defined');
    }

    this.LuigiClient()
      .linkManager()
      .fromContext(parentNavigationContext)
      .navigate('/');
  }

  openDeleteResourceModal(event: MouseEvent, resource: Resource) {
    event.stopPropagation?.();
    const resourceToDelete: Resource = {
      ...resource,
      metadata: { name: this.getResourceId() },
    };
    this.deleteModal()?.open(resourceToDelete);
  }

  openEditResourceModal(event: MouseEvent, resource: Resource) {
    event.stopPropagation?.();
    this.createModal()?.open(resource);
  }

  delete(resource: Resource) {
    const resourceDefinition = this.getResourceDefinition();
    const resourceId = this.getResourceId();

    const resourceToDelete: Resource = {
      ...resource,
      metadata: { name: resourceId },
    };

    this.resourceService
      .delete(
        resourceToDelete,
        resourceDefinition,
        this.context(),
        resourceDefinition.kind.toLowerCase() === 'account',
      )
      .subscribe({
        next: async (_result) => {
          this.deleteModal()?.close();
          console.debug('Resource deleted.');
          this.navigateToParent();
        },
        error: (_error) => {
          this.LuigiClient()
            .uxManager()
            .showAlert({
              text: `Failure! Could not delete resource: ${resource.metadata.name}.`,
              type: 'error',
            });
        },
      });
  }

  update(resource: Resource) {
    const resourceDefinition = this.getResourceDefinition();
    const resourceId = this.getResourceId();
    const fields = generateGraphQLFields(this.resourceFields());
    const resourceToUpdate: Resource = {
      ...resource,
      metadata: { name: resourceId },
    };

    this.resourceService
      .update(
        resourceToUpdate,
        resourceDefinition,
        this.context(),
        resourceDefinition.kind.toLowerCase() === 'account',
        fields,
      )
      .subscribe({
        next: (result: any) => {
          this.resource.set(result);
          this.createModal()?.close();
          console.debug('Resource updated', result);
        },
        error: (_error) => {
          this.LuigiClient()
            .uxManager()
            .showAlert({
              text: `Failure! Could not update resource: ${resource.metadata.name}.`,
              type: 'error',
            });
        },
      });
  }

  async downloadKubeConfig() {
    if (this.isDownloadingKubeConfig()) {
      return;
    }

    try {
      this.isDownloadingKubeConfig.set(true);
      const { accountId, portalContext, accountPath, kcpCA } = this.context();
      const accountInfo = await firstValueFrom(
        this.accountInfoService.read(this.context()),
      );
      const kubeconfigProps: KubeConfigTemplateProps = {
        clusterName: accountId ?? '',
        serverUrl: `${portalContext.kcpWorkspaceUrl}:${accountPath}`,
        kcpCA: kcpCA ?? '',
        oidcIssuerUrl: accountInfo?.spec.oidc.issuerUrl ?? '',
        oidcKubectlClientId:
          accountInfo?.spec.oidc.clients.kubectl.clientId ?? '',
      };

      const kubeConfig = kubeConfigTemplate(kubeconfigProps);
      const blob = new Blob([kubeConfig], { type: 'application/plain' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'kubeconfig.yaml';
      a.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      void this.LuigiClient()
        .uxManager()
        .showAlert({
          text: `Failed to download kubeconfig: ${error.message}`,
          type: 'error',
        });
    } finally {
      this.isDownloadingKubeConfig.set(false);
    }
  }

  private getResourceDefinition() {
    const resourceDefinition = this.resourceDefinition();
    if (!resourceDefinition) {
      this.LuigiClient().uxManager().showAlert({
        text: 'Resource definition is not defined',
        type: 'error',
      });

      throw new Error('Resource definition is not defined');
    }

    return resourceDefinition;
  }

  private getDetailViewQueryFields() {
    const resourceDefinition = this.getResourceDefinition();
    const additionalFields: FieldDefinition[] = [];

    if (resourceDefinition.ui?.detailView?.resourceDescription) {
      additionalFields.push(
        resourceDefinition.ui.detailView.resourceDescription,
      );
    }

    if (resourceDefinition.ui?.detailView?.resourceTitle) {
      additionalFields.push(resourceDefinition.ui.detailView.resourceTitle);
    }

    return generateGraphQLFields(
      this.resourceFields().concat(additionalFields),
    );
  }

  private getResourceId() {
    const resourceId = this.resourceId();
    if (!resourceId) {
      this.LuigiClient().uxManager().showAlert({
        text: 'Resource ID is not defined',
        type: 'error',
      });

      throw new Error('Resource ID is not defined');
    }

    return resourceId;
  }
}
