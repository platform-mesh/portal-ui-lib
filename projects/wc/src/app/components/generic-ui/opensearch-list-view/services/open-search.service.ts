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
  q: string; // (required): free-text query, may include Lucene syntax like `field:value AND field2:value2`
  resource?: string; // (optional): plural resource name; if omitted, searches across all resources
  limit?: number; // (optional): default 20, max 100
  cursor?: string; // (optional): opaque pagination cursor
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

function expandDotNotation(fields: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    const parts = key.split('.');
    let node = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (node[parts[i]] === undefined || typeof node[parts[i]] !== 'object') {
        node[parts[i]] = {};
      }
      node = node[parts[i]] as Record<string, unknown>;
    }
    node[parts[parts.length - 1]] = value;
  }
  return result;
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
            ...expandDotNotation({
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

    if (request.resource !== undefined) {
      params = params.set('resource', request.resource);
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
   * The caller passes `params.filter` in the shape `"<property>=<value>"` (the
   * shape produced by {@link OpenSearchResourceTableCard.list}). We translate
   * that to OpenSearch's native Lucene URI-search syntax and fold it into the
   * single `q` param — for example, `{ q: 'oprt', filter: 'metadata.namespace=default' }`
   * becomes `q=oprt AND metadata.namespace:default` on the wire. Reserved
   * Lucene characters in the value are escaped so unusual namespace names
   * (e.g. `kube-system`, which contains a Lucene-reserved `-`) still work.
   */
  asReadResources(): ReadResources {
    return {
      list: (
        nodeContext: ResourceNodeContext,
        pagination: ReadResourcesPagination,
        params: ReadResourcesParams,
      ): Observable<ReadResourcesResult> => {
        const request: OpenSearchRequest = {
          q: buildLuceneQuery(params.q ?? '', params.filter),
          resource:
            params.resource ?? nodeContext.resourceDefinition?.entityCollection,
          limit: pagination.limit,
          cursor: pagination.cursor,
        };

        return this.listResources(nodeContext, request).pipe(
          map((result): ReadResourcesResult => ({
            items: result?.results ?? [],
            nextCursor: result?.nextCursor,
          })),
        );
      },
      subscribe: (): Observable<ReadResourcesSubscriptionResult | undefined> =>
        EMPTY,
    };
  }
}

/**
 * Lucene reserved characters that must be backslash-escaped inside term
 * values. See the OpenSearch / Lucene query-string documentation. `\` must
 * come first in the regex character class so its own escape isn't broken.
 */
const LUCENE_RESERVED = /([\\+\-!(){}\[\]^"~*?:/]|&&|\|\|)/g;

/** Escape a value for use inside a Lucene `field:value` term clause. */
function escapeLuceneValue(value: string): string {
  return value.replace(LUCENE_RESERVED, '\\$1');
}

/**
 * Combines a free-text search term and an optional `"<property>=<value>"`
 * exact-match filter into a single Lucene URI-search query string.
 *
 * Rules:
 * - No filter, no q → `""` (matches everything).
 * - Only q → `q` verbatim.
 * - Only filter → `property:escapedValue`.
 * - Both → `q AND property:escapedValue`.
 * - Malformed filter (no `=`, empty property, or empty value) → treated as
 *   "no filter" and `q` is returned alone.
 */
export function buildLuceneQuery(
  q: string,
  filter: string | undefined,
): string {
  if (!filter) return q || '*';

  const eq = filter.indexOf('=');
  if (eq <= 0 || eq === filter.length - 1) return q;

  const property = filter.slice(0, eq);
  const value = filter.slice(eq + 1);
  const clause = `${property}:${escapeLuceneValue(value)}`;

  return q ? `${q} AND ${clause}` : clause;
}
