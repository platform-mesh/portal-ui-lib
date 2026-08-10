import { ResourceNodeContext } from './resource-node-context';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import {
  PermissionsDefinition,
  ResourceDefinition,
} from '@platform-mesh/portal-ui-lib/models';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface InstanceCheck {
  resource: string;
  group: string;
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
    permissionsDefinition: PermissionsDefinition,
    instances: { name: string; namespace?: string }[],
  ): Observable<InstancePermissionResponse[]> {
    if (!permissionsDefinition?.entityActions.length || !instances.length) {
      return of([]);
    }

    const organization = nodeContext.organization;
    const accountPath = nodeContext.accountPath;
    const token = this.luigiCoreService.getAuthData()?.idToken;

    if (!organization || !token) {
      return of([]);
    }

    const checks: InstanceCheck[] = instances.map((instance) => ({
      resource: permissionsDefinition.resource,
      group: permissionsDefinition.group,
      name: instance.name,
      namespace: instance.namespace,
      actions: permissionsDefinition.entityActions,
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
    permissionsDefinition: PermissionsDefinition,
    instance: { name: string; namespace?: string },
  ): Observable<InstancePermissionResponse[]> {
    return this.requestChecks(nodeContext, permissionsDefinition, [instance]);
  }

  checkInstances(
    nodeContext: ResourceNodeContext,
    permissionsDefinition: PermissionsDefinition,
    instances: { name: string; namespace?: string }[],
  ): Observable<InstancePermissionResponse[]> {
    return this.requestChecks(nodeContext, permissionsDefinition, instances);
  }
}
