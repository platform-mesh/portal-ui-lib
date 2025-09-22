import { ChangeDetectionStrategy, Component, OnInit, ViewEncapsulation, effect, inject, input, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LuigiClient } from '@luigi-project/client/luigi-element';
import { EnvConfigService, I18nService, Resource, ResourceDefinition } from '@openmfp/portal-ui-lib';
import { ResourceNodeContext, ResourceService } from '@platform-mesh/portal-ui-lib/services';
import {
  generateGraphQLFields,
  isLocalSetup,
} from '@platform-mesh/portal-ui-lib/utils';
import {
  ButtonComponent,
  InputComponent,
  LabelComponent,
  OptionComponent,
  SelectComponent,
} from '@ui5/webcomponents-ngx';

@Component({
  selector: 'organization-management',
  standalone: true,
  imports: [
    LabelComponent,
    InputComponent,
    ButtonComponent,
    OptionComponent,
    SelectComponent,
    FormsModule,
  ],
  templateUrl: './organization-management.component.html',
  styleUrl: './organization-management.component.scss',
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationManagementComponent implements OnInit {
  private i18nService = inject(I18nService);
  private resourceService = inject(ResourceService);
  private envConfigService = inject(EnvConfigService);
  context = input<ResourceNodeContext>();
  LuigiClient = input<LuigiClient>();

  texts: any = {};
  organizations = signal<string[]>([]);
  organizationToSwitch = linkedSignal(() => this.organizations()[0] ?? '');
  newOrganization: string;

  constructor() {
    effect(() => {
      const ctx = this.context();
      if (ctx) {
        this.i18nService.translationTable = ctx.translationTable;
        this.texts = this.readTranslations();
      }
    });
  }

  ngOnInit(): void {
    this.readOrganizations();
  }

  setOrganizationToSwitch($event: any) {
    this.organizationToSwitch.set($event.target.value);
  }

  readOrganizations() {
    const fields = generateGraphQLFields([
      {
        property: 'Accounts.metadata.name',
      },
    ]);
    const queryOperation = 'core_platform_mesh_io';

    this.resourceService
      .readOrganizations(queryOperation, fields, this.context())
      .subscribe({
        next: (result) => {
          this.organizations.set(
            result['Accounts'].map((o) => o.metadata.name),
          );
        },
      });
  }

  onboardOrganization() {
    const resource: Resource = {
      spec: { type: 'org' },
      metadata: { name: this.newOrganization },
    };
    const resourceDefinition: ResourceDefinition = {
      group: 'core.platform-mesh.io',
      kind: 'Account',
      plural: 'accounts',
      singular: 'account',
      scope: 'Cluster',
    };

    this.resourceService
      .create(resource, resourceDefinition, this.context())
      .subscribe({
        next: (result) => {
          console.debug('Resource created', result);
          this.organizations.set([
            this.newOrganization,
            ...this.organizations(),
          ]);
          this.organizationToSwitch.set(this.newOrganization);
          this.newOrganization = '';
          this.LuigiClient()
            .uxManager()
            .showAlert({
              text: this.getMessageForOrganizationCreation(
                this.organizationToSwitch(),
              ),
              type: 'info',
            });
        },
        error: (_error) => {
          this.LuigiClient()
            .uxManager()
            .showAlert({
              text: `Failure! Could not create organization: ${resource.metadata.name}.`,
              type: 'error',
            });
        },
      });
  }

  private getMessageForOrganizationCreation(orgName: string) {
    if (isLocalSetup()) {
      return `A new organization has just been onboarded. Since the portal runs on localhost, you need to add the organization to your machine's hosts file in order to switch to it. Add the following entry to your hosts configuration: 127.0.0.1 ${orgName}.portal.dev.local`;
    }

    return 'New organization has been created, select it from the list to switch to it.';
  }

  private readTranslations() {
    return {
      explanation: this.i18nService.getTranslation(
        'ORGANIZATION_MANAGEMENT_EXPLANATION',
      ),
      switchOrganization: {
        label: this.i18nService.getTranslation(
          'ORGANIZATION_MANAGEMENT_SWITCH_LABEL',
        ),
        button: this.i18nService.getTranslation(
          'ORGANIZATION_MANAGEMENT_SWITCH_BUTTON',
        ),
      },

      onboardOrganization: {
        label: this.i18nService.getTranslation(
          'ORGANIZATION_MANAGEMENT_ONBOARD_LABEL',
        ),
        button: this.i18nService.getTranslation(
          'ORGANIZATION_MANAGEMENT_ONBOARD_BUTTON',
        ),
        placeholder: this.i18nService.getTranslation(
          'ORGANIZATION_MANAGEMENT_ONBOARD_PLACEHOLDER',
        ),
      },
    };
  }

  /**
   * Allows only valid subdomain values: alphanumeric, hyphens, no periods, cannot start/end with hyphen, min 1 character.
   * Returns sanitized string or null if invalid.
   */
  private sanitizeSubdomainInput(input: string): string | null {
    // RFC 1034/1123: subdomain labels are 1-63 chars, start/end with alphanum, can contain '-'
    if (typeof input !== 'string') return null;
    const sanitized = input.trim();
    if (/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(sanitized)) {
      return sanitized;
    }
    return null;
  }

  async switchOrganization() {
    const { baseDomain } = await this.envConfigService.getEnvConfig();
    const protocol = window.location.protocol;
    const sanitizedOrg = this.sanitizeSubdomainInput(
      this.organizationToSwitch(),
    );

    if (!sanitizedOrg) {
      this.LuigiClient().uxManager().showAlert({
        text: 'Organization name is not valid for subdomain usage, accrording to RFC 1034/1123.',
        type: 'error',
      });
      return;
    }

    const fullSubdomain = `${sanitizedOrg}.${baseDomain}`;
    const port = window.location.port ? `:${window.location.port}` : '';
    window.location.href = `${protocol}//${fullSubdomain}${port}`;
  }
}