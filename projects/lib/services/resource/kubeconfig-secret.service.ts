import { ResourceNodeContext } from './resource-node-context';
import { ResourceService } from './resource.service';
import { Injectable, inject } from '@angular/core';
import {
  ALL_NAMESPACE,
  ButtonSettings,
  DOWNLOAD_KUBECONFIG_FROM_SECRET_REF_ACTION,
  DownloadKubeconfigFromSecretRefButtonSettings,
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

export interface KubeconfigDownload {
  contents: string;
  filename: string;
}

interface SecretReference {
  name: string;
  namespace: string;
}

export function isDownloadKubeconfigButtonSettings(
  buttonSettings: ButtonSettings | undefined,
): buttonSettings is DownloadKubeconfigFromSecretRefButtonSettings {
  return buttonSettings?.action === DOWNLOAD_KUBECONFIG_FROM_SECRET_REF_ACTION;
}

@Injectable({
  providedIn: 'root',
})
export class KubeconfigSecretService {
  private resourceService = inject(ResourceService);

  /**
   * Fields the detail-view query has to read so the action can resolve its
   * Secret reference from the loaded resource.
   */
  secretReferenceQueryFields(
    buttonSettings: ButtonSettings | undefined,
  ): PlatformMeshFieldDefinition[] {
    if (!isDownloadKubeconfigButtonSettings(buttonSettings)) {
      return [];
    }

    const fields: PlatformMeshFieldDefinition[] = [];
    const resourceProperty = this.readString(buttonSettings.resourceProperty);
    if (resourceProperty) {
      fields.push({ property: resourceProperty });
    }
    const namespaceProperty = this.readString(buttonSettings.namespaceProperty);
    if (namespaceProperty) {
      fields.push({ property: namespaceProperty });
    }

    return fields;
  }

  isSecretReferenceAvailable(
    buttonSettings: ButtonSettings | undefined,
    resource: Resource | undefined,
    context: ResourceNodeContext,
  ): boolean {
    return (
      isDownloadKubeconfigButtonSettings(buttonSettings) &&
      this.resolveSecretReference(buttonSettings, resource, context) !==
        undefined
    );
  }

  readKubeconfig(
    buttonSettings: ButtonSettings,
    resource: Resource | undefined,
    context: ResourceNodeContext,
  ): Observable<KubeconfigDownload> {
    if (!isDownloadKubeconfigButtonSettings(buttonSettings)) {
      return throwError(
        () => new Error('Button is not a kubeconfig download action'),
      );
    }

    const secretReference = this.resolveSecretReference(
      buttonSettings,
      resource,
      context,
    );
    if (!secretReference) {
      return throwError(
        () => new Error('Kubeconfig Secret reference is not available'),
      );
    }

    const dataKey = this.readString(buttonSettings.dataKey) ?? DEFAULT_DATA_KEY;
    const filename =
      this.readString(buttonSettings.filename) ?? DEFAULT_FILENAME;
    const secretContext: ResourceNodeContext = {
      ...context,
      namespaceId: secretReference.namespace,
      resourceDefinition: SECRET_RESOURCE_DEFINITION,
    };

    return this.resourceService
      .read(
        secretReference.name,
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
          const encodedKubeconfig = this.readString(secret?.data?.[dataKey]);
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

  private resolveSecretReference(
    buttonSettings: DownloadKubeconfigFromSecretRefButtonSettings,
    resource: Resource | undefined,
    context: ResourceNodeContext,
  ): SecretReference | undefined {
    if (!resource) {
      return undefined;
    }

    try {
      const resourceProperty = this.readString(buttonSettings.resourceProperty);
      if (!resourceProperty) {
        return undefined;
      }

      const name = this.readString(
        getResourceValueByJsonPath(resource, {
          property: resourceProperty,
        }),
      );
      const namespaceProperty = this.readString(
        buttonSettings.namespaceProperty,
      );
      const namespace = namespaceProperty
        ? this.namespaceOf(
            getResourceValueByJsonPath(resource, {
              property: namespaceProperty,
            }),
          )
        : (this.namespaceOf(resource.metadata?.namespace) ??
          this.namespaceOf(this.resourceService.getNamespace(context)));

      return name && namespace ? { name, namespace } : undefined;
    } catch {
      return undefined;
    }
  }

  private namespaceOf(value: unknown): string | undefined {
    const namespace = this.readString(value);
    return namespace && namespace !== ALL_NAMESPACE ? namespace : undefined;
  }

  private readString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }
}
