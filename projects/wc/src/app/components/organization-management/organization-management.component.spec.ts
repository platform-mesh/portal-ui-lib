import { OrganizationManagementComponent } from './organization-management.component';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  NO_ERRORS_SCHEMA,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MutationResult } from '@apollo/client';
import { LuigiClient } from '@luigi-project/client/luigi-element';
import {
  ClientEnvironment,
  EnvConfigService,
  I18nService,
  LuigiGlobalContext,
  NodeContext,
} from '@openmfp/portal-ui-lib';
import { ResourceService } from '@platform-mesh/portal-ui-lib/services';
import { of, throwError } from 'rxjs';

describe('OrganizationManagementComponent', () => {
  let component: OrganizationManagementComponent;
  let fixture: ComponentFixture<OrganizationManagementComponent>;
  let resourceServiceMock: jest.Mocked<ResourceService>;
  let i18nServiceMock: jest.Mocked<I18nService>;
  let envConfigServiceMock: jest.Mocked<EnvConfigService>;
  let luigiClientMock: jest.Mocked<LuigiClient>;

  beforeEach(async () => {
    resourceServiceMock = {
      list: jest.fn(),
      create: jest.fn(),
    } as any;

    i18nServiceMock = {
      translationTable: {},
      getTranslation: jest.fn(),
    } as any;

    envConfigServiceMock = {
      getEnvConfig: jest.fn(),
    } as any;

    luigiClientMock = {
      uxManager: jest.fn().mockReturnValue({
        showAlert: jest.fn(),
      }),
    } as any;

    await TestBed.configureTestingModule({
      imports: [OrganizationManagementComponent, FormsModule],
      providers: [
        { provide: ResourceService, useValue: resourceServiceMock },
        { provide: I18nService, useValue: i18nServiceMock },
        { provide: EnvConfigService, useValue: envConfigServiceMock },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
    })
      .overrideComponent(OrganizationManagementComponent, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(OrganizationManagementComponent);
    component = fixture.componentInstance;
    component.LuigiClient = (() => luigiClientMock) as any;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should react to context input change', () => {
    const mockContext = {
      translationTable: { hello: 'world' },
    } as any as NodeContext;

    resourceServiceMock.list.mockReturnValue(of([] as any));

    const contextSignal = signal<NodeContext | null>(mockContext);
    component.context = contextSignal as any;

    fixture.detectChanges();

    expect(component['i18nService'].translationTable).toEqual(
      mockContext.translationTable,
    );
  });

  it('should initialize with empty organizations', () => {
    expect(component.organizations()).toEqual([]);
  });

  it('should read organizations on init', () => {
    const mockOrganizations = [
      {
        metadata: { name: 'org1' },
        status: { conditions: [{ type: 'Ready', status: 'True' }] },
      },
      {
        metadata: { name: 'org2' },
        status: { conditions: [{ type: 'Ready', status: 'False' }] },
      },
    ];
    const mockGlobalContext: LuigiGlobalContext = {
      portalContext: {},
      userId: 'user1',
      userEmail: 'user@test.com',
      token: 'token',
      organization: 'org1',
      portalBaseUrl: 'https://test.com',
    };

    component.context = (() => mockGlobalContext) as any;
    resourceServiceMock.list.mockReturnValue(of(mockOrganizations as any));

    component.ngOnInit();

    expect(resourceServiceMock.list).toHaveBeenCalled();
    expect(component.organizations()).toEqual([
      { name: 'org1', ready: true },
      { name: 'org2', ready: false },
    ]);
  });

  it('should set organization to switch', () => {
    component.organizations.set([{ name: 'testOrg', ready: false }]);
    const event = { selectedOption: { _state: { value: 'testOrg' } } };
    component.setOrganizationToSwitch(event);
    expect(component.organizationToSwitch()).toEqual({
      name: 'testOrg',
      ready: false,
    });
  });

  it('should onboard new organization successfully', () => {
    const mockResponse: MutationResult<void> = {
      data: undefined,
      loading: false,
      error: undefined,
      called: true,
      client: {} as any,
      reset: jest.fn(),
    };
    resourceServiceMock.create.mockReturnValue(of(mockResponse));
    component.newOrganization.setValue('newOrg');
    component.organizations.set([{ name: 'existingOrg', ready: false }]);

    component.onboardOrganization();

    expect(resourceServiceMock.create).toHaveBeenCalled();
    expect(component.organizationToSwitch()).toEqual({
      name: 'newOrg',
      ready: false,
    });
    expect(component.newOrganization.value).toBe('');
    expect(luigiClientMock.uxManager().showAlert).toHaveBeenCalled();
  });

  it('should handle organization creation error', () => {
    resourceServiceMock.create.mockReturnValue(
      throwError(() => new Error('Creation failed')),
    );
    component.newOrganization.setValue('newOrg');

    component.onboardOrganization();

    expect(component.LuigiClient().uxManager().showAlert).toHaveBeenCalledWith({
      text: 'Failure! Could not create organization: newOrg.',
      type: 'error',
    });
  });

  it('should switch organization', async () => {
    const mockEnvConfig: ClientEnvironment = {
      idpName: 'test',
      organization: 'test',
      oauthServerUrl: 'https://test.com',
      clientId: 'test',
      baseDomain: 'test.com',
      isLocal: false,
      developmentInstance: false,
      authData: {
        expires_in: '3600',
        access_token: 'test-access-token',
        id_token: 'test-id-token',
      },
      uiOptions: [],
    };
    envConfigServiceMock.getEnvConfig.mockResolvedValue(mockEnvConfig);
    component.organizationToSwitch.set({ name: 'newOrg', ready: false });
    Object.defineProperty(window, 'location', {
      value: { protocol: 'https:', port: '8080' },
      writable: true,
    });

    await component.switchOrganization();

    expect(window.location.href).toBe('https://newOrg.test.com:8080');
  });

  it('should handle invalid organization name in switchOrganization', async () => {
    const mockEnvConfig: ClientEnvironment = {
      idpName: 'test',
      organization: 'test',
      oauthServerUrl: 'https://test.com',
      clientId: 'test',
      baseDomain: 'test.com',
      isLocal: false,
      developmentInstance: false,
      authData: {
        expires_in: '3600',
        access_token: 'test-access-token',
        id_token: 'test-id-token',
      },
      uiOptions: [],
    };
    envConfigServiceMock.getEnvConfig.mockResolvedValue(mockEnvConfig);
    component.organizationToSwitch.set({
      name: 'invalid-org-name-',
      ready: false,
    }); // Invalid: ends with hyphen

    await component.switchOrganization();

    expect(luigiClientMock.uxManager().showAlert).toHaveBeenCalledWith({
      text: 'Organization name is not valid for subdomain usage, accrording to RFC 1034/1123.',
      type: 'error',
    });
  });

  it('should handle switch organization without port', async () => {
    const mockEnvConfig: ClientEnvironment = {
      idpName: 'test',
      organization: 'test',
      oauthServerUrl: 'https://test.com',
      clientId: 'test',
      baseDomain: 'test.com',
      isLocal: false,
      developmentInstance: false,
      authData: {
        expires_in: '3600',
        access_token: 'test-access-token',
        id_token: 'test-id-token',
      },
      uiOptions: [],
    };
    envConfigServiceMock.getEnvConfig.mockResolvedValue(mockEnvConfig);
    component.organizationToSwitch.set({ name: 'validorg', ready: false });
    Object.defineProperty(window, 'location', {
      value: { protocol: 'https:', port: '' },
      writable: true,
    });

    await component.switchOrganization();

    expect(window.location.href).toBe('https://validorg.test.com');
  });

  it('should return non-local message for organization creation when not in local setup', () => {
    // Mock window.location.hostname to simulate non-local setup
    const originalHostname = window.location.hostname;
    Object.defineProperty(window.location, 'hostname', {
      value: 'production.example.com',
      writable: true,
    });

    const message = component['getMessageForOrganizationCreation']('testOrg');
    expect(message).toBe(
      'A new organization has been created. Select it from the list to switch.',
    );

    // Restore original hostname
    Object.defineProperty(window.location, 'hostname', {
      value: originalHostname,
      writable: true,
    });
  });

  it('should return Negative state for invalid and touched form control', () => {
    const formControl = {
      invalid: true,
      touched: true,
    } as any;

    const result = component.getValueState(formControl);
    expect(result).toBe('Negative');
  });

  it('should return None state for valid form control', () => {
    const formControl = {
      invalid: false,
      touched: true,
    } as any;

    const result = component.getValueState(formControl);
    expect(result).toBe('None');
  });
});
