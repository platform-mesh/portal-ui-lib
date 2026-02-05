import { TestBed } from '@angular/core/testing';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import { AccountInfoService, ApolloFactory, ResourceService } from '@platform-mesh/portal-ui-lib/services';
import { firstValueFrom, of, throwError } from 'rxjs';
import { MockedObject } from 'vitest';
import { mock } from 'vitest-mock-extended';

describe(AccountInfoService, () => {
  let service: AccountInfoService;
  let mockApollo: any;
  let mockApolloFactory: any;
  let mockLuigiCoreService: MockedObject<LuigiCoreService>;

  const namespacedNodeContext: any = {
    cluster: 'test',
    namespaceId: 'test-namespace',
    resourceDefinition: {
      group: 'core.k8s.io',
      kind: 'TestKind',
      version: 'v1',
      scope: 'Namespaced',
      namespace: 'default',
      plural: 'testkinds',
    },
  };

  beforeEach(() => {
    mockLuigiCoreService = mock();
    mockApollo = {
      query: vi.fn(),
      subscribe: vi.fn(),
      mutate: vi.fn(),
    };

    mockApolloFactory = {
      apollo: vi.fn().mockReturnValue(mockApollo),
    };

    TestBed.configureTestingModule({
      providers: [
        ResourceService,
        { provide: ApolloFactory, useValue: mockApolloFactory },
        { provide: LuigiCoreService, useValue: mockLuigiCoreService },
      ],
    });

    service = TestBed.inject(AccountInfoService);
  });

  describe('read', () => {
    it('should read account info', async () => {
      const ca = 'cert-data';
      const accountInfo = {
        spec: {
          clusterInfo: { ca },
          oidc: {
            issuerUrl: 'issuer',
            clients: '{ "kubectl": { "clientId": "cIdD" } }',
          },
        },
      };
      mockApollo.query.mockReturnValue(
        of({
          data: {
            core_platform_mesh_io: {
              v1alpha1: {
                AccountInfo: accountInfo,
              },
            },
          },
        }),
      );

      const res = await firstValueFrom(service.read(namespacedNodeContext));
      expect(res.spec.oidc.clients).toStrictEqual({
        kubectl: { clientId: 'cIdD' },
      });
      expect(mockApolloFactory.apollo).toHaveBeenCalledWith(
        namespacedNodeContext,
      );
    });

    it('should handle read account info error', async () => {
      const error = new Error('fail');
      mockApollo.query.mockReturnValue(throwError(() => error));

      await expect(
        firstValueFrom(service.read(namespacedNodeContext)),
      ).rejects.toThrowError(error);
    });
  });
});
