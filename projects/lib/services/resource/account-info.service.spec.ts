import { TestBed } from '@angular/core/testing';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import {
  AccountInfoService,
  ApolloFactory,
  ResourceService,
} from '@platform-mesh/portal-ui-lib/services';
import { mock } from 'jest-mock-extended';
import { of, throwError } from 'rxjs';

describe(AccountInfoService, () => {
  let service: AccountInfoService;
  let mockApollo: any;
  let mockApolloFactory: any;
  let mockLuigiCoreService: jest.Mocked<LuigiCoreService>;

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
      query: jest.fn(),
      subscribe: jest.fn(),
      mutate: jest.fn(),
    };

    mockApolloFactory = {
      apollo: jest.fn().mockReturnValue(mockApollo),
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
    it('should read account info', (done) => {
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

      service.read(namespacedNodeContext).subscribe((res) => {
        expect(res.spec.oidc.clients).toStrictEqual({
          kubectl: { clientId: 'cIdD' },
        });
        expect(mockApolloFactory.apollo).toHaveBeenCalledWith(
          namespacedNodeContext,
        );
        done();
      });
    });

    it('should handle read account info error', (done) => {
      const error = new Error('fail');
      mockApollo.query.mockReturnValue(throwError(() => error));
      console.error = jest.fn();

      service.read(namespacedNodeContext).subscribe({
        error: () => {
          expect(console.error).toHaveBeenCalledWith(
            'Error executing GraphQL query.',
            error,
          );
          expect(mockLuigiCoreService.showAlert).toHaveBeenCalledWith({
            text: 'fail',
            type: 'error',
          });
          done();
        },
      });
    });
  });
});
