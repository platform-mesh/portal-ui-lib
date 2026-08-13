import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import { PermissionsDefinition } from '@platform-mesh/portal-ui-lib/models';
import { firstValueFrom, of, throwError } from 'rxjs';
import { MockedObject } from 'vitest';
import { mock } from 'vitest-mock-extended';
import {
  InstancePermissionResponse,
  InstancePermissionsService,
  ResourceCheckRequest,
} from './instance-permissions.service';
import { ResourceNodeContext } from './resource-node-context';

const makePd = (overrides: Partial<PermissionsDefinition> = {}): PermissionsDefinition => ({
  group: 'core.k8s.io',
  resource: 'clusters',
  entityActions: ['get', 'update', 'delete'],
  resourceActions: ['create'],
  entityContextKey: 'entityName',
  ...overrides,
});

const makeContext = (overrides: object = {}): ResourceNodeContext =>
  ({
    accountPath: '/orgs/my-org',
    organization: 'my-org',
    portalContext: { crdGatewayApiUrl: 'https://api.example.com/graphql' },
    ...overrides,
  }) as any;

describe('InstancePermissionsService', () => {
  let service: InstancePermissionsService;
  let mockHttpClient: MockedObject<HttpClient>;
  let mockLuigiCoreService: MockedObject<LuigiCoreService>;

  const successResponse: InstancePermissionResponse[] = [
    { resource: 'clusters', name: 'cluster-1', actions: ['get', 'update'] },
    { resource: 'clusters', name: 'cluster-2', namespace: 'ns-a', actions: ['get'] },
  ];

  beforeEach(() => {
    mockHttpClient = mock();
    mockLuigiCoreService = mock();
    mockHttpClient.post.mockReturnValue(of(successResponse) as any);
    mockLuigiCoreService.getAuthData.mockReturnValue({ idToken: 'my-token' } as any);

    TestBed.configureTestingModule({
      providers: [
        InstancePermissionsService,
        { provide: HttpClient, useValue: mockHttpClient },
        { provide: LuigiCoreService, useValue: mockLuigiCoreService },
      ],
    });

    service = TestBed.inject(InstancePermissionsService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('guard: early-return paths return of([]) without HTTP', () => {
    it('returns of([]) when entityActions is empty', async () => {
      const pd = makePd({ entityActions: [] });
      const result = await firstValueFrom(
        service.checkInstances(makeContext(), pd, [{ name: 'cluster-1' }]),
      );
      expect(result).toEqual([]);
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('returns of([]) when instances array is empty', async () => {
      const pd = makePd();
      const result = await firstValueFrom(
        service.checkInstances(makeContext(), pd, []),
      );
      expect(result).toEqual([]);
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('returns of([]) when organization is missing from nodeContext', async () => {
      const result = await firstValueFrom(
        service.checkInstances(
          makeContext({ organization: undefined }),
          makePd(),
          [{ name: 'cluster-1' }],
        ),
      );
      expect(result).toEqual([]);
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('returns of([]) when auth token is missing', async () => {
      mockLuigiCoreService.getAuthData.mockReturnValue(null as any);
      const result = await firstValueFrom(
        service.checkInstances(makeContext(), makePd(), [{ name: 'cluster-1' }]),
      );
      expect(result).toEqual([]);
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });
  });

  describe('InstanceCheck payload shape', () => {
    it('POSTs to exactly /rest/permissions/resource-check', async () => {
      await firstValueFrom(
        service.checkInstances(makeContext(), makePd(), [{ name: 'cluster-1' }]),
      );
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/rest/permissions/resource-check',
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('sends Authorization: Bearer <token> header from getAuthData().idToken', async () => {
      mockLuigiCoreService.getAuthData.mockReturnValue({ idToken: 'tok-123' } as any);
      await firstValueFrom(
        service.checkInstances(makeContext(), makePd(), [{ name: 'cluster-1' }]),
      );
      const [, , options] = mockHttpClient.post.mock.calls[0];
      expect((options as any).headers).toEqual({
        Authorization: 'Bearer tok-123',
      });
    });

    it('sends organization + accountPath in body but NOT the token', async () => {
      mockLuigiCoreService.getAuthData.mockReturnValue({ idToken: 'tok-abc' } as any);
      const ctx = makeContext({
        organization: 'acme-org',
        accountPath: '/orgs/acme',
      });
      await firstValueFrom(
        service.checkInstances(ctx, makePd(), [{ name: 'inst-1' }]),
      );
      const body = mockHttpClient.post.mock.calls[0][1] as ResourceCheckRequest;
      expect((body as any).token).toBeUndefined();
      expect(body.organization).toBe('acme-org');
      expect(body.accountPath).toBe('/orgs/acme');
    });

    it('uses permissionsDefinition.resource (not entityCollection) on each check', async () => {
      const pd = makePd({ resource: 'clusters' });
      await firstValueFrom(
        service.checkInstances(makeContext(), pd, [{ name: 'c1' }]),
      );
      const body = mockHttpClient.post.mock.calls[0][1] as ResourceCheckRequest;
      expect(body.checks[0].resource).toBe('clusters');
    });

    it('uses permissionsDefinition.group on each check', async () => {
      const pd = makePd({ group: 'core.platform-mesh.io' });
      await firstValueFrom(
        service.checkInstances(makeContext(), pd, [{ name: 'c1' }]),
      );
      const body = mockHttpClient.post.mock.calls[0][1] as ResourceCheckRequest;
      expect(body.checks[0].group).toBe('core.platform-mesh.io');
    });

    it('uses permissionsDefinition.entityActions as actions on each check', async () => {
      const pd = makePd({ entityActions: ['get', 'delete'] });
      await firstValueFrom(
        service.checkInstances(makeContext(), pd, [{ name: 'c1' }]),
      );
      const body = mockHttpClient.post.mock.calls[0][1] as ResourceCheckRequest;
      expect(body.checks[0].actions).toEqual(['get', 'delete']);
    });

    it('passes instance.namespace through onto the check', async () => {
      await firstValueFrom(
        service.checkInstances(makeContext(), makePd(), [
          { name: 'pod-1', namespace: 'default' },
        ]),
      );
      const body = mockHttpClient.post.mock.calls[0][1] as ResourceCheckRequest;
      expect(body.checks[0].namespace).toBe('default');
    });

    it('check.namespace is undefined when instance has no namespace', async () => {
      await firstValueFrom(
        service.checkInstances(makeContext(), makePd(), [{ name: 'c1' }]),
      );
      const body = mockHttpClient.post.mock.calls[0][1] as ResourceCheckRequest;
      expect(body.checks[0].namespace).toBeUndefined();
    });

    it('does NOT include entityCollection, apiGroup, scope, or version on check entries', async () => {
      await firstValueFrom(
        service.checkInstances(makeContext(), makePd(), [{ name: 'c1' }]),
      );
      const body = mockHttpClient.post.mock.calls[0][1] as ResourceCheckRequest;
      const check = body.checks[0] as any;
      expect(check.entityCollection).toBeUndefined();
      expect(check.apiGroup).toBeUndefined();
      expect(check.scope).toBeUndefined();
      expect(check.version).toBeUndefined();
    });

    it('builds one check per instance', async () => {
      await firstValueFrom(
        service.checkInstances(makeContext(), makePd(), [
          { name: 'c1' },
          { name: 'c2' },
          { name: 'c3' },
        ]),
      );
      const body = mockHttpClient.post.mock.calls[0][1] as ResourceCheckRequest;
      expect(body.checks).toHaveLength(3);
      expect(body.checks.map((c) => c.name)).toEqual(['c1', 'c2', 'c3']);
    });
  });

  describe('happy-path: returns the response array directly', () => {
    it('returns the response array from the server', async () => {
      const result = await firstValueFrom(
        service.checkInstances(makeContext(), makePd(), [{ name: 'cluster-1' }]),
      );
      expect(result).toEqual(successResponse);
    });
  });

  describe('checkInstance delegates to checkInstances with a single-element array', () => {
    it('calls http.post once for checkInstance', async () => {
      await firstValueFrom(
        service.checkInstance(makeContext(), makePd(), { name: 'c1' }),
      );
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
      const body = mockHttpClient.post.mock.calls[0][1] as ResourceCheckRequest;
      expect(body.checks).toHaveLength(1);
      expect(body.checks[0].name).toBe('c1');
    });
  });

  describe('fail-open: catchError returns of([])', () => {
    it('returns [] when HTTP call errors', async () => {
      mockHttpClient.post.mockReturnValue(
        throwError(() => new Error('network error')) as any,
      );
      const result = await firstValueFrom(
        service.checkInstances(makeContext(), makePd(), [{ name: 'c1' }]),
      );
      expect(result).toEqual([]);
    });

    it('does not throw to caller on error', async () => {
      mockHttpClient.post.mockReturnValue(
        throwError(() => new Error('boom')) as any,
      );
      await expect(
        firstValueFrom(
          service.checkInstances(makeContext(), makePd(), [{ name: 'c1' }]),
        ),
      ).resolves.toEqual([]);
    });
  });
});
