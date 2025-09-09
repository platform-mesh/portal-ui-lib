import { NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ApolloLink, InMemoryCache, execute } from '@apollo/client/core';
import { parse } from 'graphql';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import { Apollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { createClient } from 'graphql-sse';
import { mock } from 'jest-mock-extended';
import { ApolloFactory } from './apollo-factory';
import { GatewayService } from './gateway.service';
import { ResourceNodeContext } from './resource-node-context';

// Mock graphql-sse client to capture provided options
jest.mock('graphql-sse', () => ({
  createClient: jest.fn(),
}));

global.fetch = (...args) =>
  // @ts-ignore
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

describe('ApolloFactory', () => {
  let factory: ApolloFactory;
  let luigiCoreServiceMock: any;
  let httpLinkMock: any;
  let gatewayServiceMock: jest.Mocked<GatewayService>;
  let ngZone: NgZone;

  beforeEach(() => {
    httpLinkMock = {
      create: jest.fn().mockReturnValue({ request: [] }),
    };
    luigiCoreServiceMock = {
      getWcExtendedContext: jest.fn().mockReturnValue({
        portalContext: { crdGatewayApiUrl: 'http://example.com/graphql' },
        accountId: '123',
      }),
      getGlobalContext: jest.fn().mockReturnValue({ token: 'fake-token' }),
    };
    gatewayServiceMock = mock<GatewayService>();
    TestBed.configureTestingModule({
      providers: [
        ApolloFactory,
        { provide: HttpLink, useValue: httpLinkMock },
        {
          provide: NgZone,
          useValue: new NgZone({ enableLongStackTrace: false }),
        },
        { provide: LuigiCoreService, useValue: luigiCoreServiceMock },
        { provide: GatewayService, useValue: gatewayServiceMock },
      ],
    });
    factory = TestBed.inject(ApolloFactory);
    ngZone = TestBed.inject(NgZone);
  });

  it('should create an Apollo instance', () => {
    expect(factory.apollo({} as ResourceNodeContext)).toBeInstanceOf(Apollo);
  });

  it('should create Apollo options with InMemoryCache', () => {
    const options = (factory as any).createApolloOptions();
    expect(options.cache).toBeInstanceOf(InMemoryCache);
  });

  it('should create HttpLink with default options', () => {
    (factory as any).createApolloOptions({ token: 't' } as unknown as ResourceNodeContext);
    expect(httpLinkMock.create).toHaveBeenCalledWith({});
  });

  it('should configure SSE client with dynamic url and auth header', () => {
    // reset call count since previous tests may initialize SSE link too
    (createClient as jest.Mock).mockClear();
    const subscribeMock = jest.fn().mockReturnValue(() => void 0);
    (createClient as jest.Mock).mockReturnValue({ subscribe: subscribeMock });

    const nodeContext: ResourceNodeContext = {
      token: 'fake-token',
    } as unknown as ResourceNodeContext;

    gatewayServiceMock.getGatewayUrl.mockReturnValue('http://example.com/graphql');

    (factory as any).createApolloOptions(nodeContext, false);

    expect(createClient).toHaveBeenCalledTimes(1);
    const clientOptions = (createClient as jest.Mock).mock.calls[0][0];

    expect(typeof clientOptions.url).toBe('function');
    expect(typeof clientOptions.headers).toBe('function');

    // url() should call GatewayService.getGatewayUrl lazily
    expect(gatewayServiceMock.getGatewayUrl).not.toHaveBeenCalled();
    const resolvedUrl = clientOptions.url();
    expect(gatewayServiceMock.getGatewayUrl).toHaveBeenCalledWith(nodeContext, false);
    expect(resolvedUrl).toBe('http://example.com/graphql');

    // headers() should include bearer token
    const headers = clientOptions.headers();
    expect(headers).toEqual({ Authorization: 'Bearer fake-token' });
  });

  it('should pass readFromParentKcpPath flag to SSE url resolver', () => {
    (createClient as jest.Mock).mockClear();
    const subscribeMock = jest.fn().mockReturnValue(() => void 0);
    (createClient as jest.Mock).mockReturnValue({ subscribe: subscribeMock });

    const nodeContext: ResourceNodeContext = { token: 't' } as unknown as ResourceNodeContext;
    gatewayServiceMock.getGatewayUrl.mockReturnValue('http://gw/graphql');

    (factory as any).createApolloOptions(nodeContext, true);

    const clientOptions = (createClient as jest.Mock).mock.calls.at(-1)[0];
    clientOptions.url();
    expect(gatewayServiceMock.getGatewayUrl).toHaveBeenCalledWith(nodeContext, true);
  });

  it('should pass readFromParentKcpPath from apollo() to options builder', () => {
    const nodeContext = { token: 'x' } as unknown as ResourceNodeContext;
    const spy = jest.spyOn<any, any>(factory as any, 'createApolloOptions');
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
    const options = (factory as any).createApolloOptions({ token: 't' } as unknown as ResourceNodeContext);
    expect(options.link).toBeInstanceOf(ApolloLink);
    expect(typeof (options.link as ApolloLink).request).toBe('function');
  });

  it('should not eagerly resolve gateway URL during options creation', () => {
    gatewayServiceMock.getGatewayUrl.mockClear();
    (factory as any).createApolloOptions({ token: 't' } as unknown as ResourceNodeContext);
    expect(gatewayServiceMock.getGatewayUrl).not.toHaveBeenCalled();
  });

  it('routes query operations without errors', () => {
    const httpReturnLink = new ApolloLink(() => ({ subscribe: jest.fn() } as any));
    httpLinkMock.create.mockReturnValue(httpReturnLink as any);

    const nodeContext = {
      token: 't',
      portalContext: { crdGatewayApiUrl: 'http://x/:kcp/graphql' },
    } as unknown as ResourceNodeContext;

    const options = (factory as any).createApolloOptions(nodeContext, false);
    const queryDoc = parse('query Q { x }');
    const obs = execute(options.link, { query: queryDoc } as any) as any;
    expect(obs).toBeTruthy();
    expect(typeof obs.subscribe).toBe('function');
    expect(() => obs.subscribe({})).not.toThrow();
  });

  it('routes subscription operations without errors', () => {
    (createClient as jest.Mock).mockClear();
    (createClient as jest.Mock).mockReturnValue({ subscribe: jest.fn().mockReturnValue(() => void 0) });

    const nodeContext = {
      token: 't',
      portalContext: { crdGatewayApiUrl: 'http://x/:kcp/graphql' },
    } as unknown as ResourceNodeContext;

    const options = (factory as any).createApolloOptions(nodeContext, false);
    const subDoc = parse('subscription S { x }');
    const obs = execute(options.link, { query: subDoc } as any) as any;
    expect(obs).toBeTruthy();
    expect(typeof obs.subscribe).toBe('function');
    expect(() => obs.subscribe({})).not.toThrow();
  });
});
