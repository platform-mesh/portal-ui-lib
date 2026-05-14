import { addSearchParams } from '../../../utils/set-search-params';
import { GenericView } from '../generic-view/generic-view.component';
import { OpenSearchResult, OpenSearchService } from './open-search.service';
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
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LuigiClient } from '@luigi-project/client/luigi-element';
import {
  DeclarativeTableCard,
  GenericResource,
  TableCardConfig,
} from '@openmfp/ngx';
import {
  ErrorHandlerService,
  ResourceNodeContext,
} from '@platform-mesh/portal-ui-lib/services';
import {
  getResourceValueByJsonPath,
  isNamespacedResource,
} from '@platform-mesh/portal-ui-lib/utils';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'pm-list-view',
  standalone: true,
  templateUrl: './os-list-view.component.html',
  styleUrls: ['./os-list-view.component.scss'],
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GenericView, DeclarativeTableCard],
})
export class OSListView {
  private openSearchService = inject(OpenSearchService);
  private errorHandlerService = inject(ErrorHandlerService);
  private destroyRef = inject(DestroyRef);

  LuigiClient = input.required<LuigiClient>();
  context = input.required<ResourceNodeContext>();

  resources = signal<GenericResource[]>([]);
  defaultTitle = computed(
    () => this.resourceDefinition()?.entityCollection ?? '',
  );
  defaultDescription = computed(
    () =>
      `This page displays the created ${this.resourceDefinition()?.entityCollection} in your environment`,
  );
  resourceDefinition = computed(() => this.context().resourceDefinition);
  columns = computed(() => {
    let columns = this.resourceDefinition()?.ui?.listView?.fields ?? [];

    const readyCondition = this.resourceDefinition()?.readyCondition;
    if (readyCondition) {
      columns = [
        {
          ...readyCondition,
          uiSettings: {
            ...readyCondition.uiSettings,
            displayAs: 'alert',
            columnWidth: '30px',
          },
        } as any,
        ...columns,
      ];
    }

    return columns;
  });

  totalItemsCount = computed(
    () => this.resources().length + this.remainingItemCount(),
  );
  paginationLimit = signal<number>(5);
  remainingItemCount = signal<number>(0);
  hasMore = signal<boolean>(false);
  resourceVersion = signal<string | undefined>(undefined);

  config = computed<TableCardConfig>(() => {
    return {
      resourcesSearchable: true,
      tableConfig: {
        fields: this.columns(),
        totalItemsCount: this.totalItemsCount(),
        paginationLimit: this.paginationLimit(),
        hasMore: this.hasMore(),
      },
    };
  });

  private currentContinueToken: string | undefined = undefined;
  private isLoadingList = false;
  private isNamespaced = computed(() => isNamespacedResource(this.context()));
  protected readonly getResourceValueByJsonPath = getResourceValueByJsonPath;
  protected trackBy = (item) => item.metadata.name;

  constructor() {
    effect(() => {
      this.currentContinueToken = undefined;
      this.list(true);
    });
  }

  private resetPagination() {
    this.currentContinueToken = undefined;
    this.resources.update((v) => v.slice(0, this.paginationLimit()));
    this.hasMore.set(this.resources().length < this.totalItemsCount());
  }

  onLimitChange(limit: number) {
    this.paginationLimit.set(limit);
    this.resetPagination();
  }

  loadMore() {
    if (!this.hasMore()) {
      return;
    }

    this.list();
  }

  list(isInitialLoad: boolean = false) {
    if (this.isLoadingList) {
      return;
    }
    this.isLoadingList = true;

    this.openSearchService
      .listResources(this.context(), {
        q: '',
        resource: this.resourceDefinition()?.entityCollection,
        limit: this.paginationLimit(),
        cursor: this.currentContinueToken,
      })
      .pipe(
        finalize(() => (this.isLoadingList = false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result: OpenSearchResult) => {
          if (isInitialLoad) {
            this.resources.set(result.results ?? []);
          } else {
            this.resources.update((values) => {
              const map = new Map(values.map((i) => [i.id, i]));
              (result.results ?? []).forEach((i) => {
                map.set(i.id, i);
              });
              return [...map.values()];
            });
          }
          // this.resourceVersion.set(result.resourceVersion);
          this.hasMore.set(!!result.nextCursor);
          this.currentContinueToken = result.nextCursor;
          // this.remainingItemCount.set(result.remainingItemCount || 0);
        },
        error: (error) => {
          this.errorHandlerService.handleError(error);
        },
      });
  }

  navigateToResource(resource: GenericResource) {
    const resourceDefinition = this.getResourceDefinition();
    if (!resourceDefinition.ui?.detailView) {
      return;
    }

    if (!resource.id) {
      this.LuigiClient().uxManager().showAlert({
        text: 'Resource name is not defined',
        type: 'error',
      });

      throw new Error('Resource name is not defined');
    }

    const ns = resource['namespace'] || resource['metadata']?.['namespace'];
    addSearchParams({
      namespace: this.isNamespaced() ? ns : undefined,
    });
    this.LuigiClient().linkManager().navigate(resource.id);
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

  protected search($event: string) {}
}
