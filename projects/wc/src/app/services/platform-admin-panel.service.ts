import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import { Observable } from 'rxjs';

export interface ApiExportEntry {
  name: string;
  clusterPath: string;
}

export interface OrgEntry {
  name: string;
}

export interface ApiExportRef {
  name: string;
  clusterPath: string;
}

export interface PolicyEntry {
  name: string;
  apiExportRef: ApiExportRef;
  allowPathExpressions: string[];
}

export interface CreatePolicyRequest {
  name: string;
  apiExportName: string;
  clusterPath: string;
  allowPathExpressions: string[];
}

export interface UpdatePolicyRequest {
  allowPathExpressions: string[];
}

const BASE = '/api/v1/admin';

@Injectable({ providedIn: 'root' })
export class PlatformAdminPanelService {
  private readonly http = inject(HttpClient);
  private readonly luigiCore = inject(LuigiCoreService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly apiExports = signal<ApiExportEntry[]>([]);
  readonly orgs = signal<OrgEntry[]>([]);
  readonly policies = signal<PolicyEntry[]>([]);

  private get headers() {
    const token = this.luigiCore.getAuthData()?.idToken ?? '';
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [apiExports, orgs, policies] = await Promise.all([
        this.http
          .get<ApiExportEntry[]>(`${BASE}/apiexports`, {
            headers: this.headers,
          })
          .toPromise(),
        this.http
          .get<OrgEntry[]>(`${BASE}/orgs`, { headers: this.headers })
          .toPromise(),
        this.http
          .get<PolicyEntry[]>(`${BASE}/apiexport-policies`, {
            headers: this.headers,
          })
          .toPromise(),
      ]);
      this.apiExports.set(apiExports ?? []);
      this.orgs.set(orgs ?? []);
      this.policies.set(policies ?? []);
    } catch {
      this.error.set('Failed to load Platform Admin data');
    } finally {
      this.loading.set(false);
    }
  }

  createPolicy(dto: CreatePolicyRequest): Observable<void> {
    return this.http.post<void>(`${BASE}/apiexport-policies`, dto, {
      headers: this.headers,
    });
  }

  updatePolicy(name: string, dto: UpdatePolicyRequest): Observable<void> {
    return this.http.put<void>(`${BASE}/apiexport-policies/${name}`, dto, {
      headers: this.headers,
    });
  }

  deletePolicy(name: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/apiexport-policies/${name}`, {
      headers: this.headers,
    });
  }
}
