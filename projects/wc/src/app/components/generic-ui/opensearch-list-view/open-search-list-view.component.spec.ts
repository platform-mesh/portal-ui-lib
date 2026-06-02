import { ReadResourcesProxyService } from './services/read-resources-proxy.service';
import { OpenSearchListView } from './open-search-list-view.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import {
  ErrorHandlerService,
  ReadResources,
  ReadResourcesResult,
} from '@platform-mesh/portal-ui-lib/services';
import { Subject, throwError } from 'rxjs';
import { MockedObject } from 'vitest';
import { mock } from 'vitest-mock-extended';

describe('OpenSearchListView', () => {
  let component: OpenSearchListView;
  let fixture: ComponentFixture<OpenSearchListView>;
  let mockErrorHandlerService: MockedObject<ErrorHandlerService>;
  let mockLuigiCoreService: any;
  let mockReadResourcesProxy: { forContext: ReturnType<typeof vi.fn> };
  let mockReadResources: MockedObject<ReadResources>;
  let listSubject: Subject<ReadResourcesResult>;

  const buildContext = (overrides: Partial<any> = {}) =>
    (() => ({
      resourceDefinition: {
        entityCollection: 'clusters',
        entity: 'Cluster',
        apiGroup: 'core_k8s_io',
        version: 'v1alpha1',
        scope: 'Namespaced',
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
      linkManager: () => ({
        fromContext: vi.fn().mockReturnThis(),
        navigate,
        withParams: vi.fn().mockReturnThis(),
      }),
      uxManager: () => ({ showAlert: vi.fn() }),
      getNodeParams: vi.fn(),
      getActiveFeatureToggles: () => [],
    };
  };

  beforeEach(() => {
    mockLuigiCoreService = mock();
    mockErrorHandlerService = mock();
    listSubject = new Subject<ReadResourcesResult>();

    mockReadResources = mock<ReadResources>();
    mockReadResources.list.mockReturnValue(listSubject.asObservable());

    mockReadResourcesProxy = {
      forContext: vi.fn().mockReturnValue(mockReadResources),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: LuigiCoreService, useValue: mockLuigiCoreService },
        { provide: ErrorHandlerService, useValue: mockErrorHandlerService },
        {
          provide: ReadResourcesProxyService,
          useValue: mockReadResourcesProxy,
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).overrideComponent(OpenSearchListView, {
      set: {
        template: '',
        imports: [],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
      },
    });

    fixture = TestBed.createComponent(OpenSearchListView);
    component = fixture.componentInstance;

    component.context = buildContext();
    component.LuigiClient = (() => buildLuigiClient()) as any;

    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create the component and call list on init', () => {
    expect(component).toBeTruthy();
    expect(mockReadResourcesProxy.forContext).toHaveBeenCalled();
    expect(mockReadResources.list).toHaveBeenCalledWith(
      expect.objectContaining({ resourceDefinition: expect.any(Object) }),
      expect.objectContaining({
        limit: 50,
        cursor: undefined,
      }),
      expect.objectContaining({
        q: '',
        resource: 'clusters',
      }),
    );
  });

  describe('computed properties', () => {
    it('defaultTitle should fall back to entityCollection', () => {
      expect(component.defaultTitle()).toBe('clusters');
    });

    it('defaultTitle should be empty string when entityCollection is missing', () => {
      const f = TestBed.createComponent(OpenSearchListView);
      f.componentInstance.context = (() => ({
        resourceDefinition: { entity: 'Cluster' },
      })) as any;
      f.componentInstance.LuigiClient = component.LuigiClient;
      f.detectChanges();
      expect(f.componentInstance.defaultTitle()).toBe('');
    });

    it('defaultDescription should reference the entityCollection', () => {
      expect(component.defaultDescription()).toBe(
        'This page displays the created clusters in your environment',
      );
    });

    it('columns should return ui.listView.fields when no readyCondition is set', () => {
      const f = TestBed.createComponent(OpenSearchListView);
      f.componentInstance.context = buildContext({
        resourceDefinition: {
          ui: { listView: { fields: [{ property: 'name' }] } },
        },
      });
      f.componentInstance.LuigiClient = component.LuigiClient;
      f.detectChanges();
      expect(f.componentInstance.columns()).toEqual([{ property: 'name' }]);
    });

    it('columns should prepend the readyCondition with displayAs=alert when defined', () => {
      const f = TestBed.createComponent(OpenSearchListView);
      f.componentInstance.context = buildContext({
        resourceDefinition: {
          ui: { listView: { fields: [{ property: 'name' }] } },
          readyCondition: { property: 'status.ready' },
        },
      });
      f.componentInstance.LuigiClient = component.LuigiClient;
      f.detectChanges();
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
      expect(cols[1]).toEqual({ property: 'name' });
    });

    it('columns should default to empty array when ui is missing', () => {
      const f = TestBed.createComponent(OpenSearchListView);
      f.componentInstance.context = (() => ({
        resourceDefinition: { entityCollection: 'x' },
      })) as any;
      f.componentInstance.LuigiClient = component.LuigiClient;
      f.detectChanges();
      expect(f.componentInstance.columns()).toEqual([]);
    });

    it('totalItemsCount should be resources.length + remainingItemCount', () => {
      component.resources.set([{ id: 'a' }, { id: 'b' }] as any);
      component.remainingItemCount.set(3);
      expect(component.totalItemsCount()).toBe(5);
    });

    it('config should reflect columns, pagination, and hasMore', () => {
      component.paginationLimit.set(10);
      component.hasMore.set(true);
      const cfg = component.config();
      expect(cfg.resourcesSearchable).toBe(true);
      expect(cfg.tableConfig?.paginationLimit).toBe(10);
      expect(cfg.tableConfig?.hasMore).toBe(true);
    });
  });

  describe('list', () => {
    it('should set resources from result.items on initial load', () => {
      listSubject.next({
        items: [{ id: 'r1' }, { id: 'r2' }] as any,
        nextCursor: 'cur-1',
        remainingItemCount: 2,
        resourceVersion: 'rv-1',
      });
      listSubject.complete();

      expect(component.resources().map((r) => r.id)).toEqual(['r1', 'r2']);
      expect(component.hasMore()).toBe(true);
      expect(component.remainingItemCount()).toBe(2);
      expect(component.resourceVersion()).toBe('rv-1');
    });

    it('should append/dedupe by id on non-initial load', () => {
      // initial load
      listSubject.next({
        items: [{ id: 'r1', tag: 'old' } as any],
        nextCursor: 'next',
      });
      listSubject.complete();

      // reset stream for the next call
      listSubject = new Subject<ReadResourcesResult>();
      mockReadResources.list.mockReturnValue(listSubject.asObservable());

      component.loadMore();

      listSubject.next({
        items: [
          { id: 'r1', tag: 'new' } as any,
          { id: 'r2', tag: 'a' } as any,
        ],
        nextCursor: undefined,
      });
      listSubject.complete();

      const ids = component.resources().map((r) => r.id);
      expect(ids).toEqual(['r1', 'r2']);
      // r1 was overwritten by the newer payload
      expect(
        (component.resources().find((r) => r.id === 'r1') as any).tag,
      ).toBe('new');
      expect(component.hasMore()).toBe(false);
    });

    it('should not start a second list call while one is in flight', () => {
      // The first call from init is still pending
      const callsBefore = mockReadResources.list.mock.calls.length;
      component.list(false);
      expect(mockReadResources.list.mock.calls.length).toBe(callsBefore);
    });

    it('should release the in-flight lock after completion', () => {
      const callsBefore = mockReadResources.list.mock.calls.length;
      listSubject.next({ items: [], nextCursor: undefined });
      listSubject.complete();

      // a fresh stream so the next call doesn't hit a completed subject
      listSubject = new Subject<ReadResourcesResult>();
      mockReadResources.list.mockReturnValue(listSubject.asObservable());

      component.list(false);
      expect(mockReadResources.list.mock.calls.length).toBe(callsBefore + 1);
    });

    it('should leave resourceVersion untouched when result omits it', () => {
      component.resourceVersion.set('keep-me');
      listSubject.next({
        items: [],
        nextCursor: undefined,
        resourceVersion: undefined,
      });
      listSubject.complete();
      expect(component.resourceVersion()).toBe('keep-me');
    });

    it('should default remainingItemCount to 0 when missing', () => {
      listSubject.next({ items: [{ id: 'r1' }] as any, nextCursor: undefined });
      listSubject.complete();
      expect(component.remainingItemCount()).toBe(0);
    });

    it('should default to empty array when result.items is undefined on initial load', () => {
      listSubject.next({ items: undefined as any, nextCursor: undefined });
      listSubject.complete();
      expect(component.resources()).toEqual([]);
    });

    it('should default to empty array when result.items is undefined on load-more', () => {
      // initial load with one item
      listSubject.next({
        items: [{ id: 'r1' } as any],
        nextCursor: 'next',
      });
      listSubject.complete();

      listSubject = new Subject<ReadResourcesResult>();
      mockReadResources.list.mockReturnValue(listSubject.asObservable());

      component.loadMore();
      listSubject.next({ items: undefined as any, nextCursor: undefined });
      listSubject.complete();

      expect(component.resources().map((r) => r.id)).toEqual(['r1']);
    });

    it('should forward errors to the ErrorHandlerService', () => {
      // drain the in-flight call from init so the next list() can fire
      listSubject.next({ items: [], nextCursor: undefined });
      listSubject.complete();

      mockReadResources.list.mockReturnValue(throwError(() => new Error('boom')));
      component.list(false, 'x');
      expect(mockErrorHandlerService.handleError).toHaveBeenCalledWith(
        expect.any(Error),
      );
    });

    it('should pass the searchKey through as q on search()', () => {
      // drain the in-flight call from init
      listSubject.next({ items: [], nextCursor: undefined });
      listSubject.complete();
      listSubject = new Subject<ReadResourcesResult>();
      mockReadResources.list.mockReturnValue(listSubject.asObservable());

      (component as any).search('hello');

      const lastCall = mockReadResources.list.mock.calls.at(-1)!;
      expect(lastCall[2]).toEqual(
        expect.objectContaining({ q: 'hello', resource: 'clusters' }),
      );
    });
  });

  describe('loadMore', () => {
    it('should be a no-op when hasMore is false', () => {
      // drain initial call
      listSubject.next({ items: [], nextCursor: undefined });
      listSubject.complete();

      const callsBefore = mockReadResources.list.mock.calls.length;
      component.loadMore();
      expect(mockReadResources.list.mock.calls.length).toBe(callsBefore);
    });

    it('should call list when hasMore is true', () => {
      listSubject.next({
        items: [{ id: 'r1' } as any],
        nextCursor: 'next',
      });
      listSubject.complete();

      const callsBefore = mockReadResources.list.mock.calls.length;
      listSubject = new Subject<ReadResourcesResult>();
      mockReadResources.list.mockReturnValue(listSubject.asObservable());

      component.loadMore();
      expect(mockReadResources.list.mock.calls.length).toBe(callsBefore + 1);
    });
  });

  describe('onLimitChange', () => {
    it('should update paginationLimit and trim resources to the new limit', () => {
      component.resources.set([
        { id: 'a' },
        { id: 'b' },
        { id: 'c' },
        { id: 'd' },
      ] as any);
      component.remainingItemCount.set(0);

      component.onLimitChange(2);

      expect(component.paginationLimit()).toBe(2);
      expect(component.resources().map((r) => r.id)).toEqual(['a', 'b']);
      expect(component.hasMore()).toBe(false);
    });

    it('should set hasMore=true when items still exceed visible total after trim', () => {
      component.resources.set([
        { id: 'a' },
        { id: 'b' },
        { id: 'c' },
      ] as any);
      // totalItemsCount = visible (3) + remaining (5) = 8 → resources(3) < 8 → hasMore=true
      component.remainingItemCount.set(5);

      component.onLimitChange(3);
      expect(component.hasMore()).toBe(true);
    });
  });

  describe('navigateToResource', () => {
    it('should do nothing when detailView is not configured', () => {
      const f = TestBed.createComponent(OpenSearchListView);
      f.componentInstance.context = buildContext({
        resourceDefinition: {
          ui: { listView: { fields: [] } /* no detailView */ },
        },
      });
      const lc = buildLuigiClient();
      f.componentInstance.LuigiClient = (() => lc) as any;
      f.detectChanges();

      f.componentInstance.navigateToResource({ id: 'r1' } as any);
      expect(lc._navigate).not.toHaveBeenCalled();
    });

    it('should navigate using resource.id when detailView exists', () => {
      const lc = buildLuigiClient();
      component.LuigiClient = (() => lc) as any;
      // re-render with the new client
      fixture.detectChanges();

      component.navigateToResource({
        id: 'r1',
        metadata: { namespace: 'ns-1' },
      } as any);

      expect(lc._navigate).toHaveBeenCalledWith('r1');
    });

    it('should navigate for cluster-scoped resources (no namespace search param)', () => {
      const lc = buildLuigiClient();

      const f = TestBed.createComponent(OpenSearchListView);
      f.componentInstance.context = buildContext({
        resourceDefinition: {
          scope: 'Cluster',
          ui: {
            listView: { fields: [] },
            detailView: { fields: [] },
          },
        },
      });
      f.componentInstance.LuigiClient = (() => lc) as any;
      f.detectChanges();

      f.componentInstance.navigateToResource({ id: 'cluster-a' } as any);

      expect(lc._navigate).toHaveBeenCalledWith('cluster-a');
    });

    it('should alert and throw when resource.id is missing', () => {
      const lc = buildLuigiClient();
      const showAlert = vi.fn();
      lc.uxManager = () => ({ showAlert });
      component.LuigiClient = (() => lc) as any;
      fixture.detectChanges();

      expect(() =>
        component.navigateToResource({ metadata: {} } as any),
      ).toThrow('Resource name is not defined');
      expect(showAlert).toHaveBeenCalledWith({
        text: 'Resource name is not defined',
        type: 'error',
      });
    });

    it('should alert and throw when resourceDefinition is missing', () => {
      const lc = buildLuigiClient();
      const showAlert = vi.fn();
      lc.uxManager = () => ({ showAlert });

      const f = TestBed.createComponent(OpenSearchListView);
      f.componentInstance.context = (() => ({})) as any;
      f.componentInstance.LuigiClient = (() => lc) as any;
      f.detectChanges();

      expect(() =>
        f.componentInstance.navigateToResource({ id: 'r1' } as any),
      ).toThrow('Resource definition is not defined');
      expect(showAlert).toHaveBeenCalledWith({
        text: 'Resource definition is not defined',
        type: 'error',
      });
    });
  });

  describe('trackBy', () => {
    it('should use metadata.name', () => {
      const item = { metadata: { name: 'foo' } } as any;
      expect((component as any).trackBy(item)).toBe('foo');
    });
  });
});
