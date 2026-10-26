import { ApiExportAdminView } from './api-export-admin.component';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LuigiClient } from '@luigi-project/client/luigi-element';
import {
  ApiExport,
  ApiExportAdminService,
} from '@platform-mesh/portal-ui-lib/services';
import { of, throwError } from 'rxjs';
import { MockedObject } from 'vitest';
import { mock } from 'vitest-mock-extended';

const makeExport = (name: string, enabled: boolean): ApiExport => ({
  metadata: { name },
  enabled,
});

const mockContext = {
  organization: 'test-org',
  portalContext: { crdGatewayApiUrl: 'https://gw.example.com' },
};

describe('ApiExportAdminView', () => {
  let component: ApiExportAdminView;
  let fixture: ComponentFixture<ApiExportAdminView>;
  let apiExportAdminService: MockedObject<ApiExportAdminService>;
  let luigiClient: MockedObject<LuigiClient>;
  let mockShowAlert: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockShowAlert = vi.fn();
    apiExportAdminService = mock<ApiExportAdminService>();
    luigiClient = mock<LuigiClient>();

    luigiClient.uxManager.mockReturnValue({ showAlert: mockShowAlert } as any);
    apiExportAdminService.listApiExports.mockReturnValue(
      of({ items: [makeExport('alpha', false), makeExport('beta', true)] }),
    );

    await TestBed.configureTestingModule({
      imports: [ApiExportAdminView],
      providers: [
        { provide: ApiExportAdminService, useValue: apiExportAdminService },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
    }).overrideComponent(ApiExportAdminView, {
      set: {
        template: '',
        imports: [],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
      },
    });

    fixture = TestBed.createComponent(ApiExportAdminView);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('context', mockContext);
    fixture.componentRef.setInput('LuigiClient', luigiClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('loads APIExports on init', () => {
      fixture.detectChanges();

      expect(apiExportAdminService.listApiExports).toHaveBeenCalledWith('test-org');
      expect(component.apiExports()).toHaveLength(2);
    });

    it('sets loading false after successful load', () => {
      fixture.detectChanges();
      expect(component.loading()).toBe(false);
    });

    it('sets error on load failure', () => {
      apiExportAdminService.listApiExports.mockReturnValue(
        throwError(() => new Error('kcp down')),
      );

      fixture.detectChanges();

      expect(component.error()).toBe('Failed to load APIExports.');
      expect(component.loading()).toBe(false);
    });
  });

  describe('toggle', () => {
    beforeEach(() => fixture.detectChanges());

    it('calls enableApiExport for a disabled export', () => {
      apiExportAdminService.enableApiExport.mockReturnValue(of(undefined));

      const alphaExport = component.apiExports().find((e) => e.metadata.name === 'alpha')!;
      component.toggle(alphaExport);

      expect(apiExportAdminService.enableApiExport).toHaveBeenCalledWith('test-org', 'alpha');
    });

    it('calls disableApiExport for an enabled export', () => {
      apiExportAdminService.disableApiExport.mockReturnValue(of(undefined));

      const betaExport = component.apiExports().find((e) => e.metadata.name === 'beta')!;
      component.toggle(betaExport);

      expect(apiExportAdminService.disableApiExport).toHaveBeenCalledWith('test-org', 'beta');
    });

    it('reloads the list after a successful toggle', () => {
      apiExportAdminService.enableApiExport.mockReturnValue(of(undefined));

      const alphaExport = component.apiExports().find((e) => e.metadata.name === 'alpha')!;
      component.toggle(alphaExport);

      expect(apiExportAdminService.listApiExports).toHaveBeenCalledTimes(2);
    });

    it('shows an alert on toggle error', () => {
      apiExportAdminService.enableApiExport.mockReturnValue(
        throwError(() => new Error('conflict')),
      );

      const alphaExport = component.apiExports().find((e) => e.metadata.name === 'alpha')!;
      component.toggle(alphaExport);

      expect(mockShowAlert).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error' }),
      );
    });

    it('clears togglingName after error', () => {
      apiExportAdminService.enableApiExport.mockReturnValue(
        throwError(() => new Error('conflict')),
      );

      const alphaExport = component.apiExports().find((e) => e.metadata.name === 'alpha')!;
      component.toggle(alphaExport);

      expect(component.togglingName()).toBeNull();
    });
  });

  describe('isToggling', () => {
    it('returns true while the export is being toggled', () => {
      apiExportAdminService.enableApiExport.mockReturnValue(
        new (require('rxjs').Subject)(),
      );

      fixture.detectChanges();
      const alphaExport = component.apiExports().find((e) => e.metadata.name === 'alpha')!;
      component.toggle(alphaExport);

      expect(component.isToggling('alpha')).toBe(true);
      expect(component.isToggling('beta')).toBe(false);
    });
  });

  describe('tableError', () => {
    it('returns null when error is null', () => {
      fixture.detectChanges();
      expect(component.tableError()).toBeNull();
    });

    it('returns a TableErrorConfig with message when error is set', () => {
      apiExportAdminService.listApiExports.mockReturnValue(
        throwError(() => new Error('server error')),
      );
      fixture.detectChanges();
      expect(component.tableError()).toEqual({ message: 'Failed to load APIExports.' });
    });
  });

  describe('onButtonClick', () => {
    beforeEach(() => fixture.detectChanges());

    it('calls toggle with the resource when resource is defined', () => {
      apiExportAdminService.enableApiExport.mockReturnValue(of(undefined));
      const alphaExport = component.apiExports().find((e) => e.metadata.name === 'alpha')!;

      component.onButtonClick({ event: new MouseEvent('click'), field: {} as any, resource: alphaExport as any });

      expect(apiExportAdminService.enableApiExport).toHaveBeenCalledWith('test-org', 'alpha');
    });

    it('does nothing when resource is undefined', () => {
      component.onButtonClick({ event: new MouseEvent('click'), field: {} as any, resource: undefined });

      expect(apiExportAdminService.enableApiExport).not.toHaveBeenCalled();
      expect(apiExportAdminService.disableApiExport).not.toHaveBeenCalled();
    });
  });
});
