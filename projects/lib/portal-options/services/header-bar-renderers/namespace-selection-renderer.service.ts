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
  FieldDefinition,
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
import '@ui5/webcomponents/dist/ComboBox.js';
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

const defaultColumns: FieldDefinition[] = [
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
      containerElement.style.paddingBottom = '0.5rem';

      const lastNode = nodeItems.at(-1)?.node as LuigiNode | undefined;
      const namespace = this.luigiCoreService
        .routing()
        .getSearchParams().namespace;
      const kcpPath = lastNode?.context?.kcpPath;

      if (lastNode?.context && !isNamespacedResource(lastNode.context)) {
        return containerElement;
      }

      const ui5combobox = this.createCombobox(containerElement);

      this.addComboboxItems(portalConfig, ui5combobox, namespace, kcpPath);

      ui5combobox.addEventListener('change', (event: any) => {
        const value = (event?.target as any)?.value.trim() ?? '';
        this.changeNamespace(value);
      });

      return ui5combobox as HTMLElement;
    };
  }

  private createCombobox(containerElement: HTMLElement) {
    const ui5combobox = document.createElement('ui5-combobox');
    ui5combobox.setAttribute('placeholder', 'Namespaces');
    ui5combobox.setAttribute('data-testid', 'namespace-selection-combobox');
    containerElement.appendChild(ui5combobox);

    return ui5combobox;
  }

  private addComboboxItems(
    portalConfig: PortalConfig,
    ui5combobox: HTMLElement,
    namespace: string | null,
    kcpPath?: string,
  ) {
    this.getNamespaceResourcesCached(portalConfig, kcpPath).subscribe(
      (resources) => {
        this.syncComboboxItems(ui5combobox, resources);
        this.setSelectedValue(ui5combobox, resources, namespace);
      },
    );
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

  private syncComboboxItems(ui5combobox: HTMLElement, resources: Resource[]) {
    ui5combobox.replaceChildren();

    resources.forEach((resource) => {
      const name = resource.metadata?.name;
      if (!name) {
        return;
      }
      const resourceOption = document.createElement('ui5-cb-item');
      resourceOption.setAttribute('text', name);
      resourceOption.setAttribute(
        'data-testid',
        `namespace-selection-combobox-item-${name}`,
      );
      ui5combobox.appendChild(resourceOption);
    });

    const allOption = document.createElement('ui5-cb-item');
    allOption.setAttribute('text', ALL_NAMESPACE);
    allOption.setAttribute(
      'data-testid',
      'namespace-selection-combobox-item-all',
    );
    ui5combobox.appendChild(allOption);
  }

  private setSelectedValue(
    ui5combobox: HTMLElement,
    resources: Resource[],
    namespace: string | null,
  ) {
    const currentNamespace = this.luigiCoreService
      .routing()
      .getSearchParams().namespace;

    if (currentNamespace) {
      ui5combobox.setAttribute('value', currentNamespace);
      return;
    }

    if (
      namespace &&
      resources.find((resource) => resource.metadata?.name === namespace)
    ) {
      ui5combobox.setAttribute('value', namespace);
    } else {
      ui5combobox.setAttribute('value', ALL_NAMESPACE);
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
    if (!value) {
      return;
    }

    const oldValue = this.luigiCoreService
      .routing()
      .getSearchParams().namespace;

    if (oldValue === value) {
      return;
    }

    this.luigiCoreService.routing().addSearchParams({ namespace: value });
  }
}
