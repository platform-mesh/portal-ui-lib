import { processGroupFields } from '../../../utils/proccess-fields';
import { CreateResourceModal } from '../list-view/create-resource-modal/create-resource-modal.component';
import { DeleteResourceModal } from '../list-view/delete-resource-confirmation-modal/delete-resource-modal.component';
import { ResourceLogo } from '../resource-logo/resource-logo.component';
import { AVAILABLE_CARDS, CARDS, SECTIONS } from './cards';
import { DashboardConfigService } from './dashboard-config.service';
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
import { Label } from '@fundamental-ngx/ui5-webcomponents/label';
import { LuigiClient } from '@luigi-project/client/luigi-element';
import {
  ButtonSettings,
  CardConfig,
  Dashboard,
  ResourceField,
  SectionConfig,
} from '@openmfp/ngx';
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
} from '@platform-mesh/portal-ui-lib/utils';
import { firstValueFrom } from 'rxjs';
import { tap } from 'rxjs/operators';

@Component({
  selector: 'pm-detail-view',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    Label,
    ResourceField,
    CreateResourceModal,
    DeleteResourceModal,
    ResourceLogo,
    Dashboard,
  ],
  templateUrl: './detail-view.component.html',
  styleUrl: './detail-view.component.scss',
  encapsulation: ViewEncapsulation.Emulated,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailView {
  private resourceService = inject(ResourceService);
  private accountInfoService = inject(AccountInfoService);
  private gatewayService = inject(GatewayService);
  private errorHandlerService = inject(ErrorHandlerService);
  private dashboardConfigService = inject(DashboardConfigService);
  protected readonly getResourceValueByJsonPath = getResourceValueByJsonPath;
  private createModal = viewChild<CreateResourceModal>('createModal');
  private deleteModal = viewChild<DeleteResourceModal>('deleteModal');

  LuigiClient = input.required<LuigiClient>();
  context = input.required<ResourceNodeContext>();
  resource = signal<Resource | undefined>(undefined);

  resourceDefinition = computed(() => this.context().resourceDefinition);
  defaultTitle = computed(
    () => this.resource()?.spec?.displayName || this.resourceId() || '',
  );
  defaultDescription = computed(
    () =>
      `The ${this.resourceDefinition()?.entity} for ${this.resource()?.spec?.displayName || this.resourceId()}`,
  );

  resourceTitleDefinition = computed(
    () =>
      this.resourceDefinition()?.ui?.detailView?.resourceTitle?.label ??
      this.defaultTitle(),
  );
  resourceDescriptionDefinition = computed(
    () =>
      this.resourceDefinition()?.ui?.detailView?.resourceDescription?.label ??
      this.defaultDescription(),
  );

  resourceFields = computed(
    () => this.resourceDefinition()?.ui?.detailView?.fields ?? [],
  );
  resourceId = computed(() => this.context().resourceId);
  workspacePath = computed(() =>
    this.gatewayService.resolveKcpPath(this.context()),
  );
  viewFields = computed(() => processGroupFields(this.resourceFields()));
  showDownloadKubeconfig = computed(
    () =>
      this.resourceDefinition()?.ui?.detailView?.showDownloadKubeconfig ??
      false,
  );
  isDownloadingKubeConfig = signal(false);
  isDemoEnabled = computed(() =>
    this.LuigiClient().getActiveFeatureToggles().includes('neoNephosDemo'),
  );

  dashboardConfig = computed(() => {
    const customActions: ButtonSettings[] = [];

    if (this.showDownloadKubeconfig()) {
      customActions.push({
        action: 'download-kubeconfig',
        text: 'Download kubeconfig',
        icon: 'download-from-cloud',
        design: 'Default',
        tooltip: 'Download kubeconfig',
      });
    }

    if (this.resource()) {
      customActions.push(
        { action: 'edit', text: 'Edit', icon: 'edit', design: 'Default' },
        {
          action: 'delete',
          text: 'Delete',
          icon: 'delete',
          design: 'Negative',
        },
      );
    }

    const backgroundImageUrl = this.isDemoEnabled()
      ? ''
      : (this.resourceDefinition()?.ui?.detailView?.backgroundImageUrl ??
        '/assets/pm_background.png');

    return {
      title: this.resourceTitleDefinition(),
      description: this.resourceDescriptionDefinition(),
      editable: true,
      backgroundImageUrl,
      customActions,
    };
  });

  sections = computed<SectionConfig[]>(() => {
    const c = this.dashboardConfigService.read({
      workspacePath: this.workspacePath(),
      entity: this.resourceDefinition()?.entity,
      resourceId: this.resourceId(),
      userId: this.context().userId,
      seed: this.isDemoEnabled() ? 'demo' : '',
    });

    return c?.sections ?? (this.isDemoEnabled() ? SECTIONS : []);
  });
  cards = computed<CardConfig[]>(() => {
    const c = this.dashboardConfigService.read({
      workspacePath: this.workspacePath(),
      entity: this.resourceDefinition()?.entity,
      resourceId: this.resourceId(),
      userId: this.context().userId,
      seed: this.isDemoEnabled() ? 'demo' : '',
    });

    return c?.cards ?? (this.isDemoEnabled() ? CARDS : []);
  });
  availableCards = computed<CardConfig[]>(() =>
    this.isDemoEnabled() ? AVAILABLE_CARDS : [],
  );

  onActionButtonClick({
    event,
    action,
  }: {
    event: MouseEvent;
    action: ButtonSettings;
  }): void {
    const resource = this.resource();
    switch (action.action) {
      case 'download-kubeconfig':
        this.downloadKubeConfig();
        break;
      case 'edit':
        if (resource) this.openEditResourceModal(event, resource);
        break;
      case 'delete':
        if (resource) this.openDeleteResourceModal(event, resource);
        break;
    }
  }

  constructor() {
    effect(() => {
      this.readResource();
    });
  }

  private readResource(): void {
    const resourceDefinition = this.getResourceDefinition();
    const fields = this.getDetailViewQueryFields();

    const params: ResourceRequestParams = resourceDefinition;

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
        params.entity.toLowerCase() === 'account',
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
      this.context().parentNavigationContexts?.at(0);

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
        resourceDefinition.entity.toLowerCase() === 'account',
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
        resourceDefinition.entity.toLowerCase() === 'account',
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
    const additionalFields: FieldDefinition[] = [
      { property: 'metadata.deletionTimestamp' },
    ];

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

  protected dashboardConfigurationChanged(config: {
    cards: CardConfig[];
    sections: SectionConfig[];
  }) {
    this.dashboardConfigService.write(
      {
        workspacePath: this.workspacePath(),
        entity: this.resourceDefinition()?.entity,
        resourceId: this.resourceId(),
        userId: this.context().userId,
        seed: this.isDemoEnabled() ? 'demo' : '',
      },
      config,
    );
  }
}
