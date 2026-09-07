import { SearchListDynamicPage } from './search-list-dynamic-page.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResourceService } from '@platform-mesh/portal-ui-lib/services';
import { of } from 'rxjs';
import { mock } from 'vitest-mock-extended';
import { MockedObject } from 'vitest';

describe('SearchListDynamicPage', () => {
  let component: SearchListDynamicPage;
  let fixture: ComponentFixture<SearchListDynamicPage>;
  let mockResourceService: MockedObject<ResourceService>;

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

  beforeEach(() => {
    mockResourceService = mock<ResourceService>();

    TestBed.configureTestingModule({
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [{ provide: ResourceService, useValue: mockResourceService }],
    }).overrideComponent(SearchListDynamicPage, {
      set: {
        template: '',
        imports: [],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
      },
    });

    fixture = TestBed.createComponent(SearchListDynamicPage);
    component = fixture.componentInstance;

    component.context = buildContext();
    component.LuigiClient = (() => buildLuigiClient()) as any;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('resourceTitleDefinition', () => {
    it('falls back to entityCollection when resourceTitle.label is missing', () => {
      expect(component.resourceTitleDefinition()).toBe('clusters');
    });

    it('uses resourceDefinition.ui.listView.resourceTitle.label when set', () => {
      const f = TestBed.createComponent(SearchListDynamicPage);
      f.componentInstance.context = buildContext({
        resourceDefinition: {
          ui: { listView: { resourceTitle: { label: 'Custom title' } } },
        },
      });
      f.componentInstance.LuigiClient = component.LuigiClient;
      f.detectChanges();
      expect(f.componentInstance.resourceTitleDefinition()).toBe('Custom title');
    });
  });

  describe('resourceDescriptionDefinition', () => {
    it('returns custom label when resourceDescription.label is set', () => {
      const f = TestBed.createComponent(SearchListDynamicPage);
      f.componentInstance.context = buildContext({
        resourceDefinition: {
          ui: {
            listView: { resourceDescription: { label: 'My description' } },
          },
        },
      });
      f.componentInstance.LuigiClient = component.LuigiClient;
      f.detectChanges();
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
      component.context = buildContext({
        resourceDefinition: {
          ui: { listView: { actions: [action] } },
        },
      });
      expect(component.actions()).toEqual([action]);
    });
  });

  describe('hasUiCreateViewFields', () => {
    it('returns false when createView fields are absent', () => {
      expect(component.hasUiCreateViewFields()).toBe(false);
    });

    it('returns true when createView fields are present', () => {
      component.context = buildContext({
        resourceDefinition: {
          ui: { createView: { fields: [{ property: 'metadata.name' }] } },
        },
      });
      expect(component.hasUiCreateViewFields()).toBe(true);
    });
  });

  describe('createFields', () => {
    it('returns empty array when createView fields are absent', () => {
      expect(component.createFields()).toEqual([]);
    });

    it('returns the createView fields when present', () => {
      const fields = [{ property: 'metadata.name', label: 'Name' }];
      component.context = buildContext({
        resourceDefinition: {
          ui: { createView: { fields } },
        },
      });
      expect(component.createFields()).toEqual(fields);
    });
  });

  describe('canDo', () => {
    it('returns true when action is undefined', () => {
      expect(component.canDo(undefined)).toBe(true);
    });

    it('returns true when portalPermissions allows the action', () => {
      component.context = buildContext({
        portalPermissions: { clusters: ['create'] },
        resourceDefinition: {
          permissionsDefinition: { resource: 'clusters' },
        },
      });
      expect(component.canDo('create')).toBe(true);
    });

    it('returns false when portalPermissions denies the action', () => {
      component.context = buildContext({
        portalPermissions: { clusters: ['get'] },
        resourceDefinition: {
          permissionsDefinition: { resource: 'clusters' },
        },
      });
      expect(component.canDo('create')).toBe(false);
    });

    it('returns true when portalPermissions is undefined (no restrictions)', () => {
      component.context = buildContext({
        portalPermissions: undefined,
        resourceDefinition: { permissionsDefinition: { resource: 'clusters' } },
      });
      expect(component.canDo('create')).toBe(true);
    });
  });

  describe('canCreate', () => {
    it('returns true when portalPermissions allows create', () => {
      component.context = buildContext({
        portalPermissions: { clusters: ['create'] },
        resourceDefinition: {
          permissionsDefinition: { resource: 'clusters' },
        },
      });
      expect(component.canCreate()).toBe(true);
    });

    it('returns false when portalPermissions denies create', () => {
      component.context = buildContext({
        portalPermissions: { clusters: ['get'] },
        resourceDefinition: {
          permissionsDefinition: { resource: 'clusters' },
        },
      });
      expect(component.canCreate()).toBe(false);
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
      component.context = (() => ({ resourceDefinition: undefined })) as any;
      const resource = { id: 'r1', metadata: { name: 'r1' } } as any;

      component.onCreateSubmit(resource);

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
