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
import { EnvConfigService } from '@openmfp/portal-ui-lib';
import { FieldDefinition, Resource } from '@platform-mesh/portal-ui-lib/models';
import {
  GatewayService,
  ResourceNodeContext,
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
import { processFields } from '../../../utils/proccess-fields';
import { ValueCellComponent } from '../value-cell/value-cell.component';
import { kubeConfigTemplate } from './kubeconfig-template';

const defaultFields: FieldDefinition[] = [
  {
    label: 'Workspace Status',
    jsonPathExpression: 'status.conditions[?(@.type=="Ready")].status',
    property: ['status.conditions.status', 'status.conditions.type'],
  },
];

@Component({
  selector: 'detail-view',
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
  private gatewayService = inject(GatewayService);
  private envConfigService = inject(EnvConfigService);
  protected readonly getResourceValueByJsonPath = getResourceValueByJsonPath;

  LuigiClient = input.required<LuigiClient>();
  context = input.required<ResourceNodeContext>();
  resource = signal<Resource | undefined>(undefined);

  resourceDefinition = computed(() => this.context().resourceDefinition);
  resourceFields = computed(
    () => this.resourceDefinition()?.ui?.detailView?.fields || defaultFields,
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
    const queryOperation = replaceDotsAndHyphensWithUnderscores(
      resourceDefinition.group,
    );
    const kind = resourceDefinition.kind;

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
        queryOperation,
        kind,
        fields,
        this.context(),
        kind.toLowerCase() === 'account',
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
}
