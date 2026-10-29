import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { AuthService } from '@openmfp/portal-ui-lib';
import { Observable } from 'rxjs';
import { ApiExportListResponse } from './api-export.model';

@Injectable({ providedIn: 'root' })
export class ApiExportAdminService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private authHeaders(): HttpHeaders {
    const token = this.authService.getToken?.() ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  listApiExports(organization: string): Observable<ApiExportListResponse> {
    return this.http.get<ApiExportListResponse>('/rest/admin/apiexports', {
      headers: this.authHeaders(),
      params: { organization },
    });
  }

  enableApiExport(organization: string, name: string): Observable<void> {
    return this.http.post<void>(
      `/rest/admin/apiexports/${encodeURIComponent(name)}/enable`,
      null,
      {
        headers: this.authHeaders(),
        params: { organization },
      },
    );
  }

  disableApiExport(organization: string, name: string): Observable<void> {
    return this.http.delete<void>(
      `/rest/admin/apiexports/${encodeURIComponent(name)}/enable`,
      {
        headers: this.authHeaders(),
        params: { organization },
      },
    );
  }
}
