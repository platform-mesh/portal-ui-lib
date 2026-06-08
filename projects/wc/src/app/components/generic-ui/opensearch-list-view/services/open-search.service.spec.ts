import { OpenSearchRequest, OpenSearchService } from './open-search.service';
import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import { ResourceNodeContext } from '@platform-mesh/portal-ui-lib/services';
import { EMPTY, firstValueFrom, of } from 'rxjs';
import { MockedObject } from 'vitest';
import { mock } from 'vitest-mock-extended';

describe('OpenSearchService', () => {
  let service: OpenSearchService;
  let mockHttpClient: MockedObject<HttpClient>;
  let mockLuigiCoreService: MockedObject<LuigiCoreService>;

  const baseContext: ResourceNodeContext = {
    token: 'tkn',
    portalContext: {
      crdGatewayApiUrl: 'https://gw.example/graphql',
      openSearchApiUrl: 'https://os.example/search',
    },
    resourceDefinition: {
      apiGroup: 'core',
      version: 'v1',
      entity: 'TestKind',
      entityCollection: 'testkinds',
    },
  } as any;

  const sampleHit = {
    id: 'r1',
    score: 1,
    kind: 'TestKind',
    name: 'res1',
    namespace: 'ns',
    apiGroup: 'core',
    apiVersion: 'v1',
    workspacePath: '',
    clusterName: '',
    organizationId: '',
    organizationName: '',
    accountId: '',
    accountName: '',
    source: {
      default_fields: { 'metadata.name': 'res1' },
      filterable_fields: {},
      semantic_fields: {},
    },
  };

  beforeEach(() => {
    mockHttpClient = mock();
    mockLuigiCoreService = mock();

    TestBed.configureTestingModule({
      providers: [
        OpenSearchService,
        { provide: HttpClient, useValue: mockHttpClient },
        { provide: LuigiCoreService, useValue: mockLuigiCoreService },
      ],
    });

    service = TestBed.inject(OpenSearchService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('listResources', () => {
    it('should call the openSearchApiUrl with auth header and query params', async () => {
      mockHttpClient.get.mockReturnValue(
        of({ results: [sampleHit], source: 'os', nextCursor: 'c1' }) as any,
      );

      const request: OpenSearchRequest = {
        q: 'foo',
        resource: 'testkinds',
        filter: 'metadata.name=res1',
        limit: 5,
        cursor: 'prev',
      };

      const result = await firstValueFrom(
        service.listResources(baseContext, request),
      );

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://os.example/search',
        expect.objectContaining({
          headers: { Authorization: 'Bearer tkn' },
          params: expect.anything(),
        }),
      );
      expect(result.nextCursor).toBe('c1');
      expect(result.results[0]).toEqual(
        expect.objectContaining({
          id: 'r1',
          metadata: { name: 'res1' },
        }),
      );
    });

    it('should throw and alert when openSearchApiUrl is missing', () => {
      const ctx = {
        ...baseContext,
        portalContext: { crdGatewayApiUrl: 'x' },
      } as any;

      expect(() =>
        service.listResources(ctx, { q: 'a' } as OpenSearchRequest),
      ).toThrow();
      expect(mockLuigiCoreService.showAlert).toHaveBeenCalledWith({
        text: expect.stringContaining('OPENMFP_PORTAL_CONTEXT_OPEN_SEARCH_API_URL'),
        type: 'error',
      });
    });
  });

  describe('asReadResources', () => {
    it('should map OpenSearchResult to ReadResourcesResult', async () => {
      mockHttpClient.get.mockReturnValue(
        of({ results: [sampleHit], source: 'os', nextCursor: 'next1' }) as any,
      );

      const result = await firstValueFrom(
        service.asReadResources().list(
          baseContext,
          { limit: 5, cursor: 'prev' },
          { q: 'foo', resource: 'testkinds' },
        ),
      );

      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBe('next1');
      expect(result.remainingItemCount).toBeUndefined();
      expect(result.resourceVersion).toBeUndefined();
    });

    it('should default the resource from resourceDefinition.entityCollection', async () => {
      mockHttpClient.get.mockReturnValue(
        of({ results: [], source: 'os', nextCursor: '' }) as any,
      );

      await firstValueFrom(
        service.asReadResources().list(baseContext, {}, {}),
      );

      const params = mockHttpClient.get.mock.calls[0][1]?.params as any;
      expect(params.get('resource')).toBe('testkinds');
      expect(params.get('q')).toBe('');
    });

    it('should handle a missing resourceDefinition gracefully when no resource is given', async () => {
      mockHttpClient.get.mockReturnValue(
        of({ results: [], source: 'os', nextCursor: '' }) as any,
      );

      const ctx = {
        ...baseContext,
        resourceDefinition: undefined,
      } as ResourceNodeContext;

      const result = await firstValueFrom(
        service.asReadResources().list(ctx, {}, { q: 'x' }),
      );

      expect(result.items).toEqual([]);
      const params = mockHttpClient.get.mock.calls[0][1]?.params as any;
      // resource should not be set when neither param nor resourceDefinition provides it
      expect(params.has('resource')).toBe(false);
    });

    it('should return EMPTY for subscribe', async () => {
      const subscribed = service
        .asReadResources()
        .subscribe(baseContext, {});

      // EMPTY completes immediately without emitting
      const events: any[] = [];
      let completed = false;
      subscribed.subscribe({
        next: (v) => events.push(v),
        complete: () => (completed = true),
      });

      expect(events).toEqual([]);
      expect(completed).toBe(true);
      expect(subscribed).toBe(EMPTY);
    });
  });

  describe('expandDotNotation (via listResources)', () => {
    it('should expand dot-notation keys into nested objects on results', async () => {
      const nestedHit = {
        ...sampleHit,
        source: {
          default_fields: {
            'spec.replicas': 3,
            'spec.image': 'nginx',
          },
          filterable_fields: { 'metadata.namespace': 'ns' },
          semantic_fields: {},
        },
      };
      mockHttpClient.get.mockReturnValue(
        of({ results: [nestedHit], source: 'os', nextCursor: '' }) as any,
      );

      const result = await firstValueFrom(
        service.listResources(baseContext, { q: 'x' }),
      );

      expect(result.results[0]).toEqual(
        expect.objectContaining({
          spec: { replicas: 3, image: 'nginx' },
          metadata: { namespace: 'ns' },
        }),
      );
    });
  });
});
