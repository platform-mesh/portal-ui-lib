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

  beforeEach(() => {
    const resourceServiceMock = {
      list: vi.fn(),
    } as any;

    const authServiceMock = {
      getToken: vi.fn(),
    };

    const luigiCoreServiceMock = {
      navigation: vi.fn(),
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

  it('should render namespace combobox when namespaced node is present and navigate on change', async () => {
    const origPathname = window.location.pathname;
    Object.defineProperty(window, 'location', {
      value: { pathname: '/ns1/workloads' },
      writable: true,
    });

    const portalConfig: any = {
      portalContext: { crdGatewayApiUrl: 'https://api.example.com/graphql' },
    };

    mockAuthService.getToken.mockReturnValue('token');

    mockResourceService.list.mockReturnValue(
      of([
        { metadata: { name: 'ns1' } } as any,
        { metadata: { name: 'ns2' } } as any,
      ]),
    );

    const navigateMock = vi.fn();
    (mockLuigiCoreService.navigation as any).mockReturnValue({
      navigate: navigateMock,
    });

    const renderer = service.create(portalConfig);

    const container = document.createElement('div');

    const nodeItems = [
      { label: 'Root', node: {} },
      {
        label: 'Workloads',
        node: {
          navigationContext: 'workloads',
          context: { resourceDefinition: { scope: 'Namespaced' } },
        },
      },
    ] as any;

    const combobox = renderer(container, nodeItems, () => {});

    expect(combobox).toBeTruthy();
    const cb = getChildrenByTag(container, 'ui5-combobox')[0];
    expect(cb).toBeTruthy();

    const cbItems = getChildrenByTag(cb, 'ui5-cb-item');
    const texts = cbItems.map((i) => i.getAttribute('text'));
    expect(texts).toEqual(['ns1', 'ns2']);

    expect(cb.getAttribute('value')).toBe('ns1');

    const namespaceChangeEvent = new Event('change');
    Object.defineProperty(namespaceChangeEvent, 'target', {
      value: { value: 'ns2' },
    });
    cb.dispatchEvent(namespaceChangeEvent);

    expect(navigateMock).toHaveBeenCalledWith('/ns2/workloads');

    Object.defineProperty(window, 'location', {
      value: { pathname: origPathname },
    });
  });

  it('should return container unchanged when no namespaced node is present', async () => {
    const portalConfig: any = { portalContext: {} };

    const renderer = service.create(portalConfig);
    const container = document.createElement('div');
    const span = document.createElement('span');
    span.textContent = 'keep-me';
    container.appendChild(span);

    const result = renderer(
      container,
      [{ label: 'A', node: {} }] as any,
      () => {},
    );

    expect(result).toBe(container);
    expect(container.children.length).toBe(1);
    expect(container.children[0].textContent).toBe('keep-me');
  });

  it('should handle list errors gracefully and log error with no extra items added', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const portalConfig: any = {
      portalContext: { crdGatewayApiUrl: 'https://api.example.com/graphql' },
    };
    mockAuthService.getToken.mockReturnValue('token');

    mockResourceService.list.mockImplementation(() => {
      throw new Error('list failed');
    });

    const origPathname = window.location.pathname;
    Object.defineProperty(window, 'location', {
      value: { pathname: '/nsx/workloads' },
      writable: true,
    });

    const renderer = service.create(portalConfig);
    const container = document.createElement('div');
    const nodeItems = [
      {
        label: 'Workloads',
        node: {
          navigationContext: 'workloads',
          context: { resourceDefinition: { scope: 'Namespaced' } },
        },
      },
    ] as any;

    const cb = renderer(container, nodeItems, () => {});
    expect(cb).not.toBeNull();

    const ui5cb = getChildrenByTag(container, 'ui5-combobox')[0];
    expect(ui5cb).toBeTruthy();
    const items = getChildrenByTag(ui5cb, 'ui5-cb-item');
    expect(items.length).toBe(0);

    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
    Object.defineProperty(window, 'location', {
      value: { pathname: origPathname },
    });
  });

  it('should skip items without name and avoid duplicates', async () => {
    const origPathname = window.location.pathname;
    Object.defineProperty(window, 'location', {
      value: { pathname: '/ns1/workloads' },
      writable: true,
    });

    const portalConfig: any = {
      portalContext: { crdGatewayApiUrl: 'https://api.example.com/graphql' },
    };

    mockAuthService.getToken.mockReturnValue('token');

    mockResourceService.list.mockReturnValue(
      of([
        { metadata: {} } as any,
        { metadata: { name: 'ns1' } } as any,
        { metadata: { name: 'ns1' } } as any,
      ]),
    );

    const renderer = service.create(portalConfig);
    const container = document.createElement('div');
    const nodeItems = [
      {
        label: 'Workloads',
        node: {
          navigationContext: 'workloads',
          context: { resourceDefinition: { scope: 'Namespaced' } },
        },
      },
    ] as any;

    renderer(container, nodeItems, () => {});

    const cb = getChildrenByTag(container, 'ui5-combobox')[0];
    const items = getChildrenByTag(cb, 'ui5-cb-item');
    const texts = items.map((i) => i.getAttribute('text'));

    expect(texts).toEqual(['ns1']);

    Object.defineProperty(window, 'location', {
      value: { pathname: origPathname },
    });
  });

  it('should not navigate when change event has no target.value (undefined) -> trimmed to empty', async () => {
    const origPathname = window.location.pathname;
    Object.defineProperty(window, 'location', {
      value: { pathname: '/ns1/workloads' },
      writable: true,
    });

    const portalConfig: any = {
      portalContext: { crdGatewayApiUrl: 'https://api.example.com/graphql' },
    };

    mockAuthService.getToken.mockReturnValue('token');
    mockResourceService.list.mockReturnValue(
      of([{ metadata: { name: 'ns1' } } as any]),
    );

    const navigateMock = vi.fn();
    (mockLuigiCoreService.navigation as any).mockReturnValue({
      navigate: navigateMock,
    });

    const renderer = service.create(portalConfig);
    const container = document.createElement('div');
    const nodeItems = [
      {
        label: 'Workloads',
        node: {
          navigationContext: 'workloads',
          context: { resourceDefinition: { scope: 'Namespaced' } },
        },
      },
    ] as any;

    renderer(container, nodeItems, () => {});

    const cb = getChildrenByTag(container, 'ui5-combobox')[0] as HTMLElement;

    const ev = new Event('change');
    Object.defineProperty(ev, 'target', { value: {} });
    cb.dispatchEvent(ev);

    expect(navigateMock).not.toHaveBeenCalled();

    Object.defineProperty(window, 'location', {
      value: { pathname: origPathname },
    });
  });

  it('should not navigate when change event value is whitespace only', async () => {
    const origPathname = window.location.pathname;
    Object.defineProperty(window, 'location', {
      value: { pathname: '/ns1/workloads' },
      writable: true,
    });

    const portalConfig: any = {
      portalContext: { crdGatewayApiUrl: 'https://api.example.com/graphql' },
    };

    mockAuthService.getToken.mockReturnValue('token');
    mockResourceService.list.mockReturnValue(
      of([{ metadata: { name: 'ns1' } } as any]),
    );

    const navigateMock = vi.fn();
    (mockLuigiCoreService.navigation as any).mockReturnValue({
      navigate: navigateMock,
    });

    const renderer = service.create(portalConfig);
    const container = document.createElement('div');
    const nodeItems = [
      {
        label: 'Workloads',
        node: {
          navigationContext: 'workloads',
          context: { resourceDefinition: { scope: 'Namespaced' } },
        },
      },
    ] as any;

    renderer(container, nodeItems, () => {});

    const cb = getChildrenByTag(container, 'ui5-combobox')[0] as HTMLElement;

    const ev = new Event('change');
    Object.defineProperty(ev, 'target', { value: { value: '   ' } });
    cb.dispatchEvent(ev);

    expect(navigateMock).not.toHaveBeenCalled();

    Object.defineProperty(window, 'location', {
      value: { pathname: origPathname },
    });
  });

  it('should return null namespaceName when namespaced node is first segment (getNamespaceNodeName index === 0)', async () => {
    const origPathname = window.location.pathname;
    Object.defineProperty(window, 'location', {
      value: { pathname: '/workloads' },
      writable: true,
    });

    const portalConfig: any = {
      portalContext: { crdGatewayApiUrl: 'https://api.example.com/graphql' },
    };

    mockAuthService.getToken.mockReturnValue('token');
    mockResourceService.list.mockReturnValue(
      of([
        { metadata: { name: 'ns1' } } as any,
        { metadata: { name: 'ns2' } } as any,
      ]),
    );

    const navigateMock = vi.fn();
    (mockLuigiCoreService.navigation as any).mockReturnValue({
      navigate: navigateMock,
    });

    const renderer = service.create(portalConfig);
    const container = document.createElement('div');
    const nodeItems = [
      {
        label: 'Workloads',
        node: {
          navigationContext: 'workloads',
          context: { resourceDefinition: { scope: 'Namespaced' } },
        },
      },
    ] as any;

    renderer(container, nodeItems, () => {});

    const cb = getChildrenByTag(container, 'ui5-combobox')[0] as HTMLElement;

    // namespaceName null => value не выставится
    expect(cb.getAttribute('value')).toBeNull();

    // и смена не должна навигировать, т.к. replacePathSegment(name=null) early-return
    const ev = new Event('change');
    Object.defineProperty(ev, 'target', { value: { value: 'ns2' } });
    cb.dispatchEvent(ev);

    expect(navigateMock).not.toHaveBeenCalled();

    Object.defineProperty(window, 'location', {
      value: { pathname: origPathname },
    });
  });

  it('should cache namespaceResources$ so ResourceService.list is called only once across multiple renders', async () => {
    const origPathname = window.location.pathname;
    Object.defineProperty(window, 'location', {
      value: { pathname: '/ns1/workloads' },
      writable: true,
    });

    const portalConfig: any = {
      portalContext: { crdGatewayApiUrl: 'https://api.example.com/graphql' },
    };

    mockAuthService.getToken.mockReturnValue('token');
    mockResourceService.list.mockReturnValue(
      of([{ metadata: { name: 'ns1' } } as any]),
    );

    const renderer = service.create(portalConfig);

    const nodeItems = [
      {
        label: 'Workloads',
        node: {
          navigationContext: 'workloads',
          context: { resourceDefinition: { scope: 'Namespaced' } },
        },
      },
    ] as any;

    const container1 = document.createElement('div');
    const container2 = document.createElement('div');

    renderer(container1, nodeItems, () => {});
    renderer(container2, nodeItems, () => {});

    expect(mockResourceService.list).toHaveBeenCalledTimes(1);

    Object.defineProperty(window, 'location', {
      value: { pathname: origPathname },
    });
  });
});
