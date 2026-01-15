import { processFields } from '../../../utils/proccess-fields';
import { validateKubeconfigProps } from '../../../utils/ts-guargs/validate-kubeconfig-props';
import { ListViewComponent } from '../list-view/list-view.component';
import { ValueCellComponent } from '../value-cell/value-cell.component';
import { kubeConfigTemplate } from './kubeconfig-template';
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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LuigiClient } from '@luigi-project/client/luigi-element';
import { EnvConfigService } from '@openmfp/portal-ui-lib';
import {
  Resource,
  ResourceDefinition,
} from '@platform-mesh/portal-ui-lib/models';
import {
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
import '@ui5/webcomponents-icons/dist/collaborate.js';
import '@ui5/webcomponents-icons/dist/competitor.js';
import '@ui5/webcomponents-icons/dist/wallet.js';
import {
  CardComponent,
  CardHeaderComponent,
  DynamicPageComponent,
  DynamicPageHeaderComponent,
  DynamicPageTitleComponent,
  LabelComponent,
  LinkComponent,
  TextComponent,
  TitleComponent,
  ToolbarButtonComponent,
  ToolbarComponent,
} from '@ui5/webcomponents-ngx';
/* playground-hide-end */
import '@ui5/webcomponents/dist/Card.js';
import '@ui5/webcomponents/dist/CardHeader.js';
import '@ui5/webcomponents/dist/Label.js';
import '@ui5/webcomponents/dist/Link.js';
import '@ui5/webcomponents/dist/List.js';
import '@ui5/webcomponents/dist/ListItemStandard.js';
import '@ui5/webcomponents/dist/Text.js';
import '@ui5/webcomponents/dist/Title.js';

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
    ListViewComponent,
    LinkComponent,
    CardComponent,
    CardHeaderComponent,
  ],
  templateUrl: './detail-view.component.html',
  styleUrl: './detail-view.component.scss',
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailViewComponent {
  private resourceService = inject(ResourceService);
  private gatewayService = inject(GatewayService);
  private envConfigService = inject(EnvConfigService);
  protected readonly getResourceValueByJsonPath = getResourceValueByJsonPath;

  LuigiClient = input.required<LuigiClient>();
  context = input.required<ResourceNodeContext>();
  resource = signal<Resource | undefined>(undefined);
  connectedResource = signal<
    | { resource: Resource[]; resourceDefinition: ResourceDefinition }[]
    | undefined
  >(undefined);
  connectedResourceDefinition = signal<ResourceDefinition[]>([]);

  resourceDefinition = computed(() => this.context().resourceDefinition);
  resourceFields = computed(
    () => this.resourceDefinition()?.ui?.detailView?.fields ?? [],
  );
  resourceId = computed(() => this.context().entity?.metadata.name);
  workspacePath = computed(() =>
    this.gatewayService.resolveKcpPath(this.context()),
  );
  viewFields = computed(() => processFields(this.resourceFields()));

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
      operation: replaceDotsAndHyphensWithUnderscores(resourceDefinition.group),
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

    this.connectedResourceDefinition.set(
      resourceDefinition.ui?.detailView?.connectedResources || [],
    );
  }

  contextPerConnectedResource(resourceDefinition: ResourceDefinition) {
    return {
      ...this.context(),
      resourceDefinition,
    };
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
    const { oidcIssuerUrl } = await this.envConfigService.getEnvConfig();
    const kubeconfigProps = {
      accountId: this.context().accountId,
      organization: this.context().organization,
      kcpCA: this.context().kcpCA,
      token: this.context().token,
      kcpWorkspaceUrl: this.context().portalContext.kcpWorkspaceUrl,
    };

    try {
      validateKubeconfigProps(kubeconfigProps);
    } catch (error) {
      this.LuigiClient().uxManager().showAlert({
        text: error.message,
        type: 'error',
      });

      throw error;
    }

    const kubeConfig = kubeConfigTemplate
      .replaceAll('<cluster-name>', kubeconfigProps.accountId)
      .replaceAll('<org-name>', kubeconfigProps.organization)
      .replaceAll(
        '<server-url>',
        `${kubeconfigProps.kcpWorkspaceUrl}:${kubeconfigProps.accountId}`,
      )
      .replaceAll('<oidc-issuer-url>', oidcIssuerUrl)
      .replaceAll('<ca-data>', kubeconfigProps.kcpCA)
      .replaceAll('<token>', kubeconfigProps.token);

    const blob = new Blob([kubeConfig], { type: 'application/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'kubeconfig.yaml';
    a.click();
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

  viewCard = signal<boolean>(false);
  toggleCardView() {
    this.viewCard.set(!this.viewCard());
  }
}
