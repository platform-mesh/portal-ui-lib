import { processFields } from '../../../utils/proccess-fields';
import { ValueCellComponent } from '../value-cell/value-cell.component';
import {
  KubeConfigTemplateProps,
  kubeConfigTemplate,
} from './kubeconfig-template';
import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { LuigiClient } from '@luigi-project/client/luigi-element';
import { Resource } from '@platform-mesh/portal-ui-lib/models';
import {
  AccountInfoService,
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
import {
  DynamicPageComponent,
  DynamicPageHeaderComponent,
  DynamicPageTitleComponent,
  LabelComponent,
  TextComponent,
  TitleComponent,
  ToolbarButtonComponent,
  ToolbarComponent,
} from '@ui5/webcomponents-ngx';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'pm-detail-view',
  standalone: true,
  imports: [
    DynamicPageComponent,
    DynamicPageTitleComponent,
    TitleComponent,
    TextComponent,
    ToolbarComponent,
    ToolbarButtonComponent,
    DynamicPageHeaderComponent,
    LabelComponent,
    ValueCellComponent,
  ],
  templateUrl: './detail-view.component.html',
  styleUrl: './detail-view.component.scss',
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailViewComponent {
  private resourceService = inject(ResourceService);
  private accountInfoService = inject(AccountInfoService);
  private gatewayService = inject(GatewayService);
  protected readonly getResourceValueByJsonPath = getResourceValueByJsonPath;

  LuigiClient = input.required<LuigiClient>();
  context = input.required<ResourceNodeContext>();
  resource = signal<Resource | undefined>(undefined);

  resourceDefinition = computed(() => this.context().resourceDefinition);
  resourceFields = computed(
    () => this.resourceDefinition()?.ui?.detailView?.fields ?? [],
  );
  resourceId = computed(() => this.context().entity?.metadata.name);
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

  constructor() {
    effect(() => {
      this.readResource();
    });
  }

  private readResource(): void {
    const resourceDefinition = this.getResourceDefinition();
    const fields = generateGraphQLFields(this.resourceFields());

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
      .subscribe({
        next: (result) => this.resource.set(result),
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
      this.LuigiClient()
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
}
