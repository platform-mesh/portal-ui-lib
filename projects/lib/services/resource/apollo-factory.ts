import { GatewayService } from './gateway.service';
import { ResourceNodeContext } from './resource-node-context';
import { HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { AuthService } from '@openmfp/portal-ui-lib';
import {
  type ApolloClientOptions,
  ApolloLink,
  Observable as ApolloObservable,
  FetchResult,
  InMemoryCache,
  Operation,
  split,
} from '@apollo/client/core';
import { SetContextLink } from '@apollo/client/link/context';
import { getMainDefinition } from '@apollo/client/utilities';
import { Apollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { print } from 'graphql';
import { Client, ClientOptions, createClient } from 'graphql-sse';

class SSELink extends ApolloLink {
  private client: Client;

  constructor(options: ClientOptions) {
    super();
    this.client = createClient(options);
  }

  public override request(operation: Operation): ApolloObservable<FetchResult> {
    return new ApolloObservable((sink) => {
      return this.client.subscribe(
        { ...operation, query: print(operation.query) },
        {
          next: sink.next.bind(sink),
          complete: sink.complete.bind(sink),
          error: sink.error.bind(sink),
        },
      );
    });
  }
}

const noopZone = {
  run: (fn: any) => fn(),
  runOutsideAngular: (fn: any) => fn(),
} as any;

const isUnauthorized = (error: unknown): boolean => {
  const err = error as {
    status?: number;
    statusCode?: number;
    networkError?: { status?: number; statusCode?: number };
  };
  return [
    err?.status,
    err?.statusCode,
    err?.networkError?.status,
    err?.networkError?.statusCode,
  ].includes(401);
};

@Injectable({
  providedIn: 'root',
})
export class ApolloFactory {
  private httpLink = inject(HttpLink);
  private gatewayService = inject(GatewayService);
  private authService = inject(AuthService);

  public readonly apollo = (
    nodeContext: ResourceNodeContext,
    readFromParentKcpPath = false,
  ): Apollo =>
    new Apollo(
      noopZone,
      this.createApolloOptions(nodeContext, readFromParentKcpPath),
    );

  /**
   * The token must be resolved per request, never captured at client
   * creation: a client built before the shell delivers the token would
   * otherwise send "Bearer undefined" for its whole lifetime (silent 401s,
   * empty views until a hard reload). Prefer live sources over the node
   * context, which is a mount-time snapshot: in web-component bundles the
   * injected AuthService belongs to a separate injector that never runs a
   * refresh, so the shell's Luigi auth store is the only value that tracks
   * the boot refresh and later scheduled refreshes.
   */
  private resolveToken(nodeContext: ResourceNodeContext): string | undefined {
    return (
      this.authService.getToken() ||
      this.resolveLuigiStoreToken() ||
      nodeContext.token
    );
  }

  // Web components run on the shell window; iframe-based MFEs have no
  // window.Luigi and fall through to the node context.
  private resolveLuigiStoreToken(): string | undefined {
    try {
      return (globalThis as any).Luigi?.auth?.()?.store?.getAuthData?.()
        ?.idToken;
    } catch {
      return undefined;
    }
  }

  /**
   * Retries an operation exactly once when the gateway answers 401. The
   * Authorization header is rebuilt by the context link on the retry, so a
   * request that raced ahead of token delivery (or whose token expired in
   * flight) heals itself instead of leaving the view empty until a manual
   * reload. 401 means the request was rejected before execution, so this
   * is safe for mutations too.
   */
  private createAuthRetryLink(): ApolloLink {
    return new ApolloLink((operation, forward) => {
      return new ApolloObservable((observer) => {
        let activeSub: { unsubscribe(): void } | undefined;
        const attempt = (isRetry: boolean) => {
          activeSub = forward(operation).subscribe({
            next: observer.next.bind(observer),
            complete: observer.complete.bind(observer),
            error: (error: unknown) => {
              if (!isRetry && isUnauthorized(error)) {
                attempt(true);
                return;
              }
              observer.error(error);
            },
          });
        };
        attempt(false);
        return () => activeSub?.unsubscribe();
      });
    });
  }

  private createApolloOptions(
    nodeContext: ResourceNodeContext,
    readFromParentKcpPath = false,
  ): ApolloClientOptions {
    const contextLink = new SetContextLink((prevContext) => {
      const baseHeaders =
        prevContext.headers instanceof HttpHeaders
          ? prevContext.headers
          : new HttpHeaders(prevContext.headers ?? {});

      return {
        ...prevContext,
        uri: () =>
          this.gatewayService.getGatewayUrl(nodeContext, readFromParentKcpPath),
        headers: baseHeaders
          .set('Authorization', `Bearer ${this.resolveToken(nodeContext)}`)
          .set('Accept', 'charset=utf-8'),
      };
    });

    const splitClient = split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return (
          definition.kind === 'OperationDefinition' &&
          definition.operation === 'subscription'
        );
      },
      new SSELink({
        url: () =>
          this.gatewayService.getGatewayUrl(nodeContext, readFromParentKcpPath),
        headers: () => ({
          Authorization: `Bearer ${this.resolveToken(nodeContext)}`,
        }),
      }),
      this.httpLink.create({}),
    );

    // Retry sits outermost so a retry re-runs the context link and picks
    // up a freshly resolved token.
    const link = ApolloLink.from([
      this.createAuthRetryLink(),
      contextLink,
      splitClient,
    ]);
    const cache = new InMemoryCache();

    return {
      link,
      cache,
    };
  }
}
