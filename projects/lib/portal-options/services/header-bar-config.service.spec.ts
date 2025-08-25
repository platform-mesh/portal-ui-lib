jest.mock('@ui5/webcomponents/dist/Breadcrumbs.js', () => ({}), { virtual: true });
jest.mock('@ui5/webcomponents/dist/BreadcrumbsItem.js', () => ({}), { virtual: true });
jest.mock('@ui5/webcomponents/dist/ComboBox.js', () => ({}), { virtual: true });

import { HeaderBarConfigServiceImpl } from './header-bar-config.service';
import { NamespaceSelectionRendererService } from './header-bar-renderers/namespace-selection-renderer.service';
import { TestBed } from '@angular/core/testing';
import { ConfigService } from '@openmfp/portal-ui-lib';

describe('HeaderBarConfigServiceImpl', () => {
  let service: HeaderBarConfigServiceImpl;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockNamespaceSelectionRendererService: jest.Mocked<NamespaceSelectionRendererService>;

  beforeEach(() => {
    const configServiceMock = {
      getPortalConfig: jest.fn(),
    } as jest.Mocked<Partial<ConfigService>>;
    const namespaceSelectionRendererServiceMock = {
      create: jest.fn().mockReturnValue(() => document.createElement('div')),
    } as any;

    TestBed.configureTestingModule({
      providers: [
        HeaderBarConfigServiceImpl,
        { provide: ConfigService, useValue: configServiceMock },
        { provide: NamespaceSelectionRendererService, useValue: namespaceSelectionRendererServiceMock },
      ],
    });

    service = TestBed.inject(HeaderBarConfigServiceImpl);
    mockConfigService = TestBed.inject(ConfigService) as jest.Mocked<ConfigService>;
    mockNamespaceSelectionRendererService = TestBed.inject(NamespaceSelectionRendererService) as jest.Mocked<NamespaceSelectionRendererService>;
  });

  it('should provide default header bar config and set renderers', async () => {
    const portalConfig = { portalContext: {} } as any;
    mockConfigService.getPortalConfig.mockResolvedValue(portalConfig);

    const cfg = await service.getConfig();

    expect(cfg.pendingItemLabel).toBe('...');
    expect(cfg.omitRoot).toBe(false);
    expect(cfg.autoHide).toBe(true);
    expect(Array.isArray(cfg.leftRenderers)).toBe(true);
    expect(cfg.leftRenderers.length).toBeGreaterThan(0);
    expect(typeof cfg.leftRenderers[0]).toBe('function');
    expect(Array.isArray(cfg.rightRenderers)).toBe(true);
    expect(cfg.rightRenderers.length).toBeGreaterThan(0);

    expect(mockNamespaceSelectionRendererService.create).toHaveBeenCalledWith(portalConfig);
  });
});
