import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import { ResourceNodeContext } from '@platform-mesh/portal-ui-lib/services';
import { Observable } from 'rxjs';

interface OpenSearchRequest {
  q: string; // (required): free-text query
  resource?:string; // (optional): plural resource name; if omitted, searches across all resources
  filter?:string; // filter.<field> (optional, repeatable): exact-match filters; requires resource
  limit?: number; // (optional): default 20, max 100
  cursor?: string; // (optional): opaque pagination cursor
}

interface OpenSearchResult {
  results: unknown[];
  source: string;
  nextCursor: string;
}

@Injectable({ providedIn: 'root'})
export class OpenSearchService {
  private luigiCoreService = inject(LuigiCoreService);
  private httpClient = inject(HttpClient);

  listResources = (nodeContext: ResourceNodeContext, request: OpenSearchRequest): Observable<OpenSearchResult> => {

    const openSearchApiUrl = nodeContext.portalContext.openSearchApiUrl;

    if (!openSearchApiUrl){
      const message = 'OPENMFP_PORTAL_CONTEXT_OPEN_SEARCH_API_URL env variable is missing!'
      this.alertErrors(message);
      throw Error(message);
    }

    return this.httpClient.get<OpenSearchResult>(openSearchApiUrl, {
      headers: {
        Authorization: `Bearer ${nodeContext.token}`,
      },
      params: this.buildParams(request),
    });
  }

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

    if (request.filter !== undefined) {
      params = params.set('filter', request.filter);
    }

    return params;
  }

  private alertErrors(message: string) {
    this.luigiCoreService.showAlert({
      text: message,
      type: 'error',
    });
  }
}
