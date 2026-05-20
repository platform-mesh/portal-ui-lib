import { ListView } from './list-view.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import {
  ErrorHandlerService,
  ResourceService,
} from '@platform-mesh/portal-ui-lib/services';
import { of } from 'rxjs';
import { MockedObject } from 'vitest';
import { mock } from 'vitest-mock-extended';

describe('ListViewComponent', () => {
  let component: ListView;
  let fixture: ComponentFixture<ListView>;
  let mockResourceService: MockedObject<ResourceService>;
  let mockErrorHandlerService: MockedObject<ErrorHandlerService>;
  let mockLuigiCoreService: any;

  beforeEach(() => {
    mockResourceService = mock();
    mockResourceService.create.mockReturnValue(of({ data: { name: 'test' } }));
    mockLuigiCoreService = mock();
    mockErrorHandlerService = mock();

    TestBed.configureTestingModule({
      providers: [
        { provide: ResourceService, useValue: mockResourceService },
        { provide: LuigiCoreService, useValue: mockLuigiCoreService },
        { provide: ErrorHandlerService, useValue: mockErrorHandlerService },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).overrideComponent(ListView, {
      set: {
        template: '',
        imports: [],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
      },
    });

    fixture = TestBed.createComponent(ListView);
    component = fixture.componentInstance;

    component.context = (() => ({
      resourceDefinition: {
        entityCollection: 'clusters',
        entity: 'Cluster',
        apiGroup: 'core_k8s_io',
        version: 'v1alpha1',
        ui: {
          listView: { fields: [] },
          detailView: { fields: [] },
        },
      },
    })) as any;

    component.LuigiClient = (() => ({
      linkManager: () => ({
        fromContext: vi.fn().mockReturnThis(),
        navigate: vi.fn(),
        withParams: vi.fn().mockReturnThis(),
      }),
      uxManager: () => ({ showAlert: vi.fn() }),
      getNodeParams: vi.fn(),
    })) as any;

    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should create a resource', () => {
    const resource = { metadata: { name: 'test' } };
    component.create(resource as any);
    expect(mockResourceService.create).toHaveBeenCalled();
  });

  it('should close create modal after successful creation', () => {
    const closeSpy = vi.fn();
    (component as any).createModal = () => ({ close: closeSpy });
    component.create({ metadata: { name: 'test' } } as any);
    expect(closeSpy).toHaveBeenCalled();
  });

  it('should open create resource modal', () => {
    const openSpy = vi.fn();
    (component as any).createModal = () => ({ open: openSpy });
    component.openCreateResourceModal();
    expect(openSpy).toHaveBeenCalled();
  });

  it('should open create modal on dashboard create action', () => {
    const openSpy = vi.fn();
    (component as any).createModal = () => ({ open: openSpy });
    component.onDashboardAction({ action: { action: 'create' } } as any);
    expect(openSpy).toHaveBeenCalled();
  });

  it('should do nothing on dashboard action other than create', () => {
    const openSpy = vi.fn();
    (component as any).createModal = () => ({ open: openSpy });
    component.onDashboardAction({ action: { action: 'other' } } as any);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('should check create view fields existence', () => {
    const newFixture = TestBed.createComponent(ListView);
    const newComponent = newFixture.componentInstance;

    const mockContext = {
      resourceDefinition: {
        entity: 'Cluster',
        apiGroup: 'core_k8s_io',
        entityCollection: 'clusters',
        ui: {
          createView: { fields: [{ property: 'any' }] },
          listView: { fields: [] },
        },
      },
    } as any;

    newComponent.context = (() => mockContext) as any;
    newComponent.LuigiClient = (() => ({
      linkManager: () => ({ navigate: vi.fn() }),
      uxManager: () => ({ showAlert: vi.fn() }),
    })) as any;

    newFixture.detectChanges();

    expect(newComponent.hasUiCreateViewFields()).toBe(true);
  });

  it('should return false for hasUiCreateViewFields when createView is undefined', () => {
    expect(component.hasUiCreateViewFields()).toBe(false);
  });

  it('should return false for hasUiCreateViewFields when fields array is empty', () => {
    const newFixture = TestBed.createComponent(ListView);
    const newComponent = newFixture.componentInstance;
    newComponent.context = (() => ({
      resourceDefinition: {
        entityCollection: 'clusters',
        entity: 'Cluster',
        apiGroup: 'core_k8s_io',
        ui: { createView: { fields: [] }, listView: { fields: [] } },
      },
    })) as any;
    newComponent.LuigiClient = (() => ({
      linkManager: () => ({ navigate: vi.fn() }),
      uxManager: () => ({ showAlert: vi.fn() }),
    })) as any;
    newFixture.detectChanges();
    expect(newComponent.hasUiCreateViewFields()).toBe(false);
  });

  describe('Undefined checks', () => {
    it('should show alert and throw error when resourceDefinition is undefined in create method', () => {
      const newFixture = TestBed.createComponent(ListView);
      const newComponent = newFixture.componentInstance;

      newComponent.context = (() => ({ resourceDefinition: undefined })) as any;

      const showAlertSpy = vi.fn();
      newComponent.LuigiClient = (() => ({
        linkManager: () => ({ navigate: vi.fn() }),
        uxManager: () => ({ showAlert: showAlertSpy }),
      })) as any;

      expect(() =>
        newComponent.create({ metadata: { name: 'test' } } as any),
      ).toThrow('Resource definition is not defined');
      expect(showAlertSpy).toHaveBeenCalledWith({
        text: 'Resource definition is not defined',
        type: 'error',
      });
    });
  });

  describe('resourceTitleDefinition', () => {
    it('should use resourceTitle.label when defined', () => {
      const newFixture = TestBed.createComponent(ListView);
      const newComponent = newFixture.componentInstance;
      newComponent.context = (() => ({
        resourceDefinition: {
          entityCollection: 'clusters',
          entity: 'Cluster',
          apiGroup: 'core_k8s_io',
          ui: {
            listView: { resourceTitle: { label: 'My Clusters' }, fields: [] },
          },
        },
      })) as any;
      newComponent.LuigiClient = component.LuigiClient;
      newFixture.detectChanges();
      expect(newComponent.resourceTitleDefinition()).toBe('My Clusters');
    });

    it('should fall back to entityCollection when resourceTitle is not defined', () => {
      expect(component.resourceTitleDefinition()).toBe('clusters');
    });

    it('should return empty string when neither resourceTitle nor entityCollection is defined', () => {
      const newFixture = TestBed.createComponent(ListView);
      const newComponent = newFixture.componentInstance;
      newComponent.context = (() => ({
        resourceDefinition: {
          entity: 'Cluster',
          apiGroup: 'core_k8s_io',
          ui: { listView: { fields: [] } },
        },
      })) as any;
      newComponent.LuigiClient = component.LuigiClient;
      newFixture.detectChanges();
      expect(newComponent.resourceTitleDefinition()).toBe('');
    });
  });

  describe('resourceDescriptionDefinition', () => {
    it('should use resourceDescription.label when defined', () => {
      const newFixture = TestBed.createComponent(ListView);
      const newComponent = newFixture.componentInstance;
      newComponent.context = (() => ({
        resourceDefinition: {
          entityCollection: 'clusters',
          entity: 'Cluster',
          apiGroup: 'core_k8s_io',
          ui: {
            listView: {
              resourceDescription: { label: 'All your clusters' },
              fields: [],
            },
          },
        },
      })) as any;
      newComponent.LuigiClient = component.LuigiClient;
      newFixture.detectChanges();
      expect(newComponent.resourceDescriptionDefinition()).toBe(
        'All your clusters',
      );
    });

    it('should use default description when resourceDescription is not defined', () => {
      expect(component.resourceDescriptionDefinition()).toBe(
        'This page displays the created clusters in your environment',
      );
    });
  });

  describe('dashboardConfig', () => {
    it('should include create action when hasUiCreateViewFields is true', () => {
      const newFixture = TestBed.createComponent(ListView);
      const newComponent = newFixture.componentInstance;
      newComponent.context = (() => ({
        resourceDefinition: {
          entityCollection: 'clusters',
          entity: 'Cluster',
          apiGroup: 'core_k8s_io',
          ui: {
            createView: { fields: [{ property: 'metadata.name' }] },
            listView: { fields: [] },
          },
        },
      })) as any;
      newComponent.LuigiClient = component.LuigiClient;
      newFixture.detectChanges();
      const config = newComponent.dashboardConfig();
      expect(config.customActions.some((a) => a.action === 'create')).toBe(
        true,
      );
      expect(config.editable).toBe(false);
    });

    it('should have no custom actions when hasUiCreateViewFields is false', () => {
      const config = component.dashboardConfig();
      expect(config.customActions.length).toBe(0);
    });

    it('should use backgroundImageUrl from definition when provided', () => {
      const newFixture = TestBed.createComponent(ListView);
      const newComponent = newFixture.componentInstance;
      newComponent.context = (() => ({
        resourceDefinition: {
          entityCollection: 'clusters',
          entity: 'Cluster',
          apiGroup: 'core_k8s_io',
          ui: {
            listView: { backgroundImageUrl: '/assets/custom.png', fields: [] },
          },
        },
      })) as any;
      newComponent.LuigiClient = component.LuigiClient;
      newFixture.detectChanges();
      expect(newComponent.dashboardConfig().backgroundImageUrl).toBe(
        '/assets/custom.png',
      );
    });

    it('should use default backgroundImageUrl when not defined', () => {
      expect(component.dashboardConfig().backgroundImageUrl).toBe(
        '/assets/pm_background.png',
      );
    });
  });

  describe('cards', () => {
    it('should return a single resource-table-card config', () => {
      const cards = component.cards();
      expect(cards.length).toBe(1);
      expect(cards[0].id).toBe('pm-resource-table-card');
      expect(cards[0].component).toBe('pm-resource-table-card');
      expect(cards[0].w).toBe(12);
      expect(cards[0].h).toBe(50);
    });

    it('should pass LuigiClient and context as componentInputs', () => {
      const cards = component.cards();
      expect(cards[0].componentInputs?.['LuigiClient']).toBeDefined();
      expect(cards[0].componentInputs?.['context']).toBeDefined();
    });
  });
});
