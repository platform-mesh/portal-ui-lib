import { ResourceNodeContext } from './resource-node-context';
import { ResourceService } from './resource.service';
import { Injectable, inject } from '@angular/core';
import {
  ALL_NAMESPACE,
  DOWNLOAD_KUBECONFIG_FROM_SECRET_REF_ACTION,
  DownloadKubeconfigFromSecretRefAction,
  PlatformMeshFieldDefinition,
  Resource,
  ResourceDefinition,
} from '@platform-mesh/portal-ui-lib/models';
import {
  decodeBase64,
  getResourceValueByJsonPath,
} from '@platform-mesh/portal-ui-lib/utils';
import { Observable, catchError, map, throwError } from 'rxjs';

const SECRET_RESOURCE_DEFINITION: ResourceDefinition = {
  version: 'v1',
  entity: 'Secret',
  entityCollection: 'Secrets',
  scope: 'Namespaced',
};

const DEFAULT_DATA_KEY = 'kubeconfig';
const DEFAULT_FILENAME = 'kubeconfig.yaml';
const GRAPHQL_PROPERTY_PATH_PATTERN =
  /^[_A-Za-z][_0-9A-Za-z]*(?:\.[_A-Za-z][_0-9A-Za-z]*)*$/;

export interface KubeconfigDownload {
  contents: string;
  filename: string;
}

interface SecretReference {
  name: string;
  namespace: string;
}

@Injectable({
  providedIn: 'root',
})
export class KubeconfigSecretService {
  private resourceService = inject(ResourceService);

  isDownloadActionIdentifier(action: PlatformMeshFieldDefinition): boolean {
    return (
      action.uiSettings?.buttonSettings?.action ===
      DOWNLOAD_KUBECONFIG_FROM_SECRET_REF_ACTION
    );
  }

  isDownloadAction(
    action: PlatformMeshFieldDefinition,
  ): action is DownloadKubeconfigFromSecretRefAction {
    const buttonSettings = action.uiSettings?.buttonSettings;
    const namespaceProperty =
      buttonSettings && 'namespaceProperty' in buttonSettings
        ? buttonSettings.namespaceProperty
        : undefined;

    return (
      this.isDownloadActionIdentifier(action) &&
      (action.uiSettings?.displayAs === undefined ||
        action.uiSettings.displayAs === 'button') &&
      action.propertyCollection === undefined &&
      typeof action.property === 'string' &&
      this.normalizeProperty(action.property) !== undefined &&
      (namespaceProperty === undefined ||
        this.normalizeProperty(namespaceProperty) !== undefined)
    );
  }

  getSecretReferenceFields(
    action: DownloadKubeconfigFromSecretRefAction,
  ): PlatformMeshFieldDefinition[] {
    const property = this.normalizeProperty(action.property);
    if (!property) {
      return [];
    }

    const fields: PlatformMeshFieldDefinition[] = [{ property }];
    const namespaceProperty = this.normalizeProperty(
      action.uiSettings.buttonSettings.namespaceProperty,
    );
    if (namespaceProperty) {
      fields.push({ property: namespaceProperty });
    }

    return fields;
  }

  resolveSecretReference(
    action: DownloadKubeconfigFromSecretRefAction,
    resource: Resource | undefined,
    context: ResourceNodeContext,
  ): SecretReference | undefined {
    if (!resource) {
      return undefined;
    }

    const nameProperty = this.normalizeProperty(action.property);
    if (!nameProperty) {
      return undefined;
    }

    const name = this.readStringProperty(resource, nameProperty);
    const configuredNamespaceProperty =
      action.uiSettings.buttonSettings.namespaceProperty;
    const namespace =
      configuredNamespaceProperty === undefined
        ? (this.normalizeNamespace(resource.metadata?.namespace) ??
          this.normalizeNamespace(context.namespaceId))
        : this.normalizeNamespace(
            this.readStringProperty(
              resource,
              this.normalizeProperty(configuredNamespaceProperty),
            ),
          );

    return name && namespace ? { name, namespace } : undefined;
  }

  readKubeconfig(
    action: DownloadKubeconfigFromSecretRefAction,
    resource: Resource | undefined,
    context: ResourceNodeContext,
  ): Observable<KubeconfigDownload> {
    const secretRef = this.resolveSecretReference(action, resource, context);
    if (!secretRef) {
      return throwError(
        () => new Error('Kubeconfig Secret reference is not available'),
      );
    }

    const buttonSettings = action.uiSettings.buttonSettings;
    const dataKey =
      this.readNonEmptyString(buttonSettings.dataKey) ?? DEFAULT_DATA_KEY;
    const filename =
      this.readNonEmptyString(buttonSettings.filename) ?? DEFAULT_FILENAME;
    const secretContext: ResourceNodeContext = {
      ...context,
      namespaceId: secretRef.namespace,
      resourceDefinition: SECRET_RESOURCE_DEFINITION,
    };

    return this.resourceService
      .read(
        secretRef.name,
        SECRET_RESOURCE_DEFINITION,
        ['data'],
        secretContext,
        false,
      )
      .pipe(
        catchError(() =>
          throwError(() => new Error('Kubeconfig Secret could not be read')),
        ),
        map((secret) => {
          const encodedKubeconfig = this.readNonEmptyString(
            secret?.data?.[dataKey],
          );
          if (!encodedKubeconfig) {
            throw new Error(
              `Kubeconfig data key "${dataKey}" is not available`,
            );
          }

          return {
            contents: decodeBase64(encodedKubeconfig),
            filename,
          };
        }),
      );
  }

  private readStringProperty(
    resource: Resource,
    property: string | undefined,
  ): string | undefined {
    return property
      ? this.readNonEmptyString(
          getResourceValueByJsonPath(resource, { property }),
        )
      : undefined;
  }

  private normalizeProperty(value: unknown): string | undefined {
    const property = this.readNonEmptyString(value);
    const normalized = property?.startsWith('$.')
      ? property.slice(2)
      : property;
    return normalized && GRAPHQL_PROPERTY_PATH_PATTERN.test(normalized)
      ? normalized
      : undefined;
  }

  private normalizeNamespace(value: unknown): string | undefined {
    const namespace = this.readNonEmptyString(value);
    return namespace && namespace !== ALL_NAMESPACE ? namespace : undefined;
  }

  private readNonEmptyString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }
}
