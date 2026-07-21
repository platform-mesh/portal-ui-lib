import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { GenericResource } from '@openmfp/ngx';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import {
  ReadResources,
  ReadResourcesPagination,
  ReadResourcesParams,
  ReadResourcesResult,
  ReadResourcesSubscriptionResult,
  ResourceNodeContext,
} from '@platform-mesh/portal-ui-lib/services';
import { EMPTY, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

export interface OpenSearchRequest {
  q: string; // (required): free-text query
  resource?: string; // (optional): plural resource name; if omitted, searches across all resources
  limit?: number; // (optional): default 20, max 100
  cursor?: string; // (optional): opaque pagination cursor
  page?: number; // (optional): 1-based page number for page-based pagination
  filters?: Record<string, string>; // (optional, repeatable): exact-match filters, sent as `filter.<field>=<value>`; requires `resource`
}

export interface OpenSearchResult {
  results: OpenSearchResource[];
  source: string;
  nextCursor: string;
}

export interface OpenSearchResourceSource extends Record<any, unknown> {
  default_fields: Record<string, unknown>;
  filterable_fields: Record<string, unknown>;
  semantic_fields: Record<string, unknown>;
  custom_fields?: Record<string, unknown>;
}

export interface OpenSearchResource extends GenericResource {
  id: string;
  score: number;
  kind: string;
  name: string;
  namespace: string;
  apiGroup: string;
  apiVersion: string;
  workspacePath: string;
  clusterName: string;
  organizationId: string;
  organizationName: string;
  accountId: string;
  accountName: string;
  source: OpenSearchResourceSource;
}

@Injectable({ providedIn: 'root' })
export class OpenSearchService {
  private luigiCoreService = inject(LuigiCoreService);
  private httpClient = inject(HttpClient);

  listResources = (
    nodeContext: ResourceNodeContext,
    request: OpenSearchRequest,
  ): Observable<OpenSearchResult> => {
    const openSearchApiUrl = nodeContext.portalContext.openSearchApiUrl;

    if (!openSearchApiUrl) {
      const message =
        'OPENMFP_PORTAL_CONTEXT_OPEN_SEARCH_API_URL env variable is missing!';
      this.alertErrors(message);
      throw Error(message);
    }

    return this.httpClient
      .get<OpenSearchResult>(openSearchApiUrl, {
        headers: {
          Authorization: `Bearer ${nodeContext.token}`,
        },
        params: this.buildParams(request),
      })
      .pipe(
        map((response) => ({
          ...response,
          results: response.results.map((r) => ({
            ...r,
            ...this.expandDotNotation({
              ...r.source.default_fields,
              ...r.source.filterable_fields,
              ...r.source.semantic_fields,
              ...r.source.custom_fields,
            }),
          })),
        })),
      );
  };

  private buildParams(request: OpenSearchRequest): HttpParams {
    let params = new HttpParams().set('q', request.q);

    if (request.limit !== undefined) {
      params = params.set('limit', request.limit.toString());
    }

    if (request.cursor !== undefined) {
      params = params.set('cursor', request.cursor);
    }

    if (request.page !== undefined) {
      params = params.set('page', request.page.toString());
    }

    if (request.resource !== undefined) {
      params = params.set('resource', request.resource);
    }

    for (const [field, value] of Object.entries(request.filters ?? {})) {
      params = params.set(`filter.${field}`, value);
    }

    return params;
  }

  private alertErrors(message: string) {
    this.luigiCoreService.showAlert({
      text: message,
      type: 'error',
    });
  }

  /**
   * Returns a {@link ReadResources}-shaped adapter over this service so it can
   * be swapped for ResourceService behind a feature toggle. OpenSearch has no
   * subscription channel, so `subscribe` returns an EMPTY observable.
   *
   * The caller passes `params.filter` in the shape `"<field>=<value>"` (the
   * shape produced by {@link OpenSearchResourceTableCard.list}). We forward it
   * as the search API's native `filter.<field>=<value>` query param — for
   * example, `{ q: 'oprt', filter: 'metadata.namespace=default' }` becomes
   * `q=oprt&filter.metadata.namespace=default` on the wire. Per the API,
   * `filter.<field>` requires `resource` to be set.
   */
  asReadResources(): ReadResources {
    return {
      list: (
        nodeContext: ResourceNodeContext,
        pagination: ReadResourcesPagination,
        params: ReadResourcesParams,
      ): Observable<ReadResourcesResult> => {
        const request: OpenSearchRequest = {
          q: params.q || '*',
          resource:
            params.resource ?? nodeContext.resourceDefinition?.entityCollection,
          limit: pagination.limit,
          cursor: pagination.cursor,
          page: pagination.page,
          filters: this.parseFilter(params.filter),
        };

        return this.listResources(nodeContext, request).pipe(
          map(
            (result): ReadResourcesResult => ({
              items: result?.results ?? [],
              nextCursor: result?.nextCursor,
            }),
          ),
        );
      },
      subscribe: (): Observable<ReadResourcesSubscriptionResult | undefined> =>
        EMPTY,
    };
  }

  /**
   * Parses the `"<field>=<value>"` filter string used across the read-resources
   * contract into a `{ field: value }` map suitable for `filter.<field>=<value>`
   * query params. Returns an empty object for absent or malformed input (no `=`,
   * empty field, or empty value).
   */
  private parseFilter(filter: string | undefined): Record<string, string> {
    if (!filter) return {};

    const eq = filter.indexOf('=');
    if (eq <= 0 || eq === filter.length - 1) return {};

    return { [filter.slice(0, eq)]: filter.slice(eq + 1) };
  }

  private expandDotNotation(
    fields: Record<string, unknown>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      const parts = key.split('.');
      let node = result;
      for (let i = 0; i < parts.length - 1; i++) {
        if (
          node[parts[i]] === undefined ||
          typeof node[parts[i]] !== 'object'
        ) {
          node[parts[i]] = {};
        }
        node = node[parts[i]] as Record<string, unknown>;
      }
      node[parts[parts.length - 1]] = value;
    }
    return result;
  }
}
