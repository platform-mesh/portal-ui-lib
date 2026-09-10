import { SearchListDynamicPage } from './search-list-dynamic-page.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ErrorHandlerService,
  ReadResources,
  ReadResourcesResult,
  ResourceService,
} from '@platform-mesh/portal-ui-lib/services';
import { Subject, of, throwError } from 'rxjs';
import { mock } from 'vitest-mock-extended';
import { MockedObject } from 'vitest';
import { ReadResourcesProxyService } from '../opensearch-list-view/services/read-resources-proxy.service';
import { InstancePermissionsStore } from '../store/instance-permissions-store.service';

describe('SearchListDynamicPage', () => {
  let component: SearchListDynamicPage;
  let fixture: ComponentFixture<SearchListDynamicPage>;
  let mockResourceService: MockedObject<ResourceService>;
  let mockReadResourcesProxy: { forContext: ReturnType<typeof vi.fn> };
  let mockReadResources: MockedObject<ReadResources>;
  let mockErrorHandlerService: MockedObject<ErrorHandlerService>;
  let mockInstancePermissionsStore: MockedObject<InstancePermissionsStore>;
  let listSubject: Subject<ReadResourcesResult>;

  const buildContext = (overrides: Partial<any> = {}) =>
    (() => ({
      resourceDefinition: {
        entityCollection: 'clusters',
        entity: 'Cluster',
        apiGroup: 'core_k8s_io',
        version: 'v1alpha1',
        ui: {
          listView: { fields: [] },
          detailView: { fields: [] },
        },
        ...(overrides.resourceDefinition ?? {}),
      },
      ...overrides,
    })) as any;

  const buildLuigiClient = () => {
    const navigate = vi.fn();
    return {
      _navigate: navigate,
      linkManager: () => ({ navigate }),
      uxManager: () => ({ showAlert: vi.fn() }),
      getActiveFeatureToggles: () => [],
    };
  };

  const createComponent = (
    contextOverrides: Partial<any> = {},
    luigiClient?: any,
  ): ComponentFixture<SearchListDynamicPage> => {
    const f = TestBed.createComponent(SearchListDynamicPage);
    f.componentInstance.context = buildContext(contextOverrides);
    f.componentInstance.LuigiClient = (() =>
      luigiClient ?? buildLuigiClient()) as any;
    f.detectChanges();
    return f;
  };

  beforeEach(() => {
    mockResourceService = mock<ResourceService>();
    mockErrorHandlerService = mock<ErrorHandlerService>();
    mockInstancePermissionsStore = mock<InstancePermissionsStore>();
    mockInstancePermissionsStore.permissions.mockReturnValue({});

    listSubject = new Subject<ReadResourcesResult>();
    mockReadResources = mock<ReadResources>();
    mockReadResources.list.mockReturnValue(listSubject.asObservable());

    mockReadResourcesProxy = {
      forContext: vi.fn().mockReturnValue(mockReadResources),
    };

    TestBed.configureTestingModule({
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: ResourceService, useValue: mockResourceService },
        { provide: ReadResourcesProxyService, useValue: mockReadResourcesProxy },
        { provide: ErrorHandlerService, useValue: mockErrorHandlerService },
        {
          provide: InstancePermissionsStore,
          useValue: mockInstancePermissionsStore,
        },
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

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create and call list on init', () => {
    expect(component).toBeTruthy();
    expect(mockReadResourcesProxy.forContext).toHaveBeenCalled();
    expect(mockReadResources.list).toHaveBeenCalledWith(
      expect.objectContaining({ resourceDefinition: expect.any(Object) }),
      expect.objectContaining({ limit: 20, page: 1 }),
      expect.objectContaining({ resource: 'clusters' }),
    );
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
      const action = {
        property: 'spec.url',
        label: 'Open',
        uiSettings: { buttonSettings: { action: 'navigate' } },
      };
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

  describe('columns', () => {
    it('returns ui.listView.fields when no readyCondition', () => {
      const f = createComponent({
        resourceDefinition: {
          ui: { listView: { fields: [{ property: 'metadata.name' }] } },
        },
      });
      expect(f.componentInstance.columns()).toEqual([
        { property: 'metadata.name' },
      ]);
    });

    it('prepends readyCondition as alert column when defined', () => {
      const f = createComponent({
        resourceDefinition: {
          ui: { listView: { fields: [{ property: 'metadata.name' }] } },
          readyCondition: { property: 'status.ready' },
        },
      });
      const cols = f.componentInstance.columns();
      expect(cols[0]).toEqual(
        expect.objectContaining({
          property: 'status.ready',
          uiSettings: expect.objectContaining({
            displayAs: 'alert',
            columnWidth: '30px',
          }),
        }),
      );
      expect(cols[1]).toEqual({ property: 'metadata.name' });
    });

    it('defaults to empty array when listView.fields is absent', () => {
      const f = createComponent({
        resourceDefinition: { ui: {} },
      });
      expect(f.componentInstance.columns()).toEqual([]);
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

    it('returns true when portalPermissions is undefined', () => {
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

  describe('list', () => {
    it('sets resources from result.items', () => {
      listSubject.next({
        items: [
          { id: 'r1', metadata: { name: 'r1' } },
          { id: 'r2', metadata: { name: 'r2' } },
        ] as any,
      });
      listSubject.complete();
      expect(component.resources().map((r) => r.id)).toEqual(['r1', 'r2']);
    });

    it('defaults to empty array when result.items is undefined', () => {
      listSubject.next({ items: undefined as any });
      listSubject.complete();
      expect(component.resources()).toEqual([]);
    });

    it('sets hasMore=true and totalItemsCount=undefined when nextCursor is present', () => {
      listSubject.next({ items: [{ id: 'a' }] as any, nextCursor: 'cursor1' });
      listSubject.complete();
      expect(component.hasMore()).toBe(true);
      expect(component.totalItemsCount()).toBeUndefined();
    });

    it('sets hasMore=false and computes totalItemsCount when no nextCursor', () => {
      listSubject.next({
        items: [{ id: 'a' }, { id: 'b' }] as any,
        remainingItemCount: 3,
      });
      listSubject.complete();
      expect(component.hasMore()).toBe(false);
      // page=1, limit=20, items=2, remaining=3 → (1-1)*20 + 2 + 3 = 5
      expect(component.totalItemsCount()).toBe(5);
    });

    it('computes totalItemsCount correctly on page 2', () => {
      listSubject.next({ items: [] });
      listSubject.complete();
      listSubject = new Subject<ReadResourcesResult>();
      mockReadResources.list.mockReturnValue(listSubject.asObservable());

      component.onPageChange(2);
      listSubject.next({ items: [{ id: 'a' }, { id: 'b' }] as any });
      listSubject.complete();
      // (2-1)*20 + 2 + 0 = 22
      expect(component.totalItemsCount()).toBe(22);
    });

    it('replaces resources on each page load (no append)', () => {
      listSubject.next({ items: [{ id: 'r1' }] as any });
      listSubject.complete();

      listSubject = new Subject<ReadResourcesResult>();
      mockReadResources.list.mockReturnValue(listSubject.asObservable());

      component.onPageChange(2);
      listSubject.next({ items: [{ id: 'r2' }, { id: 'r3' }] as any });
      listSubject.complete();

      expect(component.resources().map((r) => r.id)).toEqual(['r2', 'r3']);
    });

    it('cancels in-flight request when a new list() supersedes it', () => {
      const callsBefore = mockReadResources.list.mock.calls.length;
      component.list();
      expect(mockReadResources.list.mock.calls.length).toBe(callsBefore + 1);
    });

    it('forwards errors to ErrorHandlerService', () => {
      listSubject.next({ items: [] });
      listSubject.complete();

      mockReadResources.list.mockReturnValue(
        throwError(() => new Error('boom')),
      );
      component.list();
      expect(mockErrorHandlerService.handleError).toHaveBeenCalledWith(
        expect.any(Error),
      );
    });

    it('does not call list when canDo("list") returns false', () => {
      const f = createComponent({
        portalPermissions: { clusters: ['get'] },
        resourceDefinition: {
          permissionsDefinition: { resource: 'clusters' },
        },
      });
      const callsBefore = mockReadResources.list.mock.calls.length;
      f.componentInstance.list();
      expect(mockReadResources.list.mock.calls.length).toBe(callsBefore);
    });

    it('passes generated GraphQL fields in the request params', () => {
      const lastCall = mockReadResources.list.mock.calls.at(-1)!;
      expect(lastCall[2]).toHaveProperty('fields');
      expect(Array.isArray(lastCall[2].fields)).toBe(true);
    });
  });

  describe('onLimitChange', () => {
    it('updates paginationLimit, resets to page 1, and re-fetches', () => {
      component.currentPage.set(4);
      listSubject.next({ items: [] });
      listSubject.complete();
      listSubject = new Subject<ReadResourcesResult>();
      mockReadResources.list.mockReturnValue(listSubject.asObservable());

      const callsBefore = mockReadResources.list.mock.calls.length;
      component.onLimitChange(50);

      expect(component.paginationLimit()).toBe(50);
      expect(component.currentPage()).toBe(1);
      expect(mockReadResources.list.mock.calls.length).toBe(callsBefore + 1);
    });
  });

  describe('onPageChange', () => {
    it('updates currentPage and re-fetches', () => {
      listSubject.next({ items: [] });
      listSubject.complete();
      listSubject = new Subject<ReadResourcesResult>();
      mockReadResources.list.mockReturnValue(listSubject.asObservable());

      const callsBefore = mockReadResources.list.mock.calls.length;
      component.onPageChange(3);

      expect(component.currentPage()).toBe(3);
      expect(mockReadResources.list.mock.calls.length).toBe(callsBefore + 1);
    });

    it('sends the updated page in the pagination argument', () => {
      listSubject.next({ items: [] });
      listSubject.complete();
      listSubject = new Subject<ReadResourcesResult>();
      mockReadResources.list.mockReturnValue(listSubject.asObservable());

      component.onPageChange(5);

      const lastCall = mockReadResources.list.mock.calls.at(-1)!;
      expect(lastCall[1]).toEqual(expect.objectContaining({ page: 5 }));
    });
  });

  describe('openCreateModal', () => {
    it('does not throw when createModal viewChild is absent', () => {
      expect(() => component.openCreateModal()).not.toThrow();
    });
  });

  describe('onCreateSubmit', () => {
    it('calls resourceService.create, closes modal, and refreshes list on success', () => {
      const resource = { id: 'r1', metadata: { name: 'r1' } } as any;
      mockResourceService.create.mockReturnValue(of(resource));

      const closeSpy = vi.fn();
      vi.spyOn(component as any, 'createModal', 'get').mockReturnValue(
        () => ({ close: closeSpy }),
      );

      const callsBefore = mockReadResources.list.mock.calls.length;
      component.onCreateSubmit(resource);

      expect(mockResourceService.create).toHaveBeenCalledWith(
        resource,
        component.resourceDefinition(),
        component.context(),
      );
      expect(closeSpy).toHaveBeenCalled();
      expect(mockReadResources.list.mock.calls.length).toBeGreaterThan(
        callsBefore,
      );
    });

    it('does nothing when resourceDefinition is undefined', () => {
      const f = createComponent({ resourceDefinition: undefined });
      const resource = { id: 'r1', metadata: { name: 'r1' } } as any;

      f.componentInstance.onCreateSubmit(resource);

      expect(mockResourceService.create).not.toHaveBeenCalled();
    });
  });

  describe('navigateToResource', () => {
    it('does nothing when detailView is not configured', () => {
      const lc = buildLuigiClient();
      const f = createComponent(
        { resourceDefinition: { ui: { listView: { fields: [] } } } },
        lc,
      );
      f.componentInstance.navigateToResource({
        metadata: { name: 'r1' },
      } as any);
      expect(lc._navigate).not.toHaveBeenCalled();
    });

    it('navigates using metadata.name when detailView exists', () => {
      const lc = buildLuigiClient();
      component.LuigiClient = (() => lc) as any;

      component.navigateToResource({
        id: 'r1',
        metadata: { name: 'cluster-1' },
      } as any);

      expect(lc._navigate).toHaveBeenCalledWith('cluster-1');
    });

    it('alerts and throws when resource.metadata.name is missing', () => {
      const showAlert = vi.fn();
      component.LuigiClient = (() => ({
        uxManager: () => ({ showAlert }),
        linkManager: () => ({ navigate: vi.fn() }),
      })) as any;

      expect(() =>
        component.navigateToResource({ metadata: {} } as any),
      ).toThrow('Resource name is not defined');
      expect(showAlert).toHaveBeenCalledWith({
        text: 'Resource name is not defined',
        type: 'error',
      });
    });

    it('alerts and throws when resourceDefinition is undefined', () => {
      const showAlert = vi.fn();
      const lc = buildLuigiClient();
      lc.uxManager = () => ({ showAlert });

      const f = createComponent({ resourceDefinition: undefined }, lc);

      expect(() =>
        f.componentInstance.navigateToResource({ metadata: { name: 'r1' } }),
      ).toThrow('Resource definition is not defined');
      expect(showAlert).toHaveBeenCalledWith({
        text: 'Resource definition is not defined',
        type: 'error',
      });
    });
  });

  describe('genericActionHandler', () => {
    it('calls linkManager navigate when action is navigate', () => {
      const navigateSpy = vi.fn();
      component.LuigiClient = (() => ({
        linkManager: () => ({ navigate: navigateSpy }),
        uxManager: () => ({ showAlert: vi.fn() }),
      })) as any;

      const field = {
        value: '/clusters/cluster-1',
        uiSettings: { buttonSettings: { action: 'navigate' } },
      } as any;
      const resource = { id: 'r1', metadata: { name: 'r1' } } as any;

      component.genericActionHandler({ field, resource } as any);

      expect(navigateSpy).toHaveBeenCalledWith('/clusters/cluster-1');
    });

    it('does not throw for a valid action event with no resource', () => {
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

  describe('genericActionHandler modal callback branches (via handleModalResult)', () => {
    it('navigate action calls navigateToResource', () => {
      const navigateSpy = vi.fn();
      component.LuigiClient = (() => ({
        linkManager: () => ({ navigate: navigateSpy }),
        uxManager: () => ({ showAlert: vi.fn() }),
      })) as any;

      component.handleModalResult({
        data: { action: 'navigate', resource: { metadata: { name: 'r1' } } },
      } as any);

      expect(navigateSpy).toHaveBeenCalledWith('r1');
    });

    it('no result data does nothing', () => {
      const callsBefore = mockReadResources.list.mock.calls.length;
      component.handleModalResult(undefined);
      expect(mockReadResources.list.mock.calls.length).toBe(callsBefore);
    });

    it('create action calls resourceService.create', () => {
      mockResourceService.create.mockReturnValue(of({} as any));
      component.handleModalResult({
        data: { action: 'create', resource: { metadata: { name: 'new-r' } } },
      } as any);
      expect(mockResourceService.create).toHaveBeenCalled();
    });

    it('loadTableData action calls list()', () => {
      listSubject.next({ items: [] });
      listSubject.complete();
      listSubject = new Subject<ReadResourcesResult>();
      mockReadResources.list.mockReturnValue(listSubject.asObservable());

      const callsBefore = mockReadResources.list.mock.calls.length;
      component.handleModalResult({ data: { action: 'loadTableData' } } as any);
      expect(mockReadResources.list.mock.calls.length).toBeGreaterThan(
        callsBefore,
      );
    });

    it('unknown action does not throw', () => {
      expect(() =>
        component.handleModalResult({ data: { action: 'unknown' } } as any),
      ).not.toThrow();
    });
  });

  describe('instance permissions sync effect', () => {
    it('calls instancePermissionsStore.sync when resources and entityActions are present', () => {
      const f = createComponent({
        resourceDefinition: {
          entityCollection: 'clusters',
          ui: { listView: { fields: [] }, detailView: { fields: [] } },
          permissionsDefinition: {
            resource: 'clusters',
            entityActions: ['get', 'delete'],
          },
        },
      });

      f.componentInstance.resources.set([
        { id: 'r1', metadata: { name: 'r1' } } as any,
      ]);
      TestBed.flushEffects();

      expect(mockInstancePermissionsStore.sync).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ entityActions: ['get', 'delete'] }),
        [expect.objectContaining({ name: 'r1' })],
      );
    });
  });

  describe('tableResources', () => {
    it('maps resources with generated id', () => {
      listSubject.next({
        items: [
          { id: 'x', metadata: { name: 'foo' } },
        ] as any,
      });
      listSubject.complete();

      const rows = component.tableResources();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toHaveProperty('id');
      expect((rows[0] as any).metadata).toEqual({ name: 'foo' });
    });

    it('returns empty array when resources is empty', () => {
      expect(component.tableResources()).toEqual([]);
    });

    it('falls back to metadata.name when resourceDefinition is absent', () => {
      const f = createComponent({ resourceDefinition: undefined });
      f.componentInstance.resources.set([
        { id: '', metadata: { name: 'fallback-name' } } as any,
      ]);
      const rows = f.componentInstance.tableResources();
      expect(rows[0].id).toBe('fallback-name');
    });
  });
});
