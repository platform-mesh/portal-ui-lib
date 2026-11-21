import { ApiExportAdminService } from './api-export-admin.service';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from '@openmfp/portal-ui-lib';
import { mock } from 'vitest-mock-extended';
import { MockedObject } from 'vitest';
import { ApiExportListResponse } from './api-export.model';

describe('ApiExportAdminService', () => {
  let service: ApiExportAdminService;
  let httpMock: HttpTestingController;
  let authService: MockedObject<AuthService>;

  beforeEach(() => {
    authService = mock<AuthService>();
    authService.getToken = vi.fn().mockReturnValue('test-token');

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ApiExportAdminService,
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(ApiExportAdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.clearAllMocks();
  });

  describe('listApiExports', () => {
    it('calls GET /rest/admin/apiexports with organization param', () => {
      const mockResponse: ApiExportListResponse = {
        items: [{ metadata: { name: 'alpha' }, enabled: true }],
      };

      service.listApiExports('my-org').subscribe((res) => {
        expect(res).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('/rest/admin/apiexports?organization=my-org');
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
      req.flush(mockResponse);
    });

    it('includes Bearer token in Authorization header', () => {
      authService.getToken = vi.fn().mockReturnValue('another-token');
      service.listApiExports('org').subscribe();

      const req = httpMock.expectOne('/rest/admin/apiexports?organization=org');
      expect(req.request.headers.get('Authorization')).toBe('Bearer another-token');
      req.flush({ items: [] });
    });
  });

  describe('enableApiExport', () => {
    it('calls POST /rest/admin/apiexports/:name/enable', () => {
      service.enableApiExport('my-org', 'alpha').subscribe();

      const req = httpMock.expectOne('/rest/admin/apiexports/alpha/enable?organization=my-org');
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
      req.flush(null);
    });

    it('URL-encodes the API export name', () => {
      service.enableApiExport('my-org', 'my export').subscribe();

      const req = httpMock.expectOne('/rest/admin/apiexports/my%20export/enable?organization=my-org');
      expect(req.request.method).toBe('POST');
      req.flush(null);
    });
  });

  describe('disableApiExport', () => {
    it('calls DELETE /rest/admin/apiexports/:name/enable', () => {
      service.disableApiExport('my-org', 'alpha').subscribe();

      const req = httpMock.expectOne('/rest/admin/apiexports/alpha/enable?organization=my-org');
      expect(req.request.method).toBe('DELETE');
      expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
      req.flush(null);
    });
  });
});
