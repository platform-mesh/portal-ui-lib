import { TestBed } from '@angular/core/testing';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import { ApolloFactory, LogicalClusterService, ResourceService } from '@platform-mesh/portal-ui-lib/services';
import { firstValueFrom, of, throwError } from 'rxjs';
import { MockedObject } from 'vitest';
import { mock } from 'vitest-mock-extended';

describe(LogicalClusterService, () => {
  let service: LogicalClusterService;
  let mockApollo: any;
  let mockApolloFactory: any;
  let mockLuigiCoreService: MockedObject<LuigiCoreService>;

  beforeEach(() => {
    mockLuigiCoreService = mock();
    mockApollo = mock();
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

    service = TestBed.inject(LogicalClusterService);
  });

  describe('readOrganizationReady', () => {
    it('should return true when organization is ready', async () => {
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

      const navigateMock = vi.fn();
      mockLuigiCoreService.navigation.mockReturnValue({
        navigate: navigateMock,
      } as any);

      const response = await firstValueFrom(
        service.read({
          portalContext: { crdGatewayApiUrl: 'http://gw/graphql' },
          token: 't',
        } as any),
      );

      expect(response).toEqual(logicalCluster);
      expect(navigateMock).not.toHaveBeenCalled();
    });

    it('should alert and rethrow when query fails', async () => {
      const error = new Error('fail');
      mockApollo.query.mockReturnValue(throwError(() => error));
      console.error = vi.fn();

      await expect(
        firstValueFrom(
          service.read({
            portalContext: { crdGatewayApiUrl: 'http://gw/graphql' },
            token: 't',
          } as any),
        ),
      ).rejects.toThrow('fail');
      expect(mockLuigiCoreService.showAlert).toHaveBeenCalledWith({
        text: 'fail',
        type: 'error',
      });
      expect(console.error).toHaveBeenCalledWith(
        'Error executing GraphQL query.',
        error,
      );
    });
  });
});
