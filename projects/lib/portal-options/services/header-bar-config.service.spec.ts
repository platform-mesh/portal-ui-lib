import { HeaderBarConfigServiceImpl } from './header-bar-config.service';
import { NamespaceSelectionRendererService } from './header-bar-renderers/namespace-selection-renderer.service';
import { TestBed } from '@angular/core/testing';
import { ConfigService } from '@openmfp/portal-ui-lib';
import { MockedObject } from 'vitest';

describe('HeaderBarConfigServiceImpl', () => {
  let service: HeaderBarConfigServiceImpl;
  let mockConfigService: MockedObject<ConfigService>;
  let mockNamespaceSelectionRendererService: MockedObject<NamespaceSelectionRendererService>;

  beforeEach(() => {
    const configServiceMock = {
      getPortalConfig: vi.fn(),
    };
    const namespaceSelectionRendererServiceMock = {
      create: vi.fn().mockReturnValue(() => document.createElement('div')),
    } as any;

    TestBed.configureTestingModule({
      providers: [
        HeaderBarConfigServiceImpl,
        { provide: ConfigService, useValue: configServiceMock },
        {
          provide: NamespaceSelectionRendererService,
          useValue: namespaceSelectionRendererServiceMock,
        },
      ],
    });

    service = TestBed.inject(HeaderBarConfigServiceImpl);
    mockConfigService = TestBed.inject(
      ConfigService,
    ) as MockedObject<ConfigService>;
    mockNamespaceSelectionRendererService = TestBed.inject(
      NamespaceSelectionRendererService,
    ) as MockedObject<NamespaceSelectionRendererService>;
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

    expect(mockNamespaceSelectionRendererService.create).toHaveBeenCalledWith(
      portalConfig,
    );
  });
});
