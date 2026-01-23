import { processFields } from '../../../utils/proccess-fields';
import { ValueCellComponent } from '../value-cell/value-cell.component';
import { CreateResourceModalComponent } from './create-resource-modal/create-resource-modal.component';
import { DeleteResourceModalComponent } from './delete-resource-confirmation-modal/delete-resource-modal.component';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LuigiClient } from '@luigi-project/client/luigi-element';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import {
  Resource,
  ResourceListResult,
} from '@platform-mesh/portal-ui-lib/models';
import {
  ResourceNodeContext,
  ResourceRequestParams,
  ResourceService,
} from '@platform-mesh/portal-ui-lib/services';
import {
  generateGraphQLFields,
  getResourceValueByJsonPath,
  replaceDotsAndHyphensWithUnderscores,
} from '@platform-mesh/portal-ui-lib/utils';
import '@ui5/webcomponents-icons/dist/navigation-left-arrow.js';
import '@ui5/webcomponents-icons/dist/navigation-right-arrow.js';
import {
  ButtonComponent,
  DynamicPageComponent,
  DynamicPageTitleComponent,
  IconComponent,
  IllustratedMessageComponent,
  OptionComponent,
  SelectComponent,
  TableCellComponent,
  TableComponent,
  TableHeaderCellComponent,
  TableHeaderRowComponent,
  TableRowComponent,
  TextComponent,
  TitleComponent,
  ToolbarButtonComponent,
  ToolbarComponent,
} from '@ui5/webcomponents-ngx';

@Component({
  selector: 'pm-list-view',
  standalone: true,
  templateUrl: './list-view.component.html',
  styleUrls: ['./list-view.component.scss'],
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CreateResourceModalComponent,
    DeleteResourceModalComponent,
    DynamicPageComponent,
    DynamicPageTitleComponent,
    IconComponent,
    IllustratedMessageComponent,
    TableComponent,
    TableCellComponent,
    TableHeaderCellComponent,
    TableHeaderRowComponent,
    TableRowComponent,
    TextComponent,
    TitleComponent,
    ToolbarButtonComponent,
    ToolbarComponent,
    ValueCellComponent,
    ButtonComponent,
    SelectComponent,
    OptionComponent,
  ],
})
export class ListViewComponent {
  private resourceService = inject(ResourceService);
  private luigiCoreService = inject(LuigiCoreService);
  private destroyRef = inject(DestroyRef);
  LuigiClient = input.required<LuigiClient>();
  context = input.required<ResourceNodeContext>();
  private createModal = viewChild<CreateResourceModalComponent>('createModal');
  private deleteModal = viewChild<DeleteResourceModalComponent>('deleteModal');

  resources = signal<Resource[]>([]);
  heading = computed(
    () =>
      `${this.resourceDefinition()?.plural.charAt(0).toUpperCase()}${this.resourceDefinition()?.plural.slice(1)}`,
  );
  resourceDefinition = computed(() => this.context().resourceDefinition);
  columns = computed(
    () => this.resourceDefinition()?.ui?.listView?.fields ?? [],
  );
  viewColomns = computed(() => processFields(this.columns()));
  readyCondition = computed(() => this.resourceDefinition()?.readyCondition);
  hasUiCreateViewFields = computed(
    () => !!this.resourceDefinition()?.ui?.createView?.fields?.length,
  );

  currentPage = signal<number>(1);
  totalItemsCount = signal<number>(0);
  paginationLimit = signal<number>(5);

  private currentContinueToken: string | undefined = undefined;
  private tokenHistory: (string | undefined)[] = [undefined]; // Stores tokens for back navigation

  hasNextPage = signal<boolean>(false);
  hasPrevPage = computed(() => this.currentPage() > 1);

  protected readonly getResourceValueByJsonPath = getResourceValueByJsonPath;

  constructor() {
    effect(() => {
      this.resetPagination();
      this.list();
    });
  }

  private resetPagination() {
    this.currentPage.set(1);
    this.currentContinueToken = undefined;
    this.tokenHistory = [undefined];
    this.totalItemsCount.set(0);
  }

  onLimitChange(event: any) {
    const newLimit = parseInt(event.detail.selectedOption.value, 10);
    this.paginationLimit.set(newLimit);
  }

  private handlePageResults(result: ResourceListResult) {
    this.hasNextPage.set(!!result.continue);
    this.tokenHistory[this.currentPage()] = result.continue;

    const loadedSoFar = (this.currentPage() - 1) * this.paginationLimit();
    const totalEstimated =
      loadedSoFar + result.items.length + (result.remainingItemCount || 0);
    this.totalItemsCount.set(totalEstimated);
  }

