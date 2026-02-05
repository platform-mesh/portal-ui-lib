import { TestBed } from '@angular/core/testing';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import {
  ApolloFactory,
  LogicalClusterService,
  ResourceService,
} from '@platform-mesh/portal-ui-lib/services';
import { mock } from 'jest-mock-extended';
import { of, throwError } from 'rxjs';

describe(LogicalClusterService, () => {
  let service: LogicalClusterService;
  let mockApollo: any;
  let mockApolloFactory: any;
  let mockLuigiCoreService: jest.Mocked<LuigiCoreService>;

  beforeEach(() => {
    mockLuigiCoreService = mock();
    mockApollo = mock();
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

    service = TestBed.inject(LogicalClusterService);
  });

  describe('readOrganizationReady', () => {
    it('should return true when organization is ready', (done) => {
      const logicalCluster = {
        status: { phase: 'Ready' },
      };
      mockApollo.query.mockReturnValue(
        of({
          data: {
            core_kcp_io: {
              v1alpha1: {
                LogicalCluster: logicalCluster,
              },
            },
          },
        }),
      );

      const navigateMock = jest.fn();
      mockLuigiCoreService.navigation.mockReturnValue({
        navigate: navigateMock,
      } as any);

      service
        .read({
          portalContext: { crdGatewayApiUrl: 'http://gw/graphql' },
          token: 't',
        } as any)
        .subscribe((response) => {
          expect(response).toEqual(logicalCluster);
          expect(navigateMock).not.toHaveBeenCalled();
          done();
        });
    });

    it('should alert and rethrow when query fails', (done) => {
      const error = new Error('fail');
      mockApollo.query.mockReturnValue(throwError(() => error));
      console.error = jest.fn();

      service
        .read({
          portalContext: { crdGatewayApiUrl: 'http://gw/graphql' },
          token: 't',
        } as any)
        .subscribe({
          error: (err) => {
            expect(err).toBe(error);
            done();
          },
        });
    });
  });
});
