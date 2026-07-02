import { addSearchParams } from '../../../../utils/set-search-params';
import { ReadResourcesProxyService } from '../services/read-resources-proxy.service';
import { resolveContextPlaceholders } from '../utils/resolve-context-placeholders';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LuigiClient } from '@luigi-project/client/luigi-element';
import {
  DeclarativeTableCard,
  FieldFilterDefinition,
  GenericResource,
  TableCardConfig,
} from '@openmfp/ngx';
import {
  ErrorHandlerService,
  ReadResourcesResult,
  ResourceNodeContext,
} from '@platform-mesh/portal-ui-lib/services';
import {
  getResourceValueByJsonPath,
  isNamespacedResource,
} from '@platform-mesh/portal-ui-lib/utils';
import { Subscription } from 'rxjs';

/**
 * Open-search–backed list-view card. Loaded inside `<mfp-dashboard>` via
 * `Dashboard.registerAngularComponents([OpenSearchResourceTableCard])` and
 * the `pm-open-search-resource-table-card` selector.
 *
 * Differs from the GraphQL `ResourceTableCard` in two ways:
 * - Uses {@link ReadResourcesProxyService} so the same UI can be backed by
 *   the GraphQL gateway OR by OpenSearch depending on the `os-provider`
 *   feature toggle.
 * - Owns the search-text + scope filter state (URL-roundtripped and forwarded
 *   to the OpenSearch backend as `q` and `filter=property=value`).
 */
@Component({
  selector: 'pm-open-search-resource-table-card',
  standalone: true,
  imports: [DeclarativeTableCard],
  templateUrl: './open-search-resource-table-card.component.html',
  encapsulation: ViewEncapsulation.Emulated,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpenSearchResourceTableCard {
  private readResourcesProxy = inject(ReadResourcesProxyService);
  private errorHandlerService = inject(ErrorHandlerService);
  private destroyRef = inject(DestroyRef);

  LuigiClient = input.required<LuigiClient>();
  context = input.required<ResourceNodeContext>();

  resources = signal<GenericResource[]>([]);
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
  paginationLimit = signal<number>(50);
  remainingItemCount = signal<number>(0);
  hasMore = signal<boolean>(false);
  resourceVersion = signal<string | undefined>(undefined);

  selectedSearchFilter = linkedSignal<
    FieldFilterDefinition[] | undefined,
    FieldFilterDefinition | undefined
  >({
    source: () => this.searchFilters(),
    computation: (filters, prev) => {
      const previous = prev?.value;
      if (
        previous &&
        filters?.some(
          (f) => f.property === previous.property && f.value === previous.value,
        )
      ) {
        return previous;
      }
      const def = filters?.find((f) => f.default);
      return def?.property && def?.value !== undefined ? def : undefined;
    },
  });
  private searchKey = signal<string | null | undefined>(null);
  searchFilters = computed<FieldFilterDefinition[] | undefined>(() => {
    const ctx = this.context();
    return ctx.resourceDefinition?.ui?.listView?.filters
      ?.slice()
      .sort((a, b) => Number(b.default ?? false) - Number(a.default ?? false))
      .map((filter) => ({
        ...filter,
        value: resolveContextPlaceholders(filter.value, ctx),
      }));
  });
  config = computed<TableCardConfig>(() => {
    return {
      header: 'Accounts',
      resourcesSearchable: true,
      filterTabs: this.searchFilters(),
      tableConfig: {
        fields: this.columns(),
        totalItemsCount: this.totalItemsCount(),
        paginationLimit: this.paginationLimit(),
        hasMore: this.hasMore(),
      },
    };
  });

  private currentContinueToken: string | undefined = undefined;
  /**
   * Active in-flight `list()` subscription. New calls cancel it so the most
   * recent user action (search submit, scope change, clear-icon click)
   * always wins — instead of being silently dropped behind an earlier
   * still-loading request.
   */
  private listSubscription?: Subscription;
  private isNamespaced = computed(() => isNamespacedResource(this.context()));
  protected readonly getResourceValueByJsonPath = getResourceValueByJsonPath;
  protected trackBy = (item: GenericResource) =>
    (item as any).metadata?.name ?? item.id;

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

    this.list(false);
  }

  list(isInitialLoad: boolean, searchKey?: string | null) {
    // Cancel any in-flight request so this new one supersedes it. The latest
    // user action (clear, filter change, submit) should always reach the
    // backend rather than being dropped behind a slow earlier request.
    this.listSubscription?.unsubscribe();

    // Remember the latest search term so filter changes can re-run the same query.
    if (searchKey !== undefined) {
      this.searchKey.set(searchKey);
    }
    const q = this.searchKey() ?? '';

    const filter = this.selectedSearchFilter();
    const filterParam =
      filter?.property && filter?.value !== undefined
        ? `${filter.property}=${filter.value}`
        : undefined;
    addSearchParams({
      q: q || undefined,
      filter: filterParam,
    });

    this.listSubscription = this.readResourcesProxy
      .forContext(this.LuigiClient())
      .list(
        this.context(),
        {
          limit: this.paginationLimit(),
          cursor: this.currentContinueToken,
        },
        {
          q,
          filter: filterParam,
          resource: this.resourceDefinition()?.entityCollection,
        },
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result: ReadResourcesResult) => {
          if (isInitialLoad) {
            this.resources.set(result.items ?? []);
          } else {
            this.resources.update((values) => {
              const map = new Map(values.map((i) => [i.id, i]));
              (result.items ?? []).forEach((i) => {
                map.set(i.id, i);
              });
              return [...map.values()];
            });
          }
          if (result.resourceVersion !== undefined) {
            this.resourceVersion.set(result.resourceVersion);
          }
          this.hasMore.set(!!result.nextCursor);
          this.currentContinueToken = result.nextCursor;
          this.remainingItemCount.set(result.remainingItemCount || 0);
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

    const ns =
      (resource as any)['namespace'] ||
      (resource as any)['metadata']?.['namespace'];
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

  protected search(event: string | null) {
    this.currentContinueToken = undefined;
    this.list(false, event);
  }

  /**
   * Fires on every (debounced) keystroke. Keep `searchKey` in sync so a scope
   * change always uses the latest typed text, but only re-fetch when the user
   * clears the input — submitting via {@link search} is the trigger for a real
   * search request.
   */
  protected searchChanged(event: string | null) {
    this.searchKey.set(event ?? null);
    if (!event) {
      this.currentContinueToken = undefined;
      this.list(false, event);
    }
  }

  /**
   * Reacts to the user picking a filter-tab from the table-card strip.
   *
   * - When `event` is a `FieldFilterDefinition`, that filter becomes the
   *   active one — its `property=value` pair is forwarded to OpenSearch as
   *   the `filter` request param and reflected in the URL.
   * - When `event` is `undefined`, the auto-prepended "All" tab was picked.
   *   Any previously-active filter's URL param is stripped and no `filter`
   *   parameter is sent to the backend, so the result set is unfiltered.
   *
   * Pagination is reset so the new filter result starts from the first page.
   */
  protected onFilterTabChanged(event: FieldFilterDefinition | undefined) {
    // Strip the previous filter's URL param if the property has changed.
    const prev = this.selectedSearchFilter();
    if (prev?.property && prev.property !== event?.property) {
      addSearchParams({ [prev.property]: undefined });
    }

    this.selectedSearchFilter.set(event);
    this.currentContinueToken = undefined;
    this.list(false);
  }
}
