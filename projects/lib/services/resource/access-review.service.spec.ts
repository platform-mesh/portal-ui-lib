import {
  AccessReviewGraphQLResponse,
  AccessReviewService,
  SelfClusterAccessReview,
  accessReviewMutation,
  accessReviewSubscription,
  accessReviewSubscriptionField,
} from './access-review.service';
import { GatewayService } from './gateway.service';
import { ResourceNodeContext } from './resource-node-context';
import { ResourceService } from './resource.service';
import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import { firstValueFrom, of, throwError } from 'rxjs';
import { MockedObject } from 'vitest';
import { mock } from 'vitest-mock-extended';

const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }));

vi.mock('graphql-sse', () => ({
  createClient: createClientMock,
}));

const makeContext = (overrides: object = {}): ResourceNodeContext =>
  ({
    portalContext: {
      crdGatewayApiUrl:
        'https://portal.example.com/api/kubernetes-graphql-gateway/root:orgs:acme/graphql',
    },
    resourceDefinition: {
      entity: 'Account',
      entityCollection: 'Accounts',
      version: 'v1alpha1',
    },
    ...overrides,
  }) as any;

const review: SelfClusterAccessReview = {
  status: {
    clusters: [
      {
        clusterName: 'c-team-b',
        endpoint: 'https://kcp.example.com/clusters/c-team-b',
        account: {
          name: 'team-b',
          path: 'root:orgs:acme:team-b',
          type: 'account',
          ready: false,
        },
      },
      {
        clusterName: 'c-acme',
        endpoint: 'https://kcp.example.com/clusters/c-acme',
        account: {
          name: 'acme',
          path: 'root:orgs:acme',
          type: 'org',
          ready: true,
        },
      },
      {
        clusterName: 'c-team-a',
        endpoint: 'https://kcp.example.com/clusters/c-team-a',
        account: {
          name: 'team-a',
          path: 'root:orgs:acme:team-a',
          displayName: 'Team A',
          type: 'account',
          ready: true,
        },
      },
      {
        clusterName: 'c-nested',
        endpoint: 'https://kcp.example.com/clusters/c-nested',
        account: {
          name: 'nested',
          path: 'root:orgs:acme:team-a:nested',
          type: 'account',
          ready: true,
        },
      },
      // What a provider that knows no accounts returns.
      {
        clusterName: 'c-plain',
        endpoint: 'https://kcp.example.com/clusters/c-plain',
      },
    ],
  },
};

const answer = (
  r: SelfClusterAccessReview | null,
): AccessReviewGraphQLResponse => ({
  data: {
    access_platform_mesh_io: { v1alpha1: { createSelfClusterAccessReview: r } },
  },
});

