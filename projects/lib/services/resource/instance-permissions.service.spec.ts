import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import { ResourceNodeContext } from './resource-node-context';
import {
  InstancePermissionsService,
  ResourceCheckRequest,
  InstancePermissionResponse,
} from './instance-permissions.service';
import { firstValueFrom, of, Subject, throwError } from 'rxjs';
import { MockedObject } from 'vitest';
import { mock } from 'vitest-mock-extended';

const makeRd = (overrides: object = {}) => ({
  entity: 'Cluster',
  entityCollection: 'clusters',
  apiGroup: 'core.k8s.io',
  version: 'v1alpha1',
  scope: 'Cluster' as const,
  checkActionsForInstance: ['get', 'update', 'delete'],
  ...overrides,
});

const makeContext = (overrides: object = {}): ResourceNodeContext =>
  ({
    token: 'my-token',
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
    { resource: 'Cluster', name: 'cluster-1', actions: ['get', 'update'] },
    { resource: 'Cluster', name: 'cluster-2', namespace: 'ns-a', actions: ['get'] },
  ];

  beforeEach(() => {
    mockHttpClient = mock();
    mockLuigiCoreService = mock();
    mockHttpClient.post.mockReturnValue(of(successResponse) as any);

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

  describe('guard: no-op paths return of({}) without HTTP', () => {
    it('returns of({}) when checkActionsForInstance is absent', async () => {
      const rd = makeRd({ checkActionsForInstance: undefined });
      const result = await firstValueFrom(
        service.checkInstances(makeContext(), rd as any, [
          { name: 'cluster-1' },
        ]),
      );
      expect(result).toEqual({});
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('returns of({}) when checkActionsForInstance is empty array', async () => {
      const rd = makeRd({ checkActionsForInstance: [] });
      const result = await firstValueFrom(
        service.checkInstances(makeContext(), rd as any, [
          { name: 'cluster-1' },
        ]),
      );
      expect(result).toEqual({});
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('returns of({}) when instances array is empty', async () => {
      const rd = makeRd();
      const result = await firstValueFrom(
        service.checkInstances(makeContext(), rd as any, []),
      );
      expect(result).toEqual({});
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });
  });

  describe('HTTP request construction', () => {
    it('POSTs to exactly /rest/permissions/resource-check', async () => {
      await firstValueFrom(
        service.checkInstances(makeContext(), makeRd() as any, [
          { name: 'cluster-1' },
        ]),
      );
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/rest/permissions/resource-check',
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('sends Authorization: Bearer <token> header', async () => {
      await firstValueFrom(
        service.checkInstances(makeContext({ token: 'tok-123' }), makeRd() as any, [
          { name: 'cluster-1' },
        ]),
      );
      const [, , options] = mockHttpClient.post.mock.calls[0];
      expect((options as any).headers).toEqual({
        Authorization: 'Bearer tok-123',
      });
    });

    it('sends token + organization + accountPath in body', async () => {
      const ctx = makeContext({
        token: 'tok-abc',
        organization: 'acme-org',
        accountPath: '/orgs/acme',
      });
      await firstValueFrom(
        service.checkInstances(ctx, makeRd() as any, [{ name: 'inst-1' }]),
      );
      const body = mockHttpClient.post.mock.calls[0][1] as ResourceCheckRequest;
      expect(body.token).toBe('tok-abc');
      expect(body.organization).toBe('acme-org');
      expect(body.accountPath).toBe('/orgs/acme');
    });

    it('uses resource=entity (NOT entityCollection) in checks', async () => {
      const rd = makeRd({ entity: 'Cluster', entityCollection: 'clusters' });
      await firstValueFrom(
        service.checkInstances(makeContext(), rd as any, [{ name: 'c1' }]),
      );
      const body = mockHttpClient.post.mock.calls[0][1] as ResourceCheckRequest;
      expect(body.checks[0].resource).toBe('Cluster');
      expect(body.checks[0].entityCollection).toBe('clusters');
    });

    it('uses checkActionsForInstance as actions on each check', async () => {
      const rd = makeRd({ checkActionsForInstance: ['get', 'delete'] });
      await firstValueFrom(
        service.checkInstances(makeContext(), rd as any, [{ name: 'c1' }]),
      );
      const body = mockHttpClient.post.mock.calls[0][1] as ResourceCheckRequest;
      expect(body.checks[0].actions).toEqual(['get', 'delete']);
    });

    it('omits namespace on checks for Cluster-scoped resources', async () => {
      const rd = makeRd({ scope: 'Cluster' });
      await firstValueFrom(
        service.checkInstances(makeContext(), rd as any, [
          { name: 'c1', namespace: 'some-ns' },
        ]),
      );
      const body = mockHttpClient.post.mock.calls[0][1] as ResourceCheckRequest;
      expect(body.checks[0].namespace).toBeUndefined();
    });

    it('includes namespace on checks for Namespaced resources when instance has namespace', async () => {
      const rd = makeRd({ scope: 'Namespaced' });
      await firstValueFrom(
        service.checkInstances(makeContext(), rd as any, [
          { name: 'pod-1', namespace: 'default' },
        ]),
      );
      const body = mockHttpClient.post.mock.calls[0][1] as ResourceCheckRequest;
      expect(body.checks[0].namespace).toBe('default');
    });

    it('omits namespace for Namespaced resource when instance.namespace is undefined', async () => {
      const rd = makeRd({ scope: 'Namespaced' });
      await firstValueFrom(
        service.checkInstances(makeContext(), rd as any, [
          { name: 'pod-1' },
        ]),
      );
      const body = mockHttpClient.post.mock.calls[0][1] as ResourceCheckRequest;
      expect(body.checks[0].namespace).toBeUndefined();
    });

    it('builds one check per instance', async () => {
      const rd = makeRd();
      await firstValueFrom(
        service.checkInstances(makeContext(), rd as any, [
          { name: 'c1' },
          { name: 'c2' },
          { name: 'c3' },
        ]),
      );
      const body = mockHttpClient.post.mock.calls[0][1] as ResourceCheckRequest;
      expect(body.checks).toHaveLength(3);
      expect(body.checks.map((c) => c.name)).toEqual(['c1', 'c2', 'c3']);
    });

    it('defaults apiGroup to empty string when resourceDefinition.apiGroup is undefined', async () => {
      const rd = makeRd({ apiGroup: undefined });
      await firstValueFrom(
        service.checkInstances(makeContext(), rd as any, [{ name: 'c1' }]),
      );
      const body = mockHttpClient.post.mock.calls[0][1] as ResourceCheckRequest;
      expect(body.checks[0].apiGroup).toBe('');
    });

    it('defaults scope to "Cluster" when resourceDefinition.scope is undefined', async () => {
      const rd = makeRd({ scope: undefined });
      await firstValueFrom(
        service.checkInstances(makeContext(), rd as any, [{ name: 'c1' }]),
      );
      const body = mockHttpClient.post.mock.calls[0][1] as ResourceCheckRequest;
      expect(body.checks[0].scope).toBe('Cluster');
    });

    it('falls back to organization from getGlobalContext when nodeContext lacks it', async () => {
      mockLuigiCoreService.getGlobalContext.mockReturnValue({
        organization: 'global-org',
      } as any);
      const ctx = makeContext({ organization: undefined });
      await firstValueFrom(
        service.checkInstances(ctx, makeRd() as any, [{ name: 'c1' }]),
      );
      const body = mockHttpClient.post.mock.calls[0][1] as ResourceCheckRequest;
      expect(body.organization).toBe('global-org');
    });
  });

  describe('response mapping', () => {
    it('maps response to nested map using instancePermissionKey', async () => {
      mockHttpClient.post.mockReturnValue(
        of([
          { resource: 'Cluster', name: 'c1', actions: ['get', 'update'] },
          {
            resource: 'Pod',
            name: 'p1',
            namespace: 'default',
            actions: ['get'],
          },
        ] as InstancePermissionResponse[]) as any,
      );

      const result = await firstValueFrom(
        service.checkInstances(makeContext(), makeRd() as any, [{ name: 'c1' }]),
      );

      expect(result['Cluster']['/c1']).toEqual(['get', 'update']);
      expect(result['Pod']['default/p1']).toEqual(['get']);
    });

    it('handles response entry where name is undefined by falling back to empty string key', async () => {
      mockHttpClient.post.mockReturnValue(
        of([
          { resource: 'Cluster', namespace: 'ns-a', actions: ['get'] },
        ] as InstancePermissionResponse[]) as any,
      );

      const result = await firstValueFrom(
        service.checkInstances(makeContext(), makeRd() as any, [{ name: 'c1' }]),
      );

      // instancePermissionKey('ns-a', '') = 'ns-a/'
      expect(result['Cluster']['ns-a/']).toEqual(['get']);
    });

    it('groups multiple responses by resource', async () => {
      mockHttpClient.post.mockReturnValue(
        of([
          { resource: 'Cluster', name: 'c1', actions: ['get'] },
          { resource: 'Cluster', name: 'c2', actions: ['get', 'delete'] },
        ] as InstancePermissionResponse[]) as any,
      );

      const result = await firstValueFrom(
        service.checkInstances(makeContext(), makeRd() as any, [
          { name: 'c1' },
          { name: 'c2' },
        ]),
      );

      expect(Object.keys(result['Cluster'])).toHaveLength(2);
      expect(result['Cluster']['/c1']).toEqual(['get']);
      expect(result['Cluster']['/c2']).toEqual(['get', 'delete']);
    });
  });

  describe('fail-open: catchError returns of({})', () => {
    it('returns {} when HTTP call errors', async () => {
      mockHttpClient.post.mockReturnValue(
        throwError(() => new Error('network error')) as any,
      );

      const result = await firstValueFrom(
        service.checkInstances(makeContext(), makeRd() as any, [{ name: 'c1' }]),
      );
      expect(result).toEqual({});
    });

    it('does not throw to caller on error', async () => {
      mockHttpClient.post.mockReturnValue(
        throwError(() => new Error('boom')) as any,
      );

      await expect(
        firstValueFrom(
          service.checkInstances(makeContext(), makeRd() as any, [{ name: 'c1' }]),
        ),
      ).resolves.toEqual({});
    });
  });

  describe('in-flight cache', () => {
    it('coalesces two concurrent identical calls into one HTTP request', async () => {
      const subject = new Subject<InstancePermissionResponse[]>();
      mockHttpClient.post.mockReturnValue(subject.asObservable() as any);

      const ctx = makeContext();
      const rd = makeRd() as any;
      const instances = [{ name: 'c1' }];

      const p1 = firstValueFrom(service.checkInstances(ctx, rd, instances));
      const p2 = firstValueFrom(service.checkInstances(ctx, rd, instances));

      subject.next([]);
      subject.complete();

      await Promise.all([p1, p2]);
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
    });

    it('evicts cache on error so next call retries HTTP', async () => {
      mockHttpClient.post
        .mockReturnValueOnce(throwError(() => new Error('fail')) as any)
        .mockReturnValueOnce(of([]) as any);

      const ctx = makeContext();
      const rd = makeRd() as any;
      const instances = [{ name: 'c1' }];

      const r1 = await firstValueFrom(service.checkInstances(ctx, rd, instances));
      expect(r1).toEqual({});

      const r2 = await firstValueFrom(service.checkInstances(ctx, rd, instances));
      expect(r2).toEqual({});

      expect(mockHttpClient.post).toHaveBeenCalledTimes(2);
    });

    it('uses separate cache entries for different instance sets', async () => {
      mockHttpClient.post.mockReturnValue(of([]) as any);

      const ctx = makeContext();
      const rd = makeRd() as any;

      await firstValueFrom(service.checkInstances(ctx, rd, [{ name: 'c1' }]));
      await firstValueFrom(service.checkInstances(ctx, rd, [{ name: 'c2' }]));

      expect(mockHttpClient.post).toHaveBeenCalledTimes(2);
    });
  });
});
