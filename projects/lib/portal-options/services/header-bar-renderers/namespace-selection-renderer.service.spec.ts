import { NamespaceSelectionRendererService } from './namespace-selection-renderer.service';
import { TestBed } from '@angular/core/testing';
import { AuthService, LuigiCoreService } from '@openmfp/portal-ui-lib';
import {
  ALL_NAMESPACE,
  ResourceOperationTypeMap,
} from '@platform-mesh/portal-ui-lib/models';
import { ResourceService } from '@platform-mesh/portal-ui-lib/services';
import { Subject, defer, of, throwError } from 'rxjs';
import { MockedObject } from 'vitest';

vi.mock('@ui5/webcomponents/dist/Input.js', () => ({}));
vi.mock('@ui5/webcomponents/dist/Popover.js', () => ({}));

function selectedValue(container: Element): string | null | undefined {
  return container
    .querySelector('[data-testid="namespace-selection-combobox"]')
    ?.getAttribute('data-value');
}

function namespaceOptions(container: Element): (string | undefined)[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>('.pm-namespace-menu__option'),
  ).map((option) => option.dataset['value']);
}

function chooseNamespace(container: Element, value: string): void {
  container
    .querySelector<HTMLElement>(
      `.pm-namespace-menu__option[data-value="${value}"]`,
    )!
    .click();
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
      setInGlobalContext: vi.fn(),
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

  it('should render the all option first, then the namespaces', () => {
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
    const items = namespaceOptions(container);

    expect(items).toEqual([ALL_NAMESPACE, 'ns1', 'ns2']);
    expect(selectedValue(container)).toBe('ns2');
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

  it('should update namespace through search params when an option is chosen', () => {
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

    chooseNamespace(container, 'ns2');

    expect(addSearchParamsMock).toHaveBeenCalledWith({ namespace: 'ns2' });
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

    chooseNamespace(container, 'ns1');

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
    expect(selectedValue(container)).toBe(ALL_NAMESPACE);
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
    expect(selectedValue(container)).toBe('ns1');
  });

  it('should handle namespace list read errors and offer only the all option', () => {
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
    expect(namespaceOptions(container)).toEqual([ALL_NAMESPACE]);
    expect(selectedValue(container)).toBe(ALL_NAMESPACE);
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

  it('should update options on namespace subscription changes', () => {
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

    changes$.next({
      type: ResourceOperationTypeMap.ADDED,
      object: { metadata: { name: 'ns2' } },
    });

    const itemsAfterAdd = namespaceOptions(container);
    expect(itemsAfterAdd).toEqual([ALL_NAMESPACE, 'ns1', 'ns2']);

    changes$.next({
      type: ResourceOperationTypeMap.DELETED,
      object: { metadata: { name: 'ns1' } },
    });

    const itemsAfterDelete = namespaceOptions(container);
    expect(itemsAfterDelete).toEqual([ALL_NAMESPACE, 'ns2']);
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
    const items = namespaceOptions(container);

    expect(attempts).toBe(4);
    expect(items).toEqual([ALL_NAMESPACE, 'ns1']);
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
    const secondItems = namespaceOptions(secondContainer);
    expect(secondItems).toEqual([ALL_NAMESPACE, 'new-ns']);
  });
});
