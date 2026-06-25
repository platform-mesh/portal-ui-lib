import { addSearchParams } from '../../../utils/set-search-params';
import { GenericView } from './generic-view/generic-view.component';
import { ReadResourcesProxyService } from './services/read-resources-proxy.service';
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
  Scope,
  TableCardConfig,
} from '@openmfp/ngx';
import { FieldFilterDefinition } from '@platform-mesh/portal-ui-lib/models';
import {
  ErrorHandlerService,
  ReadResourcesResult,
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
  templateUrl: './open-search-list-view.component.html',
  styleUrls: ['./open-search-list-view.component.scss'],
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GenericView, DeclarativeTableCard],
})
export class OpenSearchListView {
  private readResourcesProxy = inject(ReadResourcesProxyService);
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
  paginationLimit = signal<number>(50);
  remainingItemCount = signal<number>(0);
  hasMore = signal<boolean>(false);
  resourceVersion = signal<string | undefined>(undefined);

  selectedSearchFilter: any;
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
    const initialScopeValue = this.searchFilters()?.find((f) => f.default);

    return {
      header: 'Accounts',
      searchConfig: {
        scopes: this.searchFilters()?.map((e) => ({
          value: e.value,
          label: e.label,
          property: e.property,
        })),
        initialScopeValue,
      },
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
      // Seed scope from the default filter on first render, if any.
      if (!this.selectedSearchFilter) {
        const def = this.searchFilters()?.find((f) => f.default);
        if (def?.property && def?.value !== undefined) {
          this.selectedSearchFilter = {
            property: def.property,
            value: def.value,
          };
        }
      }
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
    if (this.isLoadingList) {
      return;
    }
    this.isLoadingList = true;

    // Remember the latest search term so scope changes can re-run the same query.
    if (searchKey !== undefined) {
      this.searchKey.set(searchKey);
    }
    const q = this.searchKey() ?? '';

    // Build the URL query string from current scope + search text.
    const scope = this.selectedSearchFilter;
    addSearchParams({
      q: q || undefined,
      ...(scope?.property
        ? { [scope.property]: scope.value ?? undefined }
        : {}),
    });

    // Pass the scope as an exact-match filter to the OpenSearch backend.
    const filter =
      scope?.property && scope?.value !== undefined
        ? `${scope.property}=${scope.value}`
        : undefined;

    this.readResourcesProxy
      .forContext(this.LuigiClient())
      .list(
        this.context(),
        {
          limit: this.paginationLimit(),
          cursor: this.currentContinueToken,
        },
        {
          q,
          filter,
          resource: this.resourceDefinition()?.entityCollection,
        },
      )
      .pipe(
        finalize(() => (this.isLoadingList = false)),
        takeUntilDestroyed(this.destroyRef),
      )
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

  protected search(event: string | null) {
    this.currentContinueToken = undefined;
    this.list(false, event);
  }

  protected searchCleared(event: string | null) {
    if (!event) {
      this.currentContinueToken = undefined;
      this.list(false, event);
    }
  }

  protected searchWithScope(
    event: { value: string; property: string } | undefined,
  ) {
    // Strip the previous scope's URL param if the property has changed.
    const prev = this.selectedSearchFilter;
    if (prev?.property && prev.property !== event?.property) {
      addSearchParams({ [prev.property]: undefined });
    }

    this.selectedSearchFilter = event;
    this.currentContinueToken = undefined;
    this.list(false);
  }
}

/**
 * Replaces `{context.<dot.path>}` placeholders in `value` with values from `ctx`.
 *
 *   "{context.userId}"                                → ctx.userId
 *   "/users/{context.userId}/orgs/{context.orgId}"    → "/users/u1/orgs/o2"
 *   "{context.user.email}"                            → ctx.user.email  (nested)
 *
 * If the resolved value is `undefined` or `null`, the original placeholder is left
 * in place (so it's visible in the UI rather than silently becoming "undefined").
 */
function resolveContextPlaceholders(
  value: string | undefined,
  ctx: Record<string, any>,
): string {
  if (typeof value !== 'string') return '';

  return value.replace(/\{context\.([\w.]+)\}/g, (match, path: string) => {
    const resolved = path
      .split('.')
      .reduce<any>((acc, key) => (acc == null ? acc : acc[key]), ctx);
    return resolved == null ? match : String(resolved);
  });
}
