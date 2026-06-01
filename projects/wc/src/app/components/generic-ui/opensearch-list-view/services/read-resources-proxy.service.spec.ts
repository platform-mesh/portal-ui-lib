import { OpenSearchService } from './open-search.service';
import { ReadResourcesProxyService } from './read-resources-proxy.service';
import { TestBed } from '@angular/core/testing';
import { LuigiClient } from '@luigi-project/client/luigi-element';
import {
  ReadResources,
  ResourceNodeContext,
  ResourceService,
} from '@platform-mesh/portal-ui-lib/services';
import { firstValueFrom, of } from 'rxjs';

describe('ReadResourcesProxyService', () => {
  let service: ReadResourcesProxyService;
  let mockResourceService: { asReadResources: ReturnType<typeof vi.fn> };
  let mockOpenSearchService: { asReadResources: ReturnType<typeof vi.fn> };
  let resourceImpl: ReadResources;
  let osImpl: ReadResources;
  let luigiClient: LuigiClient;
  let activeToggles: string[];

  const ctx: ResourceNodeContext = {
    portalContext: { crdGatewayApiUrl: 'x', openSearchApiUrl: 'y' },
    resourceDefinition: {
      apiGroup: 'core',
      version: 'v1',
      entity: 'TestKind',
      entityCollection: 'testkinds',
    },
  } as any;

  beforeEach(() => {
    activeToggles = [];

    resourceImpl = {
      list: vi.fn().mockReturnValue(
        of({
          items: [{ id: 'r-from-resource' } as any],
          nextCursor: 'rc',
          remainingItemCount: 2,
          resourceVersion: 'rv',
        }),
      ),
      subscribe: vi
        .fn()
        .mockReturnValue(of({ type: 'ADDED', object: { id: 'r1' } as any })),
    };

    osImpl = {
      list: vi.fn().mockReturnValue(
        of({ items: [{ id: 'r-from-os' } as any], nextCursor: 'oc' }),
      ),
      subscribe: vi.fn().mockReturnValue(of(undefined)),
    };

    mockResourceService = { asReadResources: vi.fn(() => resourceImpl) };
    mockOpenSearchService = { asReadResources: vi.fn(() => osImpl) };

    luigiClient = {
      getActiveFeatureToggles: () => activeToggles,
    } as any as LuigiClient;

    TestBed.configureTestingModule({
      providers: [
        ReadResourcesProxyService,
        { provide: ResourceService, useValue: mockResourceService },
        { provide: OpenSearchService, useValue: mockOpenSearchService },
      ],
    });

    service = TestBed.inject(ReadResourcesProxyService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should delegate list to ResourceService when os-provider toggle is off', async () => {
    activeToggles = [];

    const res = await firstValueFrom(
      service
        .forContext(luigiClient)
        .list(ctx, { limit: 5 }, { q: 'foo' }),
    );

    expect(mockResourceService.asReadResources).toHaveBeenCalled();
    expect(mockOpenSearchService.asReadResources).not.toHaveBeenCalled();
    expect(resourceImpl.list).toHaveBeenCalledWith(
      ctx,
      { limit: 5 },
      { q: 'foo' },
    );
    expect(res.items[0].id).toBe('r-from-resource');
  });

  it('should delegate list to OpenSearchService when os-provider toggle is on', async () => {
    activeToggles = ['os-provider'];

    const res = await firstValueFrom(
      service
        .forContext(luigiClient)
        .list(ctx, { limit: 5 }, { q: 'foo' }),
    );

    expect(mockOpenSearchService.asReadResources).toHaveBeenCalled();
    expect(mockResourceService.asReadResources).not.toHaveBeenCalled();
    expect(osImpl.list).toHaveBeenCalledWith(
      ctx,
      { limit: 5 },
      { q: 'foo' },
    );
    expect(res.items[0].id).toBe('r-from-os');
  });

  it('should re-evaluate the toggle on every call (defer)', async () => {
    const adapter = service.forContext(luigiClient);

    activeToggles = [];
    await firstValueFrom(adapter.list(ctx, {}, {}));
    expect(resourceImpl.list).toHaveBeenCalledTimes(1);
    expect(osImpl.list).not.toHaveBeenCalled();

    activeToggles = ['os-provider'];
    await firstValueFrom(adapter.list(ctx, {}, {}));
    expect(osImpl.list).toHaveBeenCalledTimes(1);
    expect(resourceImpl.list).toHaveBeenCalledTimes(1);
  });

  it('should delegate subscribe to ResourceService when toggle is off', async () => {
    activeToggles = [];

    const res = await firstValueFrom(
      service
        .forContext(luigiClient)
        .subscribe(ctx, { resourceVersion: 'rv-1' }),
    );

    expect(resourceImpl.subscribe).toHaveBeenCalledWith(ctx, {
      resourceVersion: 'rv-1',
    });
    expect(res?.type).toBe('ADDED');
  });

  it('should delegate subscribe to OpenSearchService when toggle is on', async () => {
    activeToggles = ['os-provider'];

    const res = await firstValueFrom(
      service.forContext(luigiClient).subscribe(ctx, {}),
    );

    expect(osImpl.subscribe).toHaveBeenCalledWith(ctx, {});
    expect(resourceImpl.subscribe).not.toHaveBeenCalled();
    expect(res).toBeUndefined();
  });

  it('should ignore unrelated feature toggles', async () => {
    activeToggles = ['other', 'neoNephosDemo'];

    await firstValueFrom(
      service.forContext(luigiClient).list(ctx, {}, {}),
    );

    expect(resourceImpl.list).toHaveBeenCalled();
    expect(osImpl.list).not.toHaveBeenCalled();
  });
});
