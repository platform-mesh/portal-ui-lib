import {
  addSearchParams,
  readUrlSearchParam,
  snapshotUrl,
} from '../../../../utils/url-params';
import { ReadResourcesProxyService } from '../services/read-resources-proxy.service';
import { resolveContextPlaceholders } from '../utils/resolve-context-placeholders';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  ViewEncapsulation,
  computed,
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
 * - Owns the search-text + scope filter state. Each active filter is
 *   reflected in the URL as `?<filter.property>=<filter.value>` (one clean
 *   query param per filter), and the backend receives it as the search API's
 *   native `filter.<field>=<value>` query param.
 *
 * On mount, `q` and any URL param whose key matches a filter tab's `property`
 * (and whose value matches that tab's `value`) are pushed to the host card
 * via `searchConfig.initialSearch` / `initialFilter` so a full page refresh
 * re-hydrates the visible search input and selected filter tab. The host's
 * seeds are one-shot; after that, user-driven changes flow through
 * `searchChanged` / `filterTabChanged` as before.
 */
@Component({
  selector: 'pm-open-search-resource-table-card',
  standalone: true,
  imports: [DeclarativeTableCard],
  templateUrl: './open-search-resource-table-card.component.html',
  encapsulation: ViewEncapsulation.Emulated,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpenSearchResourceTableCard implements OnInit {
  private readResourcesProxy = inject(ReadResourcesProxyService);
  private errorHandlerService = inject(ErrorHandlerService);
  private destroyRef = inject(DestroyRef);

  LuigiClient = input.required<LuigiClient>();
  context = input.required<ResourceNodeContext>();

  private readonly initialSearchFromUrl = readUrlSearchParam('q');
  private readonly urlSnapshot: Record<string, string> = snapshotUrl();

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

  paginationLimit = signal<number>(50);
  currentPage = signal<number>(this.pageFromUrl());
  totalItemsCount = signal<number>(0);

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

      if (!prev && filters) {
        const match = this.matchUrlFilter(filters);
        if (match) return match;
      }
      const def = filters?.find((f) => f.default);
      return def?.property && def?.value !== undefined ? def : undefined;
    },
  });
  private searchKey = signal<string | null | undefined>(
    this.initialSearchFromUrl ?? null,
  );
  searchFilters = computed<FieldFilterDefinition[] | undefined>(() => {
    const ctx = this.context();
    return ctx.resourceDefinition?.ui?.listView?.filters
      ?.slice()
      .map((filter) => ({
        ...filter,
        value: resolveContextPlaceholders(filter.value, ctx),
      }));
  });
  config = computed<TableCardConfig>(() => {
    return {
      header: 'Accounts',
      searchConfig: {
        filterTabs: this.searchFilters(),
        initialSearch: this.initialSearchFromUrl,
        initialFilter: this.resolveInitialFilterTab(),
      },
      tableConfig: {
        fields: this.columns(),
        totalItemsCount: this.totalItemsCount(),
        paginationLimit: this.paginationLimit(),
        currentPage: this.currentPage(),
        loadMode: 'pager',
      },
    };
  });

  private listSubscription?: Subscription;
  private isNamespaced = computed(() => isNamespacedResource(this.context()));
  protected readonly getResourceValueByJsonPath = getResourceValueByJsonPath;
  protected trackBy = (item: GenericResource) =>
    (item as any).metadata?.name ?? item.id;

  ngOnInit(): void {
    this.list();
  }

  private pageFromUrl(): number {
    const raw = Number(readUrlSearchParam('page'));
    return Number.isInteger(raw) && raw >= 1 ? raw : 1;
  }

  onLimitChange(limit: number) {
    this.paginationLimit.set(limit);
    this.goToPage(1);
  }

  protected onPageChange(page: number) {
    this.goToPage(page);
  }

  private goToPage(page: number) {
    this.currentPage.set(page);
    this.list();
  }

  list(searchKey?: string | null) {
    this.listSubscription?.unsubscribe();

    if (searchKey !== undefined) {
      this.searchKey.set(searchKey);
    }
    const q = this.searchKey() ?? '';
    const page = this.currentPage();

    const filter = this.selectedSearchFilter();
    const filterParam =
      filter?.property && filter?.value !== undefined
        ? `${filter.property}=${filter.value}`
        : undefined;
    addSearchParams({
      q: q || undefined,
      page: page > 1 ? String(page) : undefined,
      ...(filter?.property
        ? { [filter.property]: filter.value ?? undefined }
        : {}),
    });

    this.listSubscription = this.readResourcesProxy
      .forContext(this.LuigiClient())
      .list(
        this.context(),
        {
          limit: this.paginationLimit(),
          page,
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
          const items = result.items ?? [];
          this.resources.set(items);
          const limit = this.paginationLimit();
          this.totalItemsCount.set(
            (page - 1) * limit +
              items.length +
              (result.remainingItemCount ?? 0),
          );
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
    this.currentPage.set(1);
    this.list(event);
  }

  protected searchChanged(event: string | null) {
    this.searchKey.set(event ?? null);
    this.currentPage.set(1);
    this.list(event);
  }

  protected onFilterTabChanged(event: FieldFilterDefinition | undefined) {
    // Strip the previous filter's URL param if the property has changed.
    const prev = this.selectedSearchFilter();
    if (prev?.property && prev.property !== event?.property) {
      addSearchParams({ [prev.property]: undefined });
    }

    this.selectedSearchFilter.set(event);
    this.currentPage.set(1);
    this.list();
  }

  private matchUrlFilter(
    filters: FieldFilterDefinition[],
  ): FieldFilterDefinition | undefined {
    return filters.find((f) => {
      if (!f.property) return false;
      const urlValue = this.urlSnapshot[f.property];
      return urlValue !== undefined && urlValue === f.value;
    });
  }

  private resolveInitialFilterTab(): FieldFilterDefinition | undefined {
    const filters = this.searchFilters();
    if (!filters?.length) return undefined;
    return this.matchUrlFilter(filters);
  }
}
