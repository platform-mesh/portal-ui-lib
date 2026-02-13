import { OrganizationManagementComponent } from './organization-management.component';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LuigiClient } from '@luigi-project/client/luigi-element';
import { EnvConfigService, I18nService } from '@openmfp/portal-ui-lib';
import { ResourceService } from '@platform-mesh/portal-ui-lib/services';
import { of, throwError } from 'rxjs';
import { MockedObject } from 'vitest';
import { mock } from 'vitest-mock-extended';

describe('OrganizationManagementComponent', () => {
  let component: OrganizationManagementComponent;
  let fixture: ComponentFixture<OrganizationManagementComponent>;
  let resourceService: MockedObject<ResourceService>;
  let i18nService: MockedObject<I18nService>;
  let envConfigService: MockedObject<EnvConfigService>;
  let luigiClient: MockedObject<LuigiClient>;

  let mockShowAlert;
  let mockUxManager;

  beforeEach(async () => {
    mockShowAlert = vi.fn();
    mockUxManager = {
      showAlert: mockShowAlert,
    };

    resourceService = mock<ResourceService>();
    i18nService = mock<I18nService>();
    envConfigService = mock<EnvConfigService>();
    luigiClient = mock<LuigiClient>();

    luigiClient.uxManager.mockReturnValue(mockUxManager as any);
    i18nService.getTranslation.mockImplementation((key: string) => key);

    await TestBed.configureTestingModule({
      imports: [
        OrganizationManagementComponent,
        FormsModule,
        ReactiveFormsModule,
      ],
      providers: [
        { provide: ResourceService, useValue: resourceService },
        { provide: I18nService, useValue: i18nService },
        { provide: EnvConfigService, useValue: envConfigService },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
    }).overrideComponent(OrganizationManagementComponent, {
      set: {
        template: '',
        imports: [],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
      },
    });

    fixture = TestBed.createComponent(OrganizationManagementComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('LuigiClient', luigiClient);
    fixture.componentRef.setInput('context', {
      translationTable: { hello: 'world' },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with empty organizations', () => {
      expect(component.organizations()).toEqual([]);
    });

    it('should initialize with null organizationToSwitch', () => {
      expect(component.organizationToSwitch()).toBeNull();
    });

    it('should read translations on init', () => {
      resourceService.list.mockReturnValue(
        of({ items: [], resourceVersion: '1' } as any),
      );
      resourceService.resourceChangeSubscription.mockReturnValue(of(undefined));

      fixture.detectChanges();

      expect(i18nService.getTranslation).toHaveBeenCalled();
    });
  });

  describe('readOrganizations', () => {
    it('should read organizations successfully', () => {
      const mockOrganizations = {
        items: [
          {
            metadata: { name: 'org1' },
            ready: true,
            status: { conditions: [{ type: 'Ready', status: 'True' }] },
          },
          {
            metadata: { name: 'org2' },
            ready: false,
            status: { conditions: [{ type: 'Ready', status: 'False' }] },
          },
        ],
        resourceVersion: '123',
      };

      resourceService.list.mockReturnValue(of(mockOrganizations as any));
      resourceService.resourceChangeSubscription.mockReturnValue(of(undefined));

      component.readOrganizations();

      expect(resourceService.list).toHaveBeenCalled();
      expect(component.organizations()).toEqual([
        { name: 'org1', ready: true },
        { name: 'org2', ready: false },
      ]);
    });

    it('should call list with correct parameters', () => {
      resourceService.list.mockReturnValue(
        of({ items: [], resourceVersion: '1' } as any),
      );
      resourceService.resourceChangeSubscription.mockReturnValue(of(undefined));

      component.readOrganizations();

      expect(resourceService.list).toHaveBeenCalledWith(
        'core_platform_mesh_io_v1alpha1_accounts',
        expect.any(Array),
        expect.objectContaining({
          resourceDefinition: expect.objectContaining({
            group: 'core.platform-mesh.io',
            version: 'v1alpha1',
            plural: 'accounts',
          }),
        }),
      );
    });

    it('should set first organization as organizationToSwitch when null', () => {
      const mockOrganizations = {
        items: [{ metadata: { name: 'org1' }, ready: true }],
        resourceVersion: '123',
      };

      resourceService.list.mockReturnValue(of(mockOrganizations as any));
      resourceService.resourceChangeSubscription.mockReturnValue(of(undefined));
      component.organizationToSwitch.set(null);

      component.readOrganizations();

      expect(component.organizationToSwitch()).toEqual({
        name: 'org1',
        ready: true,
      });
    });

    it('should update existing organizationToSwitch', () => {
      const mockOrganizations = {
        items: [
          { metadata: { name: 'org1' }, ready: false },
          { metadata: { name: 'org2' }, ready: true },
        ],
        resourceVersion: '123',
      };

      resourceService.list.mockReturnValue(of(mockOrganizations as any));
      resourceService.resourceChangeSubscription.mockReturnValue(of(undefined));
      component.organizationToSwitch.set({ name: 'org2', ready: false });

      component.readOrganizations();

      expect(component.organizationToSwitch()).toEqual({
        name: 'org2',
        ready: true,
      });
    });

    it('should handle error when reading organizations', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const error = new Error('Read failed');

      resourceService.list.mockReturnValue(throwError(() => error));

      component.readOrganizations();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Organization list retrieval failed',
        error,
      );

      consoleSpy.mockRestore();
    });

    it('should setup subscription for organization updates', () => {
      const mockOrganizations = {
        items: [{ metadata: { name: 'org1' }, ready: true }],
        resourceVersion: '123',
      };

      resourceService.list.mockReturnValue(of(mockOrganizations as any));
      resourceService.resourceChangeSubscription.mockReturnValue(of(undefined));

      component.readOrganizations();

      expect(resourceService.resourceChangeSubscription).toHaveBeenCalledWith(
        'core_platform_mesh_io_v1alpha1_accounts',
        expect.any(Array),
        expect.any(Object),
        '123',
        false,
      );
    });
  });

  describe('mergeResourcesWithSubscriptionResult', () => {
    beforeEach(() => {
      component.organizations.set([
        { name: 'org1', ready: true },
        { name: 'org2', ready: false },
      ]);
    });

    it('should add new organization on ADDED event', () => {
      const subscriptionResult = {
        type: 'ADDED' as const,
        object: { metadata: { name: 'org3' }, ready: true },
      };

      component['mergeResourcesWithSubscriptionResult'](
        subscriptionResult as any,
      );

      expect(component.organizations()).toContainEqual({
        name: 'org3',
        ready: true,
      });
    });

    it('should update existing organization on MODIFIED event', () => {
      const subscriptionResult = {
        type: 'MODIFIED' as const,
        object: { metadata: { name: 'org2' }, ready: true },
      };

      component['mergeResourcesWithSubscriptionResult'](
        subscriptionResult as any,
      );

      expect(component.organizations()).toContainEqual({
        name: 'org2',
        ready: true,
      });
    });

    it('should not add non-existing organization on MODIFIED event', () => {
      const subscriptionResult = {
        type: 'MODIFIED' as const,
        object: { metadata: { name: 'org-new' }, ready: true },
      };

      component['mergeResourcesWithSubscriptionResult'](
        subscriptionResult as any,
      );

      expect(
        component.organizations().find((o) => o.name === 'org-new'),
      ).toBeUndefined();
    });

    it('should remove organization on DELETED event', () => {
      const subscriptionResult = {
        type: 'DELETED' as const,
        object: { metadata: { name: 'org1' }, ready: true },
      };

      component['mergeResourcesWithSubscriptionResult'](
        subscriptionResult as any,
      );

      expect(
        component.organizations().find((o) => o.name === 'org1'),
      ).toBeUndefined();
    });

    it('should refresh organizationToSwitch after merge', () => {
      const spy = vi.spyOn(component as any, 'refreshOrganizationToSwitch');
      resourceService.list.mockReturnValue(
        of({
          items: [{ metadata: { name: 'org1' }, ready: true }],
          resourceVersion: '1',
        } as any),
      );
      resourceService.resourceChangeSubscription.mockReturnValue(
        of({
          type: 'ADDED',
          object: { metadata: { name: 'org2' }, ready: true },
        } as any),
      );

      component.readOrganizations();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('setOrganizationToSwitch', () => {
    beforeEach(() => {
      component.organizations.set([
        { name: 'org1', ready: true },
        { name: 'org2', ready: false },
      ]);
    });

    it('should set organization from event', () => {
      const event = { detail: { selectedOption: { _state: { value: 'org2' } } } };

      component.setOrganizationToSwitch(event);

      expect(component.organizationToSwitch()).toEqual({
        name: 'org2',
        ready: false,
      });
    });

    it('should set null when organization not found', () => {
      const event = {
        detail: { selectedOption: { _state: { value: 'org-nonexistent' } } },
      };

      component.setOrganizationToSwitch(event);

      expect(component.organizationToSwitch()).toBeNull();
    });

    it('should handle undefined value', () => {
      const event = { detail: { selectedOption: { _state: { value: undefined } } } };

      component.setOrganizationToSwitch(event);

      expect(component.organizationToSwitch()).toBeNull();
    });

    it('should handle null value', () => {
      const event = { detail: { selectedOption: { _state: { value: null } } } };

      component.setOrganizationToSwitch(event);

      expect(component.organizationToSwitch()).toBeNull();
    });
  });

  describe('onboardOrganization', () => {
    beforeEach(() => {
      component.newOrganizationControl.setValue('neworg');
    });

    it('should create organization successfully', () => {
      const mockResponse = {
        data: undefined,
        error: undefined,
      };

      resourceService.create.mockReturnValue(of(mockResponse));

      component.onboardOrganization();

      expect(resourceService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { name: 'neworg' },
          spec: { type: 'org' },
        }),
        expect.objectContaining({
          group: 'core.platform-mesh.io',
          kind: 'Account',
        }),
        expect.any(Object),
      );
    });

    it('should set organizationToSwitch after creation', () => {
      resourceService.create.mockReturnValue(of({} as any));

      component.onboardOrganization();

      expect(component.organizationToSwitch()).toEqual({
        name: 'neworg',
        ready: false,
      });
    });

    it('should reset form control after creation', () => {
      resourceService.create.mockReturnValue(of({} as any));

      component.onboardOrganization();

      expect(component.newOrganizationControl.value).toBe('');
    });

    it('should show success message in local setup', () => {
      // (isLocalSetup as any).mockReturnValue(true);
      resourceService.create.mockReturnValue(of({} as any));

      component.onboardOrganization();

      expect(mockShowAlert).toHaveBeenCalledWith({
        text: expect.stringContaining('password'),
        type: 'info',
      });
    });

    it('should not show success message in non-local setup', () => {
      resourceService.create.mockReturnValue(of({} as any));

      component.onboardOrganization();

      expect(mockShowAlert).toHaveBeenCalledWith({
        text: `A new organization is creating. Once ready you can login using your e-mail. The default password is set to 'password'.`,
        type: 'info',
      });
    });

    it('should handle creation error', () => {
      resourceService.create.mockReturnValue(
        throwError(() => new Error('Create failed')),
      );

      component.onboardOrganization();

      expect(mockShowAlert).toHaveBeenCalledWith({
        text: 'Failure! Could not create organization: neworg.',
        type: 'error',
      });
    });

    it('should log resource created on success', () => {
      const consoleSpy = vi
        .spyOn(console, 'debug')
        .mockImplementation(() => {});
      resourceService.create.mockReturnValue(of({} as any));

      component.onboardOrganization();

      expect(consoleSpy).toHaveBeenCalledWith('Resource created', {});

      consoleSpy.mockRestore();
    });
  });

  describe('switchOrganization', () => {
    beforeEach(() => {
      envConfigService.getEnvConfig.mockResolvedValue({
        baseDomain: 'test.com',
      } as any);
      Object.defineProperty(window, 'location', {
        value: { protocol: 'https:', port: '8080', href: '' },
        writable: true,
      });
    });

    it('should switch organization successfully', async () => {
      component.organizationToSwitch.set({ name: 'neworg', ready: true });

      await component.switchOrganization();

      expect(window.location.href).toBe('https://neworg.test.com:8080');
    });

    it('should switch organization without port', async () => {
      component.organizationToSwitch.set({ name: 'myorg', ready: true });
      Object.defineProperty(window, 'location', {
        value: { protocol: 'https:', port: '', href: '' },
        writable: true,
      });

      await component.switchOrganization();

      expect(window.location.href).toBe('https://myorg.test.com');
    });

    it('should handle http protocol', async () => {
      component.organizationToSwitch.set({ name: 'testorg', ready: true });
      Object.defineProperty(window, 'location', {
        value: { protocol: 'http:', port: '3000', href: '' },
        writable: true,
      });

      await component.switchOrganization();

      expect(window.location.href).toBe('http://testorg.test.com:3000');
    });

    it('should show error for invalid organization name', async () => {
      component.organizationToSwitch.set({
        name: 'invalid-name-',
        ready: true,
      });

      await component.switchOrganization();

      expect(mockShowAlert).toHaveBeenCalledWith({
        text: expect.stringContaining('RFC 1034/1123'),
        type: 'error',
      });
      expect(window.location.href).toBe('');
    });

    it('should show error for undefined organizationToSwitch', async () => {
      component.organizationToSwitch.set(undefined as any);

      await component.switchOrganization();

      expect(mockShowAlert).toHaveBeenCalledWith({
        text: expect.stringContaining('RFC 1034/1123'),
        type: 'error',
      });
    });

    it('should show error for null organizationToSwitch', async () => {
      component.organizationToSwitch.set(null);

      await component.switchOrganization();

      expect(mockShowAlert).toHaveBeenCalledWith({
        text: expect.stringContaining('RFC 1034/1123'),
        type: 'error',
      });
    });

    it('should show error for organization with undefined name', async () => {
      component.organizationToSwitch.set({
        name: undefined as any,
        ready: true,
      });

      await component.switchOrganization();

      expect(mockShowAlert).toHaveBeenCalledWith({
        text: expect.stringContaining('RFC 1034/1123'),
        type: 'error',
      });
    });

    it('should show error for organization name with periods', async () => {
      component.organizationToSwitch.set({ name: 'invalid.org', ready: true });

      await component.switchOrganization();

      expect(mockShowAlert).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error' }),
      );
    });

    it('should show error for organization name starting with hyphen', async () => {
      component.organizationToSwitch.set({ name: '-invalid', ready: true });

      await component.switchOrganization();

      expect(mockShowAlert).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error' }),
      );
    });
  });

  describe('sanitizeSubdomainInput', () => {
    it('should return valid subdomain', () => {
      expect(component['sanitizeSubdomainInput']('valid-org')).toBe(
        'valid-org',
      );
    });

    it('should return valid single character', () => {
      expect(component['sanitizeSubdomainInput']('a')).toBe('a');
    });

    it('should return valid alphanumeric with hyphens', () => {
      expect(component['sanitizeSubdomainInput']('org-123-test')).toBe(
        'org-123-test',
      );
    });

    it('should return null for undefined input', () => {
      expect(component['sanitizeSubdomainInput'](undefined)).toBeNull();
    });

    it('should return null for null input', () => {
      expect(component['sanitizeSubdomainInput'](null as any)).toBeNull();
    });

    it('should return null for non-string input', () => {
      expect(component['sanitizeSubdomainInput'](123 as any)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(component['sanitizeSubdomainInput']('')).toBeNull();
    });

    it('should return null for whitespace only', () => {
      expect(component['sanitizeSubdomainInput']('   ')).toBeNull();
    });

    it('should return null for string starting with hyphen', () => {
      expect(component['sanitizeSubdomainInput']('-invalid')).toBeNull();
    });

    it('should return null for string ending with hyphen', () => {
      expect(component['sanitizeSubdomainInput']('invalid-')).toBeNull();
    });

    it('should return null for string with periods', () => {
      expect(component['sanitizeSubdomainInput']('invalid.org')).toBeNull();
    });

    it('should return null for string with special characters', () => {
      expect(component['sanitizeSubdomainInput']('invalid@org')).toBeNull();
    });

    it('should return null for string with underscores', () => {
      expect(component['sanitizeSubdomainInput']('invalid_org')).toBeNull();
    });

    it('should return null for string with spaces', () => {
      expect(component['sanitizeSubdomainInput']('invalid org')).toBeNull();
    });

    it('should trim whitespace and validate', () => {
      expect(component['sanitizeSubdomainInput']('  valid-org  ')).toBe(
        'valid-org',
      );
    });

    it('should handle uppercase letters', () => {
      expect(component['sanitizeSubdomainInput']('ValidOrg')).toBe('ValidOrg');
    });

    it('should handle mixed case with numbers', () => {
      expect(component['sanitizeSubdomainInput']('Org123Test')).toBe(
        'Org123Test',
      );
    });
  });

  describe('getValueState', () => {
    it('should return Negative for invalid and touched control', () => {
      component.newOrganizationControl.setValue('');
      component.newOrganizationControl.markAsTouched();

      const state = component.getValueState(component.newOrganizationControl);

      expect(state).toBe('Negative');
    });

    it('should return None for valid control', () => {
      component.newOrganizationControl.setValue('valid-name');
      component.newOrganizationControl.markAsTouched();

      const state = component.getValueState(component.newOrganizationControl);

      expect(state).toBe('None');
    });

    it('should return None for untouched invalid control', () => {
      component.newOrganizationControl.setValue('');
      component.newOrganizationControl.markAsUntouched();

      const state = component.getValueState(component.newOrganizationControl);

      expect(state).toBe('None');
    });

    it('should return None for valid and untouched control', () => {
      component.newOrganizationControl.setValue('valid-name');
      component.newOrganizationControl.markAsUntouched();

      const state = component.getValueState(component.newOrganizationControl);

      expect(state).toBe('None');
    });
  });

  describe('Form Validation', () => {
    it('should validate required field', () => {
      component.newOrganizationControl.setValue('');

      expect(component.newOrganizationControl.valid).toBe(false);
      expect(component.newOrganizationControl.hasError('required')).toBe(true);
    });

    it('should validate k8s name format', () => {
      component.newOrganizationControl.setValue('valid-name-123');

      expect(component.newOrganizationControl.valid).toBe(true);
    });

    it('should invalidate names with special characters', () => {
      component.newOrganizationControl.setValue('invalid@name');

      expect(component.newOrganizationControl.valid).toBe(false);
    });

    it('should invalidate names starting with hyphen', () => {
      component.newOrganizationControl.setValue('-invalid');

      expect(component.newOrganizationControl.valid).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty organizations list', () => {
      resourceService.list.mockReturnValue(
        of({ items: [], resourceVersion: '1' } as any),
      );
      resourceService.resourceChangeSubscription.mockReturnValue(of(undefined));

      component.readOrganizations();

      expect(component.organizations()).toEqual([]);
    });

    it('should handle subscription with no data', () => {
      resourceService.list.mockReturnValue(
        of({
          items: [{ metadata: { name: 'org1' }, ready: true }],
          resourceVersion: '1',
        } as any),
      );
      resourceService.resourceChangeSubscription.mockReturnValue(of(undefined));

      component.readOrganizations();

      expect(component.organizations()).toHaveLength(1);
    });

    it('should handle very long organization names', () => {
      const longName = 'a'.repeat(63);
      expect(component['sanitizeSubdomainInput'](longName)).toBe(longName);
    });

    it('should reject organization names over 63 characters', () => {
      const tooLongName = 'a'.repeat(64);
      expect(component['sanitizeSubdomainInput'](tooLongName)).toBeNull();
    });
  });
});
