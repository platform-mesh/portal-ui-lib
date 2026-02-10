import { k8sMessages } from '../../consts/k8s-messages';
import { k8sNameValidator } from '../../validators/k8s-name-validator';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  ViewEncapsulation,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { LuigiClient } from '@luigi-project/client/luigi-element';
import { EnvConfigService, I18nService } from '@openmfp/portal-ui-lib';
import {
  Resource,
  ResourceDefinition,
  ResourceListResult,
  ResourceOperationTypeMap,
  ResourceSubscriptionResult,
} from '@platform-mesh/portal-ui-lib/models';
import {
  ResourceNodeContext,
  ResourceService,
} from '@platform-mesh/portal-ui-lib/services';
import {
  generateGraphQLFields,
  isLocalSetup,
} from '@platform-mesh/portal-ui-lib/utils';
import {
  ButtonComponent,
  IconComponent,
  InputComponent,
  LabelComponent,
  OptionComponent,
  SelectComponent,
} from '@ui5/webcomponents-ngx';
import { map, switchMap } from 'rxjs';

@Component({
  selector: 'pm-organization-management',
  standalone: true,
  imports: [
    LabelComponent,
    InputComponent,
    ButtonComponent,
    OptionComponent,
    SelectComponent,
    FormsModule,
    ReactiveFormsModule,
    IconComponent,
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
  private destroyRef = inject(DestroyRef);

  context = input.required<ResourceNodeContext>();
  LuigiClient = input.required<LuigiClient>();

  texts: any = {};
  organizations = signal<{ name: string; ready: boolean }[]>([]);
  organizationToSwitch = signal<{ name: string; ready: boolean } | null>(null);
  newOrganizationControl = new FormControl('', {
    validators: [Validators.required, k8sNameValidator],
    nonNullable: true,
  });

  protected readonly k8sMessages = k8sMessages;

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
    this.organizationToSwitch.set(
      this.organizations().find(
        (o) => o.name === $event.selectedOption._state.value,
      ) ?? null,
    );
  }

  readOrganizations() {
    const fields = generateGraphQLFields([
      {
        property: [
          'metadata.name',
          'status.conditions.status',
          'status.conditions.type',
        ],
      },
    ]);

    const ctx = {
      ...this.context(),
      resourceDefinition: {
        group: 'core.platform-mesh.io',
        version: 'v1alpha1',
        plural: 'accounts',
        scope: 'Cluster',
      } as ResourceDefinition,
    };
    const queryOperation = 'core_platform_mesh_io_v1alpha1_accounts';
    this.resourceService
      .list(queryOperation, fields, ctx)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map((result: ResourceListResult) => {
          this.organizations.set(
            result.items.map((o) => ({
              name: o.metadata.name,
              ready: !!o.ready,
            })),
          );

          this.refreshOrganizationToSwitch();
          return result;
        }),
        switchMap((result: ResourceListResult) => {
          return this.resourceService.resourceChangeSubscription(
            queryOperation,
            fields,
            ctx,
            result.resourceVersion,
            false,
          );
        }),
      )
      .subscribe({
        next: (value) => {
          if (!value) {
            return;
          }

          this.mergeResourcesWithSubscriptionResult(value);
          this.refreshOrganizationToSwitch();
        },
        error: (error) => {
          console.error('Organization list retrieval failed', error);
        },
      });
  }

  private refreshOrganizationToSwitch() {
    const organizationToSwitch = this.organizationToSwitch();

    if (!organizationToSwitch) {
      this.organizationToSwitch.set(this.organizations()[0]);
    } else {
      this.organizationToSwitch.set(
        this.organizations().find(
          (o) => o.name === organizationToSwitch.name,
        ) ?? null,
      );
    }
  }

  private mergeResourcesWithSubscriptionResult(
    subscriptionResult: ResourceSubscriptionResult,
  ) {
    const result = new Map<string, any>(
      this.organizations().map((item) => [item.name, item]),
    );

    const { type, object } = subscriptionResult;
    const subscriptionObject = {
      name: object.metadata.name,
      ready: object.ready,
    };
    if (type === ResourceOperationTypeMap.ADDED) {
      result.set(object.metadata.name, subscriptionObject);
    } else if (type === ResourceOperationTypeMap.MODIFIED) {
      result.has(object.metadata.name) &&
        result.set(object.metadata.name, subscriptionObject);
    } else if (type === ResourceOperationTypeMap.DELETED) {
      result.delete(object.metadata.name);
    }

    this.organizations.set([...result.values()]);
  }

  onboardOrganization() {
    const resource: Resource = {
      spec: { type: 'org' },
      metadata: { name: this.newOrganizationControl.value },
    };
    const resourceDefinition: ResourceDefinition = {
      group: 'core.platform-mesh.io',
      kind: 'Account',
      plural: 'accounts',
      singular: 'account',
      scope: 'Cluster',
      version: 'v1alpha1',
    };

    this.resourceService
      .create(resource, resourceDefinition, this.context())
      .subscribe({
        next: (result) => {
          console.debug('Resource created', result);
          this.organizationToSwitch.set({
            name: this.newOrganizationControl.value,
            ready: false,
          });
          this.newOrganizationControl.reset();
          this.showOnboardingSuccessMessage();
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

  private showOnboardingSuccessMessage() {
    if (isLocalSetup()) {
      this.LuigiClient().uxManager().showAlert({
        text: `A new organization is creating. Once ready you can login using your e-mail. The default password is set to 'password'.`,
        type: 'info',
      });
    }
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
        tooltip: this.i18nService.getTranslation(
          'ORGANIZATION_MANAGEMENT_NOT_READY_TOOLTIP',
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
  private sanitizeSubdomainInput(input?: string): string | null {
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
      this.organizationToSwitch()?.name,
    );

    if (!sanitizedOrg) {
      this.LuigiClient().uxManager().showAlert({
        text: k8sMessages.RFC_1034_1123.message,
        type: k8sMessages.RFC_1034_1123.type,
      });
      return;
    }

    const fullSubdomain = `${sanitizedOrg}.${baseDomain}`;
    const port = window.location.port ? `:${window.location.port}` : '';
    window.location.href = `${protocol}//${fullSubdomain}${port}`;
  }

  getValueState(formControl: FormControl) {
    const control = formControl;
    return control.invalid && control.touched ? 'Negative' : 'None';
  }
}
