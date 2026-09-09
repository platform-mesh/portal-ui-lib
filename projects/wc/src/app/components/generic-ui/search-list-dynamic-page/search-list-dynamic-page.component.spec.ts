import { SearchListDynamicPage } from './search-list-dynamic-page.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErrorHandlerService, ResourceService } from '@platform-mesh/portal-ui-lib/services';
import { of } from 'rxjs';
import { mock } from 'vitest-mock-extended';
import { MockedObject } from 'vitest';
import { ReadResourcesProxyService } from '../opensearch-list-view/services/read-resources-proxy.service';
import { InstancePermissionsStore } from '../store/instance-permissions-store.service';

describe('SearchListDynamicPage', () => {
  let component: SearchListDynamicPage;
  let fixture: ComponentFixture<SearchListDynamicPage>;
  let mockResourceService: MockedObject<ResourceService>;
  let mockReadResourcesProxy: MockedObject<ReadResourcesProxyService>;
  let mockErrorHandlerService: MockedObject<ErrorHandlerService>;
  let mockInstancePermissionsStore: MockedObject<InstancePermissionsStore>;

  const buildContext = (overrides: Partial<any> = {}) =>
    (() => ({
      resourceDefinition: {
        entityCollection: 'clusters',
        entity: 'Cluster',
        apiGroup: 'core_k8s_io',
        version: 'v1alpha1',
        ui: {
          listView: { fields: [] },
        },
        ...(overrides.resourceDefinition ?? {}),
      },
      ...overrides,
    })) as any;

  const buildLuigiClient = () => ({}) as any;

  const createComponent = (contextOverrides: Partial<any> = {}): ComponentFixture<SearchListDynamicPage> => {
    const f = TestBed.createComponent(SearchListDynamicPage);
    f.componentInstance.context = buildContext(contextOverrides);
    f.componentInstance.LuigiClient = (() => buildLuigiClient()) as any;
    f.detectChanges();
    return f;
  };

  beforeEach(() => {
    mockResourceService = mock<ResourceService>();
    mockReadResourcesProxy = mock<ReadResourcesProxyService>();
    mockErrorHandlerService = mock<ErrorHandlerService>();
    mockInstancePermissionsStore = mock<InstancePermissionsStore>();
    mockInstancePermissionsStore.permissions.mockReturnValue({});
    mockReadResourcesProxy.forContext.mockReturnValue({
      list: () => of({ items: [], totalCount: 0 } as any),
      subscribe: () => of(undefined),
    });

    TestBed.configureTestingModule({
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: ResourceService, useValue: mockResourceService },
        { provide: ReadResourcesProxyService, useValue: mockReadResourcesProxy },
        { provide: ErrorHandlerService, useValue: mockErrorHandlerService },
        { provide: InstancePermissionsStore, useValue: mockInstancePermissionsStore },
      ],
    }).overrideComponent(SearchListDynamicPage, {
      set: {
        template: '',
        imports: [],
        providers: [],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
      },
    });

    fixture = createComponent();
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('resourceTitleDefinition', () => {
    it('falls back to entityCollection when resourceTitle.label is missing', () => {
      expect(component.resourceTitleDefinition()).toBe('clusters');
    });

    it('uses resourceDefinition.ui.listView.resourceTitle.label when set', () => {
      const f = createComponent({
        resourceDefinition: {
          ui: { listView: { resourceTitle: { label: 'Custom title' } } },
        },
      });
      expect(f.componentInstance.resourceTitleDefinition()).toBe('Custom title');
    });
  });

  describe('resourceDescriptionDefinition', () => {
    it('returns custom label when resourceDescription.label is set', () => {
      const f = createComponent({
        resourceDefinition: {
          ui: {
            listView: { resourceDescription: { label: 'My description' } },
          },
        },
      });
      expect(f.componentInstance.resourceDescriptionDefinition()).toBe(
        'My description',
      );
    });

    it('returns fallback sentence when resourceDescription.label is missing', () => {
      expect(component.resourceDescriptionDefinition()).toBe(
        'This page displays the created clusters in your environment',
      );
    });
  });

  describe('actions', () => {
    it('returns empty array when no actions are defined', () => {
      expect(component.actions()).toEqual([]);
    });

    it('returns actions from listView when defined', () => {
      const action = { property: 'spec.url', label: 'Open', uiSettings: { buttonSettings: { action: 'navigate' } } };
      const f = createComponent({
        resourceDefinition: {
          ui: { listView: { actions: [action] } },
        },
      });
      expect(f.componentInstance.actions()).toEqual([action]);
    });
  });

  describe('hasUiCreateViewFields', () => {
    it('returns false when createView fields are absent', () => {
      expect(component.hasUiCreateViewFields()).toBe(false);
    });

    it('returns true when createView fields are present', () => {
      const f = createComponent({
        resourceDefinition: {
          ui: { createView: { fields: [{ property: 'metadata.name' }] } },
        },
      });
      expect(f.componentInstance.hasUiCreateViewFields()).toBe(true);
    });
  });

  describe('createFields', () => {
    it('returns empty array when createView fields are absent', () => {
      expect(component.createFields()).toEqual([]);
    });

    it('returns the createView fields when present', () => {
      const fields = [{ property: 'metadata.name', label: 'Name' }];
      const f = createComponent({
        resourceDefinition: {
          ui: { createView: { fields } },
        },
      });
      expect(f.componentInstance.createFields()).toEqual(fields);
    });
  });

  describe('canDo', () => {
    it('returns true when action is undefined', () => {
      expect(component.canDo(undefined)).toBe(true);
    });

    it('returns true when portalPermissions allows the action', () => {
      const f = createComponent({
        portalPermissions: { clusters: ['create'] },
        resourceDefinition: {
          permissionsDefinition: { resource: 'clusters' },
        },
      });
      expect(f.componentInstance.canDo('create')).toBe(true);
    });

    it('returns false when portalPermissions denies the action', () => {
      const f = createComponent({
        portalPermissions: { clusters: ['get'] },
        resourceDefinition: {
          permissionsDefinition: { resource: 'clusters' },
        },
      });
      expect(f.componentInstance.canDo('create')).toBe(false);
    });

    it('returns true when portalPermissions is undefined (no restrictions)', () => {
      const f = createComponent({
        portalPermissions: undefined,
        resourceDefinition: { permissionsDefinition: { resource: 'clusters' } },
      });
      expect(f.componentInstance.canDo('create')).toBe(true);
    });
  });

  describe('canCreate', () => {
    it('returns true when portalPermissions allows create', () => {
      const f = createComponent({
        portalPermissions: { clusters: ['create'] },
        resourceDefinition: {
          permissionsDefinition: { resource: 'clusters' },
        },
      });
      expect(f.componentInstance.canCreate()).toBe(true);
    });

    it('returns false when portalPermissions denies create', () => {
      const f = createComponent({
        portalPermissions: { clusters: ['get'] },
        resourceDefinition: {
          permissionsDefinition: { resource: 'clusters' },
        },
      });
      expect(f.componentInstance.canCreate()).toBe(false);
    });
  });

  describe('openCreateModal', () => {
    it('does not throw when createModal viewChild is absent', () => {
      expect(() => component.openCreateModal()).not.toThrow();
    });
  });

  describe('onCreateSubmit', () => {
    it('calls resourceService.create and closes modal on success', () => {
      const resource = { id: 'r1', metadata: { name: 'r1' } } as any;
      const created = { id: 'r1', metadata: { name: 'r1' } };
      mockResourceService.create.mockReturnValue(of(created as any));

      const closeSpy = vi.fn();
      vi.spyOn(component as any, 'createModal', 'get').mockReturnValue(
        () => ({ close: closeSpy }),
      );

      component.onCreateSubmit(resource);

      expect(mockResourceService.create).toHaveBeenCalledWith(
        resource,
        component.resourceDefinition(),
        component.context(),
      );
      expect(closeSpy).toHaveBeenCalled();
    });

    it('does nothing when resourceDefinition is undefined', () => {
      const f = createComponent({ resourceDefinition: undefined });
      const resource = { id: 'r1', metadata: { name: 'r1' } } as any;

      f.componentInstance.onCreateSubmit(resource);

      expect(mockResourceService.create).not.toHaveBeenCalled();
    });
  });

  describe('genericActionHandler', () => {
    it('calls linkManager navigate when action is navigate', () => {
      const navigateSpy = vi.fn();
      component.LuigiClient = (() => ({
        linkManager: () => ({ navigate: navigateSpy }),
      })) as any;

      const field = {
        value: '/clusters/cluster-1',
        uiSettings: { buttonSettings: { action: 'navigate' } },
      } as any;
      const resource = { id: 'r1', metadata: { name: 'r1' } } as any;

      component.genericActionHandler({ field, resource } as any);

      expect(navigateSpy).toHaveBeenCalledWith('/clusters/cluster-1');
    });

    it('does not throw for a valid action event', () => {
      const navigateSpy = vi.fn();
      component.LuigiClient = (() => ({
        linkManager: () => ({ navigate: navigateSpy }),
      })) as any;

      const field = {
        value: '/some/path',
        uiSettings: { buttonSettings: { action: 'navigate' } },
      } as any;

      expect(() =>
        component.genericActionHandler({ field, resource: undefined } as any),
      ).not.toThrow();
    });
  });
});
