import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AuthService,
  FieldDefinition,
  LuigiCoreService,
  PortalConfig,
  Resource,
  ResourceNodeContext,
  ResourceService,
  generateGraphQLFields,
} from '@openmfp/portal-ui-lib';
import { LuigiNode } from '@openmfp/portal-ui-lib/lib/models';
import '@ui5/webcomponents/dist/ComboBox.js';
import { Observable, of } from 'rxjs';
import { shareReplay } from 'rxjs/operators';

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
    return (containerElement: HTMLElement, nodeItems: any[], _clickHandler: any) => {
      containerElement.style.paddingBottom = '0.5rem';

      const lastNode = nodeItems.at(-1)?.node as LuigiNode | undefined;

      if (!this.isNamespacedNode(lastNode)) {
        return containerElement;
      }

      const ui5combobox = this.createCombobox(containerElement);
      const namespaceName = this.getNamespaceNodeName(lastNode);
      this.addComboboxItems(portalConfig, ui5combobox, namespaceName);

      ui5combobox.addEventListener('change', (event: any) => {
        const value = (event?.target as any)?.value ?? '';
        const selected = (value || '').trim();
        this.replacePathSegment(namespaceName, selected);
      });

      return ui5combobox as HTMLElement;
    };
  }

  private isNamespacedNode(node: LuigiNode | undefined) {
    return node?.context?.resourceDefinition?.scope === 'Namespaced';
  }

  private getNamespaceNodeName(node?: LuigiNode) {
    const namespacedNodeName = node?.navigationContext || '';
    const segments = window.location.pathname.split('/').filter(Boolean);
    const index = segments.indexOf(namespacedNodeName);

    return index > 0 ? segments[index - 1] : null;
  }

  private createCombobox(containerElement: HTMLElement) {
    const ui5combobox = document.createElement('ui5-combobox');
    ui5combobox.setAttribute('placeholder', 'Namespaces');
    containerElement.appendChild(ui5combobox);

    const allResourceOption = document.createElement('ui5-cb-item');
    allResourceOption.setAttribute('text', '-all-');
    ui5combobox.appendChild(allResourceOption);

    return ui5combobox;
  }

  private addComboboxItems(
    portalConfig: PortalConfig,
    ui5combobox: HTMLElement,
    namespaceName: string | null,
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
        if (name === namespaceName) {
          ui5combobox.setAttribute('value', name);
        }
        ui5combobox.appendChild(resourceOption);
      });
    });
  }

  private getNamespaceResources(
    portalConfig: PortalConfig,
  ): Observable<Resource[]> {
    const operation = 'core_namespaces';
    const fields = generateGraphQLFields(defaultColumns);

    try {
      return this.resourceService.list(operation, fields, {
        portalContext: {
          crdGatewayApiUrl: portalConfig.portalContext['crdGatewayApiUrl'],
        },
        token: this.authService.getToken(),
      } as ResourceNodeContext);
    } catch (e) {
      console.error(`Failed to read entities from ${operation}`, e);
      return of([]);
    }
  }

  private replacePathSegment(name: string | null, newValue: string): void {
    if (!name || !newValue) {
      return;
    }
    const segments = window.location.pathname.split('/').filter(Boolean);
    const index = segments.indexOf(name);

    if (index !== -1) {
      segments[index] = newValue;
      const newPath = `/${segments.join('/')}`;

      this.luigiCoreService.navigation().navigate(newPath);
    } else {
      console.warn(`Segment "${name}" not found in path.`);
    }
  }
}
