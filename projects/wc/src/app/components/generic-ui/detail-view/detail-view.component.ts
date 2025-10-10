import { processFields } from '../../../utils/proccess-fields';
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

  LuigiClient = input<LuigiClient>();
  context = input<ResourceNodeContext>();
  resource = signal<Resource | null>(null);

  resourceDefinition = computed(() => this.context().resourceDefinition);
  resourceFields = computed(
    () => this.resourceDefinition().ui?.detailView?.fields || defaultFields,
  );
  resourceId = computed(() => this.context().entity.metadata.name);
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
    const fields = generateGraphQLFields(this.resourceFields());
    const queryOperation = replaceDotsAndHyphensWithUnderscores(
      this.resourceDefinition().group,
    );
    const kind = this.resourceDefinition().kind;

    this.resourceService
      .read(
        this.resourceId(),
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
    this.LuigiClient()
      .linkManager()
      .fromContext(this.context().parentNavigationContexts.at(-1))
      .navigate('/');
  }

  async downloadKubeConfig() {
    const { oidcIssuerUrl } = await this.envConfigService.getEnvConfig();

    const kubeConfig = kubeConfigTemplate
      .replaceAll('<cluster-name>', this.context().accountId)
      .replaceAll('<org-name>', this.context().organization)
      .replaceAll(
        '<server-url>',
        `${this.context().portalContext.kcpWorkspaceUrl}:${this.context().accountId}`,
      )
      .replaceAll('<oidc-issuer-url>', oidcIssuerUrl)
      .replaceAll('<ca-data>', this.context().kcpCA)
      .replaceAll('<token>', this.context().token);

    const blob = new Blob([kubeConfig], { type: 'application/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'kubeconfig.yaml';
    a.click();
  }
}
