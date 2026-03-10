import { NamespaceSelectionRendererService } from './namespace-selection-renderer.service';
import { TestBed } from '@angular/core/testing';
import { AuthService, LuigiCoreService } from '@openmfp/portal-ui-lib';
import { ResourceOperationTypeMap, ALL_NAMESPACE } from '@platform-mesh/portal-ui-lib/models';
import { ResourceService } from '@platform-mesh/portal-ui-lib/services';
import { Subject, defer, of, throwError } from 'rxjs';
import { MockedObject } from 'vitest';

vi.mock('@ui5/webcomponents/dist/ComboBox.js', () => ({}));

function getChildrenByTag(el: Element, tag: string): Element[] {
  return Array.from(el.children).filter((c) => c.tagName.toLowerCase() === tag);
}

describe('NamespaceSelectionRendererService', () => {
  let service: NamespaceSelectionRendererService;
  let mockResourceService: MockedObject<ResourceService>;
  let mockAuthService: MockedObject<AuthService>;
  let mockLuigiCoreService: MockedObject<LuigiCoreService>;
  let searchParams: { namespace?: string };
  let addSearchParamsMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    searchParams = { namespace: undefined };
    addSearchParamsMock = vi.fn((params: { namespace?: string }) => {
      searchParams.namespace = params.namespace;
    });

    const resourceServiceMock = {
      list: vi.fn(),
      resourceChangeSubscription: vi.fn(() => of(undefined)),
    } as any;

    const authServiceMock = {
      getToken: vi.fn(),
    };

    const luigiCoreServiceMock = {
      routing: vi.fn(() => ({
        getSearchParams: () => searchParams,
        addSearchParams: addSearchParamsMock,
      })),
    };

    TestBed.configureTestingModule({
      providers: [
        NamespaceSelectionRendererService,
        { provide: ResourceService, useValue: resourceServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: LuigiCoreService, useValue: luigiCoreServiceMock },
      ],
    });

    service = TestBed.inject(NamespaceSelectionRendererService);
    mockResourceService = TestBed.inject(
      ResourceService,
    ) as MockedObject<ResourceService>;
    mockAuthService = TestBed.inject(AuthService) as MockedObject<AuthService>;
    mockLuigiCoreService = TestBed.inject(
      LuigiCoreService,
    ) as MockedObject<LuigiCoreService>;
  });

  it('should render combobox with namespaces and all option', () => {
    searchParams.namespace = 'ns2';
    mockAuthService.getToken.mockReturnValue('token');
    mockResourceService.list.mockReturnValue(
      of({
        resourceVersion: '1',
        items: [{ metadata: { name: 'ns1' } }, { metadata: { name: 'ns2' } }],
      } as any),
    );

    const renderer = service.create({
      portalContext: { crdGatewayApiUrl: 'https://api.example.com/graphql' },
    } as any);
    const container = document.createElement('div');

    renderer(
      container,
      [
        {
          node: {
            context: { resourceDefinition: { scope: 'Namespaced' } },
          },
        },
      ] as any,
      () => {},
    );

    const combobox = getChildrenByTag(container, 'ui5-combobox')[0];
    const items = getChildrenByTag(combobox, 'ui5-cb-item').map((i) =>
      i.getAttribute('text'),
    );

    expect(items).toEqual(['ns1', 'ns2', ALL_NAMESPACE]);
    expect(combobox.getAttribute('value')).toBe('ns2');
  });

  it('should return container for cluster-scoped node without namespace update', () => {
    searchParams.namespace = 'ns1';

    const renderer = service.create({ portalContext: {} } as any);
    const container = document.createElement('div');
    const result = renderer(
      container,
      [
        {
          node: {
            context: { resourceDefinition: { scope: 'Cluster' } },
          },
        },
      ] as any,
      () => {},
    );

    expect(result).toBe(container);
    expect(addSearchParamsMock).not.toHaveBeenCalled();
  });

  it('should update namespace through search params on change', () => {
    searchParams.namespace = 'ns1';
    mockAuthService.getToken.mockReturnValue('token');
    mockResourceService.list.mockReturnValue(
      of({
        resourceVersion: '1',
        items: [{ metadata: { name: 'ns1' } }, { metadata: { name: 'ns2' } }],
      } as any),
    );

    const renderer = service.create({ portalContext: {} } as any);
    const container = document.createElement('div');
    renderer(
      container,
      [
        {
          node: {
            context: { resourceDefinition: { scope: 'Namespaced' } },
          },
        },
      ] as any,
      () => {},
    );

    const combobox = getChildrenByTag(
      container,
      'ui5-combobox',
    )[0] as HTMLElement;
    const event = new Event('change');
    Object.defineProperty(event, 'target', { value: { value: 'ns2' } });
    combobox.dispatchEvent(event);

    expect(addSearchParamsMock).toHaveBeenCalledWith({ namespace: 'ns2' });
  });

  it('should ignore empty namespace value from change event', () => {
    searchParams.namespace = 'ns1';
    mockAuthService.getToken.mockReturnValue('token');
    mockResourceService.list.mockReturnValue(
      of({
        resourceVersion: '1',
        items: [{ metadata: { name: 'ns1' } }],
      } as any),
    );

    const renderer = service.create({ portalContext: {} } as any);
    const container = document.createElement('div');
    renderer(
      container,
      [
        {
          node: {
            context: { resourceDefinition: { scope: 'Namespaced' } },
          },
        },
      ] as any,
      () => {},
    );

    addSearchParamsMock.mockClear();

    const combobox = getChildrenByTag(
      container,
      'ui5-combobox',
    )[0] as HTMLElement;
    const event = new Event('change');
    Object.defineProperty(event, 'target', { value: { value: '   ' } });
    combobox.dispatchEvent(event);

    expect(addSearchParamsMock).not.toHaveBeenCalled();
  });

  it('should not update namespace when value is unchanged', () => {
    searchParams.namespace = 'ns1';
    mockAuthService.getToken.mockReturnValue('token');
    mockResourceService.list.mockReturnValue(
      of({
        resourceVersion: '1',
        items: [{ metadata: { name: 'ns1' } }],
      } as any),
    );

    const renderer = service.create({ portalContext: {} } as any);
    const container = document.createElement('div');
    renderer(
      container,
      [
        {
          node: {
            context: { resourceDefinition: { scope: 'Namespaced' } },
          },
        },
      ] as any,
      () => {},
    );

    addSearchParamsMock.mockClear();

    const combobox = getChildrenByTag(
      container,
      'ui5-combobox',
    )[0] as HTMLElement;
    const event = new Event('change');
    Object.defineProperty(event, 'target', { value: { value: 'ns1' } });
    combobox.dispatchEvent(event);

    expect(addSearchParamsMock).not.toHaveBeenCalled();
  });

  it('should select all option by default when namespace is missing', () => {
    mockAuthService.getToken.mockReturnValue('token');
    mockResourceService.list.mockReturnValue(
      of({
        resourceVersion: '1',
        items: [{ metadata: { name: 'ns1' } }],
      } as any),
    );

    const renderer = service.create({ portalContext: {} } as any);
    const container = document.createElement('div');
    renderer(
      container,
      [
        {
          node: {
            context: { resourceDefinition: { scope: 'Namespaced' } },
          },
        },
      ] as any,
      () => {},
    );

    const combobox = getChildrenByTag(container, 'ui5-combobox')[0];
    expect(combobox.getAttribute('value')).toBe(ALL_NAMESPACE);
    expect(addSearchParamsMock).toHaveBeenCalledWith({
      namespace: ALL_NAMESPACE,
    });
  });

  it('should select namespace from initial value when it exists in resources', () => {
    const getSearchParamsMock = vi
      .fn()
      .mockReturnValueOnce({ namespace: 'ns1' })
      .mockReturnValue({ namespace: undefined });
    (mockLuigiCoreService.routing as any).mockReturnValue({
      getSearchParams: getSearchParamsMock,
      addSearchParams: addSearchParamsMock,
    });

    mockAuthService.getToken.mockReturnValue('token');
    mockResourceService.list.mockReturnValue(
      of({
        resourceVersion: '1',
        items: [{ metadata: { name: 'ns1' } }],
      } as any),
    );

    const renderer = service.create({ portalContext: {} } as any);
    const container = document.createElement('div');
    renderer(
      container,
      [
        {
          node: {
            context: { resourceDefinition: { scope: 'Namespaced' } },
          },
        },
      ] as any,
      () => {},
    );

    const combobox = getChildrenByTag(container, 'ui5-combobox')[0];
    expect(combobox.getAttribute('value')).toBe('ns1');
  });

  it('should handle namespace list read errors and keep combobox empty', () => {
    mockAuthService.getToken.mockReturnValue('token');
    mockResourceService.list.mockImplementation(() => {
      throw new Error('list failed');
    });

    const renderer = service.create({ portalContext: {} } as any);
    const container = document.createElement('div');
    renderer(
      container,
      [
        {
          node: {
            context: { resourceDefinition: { scope: 'Namespaced' } },
          },
        },
      ] as any,
      () => {},
    );

    const combobox = getChildrenByTag(container, 'ui5-combobox')[0];
    expect(getChildrenByTag(combobox, 'ui5-cb-item').length).toBe(1);
    expect(combobox.getAttribute('value')).toBe(ALL_NAMESPACE);
  });

  it('should cache namespace resources across renders', () => {
    mockAuthService.getToken.mockReturnValue('token');
    mockResourceService.list.mockReturnValue(
      of({
        resourceVersion: '1',
        items: [{ metadata: { name: 'ns1' } }],
      } as any),
    );

    const renderer = service.create({ portalContext: {} } as any);
    const nodeItems = [
      {
        node: {
          context: { resourceDefinition: { scope: 'Namespaced' } },
        },
      },
    ] as any;

    renderer(document.createElement('div'), nodeItems, () => {});
    renderer(document.createElement('div'), nodeItems, () => {});

    expect(mockResourceService.list).toHaveBeenCalledTimes(1);
    expect(
      mockResourceService.resourceChangeSubscription,
    ).toHaveBeenCalledTimes(1);
    expect(mockLuigiCoreService.routing).toHaveBeenCalled();
  });

  it('should update combobox items on namespace subscription changes', () => {
    const changes$ = new Subject<any>();
    mockAuthService.getToken.mockReturnValue('token');
    mockResourceService.list.mockReturnValue(
      of({
        resourceVersion: '1',
        items: [{ metadata: { name: 'ns1' } }],
      } as any),
    );
    mockResourceService.resourceChangeSubscription.mockReturnValue(
      changes$.asObservable(),
    );

    const renderer = service.create({ portalContext: {} } as any);
    const container = document.createElement('div');
    const nodeItems = [
      {
        node: {
          context: { resourceDefinition: { scope: 'Namespaced' } },
        },
      },
    ] as any;

    renderer(container, nodeItems, () => {});
    const combobox = getChildrenByTag(container, 'ui5-combobox')[0];

    changes$.next({
      type: ResourceOperationTypeMap.ADDED,
      object: { metadata: { name: 'ns2' } },
    });

    const itemsAfterAdd = getChildrenByTag(combobox, 'ui5-cb-item').map(
      (item) => item.getAttribute('text'),
    );
    expect(itemsAfterAdd).toEqual(['ns1', 'ns2', ALL_NAMESPACE]);

    changes$.next({
      type: ResourceOperationTypeMap.DELETED,
      object: { metadata: { name: 'ns1' } },
    });

    const itemsAfterDelete = getChildrenByTag(combobox, 'ui5-cb-item').map(
      (item) => item.getAttribute('text'),
    );
    expect(itemsAfterDelete).toEqual(['ns2', ALL_NAMESPACE]);
  });

  it('should retry first namespace list request up to three times', () => {
    mockAuthService.getToken.mockReturnValue('token');
    let attempts = 0;
    mockResourceService.list.mockReturnValue(
      defer(() => {
        attempts += 1;
        if (attempts < 4) {
          return throwError(() => new Error('temporary list failure'));
        }
        return of({
          resourceVersion: '1',
          items: [{ metadata: { name: 'ns1' } }],
        } as any);
      }),
    );

    const renderer = service.create({ portalContext: {} } as any);
    const container = document.createElement('div');
    const nodeItems = [
      {
        node: {
          context: { resourceDefinition: { scope: 'Namespaced' } },
        },
      },
    ] as any;

    renderer(container, nodeItems, () => {});

    const combobox = getChildrenByTag(container, 'ui5-combobox')[0];
    const items = getChildrenByTag(combobox, 'ui5-cb-item').map((item) =>
      item.getAttribute('text'),
    );

    expect(attempts).toBe(4);
    expect(items).toEqual(['ns1', ALL_NAMESPACE]);
  });

  it('should invalidate cache and unsubscribe old updates when kcpPath changes', () => {
    const oldChanges$ = new Subject<any>();
    const newChanges$ = new Subject<any>();
    mockAuthService.getToken.mockReturnValue('token');
    mockResourceService.list
      .mockReturnValueOnce(
        of({
          resourceVersion: '1',
          items: [{ metadata: { name: 'old-ns' } }],
        } as any),
      )
      .mockReturnValueOnce(
        of({
          resourceVersion: '2',
          items: [{ metadata: { name: 'new-ns' } }],
        } as any),
      );
    mockResourceService.resourceChangeSubscription
      .mockReturnValueOnce(oldChanges$.asObservable())
      .mockReturnValueOnce(newChanges$.asObservable());

    const renderer = service.create({ portalContext: {} } as any);
    const firstContainer = document.createElement('div');
    renderer(
      firstContainer,
      [
        {
          node: {
            context: {
              kcpPath: 'root:orgs:first',
              resourceDefinition: { scope: 'Namespaced' },
            },
          },
        },
      ] as any,
      () => {},
    );

    const secondContainer = document.createElement('div');
    renderer(
      secondContainer,
      [
        {
          node: {
            context: {
              kcpPath: 'root:orgs:second',
              resourceDefinition: { scope: 'Namespaced' },
            },
          },
        },
      ] as any,
      () => {},
    );

    expect(mockResourceService.list).toHaveBeenCalledTimes(2);
    expect(oldChanges$.observed).toBe(false);

    const secondCombobox = getChildrenByTag(secondContainer, 'ui5-combobox')[0];
    const secondItems = getChildrenByTag(secondCombobox, 'ui5-cb-item').map(
      (item) => item.getAttribute('text'),
    );
    expect(secondItems).toEqual(['new-ns', ALL_NAMESPACE]);
  });
});
