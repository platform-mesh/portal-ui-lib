import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DeclarativeTableCard, TableCardConfig } from '@openmfp/ngx';
import { Resource, ResourceListResult } from '@platform-mesh/portal-ui-lib/models';
import {
  ErrorHandlerService,
  ResourceNodeContext,
  ResourceService,
} from '@platform-mesh/portal-ui-lib/services';
import {
  buildResourcePath,
  generateGraphQLFields,
} from '@platform-mesh/portal-ui-lib/utils';
import { finalize } from 'rxjs/operators';
import '@ui5/webcomponents-icons/dist/AllIcons.js';

const NAMESPACE_FIELDS = [{ label: 'Name', property: 'metadata.name' }];

const OPERATION = buildResourcePath({ version: 'v1', entity: 'Namespaces' }) as string;

const TABLE_CONFIG: TableCardConfig = {
  header: 'Namespaces',
  headerTooltip: 'Available namespaces for the account.',
  tableConfig: {
    fields: NAMESPACE_FIELDS,
    paginationLimit: 5,
    hasMore: false,
  },
  createResourceFormConfig: {
    title: 'Create Namespace',
    confirmLabel: 'Create',
    fields: [
      { name: 'metadata.name', label: 'Name', required: true },
    ],
  },
  deleteResourceConfirmationConfig: {
    title: 'Delete Namespace',
    message: 'Are you sure you want to delete this namespace? This action cannot be undone.',
    confirmLabel: 'Delete',
  },
};

@Component({
  selector: 'pm-namespace-table-card',
  standalone: true,
  imports: [DeclarativeTableCard],
  template: `
    <mfp-declarative-table-card
      [config]="tableConfig()"
      [resources]="resources()"
      (createConfirmed)="onCreate($event)"
      (deleteConfirmed)="onDelete($event)"
    />
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class NamespaceTableCard {
  context = input.required<ResourceNodeContext>();

  protected resources = signal<Resource[]>([]);

  protected tableConfig = computed<TableCardConfig>(() => ({
    ...TABLE_CONFIG,
    tableConfig: {
      ...TABLE_CONFIG.tableConfig,
      totalItemsCount: this.resources().length,
    },
  }));

  private resourceService = inject(ResourceService);
  private errorHandlerService = inject(ErrorHandlerService);
  private destroyRef = inject(DestroyRef);
  private isLoading = false;

  private readonly namespaceDefinition = computed(() => ({
    entity: 'Namespace',
    entityCollection: 'Namespaces',
    version: 'v1',
    scope: 'Cluster' as const,
  }));

  private readonly namespaceContext = computed(() => ({
    ...(this.context() || {}),
    resourceDefinition: this.namespaceDefinition(),
  }));

  constructor() {
    effect(() => {
      this.loadNamespaces();
    });
  }

  protected onCreate(formValue: Record<string, unknown>): void {
    const resource = formValue as unknown as Resource;
    this.resourceService
      .create(resource, this.namespaceDefinition(), this.namespaceContext())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created: any) => {
          this.resources.update((list) => [...list, created]);
        },
        error: (error) => this.errorHandlerService.handleError(error),
      });
  }

  protected onDelete(resource: Resource): void {
    this.resourceService
      .delete(resource, this.namespaceDefinition(), this.namespaceContext(), false)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.resources.update((list) =>
            list.filter((r) => r.metadata.name !== resource.metadata.name),
          );
        },
        error: (error) => this.errorHandlerService.handleError(error),
      });
  }

  private loadNamespaces(): void {
    if (this.isLoading) return;
    this.isLoading = true;

    const fields = generateGraphQLFields(NAMESPACE_FIELDS);

    this.resourceService
      .list(OPERATION, fields, this.namespaceContext() as any, false, { limit: 50, continue: undefined })
      .pipe(
        finalize(() => (this.isLoading = false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result: ResourceListResult) => {
          this.resources.set(result.items ?? []);
        },
        error: (error) => this.errorHandlerService.handleError(error),
      });
  }
}
