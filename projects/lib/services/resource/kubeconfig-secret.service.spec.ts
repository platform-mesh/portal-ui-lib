import { KubeconfigSecretService } from './kubeconfig-secret.service';
import { ResourceService } from './resource.service';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';

describe('KubeconfigSecretService', () => {
  let service: KubeconfigSecretService;
  let resourceService: { read: ReturnType<typeof vi.fn> };

  const context: any = {
    token: 'token',
    namespaceId: 'claim-namespace',
    resourceDefinition: {
      apiGroup: 'infrastructure.cluster.x-k8s.io',
      version: 'v1alpha1',
      entity: 'ShootClaim',
      entityCollection: 'ShootClaims',
      scope: 'Namespaced',
    },
    portalContext: {
      crdGatewayApiUrl: 'https://gateway.example.test',
    },
  };

  beforeEach(() => {
    resourceService = {
      read: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        KubeconfigSecretService,
        { provide: ResourceService, useValue: resourceService },
      ],
    });

    service = TestBed.inject(KubeconfigSecretService);
  });

  it('reads the selected Secret data key in the current workspace and requested namespace', async () => {
    resourceService.read.mockReturnValue(
      of({
        data: {
          kubeconfig: 'encoded-kubeconfig',
          unrelated: 'encoded-unrelated-value',
        },
      }),
    );

    const result = await firstValueFrom(
      service.readEncodedKubeconfig(
        'cluster-kubeconfig',
        'default',
        'kubeconfig',
        context,
      ),
    );

    expect(result).toBe('encoded-kubeconfig');
    expect(resourceService.read).toHaveBeenCalledWith(
      'cluster-kubeconfig',
      {
        version: 'v1',
        entity: 'Secret',
        entityCollection: 'Secrets',
        scope: 'Namespaced',
      },
      ['data'],
      {
        ...context,
        namespaceId: 'default',
        resourceDefinition: {
          version: 'v1',
          entity: 'Secret',
          entityCollection: 'Secrets',
          scope: 'Namespaced',
        },
      },
      false,
    );
  });

  it('returns undefined when the selected Secret data key is absent', async () => {
    resourceService.read.mockReturnValue(of({ data: { other: 'value' } }));

    await expect(
      firstValueFrom(
        service.readEncodedKubeconfig(
          'cluster-kubeconfig',
          'default',
          'kubeconfig',
          context,
        ),
      ),
    ).resolves.toBeUndefined();
  });

  it('passes read failures to the caller', async () => {
    resourceService.read.mockReturnValue(
      throwError(() => new Error('forbidden')),
    );

    await expect(
      firstValueFrom(
        service.readEncodedKubeconfig(
          'cluster-kubeconfig',
          'default',
          'kubeconfig',
          context,
        ),
      ),
    ).rejects.toThrow('forbidden');
  });
});