  nextPage() {
    if (!this.hasNextPage()) return;

    this.currentContinueToken = this.tokenHistory[this.currentPage()];
    this.currentPage.update((v) => v + 1);
    this.list();
  }

  prevPage() {
    if (!this.hasPrevPage()) return;

    this.currentPage.update((v) => v - 1);
    // Retrieve the token that was used for the PREVIOUS page
    this.currentContinueToken = this.tokenHistory[this.currentPage() - 1];
    this.list();
  }

  list() {
    const fields = this.generateGqlFieldsWithReadyConditions();
    const resourceDefinition = this.getResourceDefinition();
    const queryOperation = `${replaceDotsAndHyphensWithUnderscores(resourceDefinition.group)}_${resourceDefinition.version}_${resourceDefinition.plural}`;

    this.resourceService
      .list(queryOperation, fields, this.context(), false, {
        limit: this.paginationLimit(),
        continue: this.currentContinueToken,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result: ResourceListResult) => {
          this.handlePageResults(result);

          this.resources.set(
            result.items.map((resource) => ({
              ...resource,
              ready: this.getResourceReadyStatus(resource),
            })),
          );
        },
      });
  }

  delete(resource: Resource) {
    const resourceDefinition = this.getResourceDefinition();

    this.resourceService
      .delete(resource, resourceDefinition, this.context())
      .subscribe({
        next: (_result) => {
          this.deleteModal()?.close();
          console.debug('Resource deleted.');
        },
        error: (_error) => {
          this.luigiCoreService.showAlert({
            text: `Failure! Could not delete resource: ${resource.metadata.name}.`,
            type: 'error',
          });
        },
      });
  }

  create(resource: Resource) {
    const resourceDefinition = this.getResourceDefinition();

    this.resourceService
      .create(resource, resourceDefinition, this.context())
      .subscribe({
        next: (result) => {
          this.createModal()?.close();
          console.debug('Resource created', result);
        },
      });
  }

  update(resource: Resource) {
    const resourceDefinition = this.getResourceDefinition();

    this.resourceService
      .update(resource, resourceDefinition, this.context())
      .subscribe({
        next: (result) => {
          this.createModal()?.close();
          console.debug('Resource updated', result);
        },
      });
  }

  navigateToResource(resource: Resource) {
    const resourceDefinition = this.getResourceDefinition();
    if (!resourceDefinition.ui?.detailView) {
      return;
    }

    if (!resource.metadata.name) {
      this.LuigiClient().uxManager().showAlert({
        text: 'Resource name is not defined',
        type: 'error',
      });

      throw new Error('Resource name is not defined');
    }

    this.LuigiClient().linkManager().navigate(resource.metadata.name);
  }

  openCreateResourceModal() {
    this.createModal()?.open();
  }

  openEditResourceModal(event: MouseEvent, resource: Resource) {
    event.stopPropagation?.();
    const resourceDefinition = this.getResourceDefinition();

    const fields = generateGraphQLFields(
      resourceDefinition.ui?.createView?.fields ?? [],
    );

    const params: ResourceRequestParams = {
      kind: resourceDefinition.kind,
      version: resourceDefinition.version,
      operation: replaceDotsAndHyphensWithUnderscores(resourceDefinition.group),
    };

    this.resourceService
      .read(resource.metadata.name ?? '', params, fields, this.context(), false)
      .subscribe({
        next: (result) => this.createModal()?.open(result),
      });
  }

  openDeleteResourceModal(event: MouseEvent, resource: Resource) {
    event.stopPropagation?.();
    this.deleteModal()?.open(resource);
  }

  private generateGqlFieldsWithReadyConditions() {
    const readyCondition = this.readyCondition();
    if (!readyCondition) {
      return generateGraphQLFields(this.columns());
    }

    return generateGraphQLFields(this.columns().concat(readyCondition));
  }

  private getResourceReadyStatus(resource: Resource) {
    const readyCondition = this.readyCondition();
    if (!readyCondition) {
      return true;
    }

    const readyStatus = getResourceValueByJsonPath(resource, readyCondition);
    return !!readyStatus;
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

  isAvailable(item: Resource) {
    return item.ready && !item.metadata.deletionTimestamp;
  }

  getAccessibleName(item: Resource): string {
    if (item.metadata.deletionTimestamp) {
      return 'Resource is pending deletion';
    } else if (!item.ready) {
      return 'Resource is not ready';
    }

    return '';
  }
}
