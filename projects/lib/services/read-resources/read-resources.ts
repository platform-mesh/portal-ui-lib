import { ResourceNodeContext } from '../resource/resource-node-context';
import { GenericResource } from '@openmfp/ngx';
import { ResourceOperationType } from '@platform-mesh/portal-ui-lib/models';
import { Observable } from 'rxjs';

export interface ReadResourcesParams {
  /** Free-text query — used by the OpenSearch implementation; ignored by ResourceService. */
  q?: string;
  /** OpenSearch exact-match filter; ignored by ResourceService. */
  filter?: string;
  /** Plural resource name for OpenSearch; defaults to `resourceDefinition.entityCollection`. */
  resource?: string;
  /** GraphQL fields or a raw query string — used by ResourceService; ignored by OpenSearch. */
  fields?: any[] | string;
  /** GraphQL operation name — used by ResourceService; ignored by OpenSearch. */
  operation?: string;
  /** ResourceService-only flag controlling which Apollo client to use. */
  readFromParentKcpPath?: boolean;
}

export interface ReadResourcesPagination {
  limit?: number;
  /** Unified pagination cursor — maps to `continue` for ResourceService and `cursor` for OpenSearch. */
  cursor?: string;
}

export interface ReadResourcesResult {
  items: GenericResource[];
  nextCursor?: string;
  remainingItemCount?: number;
  resourceVersion?: string;
}

export interface ReadResourcesSubscriptionResult {
  type: ResourceOperationType;
  object: GenericResource;
}

/**
 * Provider-agnostic read API for resource lists. Implementations can be backed
 * by the GraphQL gateway (ResourceService) or by OpenSearch (OpenSearchService);
 * the proxy chooses one based on the `os-provider` Luigi feature toggle.
 */
export interface ReadResources {
  list(
    nodeContext: ResourceNodeContext,
    pagination: ReadResourcesPagination,
    params: ReadResourcesParams,
  ): Observable<ReadResourcesResult>;

  subscribe(
    nodeContext: ResourceNodeContext,
    params: ReadResourcesParams & { resourceVersion?: string },
  ): Observable<ReadResourcesSubscriptionResult | undefined>;
}
