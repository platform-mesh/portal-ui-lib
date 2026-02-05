import { ResourceNodeContext } from './resource-node-context';
import { TestBed } from '@angular/core/testing';
import { ApolloLink, InMemoryCache, execute } from '@apollo/client/core';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import { Apollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { parse } from 'graphql';
import type { ApolloFactory } from './apollo-factory';
import type { GatewayService } from './gateway.service';
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
  let httpLinkMock: any;
  let gatewayServiceMock: MockedObject<GatewayService>;

  beforeEach(async () => {
    vi.resetModules();
    createClientMock.mockClear();
    ({ createClient } = await import('graphql-sse'));
    ({ GatewayService: GatewayServiceToken } = await import(
      './gateway.service'
    ));
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
    gatewayServiceMock = mock<GatewayService>();
    TestBed.configureTestingModule({
      providers: [
        ApolloFactoryClass,
        { provide: HttpLink, useValue: httpLinkMock },
        { provide: LuigiCoreService, useValue: luigiCoreServiceMock },
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
