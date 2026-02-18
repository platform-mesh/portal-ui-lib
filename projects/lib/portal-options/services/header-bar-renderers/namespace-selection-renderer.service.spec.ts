import { NamespaceSelectionRendererService } from './namespace-selection-renderer.service';
import { TestBed } from '@angular/core/testing';
import { AuthService, LuigiCoreService } from '@openmfp/portal-ui-lib';
import { ResourceService } from '@platform-mesh/portal-ui-lib/services';
import { of } from 'rxjs';
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
        items: [
          { metadata: { name: 'ns1' } },
          { metadata: { name: 'ns2' } },
        ],
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

    expect(items).toEqual(['ns1', 'ns2', '-all-']);
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
        items: [
          { metadata: { name: 'ns1' } },
          { metadata: { name: 'ns2' } },
        ],
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

    const combobox = getChildrenByTag(container, 'ui5-combobox')[0] as HTMLElement;
    const event = new Event('change');
    Object.defineProperty(event, 'target', { value: { value: 'ns2' } });
    combobox.dispatchEvent(event);

    expect(addSearchParamsMock).toHaveBeenCalledWith({ namespace: 'ns2' });
  });

  it('should ignore empty namespace value from change event', () => {
    searchParams.namespace = 'ns1';
    mockAuthService.getToken.mockReturnValue('token');
    mockResourceService.list.mockReturnValue(
      of({ items: [{ metadata: { name: 'ns1' } }] } as any),
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

    const combobox = getChildrenByTag(container, 'ui5-combobox')[0] as HTMLElement;
    const event = new Event('change');
    Object.defineProperty(event, 'target', { value: { value: '   ' } });
    combobox.dispatchEvent(event);

    expect(addSearchParamsMock).not.toHaveBeenCalled();
  });

  it('should not update namespace when value is unchanged', () => {
    searchParams.namespace = 'ns1';
    mockAuthService.getToken.mockReturnValue('token');
    mockResourceService.list.mockReturnValue(
      of({ items: [{ metadata: { name: 'ns1' } }] } as any),
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

    const combobox = getChildrenByTag(container, 'ui5-combobox')[0] as HTMLElement;
    const event = new Event('change');
    Object.defineProperty(event, 'target', { value: { value: 'ns1' } });
    combobox.dispatchEvent(event);

    expect(addSearchParamsMock).not.toHaveBeenCalled();
  });

  it('should select all option by default when namespace is missing', () => {
    mockAuthService.getToken.mockReturnValue('token');
    mockResourceService.list.mockReturnValue(
      of({
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
    expect(combobox.getAttribute('value')).toBe('-all-');
    expect(addSearchParamsMock).toHaveBeenCalledWith({ namespace: '-all-' });
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
    expect(combobox.getAttribute('value')).toBe('-all-');
  });

  it('should cache namespace resources across renders', () => {
    mockAuthService.getToken.mockReturnValue('token');
    mockResourceService.list.mockReturnValue(
      of({
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
    expect(mockLuigiCoreService.routing).toHaveBeenCalled();
  });
});
