import {
  NamespaceSelector,
  createNamespaceSelector,
} from './namespace-selector';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AuthService,
  LuigiCoreService,
  LuigiNode,
  PortalConfig,
} from '@openmfp/portal-ui-lib';
import {
  ALL_NAMESPACE,
  PlatformMeshFieldDefinition,
  Resource,
  ResourceDefinition,
  ResourceListResult,
} from '@platform-mesh/portal-ui-lib/models';
import {
  ResourceNodeContext,
  ResourceService,
} from '@platform-mesh/portal-ui-lib/services';
import {
  generateGraphQLFields,
  isNamespacedResource,
  mergeListWithSubscriptionResult,
} from '@platform-mesh/portal-ui-lib/utils';
import { Observable, Subject, defer, of } from 'rxjs';
import {
  catchError,
  retry,
  scan,
  shareReplay,
  startWith,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs/operators';

const defaultColumns: PlatformMeshFieldDefinition[] = [
  {
    label: 'Name',
    property: 'metadata.name',
  },
];

@Injectable({ providedIn: 'root' })
export class NamespaceSelectionRendererService {
  private namespaceResourcesCache?: {
    key: string;
    value$: Observable<Resource[]>;
    stop$: Subject<void>;
  };

  private resourceService = inject(ResourceService);
  private authService = inject(AuthService);
  private luigiCoreService = inject(LuigiCoreService);
  private destroyRef = inject(DestroyRef);

  public create(portalConfig: PortalConfig) {
    return (
      containerElement: HTMLElement,
      nodeItems: any[],
      _clickHandler: any,
    ) => {
      const lastNode = nodeItems.at(-1)?.node as LuigiNode | undefined;
      const namespace = this.luigiCoreService
        .routing()
        .getSearchParams().namespace;
      const kcpPath = lastNode?.context?.kcpPath;

      if (lastNode?.context && !isNamespacedResource(lastNode.context)) {
        return containerElement;
      }

      const selector = createNamespaceSelector((value) =>
        this.changeNamespace(value),
      );
      containerElement.appendChild(selector.element);

      this.getNamespaceResourcesCached(portalConfig, kcpPath).subscribe(
        (resources) => {
          selector.setNamespaces(
            resources
              .map((resource) => resource.metadata?.name)
              .filter((name): name is string => !!name),
          );
          this.setSelectedValue(selector, resources, namespace);
        },
      );

      return selector.element;
    };
  }

  private getNamespaceResourcesCached(
    portalConfig: PortalConfig,
    kcpPath?: string,
  ): Observable<Resource[]> {
    const cacheKey = this.getNamespaceResourcesCacheKey(kcpPath);
    if (this.namespaceResourcesCache?.key === cacheKey) {
      return this.namespaceResourcesCache.value$;
    }

    if (this.namespaceResourcesCache) {
      this.namespaceResourcesCache.stop$.next();
      this.namespaceResourcesCache.stop$.complete();
      this.namespaceResourcesCache = undefined;
    }

    const stop$ = new Subject<void>();
    const value$ = this.getNamespaceResources(
      portalConfig,
      kcpPath,
      stop$,
    ).pipe(shareReplay(1), takeUntilDestroyed(this.destroyRef));
    this.namespaceResourcesCache = {
      key: cacheKey,
      value$,
      stop$,
    };

    return value$;
  }

  private getNamespaceResourcesCacheKey(kcpPath?: string): string {
    return kcpPath ?? '';
  }

  private setSelectedValue(
    selector: NamespaceSelector,
    resources: Resource[],
    namespace: string | null,
  ) {
    const currentNamespace = this.luigiCoreService
      .routing()
      .getSearchParams().namespace;

    if (currentNamespace) {
      selector.select(currentNamespace);
      return;
    }

    if (
      namespace &&
      resources.find((resource) => resource.metadata?.name === namespace)
    ) {
      selector.select(namespace);
    } else {
      selector.select(ALL_NAMESPACE);
      this.changeNamespace(ALL_NAMESPACE);
    }
  }

  private getNamespaceResources(
    portalConfig: PortalConfig,
    kcpPath: string | undefined,
    stop$: Subject<void>,
  ): Observable<Resource[]> {
    const operation = 'v1_namespaces';
    const fields = generateGraphQLFields(defaultColumns);
    const context = {
      portalContext: {
        crdGatewayApiUrl: portalConfig.portalContext['crdGatewayApiUrl'],
      },
      resourceDefinition: {
        version: 'v1',
        entityCollection: 'Namespaces',
        entity: 'Namespace',
        scope: 'Cluster',
      } as ResourceDefinition,
      kcpPath,
      token: this.authService.getToken(),
    } as ResourceNodeContext;

    return defer(() =>
      this.resourceService.list(operation, fields, context),
    ).pipe(
      retry(3),
      takeUntil(stop$),
      switchMap((result: ResourceListResult) =>
        this.resourceService
          .resourceChangeSubscription(
            operation,
            fields,
            context,
            result.resourceVersion,
            false,
          )
          .pipe(
            startWith(undefined),
            scan(
              (resources, subscriptionResult) =>
                mergeListWithSubscriptionResult(resources, subscriptionResult, {
                  getItemKey: (resource) => resource.metadata?.name,
                  mapSubscriptionObjectToItem: (object) => object,
                }),
              result.items,
            ),
            tap((result) => {
              const namespaces = result.map((e) => e.metadata?.name);
              this.luigiCoreService.setInGlobalContext({ namespaces });
            }),
            takeUntil(stop$),
          ),
      ),
      catchError((error) => {
        console.error(`Failed to read entities from ${operation}`, error);
        return of([]);
      }),
    );
  }

  private changeNamespace(value: string): void {
    const oldValue = this.luigiCoreService
      .routing()
      .getSearchParams().namespace;

    if (oldValue === value) {
      return;
    }

    this.luigiCoreService.routing().addSearchParams({ namespace: value });
  }
}
