import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AuthService,
  LuigiCoreService,
  LuigiNode,
  PortalConfig,
} from '@openmfp/portal-ui-lib';
import {
  FieldDefinition,
  Resource,
  ResourceDefinition,
} from '@platform-mesh/portal-ui-lib/models';
import {
  ResourceNodeContext,
  ResourceService,
} from '@platform-mesh/portal-ui-lib/services';
import {
  generateGraphQLFields,
  isNamespacedResource,
} from '@platform-mesh/portal-ui-lib/utils';
import '@ui5/webcomponents/dist/ComboBox.js';
import { Observable, of } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';












const defaultColumns: FieldDefinition[] = [
  {
    label: 'Name',
    property: 'metadata.name',
  },
];

@Injectable({ providedIn: 'root' })
export class NamespaceSelectionRendererService {
  private namespaceResources$?: Observable<Resource[]>;

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

      if (lastNode?.context && !isNamespacedResource(lastNode.context)) {
        return containerElement;
      }

      const ui5combobox = this.createCombobox(containerElement);

      this.addComboboxItems(portalConfig, ui5combobox, namespace);

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
    containerElement.appendChild(ui5combobox);

    return ui5combobox;
  }

  private addComboboxItems(
    portalConfig: PortalConfig,
    ui5combobox: HTMLElement,
    namespace: string | null,
  ) {
    if (!this.namespaceResources$) {
      this.namespaceResources$ = this.getNamespaceResources(portalConfig).pipe(
        shareReplay(1),
        takeUntilDestroyed(this.destroyRef),
      );
    }

    this.namespaceResources$.subscribe((resources) => {
      resources.forEach((resource) => {
        const name = resource.metadata?.name;
        if (!name) {
          return;
        }
        const existingItem = Array.from(ui5combobox.children).find(
          (child) => (child as Element).getAttribute('text') === name,
        );

        if (existingItem) {
          return;
        }
        const resourceOption = document.createElement('ui5-cb-item');
        resourceOption.setAttribute('text', name);
        ui5combobox.appendChild(resourceOption);
      });

      const allOption = document.createElement('ui5-cb-item');
      allOption.setAttribute('text', '-all-');
      ui5combobox.appendChild(allOption);

      this.setSelectedValue(ui5combobox, resources, namespace);
    });
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
      ui5combobox.setAttribute('value', '-all-');
      this.changeNamespace('-all-');
    }
  }

  private getNamespaceResources(
    portalConfig: PortalConfig,
  ): Observable<Resource[]> {
    const operation = 'v1_namespaces';
    const fields = generateGraphQLFields(defaultColumns);

    try {
      return this.resourceService
        .list(operation, fields, {
          portalContext: {
            crdGatewayApiUrl: portalConfig.portalContext['crdGatewayApiUrl'],
          },
          resourceDefinition: {
            version: 'v1',
            plural: 'namespaces',
            scope: 'Cluster',
          } as ResourceDefinition,
          token: this.authService.getToken(),
        } as ResourceNodeContext)
        .pipe(map((resources) => resources.items));
    } catch (e) {
      console.error(`Failed to read entities from ${operation}`, e);
      return of([]);
    }
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
