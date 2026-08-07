import { ResourceNodeContext } from './resource-node-context';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import { ResourceDefinition } from '@platform-mesh/portal-ui-lib/models';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface InstanceCheck {
  resource: string;
  apiGroup: string;
  entityCollection: string;
  version: string;
  scope?: string;
  namespace?: string;
  name: string;
  actions: string[];
}

export interface ResourceCheckRequest {
  token?: string;
  organization: string;
  accountPath?: string;
  checks: InstanceCheck[];
}

export interface InstancePermissionResponse {
  resource: string;
  namespace?: string;
  name?: string;
  actions: string[];
}

@Injectable({ providedIn: 'root' })
export class InstancePermissionsService {
  private httpClient = inject(HttpClient);
  private luigiCoreService = inject(LuigiCoreService);

  private requestChecks(
    nodeContext: ResourceNodeContext,
    resourceDefinition: ResourceDefinition,
    instances: { name: string; namespace?: string }[],
  ): Observable<InstancePermissionResponse[]> {
    if (
      !resourceDefinition.checkActionsForInstance?.actions.length ||
      !instances.length
    ) {
      return of([]);
    }

    const organization = nodeContext.organization;
    const accountPath = nodeContext.accountPath;
    const token = this.luigiCoreService.getAuthData()?.idToken;

    if (!organization || !token) {
      return of([]);
    }

    const actions = resourceDefinition.checkActionsForInstance.actions;
    const isNamespaced = resourceDefinition.scope === 'Namespaced';

    const checks: InstanceCheck[] = instances.map((instance) => ({
      resource: resourceDefinition.entity,
      apiGroup: resourceDefinition.apiGroup ?? '',
      entityCollection: resourceDefinition.entityCollection,
      version: resourceDefinition.version,
      scope: resourceDefinition.scope ?? 'Cluster',
      name: instance.name,
      namespace: isNamespaced ? instance.namespace : undefined,
      actions,
    }));

    const body: ResourceCheckRequest = {
      token,
      organization,
      accountPath,
      checks,
    };

    return this.httpClient
      .post<InstancePermissionResponse[]>(
        '/rest/permissions/resource-check',
        body,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      .pipe(catchError(() => of([])));
  }

  checkInstance(
    nodeContext: ResourceNodeContext,
    resourceDefinition: ResourceDefinition,
    instance: { name: string; namespace?: string },
  ): Observable<InstancePermissionResponse[]> {
    return this.requestChecks(nodeContext, resourceDefinition, [instance]);
  }

  checkInstances(
    nodeContext: ResourceNodeContext,
    resourceDefinition: ResourceDefinition,
    instances: { name: string; namespace?: string }[],
  ): Observable<InstancePermissionResponse[]> {
    return this.requestChecks(nodeContext, resourceDefinition, instances);
  }
}
