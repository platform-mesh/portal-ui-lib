import { InstancePermissionsStore } from '../../store/instance-permissions-store.service';
import { ReadResourcesProxyService } from '../services/read-resources-proxy.service';
import { OpenSearchResourceTableCard } from './open-search-resource-table-card.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import {
  ErrorHandlerService,
  InstancePermissionsService,
  ReadResources,
  ReadResourcesResult,
} from '@platform-mesh/portal-ui-lib/services';
import { Subject, throwError } from 'rxjs';
import { MockedObject } from 'vitest';
import { mock } from 'vitest-mock-extended';

describe('OpenSearchResourceTableCard', () => {
  let component: OpenSearchResourceTableCard;
  let fixture: ComponentFixture<OpenSearchResourceTableCard>;
  let mockErrorHandlerService: MockedObject<ErrorHandlerService>;
  let mockLuigiCoreService: any;
  let mockReadResourcesProxy: { forContext: ReturnType<typeof vi.fn> };
  let mockReadResources: MockedObject<ReadResources>;
  let mockInstancePermissionsService: MockedObject<InstancePermissionsService>;
  let mockInstancePermissionsLocalStore: MockedObject<InstancePermissionsStore>;
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

    mockInstancePermissionsService = mock();
    mockInstancePermissionsService.checkInstances.mockReturnValue(
      listSubject.asObservable() as any,
    );
    mockInstancePermissionsLocalStore = mock();
    // Default: all instances already cached → early-return in effect
    mockInstancePermissionsLocalStore.missing.mockReturnValue([]);

    TestBed.configureTestingModule({
      providers: [
        { provide: LuigiCoreService, useValue: mockLuigiCoreService },
        { provide: ErrorHandlerService, useValue: mockErrorHandlerService },
        {
          provide: ReadResourcesProxyService,
          useValue: mockReadResourcesProxy,
        },
        {
          provide: InstancePermissionsService,
          useValue: mockInstancePermissionsService,
        },
        {
          provide: InstancePermissionsStore,
          useValue: mockInstancePermissionsLocalStore,
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).overrideComponent(OpenSearchResourceTableCard, {
      set: {
        template: '',
        imports: [],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
      },
    });

    fixture = TestBed.createComponent(OpenSearchResourceTableCard);
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
        limit: 20,
        page: 1,
      }),
      expect.objectContaining({
        q: '',
        resource: 'clusters',
      }),
    );
  });

  describe('computed properties', () => {
    it('columns should return ui.listView.fields when no readyCondition is set', () => {
      const f = TestBed.createComponent(OpenSearchResourceTableCard);
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
      const f = TestBed.createComponent(OpenSearchResourceTableCard);
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
      const f = TestBed.createComponent(OpenSearchResourceTableCard);
      f.componentInstance.context = (() => ({
        resourceDefinition: { entityCollection: 'x' },
      })) as any;
      f.componentInstance.LuigiClient = component.LuigiClient;
      f.detectChanges();
      expect(f.componentInstance.columns()).toEqual([]);
    });

    it('totalItemsCount is undefined while nextCursor is present (cursor-based pages)', () => {
      listSubject.next({ items: [{ id: 'a' }] as any, nextCursor: 'abc' });
      listSubject.complete();
      expect(component.totalItemsCount()).toBeUndefined();
      expect(component.hasMore()).toBe(true);
    });

    it('totalItemsCount equals (page-1)*limit + items.length on the last page', () => {
      // drain init call then fetch page 2
      listSubject.next({ items: [] });
      listSubject.complete();
      listSubject = new Subject<ReadResourcesResult>();
      mockReadResources.list.mockReturnValue(listSubject.asObservable());

      (component as any).onPageChange(2);
      listSubject.next({
        items: [{ id: 'a' }, { id: 'b' }] as any,
        nextCursor: undefined,
      });
      listSubject.complete();
      // (2-1)*20 + 2 = 22
      expect(component.totalItemsCount()).toBe(22);
      expect(component.hasMore()).toBe(false);
    });

    it('config should reflect columns, pagination, currentPage, pager mode, and hasMore', () => {
      component.paginationLimit.set(10);
      component.currentPage.set(4);
      component.hasMore.set(true);
      const cfg = component.config();
      expect(cfg.tableConfig?.paginationLimit).toBe(10);
      expect(cfg.tableConfig?.currentPage).toBe(4);
      expect(cfg.tableConfig?.loadMode).toBe('pager');
      expect(cfg.tableConfig?.hasMore).toBe(true);
    });
  });

  describe('list', () => {
    it('should set resources from result.items', () => {
      listSubject.next({
        items: [{ id: 'r1' }, { id: 'r2' }] as any,
        remainingItemCount: 2,
      });
      listSubject.complete();

      expect(component.resources().map((r) => r.id)).toEqual(['r1', 'r2']);
    });

    it('should replace resources on each page load (no append)', () => {
      // initial load (page 1)
      listSubject.next({ items: [{ id: 'r1' } as any] });
      listSubject.complete();

      // reset stream for the next call
      listSubject = new Subject<ReadResourcesResult>();
      mockReadResources.list.mockReturnValue(listSubject.asObservable());

      (component as any).onPageChange(2);

      listSubject.next({ items: [{ id: 'r2' } as any, { id: 'r3' } as any] });
      listSubject.complete();

      expect(component.resources().map((r) => r.id)).toEqual(['r2', 'r3']);
    });

    it('should send the current page in the pagination argument', () => {
      listSubject.next({ items: [], remainingItemCount: 0 });
      listSubject.complete();
      listSubject = new Subject<ReadResourcesResult>();
      mockReadResources.list.mockReturnValue(listSubject.asObservable());

      (component as any).onPageChange(3);

      const lastCall = mockReadResources.list.mock.calls.at(-1)!;
      expect(lastCall[1]).toEqual(
        expect.objectContaining({ page: 3, limit: 20 }),
      );
    });

    it('should cancel the in-flight request when a new list() supersedes it', () => {
      const callsBefore = mockReadResources.list.mock.calls.length;
      component.list();
      expect(mockReadResources.list.mock.calls.length).toBe(callsBefore + 1);
    });

    it('should accept subsequent list() calls after the first completes', () => {
      const callsBefore = mockReadResources.list.mock.calls.length;
      listSubject.next({ items: [] });
      listSubject.complete();

      listSubject = new Subject<ReadResourcesResult>();
      mockReadResources.list.mockReturnValue(listSubject.asObservable());

      component.list();
      expect(mockReadResources.list.mock.calls.length).toBe(callsBefore + 1);
    });

    it('should default to empty array when result.items is undefined', () => {
      listSubject.next({ items: undefined as any });
      listSubject.complete();
      expect(component.resources()).toEqual([]);
    });

    it('should forward errors to the ErrorHandlerService', () => {
      // drain the in-flight call from init so the next list() can fire
      listSubject.next({ items: [] });
      listSubject.complete();

      mockReadResources.list.mockReturnValue(
        throwError(() => new Error('boom')),
      );
      component.list('x');
      expect(mockErrorHandlerService.handleError).toHaveBeenCalledWith(
        expect.any(Error),
      );
    });

    it('should pass the searchKey through as q on search()', () => {
      // drain the in-flight call from init
      listSubject.next({ items: [] });
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

  describe('paging', () => {
    it('onPageChange updates currentPage and issues a fresh list()', () => {
      listSubject.next({ items: [], remainingItemCount: 0 });
      listSubject.complete();
      listSubject = new Subject<ReadResourcesResult>();
      mockReadResources.list.mockReturnValue(listSubject.asObservable());

      const callsBefore = mockReadResources.list.mock.calls.length;
      (component as any).onPageChange(2);

      expect(component.currentPage()).toBe(2);
      expect(mockReadResources.list.mock.calls.length).toBe(callsBefore + 1);
    });

    it('search resets the page back to 1', () => {
      component.currentPage.set(4);
      listSubject.next({ items: [] });
      listSubject.complete();
      listSubject = new Subject<ReadResourcesResult>();
      mockReadResources.list.mockReturnValue(listSubject.asObservable());

      (component as any).searchChanged('x');
      expect(component.currentPage()).toBe(1);
    });
  });

  describe('onLimitChange', () => {
    it('updates paginationLimit and resets to page 1', () => {
      component.currentPage.set(3);
      listSubject.next({ items: [] });
      listSubject.complete();
      listSubject = new Subject<ReadResourcesResult>();
      mockReadResources.list.mockReturnValue(listSubject.asObservable());

      component.onLimitChange(20);

      expect(component.paginationLimit()).toBe(20);
      expect(component.currentPage()).toBe(1);
    });
  });

  describe('navigateToResource', () => {
    it('should do nothing when detailView is not configured', () => {
      const f = TestBed.createComponent(OpenSearchResourceTableCard);
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

    it('should navigate using resource metadata.name when detailView exists', () => {
      const lc = buildLuigiClient();
      component.LuigiClient = (() => lc) as any;
      // re-render with the new client
      fixture.detectChanges();

      component.navigateToResource({
        id: 'r1',
        metadata: { name: 'resource-1', namespace: 'ns-1' },
      } as any);

      expect(lc._navigate).toHaveBeenCalledWith('resource-1');
    });

    it('should navigate for cluster-scoped resources (no namespace search param)', () => {
      const lc = buildLuigiClient();

      const f = TestBed.createComponent(OpenSearchResourceTableCard);
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

      f.componentInstance.navigateToResource({
        metadata: { name: 'cluster-a' },
      } as any);

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

      const f = TestBed.createComponent(OpenSearchResourceTableCard);
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

  describe('searchFilters', () => {
    it('resolves {context.<path>} placeholders in filter values', () => {
      const f = TestBed.createComponent(OpenSearchResourceTableCard);
      f.componentInstance.context = (() => ({
        userId: 'u-42',
        resourceDefinition: {
          entityCollection: 'clusters',
          ui: {
            listView: {
              filters: [
                {
                  id: 'mine',
                  label: 'Mine',
                  property: 'owner',
                  value: '{context.userId}',
                  default: true,
                },
              ],
            },
          },
        },
      })) as any;
      f.componentInstance.LuigiClient = component.LuigiClient;
      f.detectChanges();
      const filters = f.componentInstance.searchFilters();
      expect(filters?.[0].value).toBe('u-42');
    });

    it('seeds selectedSearchFilter from the default filter on init', () => {
      const f = TestBed.createComponent(OpenSearchResourceTableCard);
      f.componentInstance.context = (() => ({
        resourceDefinition: {
          entityCollection: 'clusters',
          ui: {
            listView: {
              filters: [
                {
                  label: 'Mine',
                  property: 'owner',
                  value: 'me',
                  default: true,
                },
              ],
            },
          },
        },
      })) as any;
      f.componentInstance.LuigiClient = component.LuigiClient;
      f.detectChanges();
      expect(f.componentInstance.selectedSearchFilter()).toEqual(
        expect.objectContaining({
          property: 'owner',
          value: 'me',
        }),
      );
    });
  });

  describe('search / searchChanged / onFilterTabChanged', () => {
    // Helper: drain the in-flight call from init so the next list() can fire
    // and reset the mocked stream so each test can observe a fresh next() call.
    const resetStream = () => {
      listSubject.next({ items: [], nextCursor: undefined });
      listSubject.complete();
      listSubject = new Subject<ReadResourcesResult>();
      mockReadResources.list.mockReturnValue(listSubject.asObservable());
    };

    it('search() forwards the new search text as q, resets pagination, and fires exactly one list() call', () => {
      resetStream();
      const callsBefore = mockReadResources.list.mock.calls.length;
      (component as any).search('foo');
      fixture.detectChanges();
      // Regression guard: search() sets `searchKey`; if that signal were an
      // effect dependency, we'd get an extra spurious list(true) fetch.
      expect(mockReadResources.list.mock.calls.length).toBe(callsBefore + 1);
      const lastCall = mockReadResources.list.mock.calls.at(-1)!;
      expect(lastCall[2]).toEqual(
        expect.objectContaining({ q: 'foo', resource: 'clusters' }),
      );
      expect(lastCall[1].cursor).toBeUndefined();
    });

    it('searchChanged() with a non-empty value fires exactly one list() call with the new q', () => {
      resetStream();
      const callsBefore = mockReadResources.list.mock.calls.length;
      (component as any).searchChanged('typing');
      fixture.detectChanges();
      // The host card debounces upstream, so every emission we see is a real
      // typing pause and should reach the backend once — no double-fires from
      // the constructor effect.
      expect(mockReadResources.list.mock.calls.length).toBe(callsBefore + 1);
      const lastCall = mockReadResources.list.mock.calls.at(-1)!;
      expect(lastCall[2]).toEqual(expect.objectContaining({ q: 'typing' }));
    });

    it('searchChanged() with an empty value triggers exactly one re-fetch (instant clear)', () => {
      resetStream();
      const callsBefore = mockReadResources.list.mock.calls.length;
      (component as any).searchChanged('');
      fixture.detectChanges();
      expect(mockReadResources.list.mock.calls.length).toBe(callsBefore + 1);
      const lastCall = mockReadResources.list.mock.calls.at(-1)!;
      expect(lastCall[2]).toEqual(expect.objectContaining({ q: '' }));
    });

    it('onFilterTabChanged() stores the new filter, forwards filter=<property>=<value>, and fires exactly one list() call', () => {
      resetStream();
      const callsBefore = mockReadResources.list.mock.calls.length;
      (component as any).onFilterTabChanged({
        label: 'Mine',
        property: 'owner',
        value: 'u-1',
      });
      // Force any pending signal effects to run. Guards against a regression
      // where the constructor `effect` picks up `selectedSearchFilter` as a
      // dependency and re-triggers `list(true)` in addition to the imperative
      // `list(false)` call inside `onFilterTabChanged` — a double-fetch.
      fixture.detectChanges();
      expect(mockReadResources.list.mock.calls.length).toBe(callsBefore + 1);
      expect(component.selectedSearchFilter()?.property).toBe('owner');
      const lastCall = mockReadResources.list.mock.calls.at(-1)!;
      expect(lastCall[2]).toEqual(
        expect.objectContaining({ filter: 'owner=u-1' }),
      );
    });

    it('onFilterTabChanged(undefined) clears the filter and fires exactly one list() call', () => {
      resetStream();
      (component as any).onFilterTabChanged({
        label: 'Mine',
        property: 'owner',
        value: 'u-1',
      });
      resetStream();
      const callsBefore = mockReadResources.list.mock.calls.length;
      (component as any).onFilterTabChanged(undefined);
      fixture.detectChanges();
      expect(mockReadResources.list.mock.calls.length).toBe(callsBefore + 1);
      expect(component.selectedSearchFilter()).toBeUndefined();
      const lastCall = mockReadResources.list.mock.calls.at(-1)!;
      expect(lastCall[2]?.filter).toBeUndefined();
    });
  });

  /**
   * URL-refresh hydration: `q` and any `<property>=<value>` pair matching a
   * filter tab are consulted at construction and pushed to the host card as
   * `searchConfig.initialSearch` / `initialFilter`. These tests bypass the
   * shared `beforeEach` fixture and construct their own because the URL must
   * be set *before* the property initializers run — after mount is too late.
   *
   * URL shape note: filters are reflected as `?<filter.property>=<filter.value>`
   * (one param per filter, e.g. `?metadata.namespace=default`), NOT as a nested
   * `?filter=property=value` pair — the latter is what the backend receives,
   * not the URL.
   */
  describe('URL hydration (q / filter query params)', () => {
    // The shared `beforeEach` builds a fixture from a plain URL. Each test
    // here overwrites location with `history.replaceState` and constructs a
    // fresh component so the property initializer sees the crafted URL.
    const setUrl = (search: string) => {
      history.replaceState(null, '', `/tests${search}`);
    };

    const buildContextWithFilters = () =>
      (() => ({
        resourceDefinition: {
          entityCollection: 'clusters',
          ui: {
            listView: {
              filters: [
                { label: 'Mine', property: 'owner', value: 'me' },
                { label: 'All', property: 'owner', value: '*', default: true },
              ],
            },
          },
        },
      })) as any;

    const makeFresh = (ctx: any) => {
      const f = TestBed.createComponent(OpenSearchResourceTableCard);
      f.componentInstance.context = ctx;
      f.componentInstance.LuigiClient = component.LuigiClient;
      f.detectChanges();
      return f;
    };

    afterEach(() => {
      // Reset the URL so we don't leak state between tests.
      history.replaceState(null, '', '/tests');
    });

    it('seeds searchKey from ?q= on init', () => {
      setUrl('?q=demo-1');
      const f = makeFresh(buildContextWithFilters());
      const lastCall = mockReadResources.list.mock.calls.at(-1)!;
      expect(lastCall[2]).toEqual(expect.objectContaining({ q: 'demo-1' }));
      // Cleanup: drain the fresh subscription so it doesn't leak into later tests.
      f.destroy();
    });

    it('seeds currentPage from ?page= on init and sends it to list()', () => {
      setUrl('?page=3');
      const f = makeFresh(buildContextWithFilters());
      expect(f.componentInstance.currentPage()).toBe(3);
      const lastCall = mockReadResources.list.mock.calls.at(-1)!;
      expect(lastCall[1]).toEqual(expect.objectContaining({ page: 3 }));
      f.destroy();
    });

    it('seeds paginationLimit from ?limit= on init when value is valid', () => {
      setUrl('?limit=50');
      const f = makeFresh(buildContextWithFilters());
      expect(f.componentInstance.paginationLimit()).toBe(50);
      const lastCall = mockReadResources.list.mock.calls.at(-1)!;
      expect(lastCall[1]).toEqual(expect.objectContaining({ limit: 50 }));
      f.destroy();
    });

    it('defaults paginationLimit to 20 when ?limit= is absent or invalid', () => {
      setUrl('?limit=999');
      const f = makeFresh(buildContextWithFilters());
      expect(f.componentInstance.paginationLimit()).toBe(20);
      f.destroy();
    });

    it('defaults currentPage to 1 when ?page= is absent or invalid', () => {
      setUrl('?page=not-a-number');
      const f = makeFresh(buildContextWithFilters());
      expect(f.componentInstance.currentPage()).toBe(1);
      f.destroy();
    });

    it('exposes initialSearch through config().searchConfig', () => {
      setUrl('?q=demo-1');
      const f = makeFresh(buildContextWithFilters());
      expect(f.componentInstance.config().searchConfig?.initialSearch).toBe(
        'demo-1',
      );
      f.destroy();
    });

    it('seeds selectedSearchFilter from ?<property>=<value> when it matches a tab', () => {
      setUrl('?owner=me');
      const f = makeFresh(buildContextWithFilters());
      // "owner=me" wins over the resourceDefinition's `default: true` on the "All" tab.
      expect(f.componentInstance.selectedSearchFilter()).toEqual(
        expect.objectContaining({ property: 'owner', value: 'me' }),
      );
      const lastCall = mockReadResources.list.mock.calls.at(-1)!;
      // Backend still receives the `property=value` string as the `filter` field.
      expect(lastCall[2]).toEqual(
        expect.objectContaining({ filter: 'owner=me' }),
      );
      f.destroy();
    });

    it('exposes initialFilter through config().searchConfig when matched', () => {
      setUrl('?owner=me');
      const f = makeFresh(buildContextWithFilters());
      expect(f.componentInstance.config().searchConfig?.initialFilter).toEqual(
        expect.objectContaining({ property: 'owner', value: 'me' }),
      );
      f.destroy();
    });

    it('falls back to default: true when the URL value does not match any tab', () => {
      setUrl('?owner=ghost');
      const f = makeFresh(buildContextWithFilters());
      // No matching (property, value) → linkedSignal falls through to the `default: true` entry.
      expect(f.componentInstance.selectedSearchFilter()).toEqual(
        expect.objectContaining({ property: 'owner', value: '*' }),
      );
      // config().searchConfig.initialFilter is undefined (nothing to promote).
      expect(
        f.componentInstance.config().searchConfig?.initialFilter,
      ).toBeUndefined();
      f.destroy();
    });

    it('ignores URL params whose keys are not filter properties', () => {
      // No filter tab has property `unrelated`, so this URL param is a plain
      // app-level query string, not a filter. The default tab still wins.
      setUrl('?unrelated=x');
      const f = makeFresh(buildContextWithFilters());
      expect(f.componentInstance.selectedSearchFilter()).toEqual(
        expect.objectContaining({ property: 'owner', value: '*' }),
      );
      f.destroy();
    });

    it('encodes special characters in filter values (round-trip)', () => {
      // A dot-in-property + slash-in-value case that used to be doubly ambiguous
      // in the `?filter=property=value` shape — with property-as-key each is one
      // clean query param and URLSearchParams handles the encoding for us.
      setUrl(
        `?${encodeURIComponent('metadata.namespace')}=${encodeURIComponent('kube-system')}`,
      );
      const ctx = (() => ({
        resourceDefinition: {
          entityCollection: 'clusters',
          ui: {
            listView: {
              filters: [
                {
                  label: 'kube-system',
                  property: 'metadata.namespace',
                  value: 'kube-system',
                },
                {
                  label: 'All',
                  property: 'metadata.namespace',
                  value: '*',
                  default: true,
                },
              ],
            },
          },
        },
      })) as any;
      const f = makeFresh(ctx);
      expect(f.componentInstance.selectedSearchFilter()).toEqual(
        expect.objectContaining({
          property: 'metadata.namespace',
          value: 'kube-system',
        }),
      );
      f.destroy();
    });

    it('behaves normally when neither q nor a matching filter is present', () => {
      setUrl('');
      const f = makeFresh(buildContextWithFilters());
      const searchConfig = f.componentInstance.config().searchConfig;
      expect(searchConfig?.initialSearch).toBeUndefined();
      expect(searchConfig?.initialFilter).toBeUndefined();
      // Default filter still wins on empty URL.
      expect(f.componentInstance.selectedSearchFilter()).toEqual(
        expect.objectContaining({ property: 'owner', value: '*' }),
      );
      f.destroy();
    });

    it('does not re-seed from the URL after the user picks a different filter', () => {
      setUrl('?owner=me');
      const f = makeFresh(buildContextWithFilters());
      // Verify initial seed took effect.
      expect(f.componentInstance.selectedSearchFilter()?.value).toBe('me');

      // User picks a different tab; the linkedSignal's `.set()` records it.
      (f.componentInstance as any).onFilterTabChanged({
        label: 'All',
        property: 'owner',
        value: '*',
      });
      expect(f.componentInstance.selectedSearchFilter()?.value).toBe('*');

      // Simulate a Luigi context change that triggers searchFilters recomputation.
      // The URL-seed flag has already latched, so `linkedSignal`'s computation
      // must NOT push the user back to `owner=me`.
      f.componentInstance.context = buildContextWithFilters();
      f.detectChanges();
      expect(f.componentInstance.selectedSearchFilter()?.value).toBe('*');
      f.destroy();
    });
  });
});