describe('AccessReviewService', () => {
  let service: AccessReviewService;
  let mockHttpClient: MockedObject<HttpClient>;
  let mockLuigiCoreService: MockedObject<LuigiCoreService>;
  let mockGatewayService: MockedObject<GatewayService>;
  let mockResourceService: MockedObject<ResourceService>;

  beforeEach(() => {
    mockHttpClient = mock();
    mockLuigiCoreService = mock();
    mockGatewayService = mock();
    mockResourceService = mock();
    mockHttpClient.post.mockReturnValue(of(answer(review)) as any);
    mockLuigiCoreService.getAuthData.mockReturnValue({
      idToken: 'my-token',
    } as any);
    mockGatewayService.resolveKcpPath.mockReturnValue('root:orgs:acme');
    mockResourceService.isAvailable.mockImplementation(
      (item, availableWhenNotReady = false) =>
        !!item.ready || availableWhenNotReady,
    );
    mockResourceService.getAccessibleName.mockImplementation((item) =>
      item.ready ? undefined : 'Resource is not ready',
    );

    TestBed.configureTestingModule({
      providers: [
        AccessReviewService,
        { provide: HttpClient, useValue: mockHttpClient },
        { provide: LuigiCoreService, useValue: mockLuigiCoreService },
        { provide: GatewayService, useValue: mockGatewayService },
        { provide: ResourceService, useValue: mockResourceService },
      ],
    });

    service = TestBed.inject(AccessReviewService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('asks the review through the gateway, addressed to the workspace, as the user', async () => {
    await firstValueFrom(service.listAccounts(makeContext()));

    expect(mockHttpClient.post).toHaveBeenCalledWith(
      'https://portal.example.com/api/kubernetes-graphql-gateway/single-access/graphql',
      {
        query: accessReviewMutation,
        extensions: { clusterTarget: 'root:orgs:acme' },
      },
      { headers: { Authorization: 'Bearer my-token' } },
    );
  });

  it('asks the gateway endpoint the list view names', async () => {
    const context = makeContext({
      resourceDefinition: {
        ui: { listView: { accessReview: { gatewayCluster: 'kcp-access' } } },
      },
    });

    await firstValueFrom(service.listAccounts(context));

    expect(mockHttpClient.post.mock.calls[0][0]).toBe(
      'https://portal.example.com/api/kubernetes-graphql-gateway/kcp-access/graphql',
    );
  });

  it('lists the accounts directly below the workspace as resources, by name', async () => {
    const result = await firstValueFrom(service.listAccounts(makeContext()));

    expect(result.resourceVersion).toBe('');
    expect(result.continue).toBeUndefined();
    expect(result.items).toEqual([
      {
        id: 'team-a',
        metadata: { name: 'team-a' },
        spec: { type: 'account', displayName: 'Team A' },
        status: { conditions: [{ type: 'Ready', status: 'True' }] },
        ready: true,
        isAvailable: true,
        accessibleName: undefined,
      },
      {
        id: 'team-b',
        metadata: { name: 'team-b' },
        spec: { type: 'account', displayName: undefined },
        status: { conditions: [{ type: 'Ready', status: 'False' }] },
        ready: false,
        isAvailable: false,
        accessibleName: 'Resource is not ready',
      },
    ]);
  });

  it('lists the accounts below an account when the node is inside one', async () => {
    mockGatewayService.resolveKcpPath.mockReturnValue('root:orgs:acme:team-a');

    const result = await firstValueFrom(service.listAccounts(makeContext()));

    expect((mockHttpClient.post.mock.calls[0][1] as any).extensions).toEqual({
      clusterTarget: 'root:orgs:acme:team-a',
    });
    expect(result.items.map((i) => i.metadata.name)).toEqual(['nested']);
  });

  it('is empty for a review without clusters', async () => {
    mockHttpClient.post.mockReturnValue(of(answer({})) as any);

    const result = await firstValueFrom(service.listAccounts(makeContext()));

    expect(result.items).toEqual([]);
  });

  it('keeps accounts usable while not ready when the resource definition says so', async () => {
    const context = makeContext({
      resourceDefinition: { availableWhenNotReady: true },
    });

    const result = await firstValueFrom(service.listAccounts(context));

    expect(result.items.every((i) => i.isAvailable)).toBe(true);
  });

  it.each([
    [
      'the gateway URL has no workspace',
      {
        portalContext: {
          crdGatewayApiUrl: 'https://portal.example.com/graphql',
        },
      },
      'tok',
      'root:orgs:acme',
    ],
    ['the workspace is unknown', {}, 'tok', ''],
    ['there is no token', {}, undefined, 'root:orgs:acme'],
  ])(
    'errors without a request when %s',
    async (_, overrides, token, kcpPath) => {
      mockLuigiCoreService.getAuthData.mockReturnValue(
        token ? ({ idToken: token } as any) : (undefined as any),
      );
      mockGatewayService.resolveKcpPath.mockReturnValue(kcpPath as string);

      await expect(
        firstValueFrom(service.listAccounts(makeContext(overrides as object))),
      ).rejects.toThrow('The access review cannot be addressed');
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    },
  );

  it('errors when the request fails', async () => {
    mockHttpClient.post.mockReturnValue(
      throwError(() => new Error('502')) as any,
    );

    await expect(
      firstValueFrom(service.listAccounts(makeContext())),
    ).rejects.toThrow('502');
  });

  it('errors when the gateway reports errors, e.g. an endpoint without the review', async () => {
    mockHttpClient.post.mockReturnValue(
      of({
        data: null,
        errors: [{ message: 'Cannot query field "access_platform_mesh_io"' }],
      }) as any,
    );

    await expect(
      firstValueFrom(service.listAccounts(makeContext())),
    ).rejects.toThrow('Cannot query field');
  });

  it.each([
    ['a page of a proxy', '<html></html>'],
    ['a review that was not created', answer(null)],
    ['nothing', null],
  ])('errors when the answer is not a review: %s', async (_, body) => {
    mockHttpClient.post.mockReturnValue(of(body) as any);

    await expect(
      firstValueFrom(service.listAccounts(makeContext())),
    ).rejects.toThrow('Not an access review');
  });
  describe('watchAccounts', () => {
    let sink: any;
    let unsubscribe: ReturnType<typeof vi.fn>;
    let client: {
      subscribe: ReturnType<typeof vi.fn>;
      dispose: ReturnType<typeof vi.fn>;
    };

    const event = (r: SelfClusterAccessReview, type = 'MODIFIED') => ({
      data: { [accessReviewSubscriptionField]: { type, object: r } },
    });

    beforeEach(() => {
      unsubscribe = vi.fn();
      client = {
        subscribe: vi.fn((_request, s) => {
          sink = s;
          return unsubscribe;
        }),
        dispose: vi.fn(),
      };
      createClientMock.mockReset();
      createClientMock.mockReturnValue(client);
    });

    it('subscribes to the review through the gateway, addressed to the workspace, as the user', () => {
      service.watchAccounts(makeContext()).subscribe();

      const options = createClientMock.mock.calls[0][0];
      expect(options.url).toBe(
        'https://portal.example.com/api/kubernetes-graphql-gateway/single-access/graphql',
      );
      expect(options.headers()).toEqual({ Authorization: 'Bearer my-token' });
      expect(client.subscribe.mock.calls[0][0]).toEqual({
        query: accessReviewSubscription,
        extensions: { clusterTarget: 'root:orgs:acme' },
      });
    });

    it('gives the accounts of each review it is sent', () => {
      const values: string[][] = [];
      service
        .watchAccounts(makeContext())
        .subscribe((items) => values.push(items.map((i) => i.metadata.name)));

      sink.next(event(review, 'ADDED'));
      sink.next(
        event({ status: { clusters: review.status!.clusters!.slice(0, 1) } }),
      );
      sink.next(event({}));
      // Not a review: nothing to show.
      sink.next({ data: { [accessReviewSubscriptionField]: null } });

      expect(values).toEqual([['team-a', 'team-b'], ['team-b'], []]);
    });

    it('errors when the gateway reports errors or the subscription fails', () => {
      const errors: string[] = [];
      const watch = () =>
        service
          .watchAccounts(makeContext())
          .subscribe({ error: (e) => errors.push(e.message) });

      watch();
      sink.next({ errors: [{ message: 'Cannot query field' }] });
      watch();
      sink.error(new Error('502'));

      expect(errors).toEqual(['Cannot query field', '502']);
    });

    it('ends the subscription when it is unsubscribed from', () => {
      service.watchAccounts(makeContext()).subscribe().unsubscribe();

      expect(unsubscribe).toHaveBeenCalled();
      expect(client.dispose).toHaveBeenCalled();
    });

    it('errors without a subscription when the workspace is unknown', () => {
      mockGatewayService.resolveKcpPath.mockReturnValue('');
      const error = vi.fn();

      service.watchAccounts(makeContext()).subscribe({ error });

      expect(error).toHaveBeenCalled();
      expect(createClientMock).not.toHaveBeenCalled();
    });
  });
});
