import type { ApolloFactory } from './apollo-factory';
import type { GatewayService } from './gateway.service';
import { ResourceNodeContext } from './resource-node-context';
import { TestBed } from '@angular/core/testing';
import {
  ApolloLink,
  InMemoryCache,
  Observable,
  execute,
} from '@apollo/client/core';
import { AuthService, LuigiCoreService } from '@openmfp/portal-ui-lib';
import { Apollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { parse } from 'graphql';
import { MockedFunction, MockedObject } from 'vitest';
import { mock } from 'vitest-mock-extended';

const createClientMock = vi.fn();

vi.mock('graphql-sse', () => ({
  createClient: createClientMock,
}));

describe('ApolloFactory', () => {
  let ApolloFactoryClass: typeof import('./apollo-factory').ApolloFactory;
  let GatewayServiceToken: typeof import('./gateway.service').GatewayService;
  let createClient: typeof import('graphql-sse').createClient;
  let factory: ApolloFactory;
  let luigiCoreServiceMock: any;
  let authServiceMock: any;
  let httpLinkMock: any;
  let gatewayServiceMock: MockedObject<GatewayService>;

  beforeEach(async () => {
    vi.resetModules();
    createClientMock.mockClear();
    ({ createClient } = await import('graphql-sse'));
    ({ GatewayService: GatewayServiceToken } =
      await import('./gateway.service'));
    ({ ApolloFactory: ApolloFactoryClass } = await import('./apollo-factory'));
    httpLinkMock = {
      create: vi.fn().mockReturnValue({ request: [] }),
    };
    luigiCoreServiceMock = {
      getWcExtendedContext: vi.fn().mockReturnValue({
        portalContext: { crdGatewayApiUrl: 'http://example.com/graphql' },
        accountId: '123',
      }),
      getGlobalContext: vi.fn().mockReturnValue({ token: 'fake-token' }),
    };
    authServiceMock = {
      getToken: vi.fn().mockReturnValue(undefined),
    };
    gatewayServiceMock = mock<GatewayService>();
    TestBed.configureTestingModule({
      providers: [
        ApolloFactoryClass,
        { provide: HttpLink, useValue: httpLinkMock },
        { provide: LuigiCoreService, useValue: luigiCoreServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: GatewayServiceToken, useValue: gatewayServiceMock },
      ],
    });
    factory = TestBed.inject(ApolloFactoryClass);
  });

  it('should create an Apollo instance', () => {
    expect(factory.apollo({} as ResourceNodeContext)).toBeInstanceOf(Apollo);
  });

  it('should create Apollo options with InMemoryCache', () => {
    const options = (factory as any).createApolloOptions();
    expect(options.cache).toBeInstanceOf(InMemoryCache);
  });

  it('should create HttpLink with default options', () => {
    (factory as any).createApolloOptions({
      token: 't',
    } as unknown as ResourceNodeContext);
    expect(httpLinkMock.create).toHaveBeenCalledWith({});
  });

  it('should configure SSE client with dynamic url and auth header', () => {
    const createClientMock = createClient as MockedFunction<
      typeof createClient
    >;
    createClientMock.mockClear();
    const subscribeMock = vi.fn().mockReturnValue(() => void 0);
    createClientMock.mockReturnValue({
      subscribe: subscribeMock,
    } as unknown as ReturnType<typeof createClient>);

    const nodeContext: ResourceNodeContext = {
      token: 'fake-token',
    } as unknown as ResourceNodeContext;

    gatewayServiceMock.getGatewayUrl.mockReturnValue(
      'http://example.com/graphql',
    );

    (factory as any).createApolloOptions(nodeContext, false);

    expect(createClient).toHaveBeenCalledTimes(1);
    const clientOptions = createClientMock.mock.calls[0][0] as {
      url: () => string;
      headers: () => Record<string, string>;
    };

    expect(typeof clientOptions.url).toBe('function');
    expect(typeof clientOptions.headers).toBe('function');

    expect(gatewayServiceMock.getGatewayUrl).not.toHaveBeenCalled();
    const resolvedUrl = clientOptions.url();
    expect(gatewayServiceMock.getGatewayUrl).toHaveBeenCalledWith(
      nodeContext,
      false,
    );
    expect(resolvedUrl).toBe('http://example.com/graphql');

    const headers = clientOptions.headers();
    expect(headers).toEqual({ Authorization: 'Bearer fake-token' });
  });

  it('resolves the token per request, preferring the live AuthService value', () => {
    const createClientMock = createClient as MockedFunction<
      typeof createClient
    >;
    createClientMock.mockClear();
    createClientMock.mockReturnValue({
      subscribe: vi.fn().mockReturnValue(() => void 0),
    } as unknown as ReturnType<typeof createClient>);

    // client created BEFORE any token exists (the sticky-401 scenario)
    const nodeContext = { token: undefined } as unknown as ResourceNodeContext;
    (factory as any).createApolloOptions(nodeContext, false);
    const clientOptions = createClientMock.mock.calls[0][0] as unknown as {
      headers: () => Record<string, string>;
    };

    authServiceMock.getToken.mockReturnValue('live-token-1');
    expect(clientOptions.headers()).toEqual({
      Authorization: 'Bearer live-token-1',
    });

    // a refreshed token must be picked up by later requests on the SAME client
    authServiceMock.getToken.mockReturnValue('live-token-2');
    expect(clientOptions.headers()).toEqual({
      Authorization: 'Bearer live-token-2',
    });
  });

  it('falls back to the node context token when AuthService has none', () => {
    const createClientMock = createClient as MockedFunction<
      typeof createClient
    >;
    createClientMock.mockClear();
    createClientMock.mockReturnValue({
      subscribe: vi.fn().mockReturnValue(() => void 0),
    } as unknown as ReturnType<typeof createClient>);

    authServiceMock.getToken.mockReturnValue(undefined);
    const nodeContext = {
      token: 'context-token',
    } as unknown as ResourceNodeContext;
    (factory as any).createApolloOptions(nodeContext, false);
    const clientOptions = createClientMock.mock.calls[0][0] as unknown as {
      headers: () => Record<string, string>;
    };
    expect(clientOptions.headers()).toEqual({
      Authorization: 'Bearer context-token',
    });
  });

  describe('live Luigi store fallback', () => {
    afterEach(() => {
      delete (globalThis as any).Luigi;
    });

    const sseHeaders = (nodeContext: ResourceNodeContext) => {
      const mockedCreateClient = createClient as MockedFunction<
        typeof createClient
      >;
      mockedCreateClient.mockClear();
      mockedCreateClient.mockReturnValue({
        subscribe: vi.fn().mockReturnValue(() => void 0),
      } as unknown as ReturnType<typeof createClient>);
      (factory as any).createApolloOptions(nodeContext, false);
      return (
        mockedCreateClient.mock.calls[0][0] as unknown as {
          headers: () => Record<string, string>;
        }
      ).headers;
    };

    it('falls back to the shell Luigi auth store when AuthService and node context have no token', () => {
      // the fresh-login race: WC mounted with a token-less context snapshot,
      // its own injector's AuthService never refreshed — the shell store is
      // the only live source
      authServiceMock.getToken.mockReturnValue(undefined);
      (globalThis as any).Luigi = {
        auth: () => ({
          store: { getAuthData: () => ({ idToken: 'store-token' }) },
        }),
      };
      const headers = sseHeaders({
        token: undefined,
      } as unknown as ResourceNodeContext);
      expect(headers()).toEqual({ Authorization: 'Bearer store-token' });
    });

    it('prefers the live AuthService token over the Luigi store', () => {
      authServiceMock.getToken.mockReturnValue('live-token');
      (globalThis as any).Luigi = {
        auth: () => ({
          store: { getAuthData: () => ({ idToken: 'store-token' }) },
        }),
      };
      const headers = sseHeaders({
        token: 'context-token',
      } as unknown as ResourceNodeContext);
      expect(headers()).toEqual({ Authorization: 'Bearer live-token' });
    });

    it('prefers the Luigi store over the mount-time context snapshot', () => {
      // after a scheduled refresh the snapshot holds the OLD token; the
      // store always holds the current one
      authServiceMock.getToken.mockReturnValue(undefined);
      (globalThis as any).Luigi = {
        auth: () => ({
          store: { getAuthData: () => ({ idToken: 'store-token' }) },
        }),
      };
      const headers = sseHeaders({
        token: 'stale-context-token',
      } as unknown as ResourceNodeContext);
      expect(headers()).toEqual({ Authorization: 'Bearer store-token' });
    });

    it('survives a Luigi store that throws', () => {
      authServiceMock.getToken.mockReturnValue(undefined);
      (globalThis as any).Luigi = {
        auth: () => {
          throw new Error('not initialized');
        },
      };
      const headers = sseHeaders({
        token: 'context-token',
      } as unknown as ResourceNodeContext);
      expect(headers()).toEqual({ Authorization: 'Bearer context-token' });
    });
  });

  describe('retry-once on 401', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    const makeFlakyHttpLink = (failures: number, error: unknown) => {
      const seenAuthHeaders: (string | null)[] = [];
      let attempts = 0;
      const link = new ApolloLink((operation) => {
        return new Observable((observer: any) => {
          attempts++;
          const headers = operation.getContext().headers;
          seenAuthHeaders.push(headers?.get?.('Authorization') ?? null);
          if (attempts <= failures) {
            observer.error(error);
          } else {
            observer.next({ data: { x: 1 } });
            observer.complete();
          }
        });
      });
      return { link, getAttempts: () => attempts, seenAuthHeaders };
    };

    // SetContextLink resolves its context through a promise and the retry
    // is scheduled on a timer — advance fake time (which also flushes
    // microtasks) before asserting
    const startQuery = (link: ApolloLink) => {
      const result = {
        data: undefined as unknown,
        error: undefined as unknown,
        complete: false,
      };
      (
        execute(
          link,
          { query: parse('query Q { x }') } as any,
          { client: {} } as any,
        ) as any
      ).subscribe({
        next: (value: unknown) => (result.data = value),
        error: (err: unknown) => (result.error = err),
        complete: () => (result.complete = true),
      });
      return result;
    };

    const runQuery = async (link: ApolloLink) => {
      const result = startQuery(link);
      await vi.advanceTimersByTimeAsync(2000);
      return result;
    };

    it('retries exactly once on 401 and re-resolves the token for the retry', async () => {
      // simulates the fresh-login incident: first request leaves before the
      // token exists (Bearer undefined -> 401), the retry picks up the live
      // token and succeeds
      const flaky = makeFlakyHttpLink(1, { status: 401 });
      httpLinkMock.create.mockReturnValue(flaky.link);
      authServiceMock.getToken
        .mockReturnValueOnce(undefined)
        .mockReturnValue('fresh-token');

      const options = (factory as any).createApolloOptions({
        token: undefined,
      } as unknown as ResourceNodeContext);
      const result = await runQuery(options.link);

      expect(flaky.getAttempts()).toBe(2);
      expect(flaky.seenAuthHeaders).toEqual([
        'Bearer undefined',
        'Bearer fresh-token',
      ]);
      expect(result.error).toBeUndefined();
      expect(result.data).toEqual({ data: { x: 1 } });
      expect(result.complete).toBe(true);
    });

    it('waits before the retry so a token still in delivery can arrive', async () => {
      // boot race sub-case: the first request can fire while the boot
      // refresh is still in flight — an instant retry would lose again
      const flaky = makeFlakyHttpLink(1, { status: 401 });
      httpLinkMock.create.mockReturnValue(flaky.link);
      authServiceMock.getToken
        .mockReturnValueOnce(undefined)
        .mockReturnValue('late-token');

      const options = (factory as any).createApolloOptions({
        token: undefined,
      } as unknown as ResourceNodeContext);
      const result = startQuery(options.link);

      // first attempt has failed, the retry must NOT have fired yet
      await vi.advanceTimersByTimeAsync(100);
      expect(flaky.getAttempts()).toBe(1);
      expect(result.error).toBeUndefined();

      // after the delay window the single retry runs with the late token
      await vi.advanceTimersByTimeAsync(1000);
      expect(flaky.getAttempts()).toBe(2);
      expect(flaky.seenAuthHeaders[1]).toBe('Bearer late-token');
      expect(result.complete).toBe(true);
    });

    it('does not retry non-401 errors', async () => {
      const flaky = makeFlakyHttpLink(1, { status: 500 });
      httpLinkMock.create.mockReturnValue(flaky.link);

      const options = (factory as any).createApolloOptions({
        token: 't',
      } as unknown as ResourceNodeContext);
      const result = await runQuery(options.link);

      expect(flaky.getAttempts()).toBe(1);
      expect(result.error).toEqual({ status: 500 });
    });

    it('surfaces the error when the retry also gets 401', async () => {
      const flaky = makeFlakyHttpLink(2, { status: 401 });
      httpLinkMock.create.mockReturnValue(flaky.link);

      const options = (factory as any).createApolloOptions({
        token: 't',
      } as unknown as ResourceNodeContext);
      const result = await runQuery(options.link);

      expect(flaky.getAttempts()).toBe(2);
      expect(result.error).toEqual({ status: 401 });
    });

    it('recognizes a 401 wrapped as networkError', async () => {
      const flaky = makeFlakyHttpLink(1, { networkError: { status: 401 } });
      httpLinkMock.create.mockReturnValue(flaky.link);

      const options = (factory as any).createApolloOptions({
        token: 't',
      } as unknown as ResourceNodeContext);
      const result = await runQuery(options.link);

      expect(flaky.getAttempts()).toBe(2);
      expect(result.error).toBeUndefined();
      expect(result.complete).toBe(true);
    });
  });

  it('should pass readFromParentKcpPath flag to SSE url resolver', () => {
    const createClientMock = createClient as MockedFunction<
      typeof createClient
    >;
    createClientMock.mockClear();
    const subscribeMock = vi.fn().mockReturnValue(() => void 0);
    createClientMock.mockReturnValue({
      subscribe: subscribeMock,
    } as unknown as ReturnType<typeof createClient>);

    const nodeContext: ResourceNodeContext = {
      token: 't',
    } as unknown as ResourceNodeContext;
    gatewayServiceMock.getGatewayUrl.mockReturnValue('http://gw/graphql');

    (factory as any).createApolloOptions(nodeContext, true);

    const clientOptions = createClientMock.mock.calls.at(-1)?.[0] as {
      url: () => string;
    };
    clientOptions.url();
    expect(gatewayServiceMock.getGatewayUrl).toHaveBeenCalledWith(
      nodeContext,
      true,
    );
  });

  it('should pass readFromParentKcpPath from apollo() to options builder', () => {
    const nodeContext = { token: 'x' } as unknown as ResourceNodeContext;
    const spy = vi.spyOn<any, any>(factory as any, 'createApolloOptions');
    factory.apollo(nodeContext, true);
    expect(spy).toHaveBeenCalledWith(nodeContext, true);
  });

  it('should create a new Apollo instance per call', () => {
    const ctx = { token: 'a' } as unknown as ResourceNodeContext;
    const a1 = factory.apollo(ctx);
    const a2 = factory.apollo(ctx);
    expect(a1).not.toBe(a2);
  });

  it('should compose a valid ApolloLink chain', () => {
    const options = (factory as any).createApolloOptions({
      token: 't',
    } as unknown as ResourceNodeContext);
    expect(options.link).toBeInstanceOf(ApolloLink);
    expect(typeof (options.link as ApolloLink).request).toBe('function');
  });

  it('should not eagerly resolve gateway URL during options creation', () => {
    gatewayServiceMock.getGatewayUrl.mockClear();
    (factory as any).createApolloOptions({
      token: 't',
    } as unknown as ResourceNodeContext);
    expect(gatewayServiceMock.getGatewayUrl).not.toHaveBeenCalled();
  });

  it('routes query operations without errors', () => {
    const httpReturnLink = new ApolloLink(
      () => ({ subscribe: vi.fn() }) as any,
    );
    httpLinkMock.create.mockReturnValue(httpReturnLink as any);

    const nodeContext = {
      token: 't',
      portalContext: { crdGatewayApiUrl: 'http://x/:kcp/graphql' },
    } as unknown as ResourceNodeContext;

    const options = (factory as any).createApolloOptions(nodeContext, false);
    const queryDoc = parse('query Q { x }');
    const obs = execute(
      options.link,
      { query: queryDoc } as any,
      { client: {} } as any,
    ) as any;
    expect(obs).toBeTruthy();
    expect(typeof obs.subscribe).toBe('function');
    expect(() => obs.subscribe({})).not.toThrow();
  });

  it('routes subscription operations without errors', () => {
    const createClientMock = createClient as MockedFunction<
      typeof createClient
    >;
    createClientMock.mockClear();
    createClientMock.mockReturnValue({
      subscribe: vi.fn().mockReturnValue(() => void 0),
    } as unknown as ReturnType<typeof createClient>);

    const nodeContext = {
      token: 't',
      portalContext: { crdGatewayApiUrl: 'http://x/:kcp/graphql' },
    } as unknown as ResourceNodeContext;

    const options = (factory as any).createApolloOptions(nodeContext, false);
    const subDoc = parse('subscription S { x }');
    const obs = execute(
      options.link,
      { query: subDoc } as any,
      { client: {} } as any,
    ) as any;
    expect(obs).toBeTruthy();
    expect(typeof obs.subscribe).toBe('function');
    expect(() => obs.subscribe({})).not.toThrow();
  });
});
