import { OpenSearchService } from './open-search.service';
import { Injectable, inject } from '@angular/core';
import { LuigiClient } from '@luigi-project/client/luigi-element';
import {
  ReadResources,
  ReadResourcesPagination,
  ReadResourcesParams,
  ReadResourcesResult,
  ReadResourcesSubscriptionResult,
  ResourceNodeContext,
  ResourceService,
} from '@platform-mesh/portal-ui-lib/services';
import { Observable, defer } from 'rxjs';

const OS_PROVIDER_TOGGLE = 'os-provider';

/**
 * Selects between {@link ResourceService} (GraphQL gateway) and
 * {@link OpenSearchService} for read operations on resources, based on the
 * `os-provider` Luigi feature toggle. Used only by `OpenSearchListView`.
 *
 * The `LuigiClient` is a per-component input rather than a DI token in this
 * library, so consumers obtain a {@link ReadResources} via {@link forContext}.
 * The toggle is re-evaluated on every call so a runtime flip is honored.
 */
@Injectable({ providedIn: 'root' })
export class ReadResourcesProxyService {
  private resourceService = inject(ResourceService);
  private openSearchService = inject(OpenSearchService);

  forContext(luigiClient: LuigiClient): ReadResources {
    const pickImpl = (): ReadResources =>
      luigiClient.getActiveFeatureToggles().includes(OS_PROVIDER_TOGGLE)
        ? this.openSearchService.asReadResources()
        : this.resourceService.asReadResources();

    return {
      list: (
        nodeContext: ResourceNodeContext,
        pagination: ReadResourcesPagination,
        params: ReadResourcesParams,
      ): Observable<ReadResourcesResult> =>
        defer(() => pickImpl().list(nodeContext, pagination, params)),

      subscribe: (
        nodeContext: ResourceNodeContext,
        params: ReadResourcesParams & { resourceVersion?: string },
      ): Observable<ReadResourcesSubscriptionResult | undefined> =>
        defer(() => pickImpl().subscribe(nodeContext, params)),
    };
  }
}
