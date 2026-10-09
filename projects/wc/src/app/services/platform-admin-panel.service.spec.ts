import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import {
  ApiExportEntry,
  OrgEntry,
  PolicyEntry,
  PlatformAdminPanelService,
} from './platform-admin-panel.service';

const BASE = '/api/v1/admin';

describe('PlatformAdminPanelService', () => {
  let service: PlatformAdminPanelService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: LuigiCoreService,
          useValue: { getAuthData: () => ({ idToken: 'test-token' }) },
        },
      ],
    });
    service = TestBed.inject(PlatformAdminPanelService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('load() populates signals from all three endpoints', async () => {
    const exports: ApiExportEntry[] = [
      { name: 'exp-a', clusterPath: 'root:providers:p1' },
    ];
    const orgs: OrgEntry[] = [{ name: 'default' }];
    const policies: PolicyEntry[] = [];

    const loadPromise = service.load();
    httpMock.expectOne(`${BASE}/apiexports`).flush(exports);
    httpMock.expectOne(`${BASE}/orgs`).flush(orgs);
    httpMock.expectOne(`${BASE}/apiexport-policies`).flush(policies);
    await loadPromise;

    expect(service.apiExports()).toEqual(exports);
    expect(service.orgs()).toEqual(orgs);
    expect(service.policies()).toEqual([]);
    expect(service.loading()).toBe(false);
    expect(service.error()).toBeNull();
  });

  it('load() sets error signal when a request fails', async () => {
    const loadPromise = service.load();
    httpMock
      .expectOne(`${BASE}/apiexports`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    httpMock.expectOne(`${BASE}/orgs`).flush([]);
    httpMock.expectOne(`${BASE}/apiexport-policies`).flush([]);
    await loadPromise;

    expect(service.error()).toBeTruthy();
    expect(service.loading()).toBe(false);
  });

  it('load() sends Authorization header', async () => {
    const loadPromise = service.load();
    const req = httpMock.expectOne(`${BASE}/apiexports`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
    req.flush([]);
    httpMock.expectOne(`${BASE}/orgs`).flush([]);
    httpMock.expectOne(`${BASE}/apiexport-policies`).flush([]);
    await loadPromise;
  });

  it('createPolicy() POSTs to the policies endpoint', () => {
    const dto = {
      name: 'exp-a',
      apiExportName: 'exp-a',
      clusterPath: 'root:providers:p1',
      allowPathExpressions: [':root:orgs:default'],
    };
    service.createPolicy(dto).subscribe();
    const req = httpMock.expectOne(`${BASE}/apiexport-policies`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush(null);
  });

  it('updatePolicy() PUTs to the named policy endpoint', () => {
    service
      .updatePolicy('exp-a', { allowPathExpressions: [':root:orgs:*'] })
      .subscribe();
    const req = httpMock.expectOne(`${BASE}/apiexport-policies/exp-a`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ allowPathExpressions: [':root:orgs:*'] });
    req.flush(null);
  });

  it('deletePolicy() DELETEs the named policy', () => {
    service.deletePolicy('exp-a').subscribe();
    const req = httpMock.expectOne(`${BASE}/apiexport-policies/exp-a`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
