import {
  KubeconfigSecretService,
  isDownloadKubeconfigButtonSettings,
} from './kubeconfig-secret.service';
import { ResourceService } from './resource.service';
import { TestBed } from '@angular/core/testing';
import {
  DOWNLOAD_KUBECONFIG_FROM_SECRET_REF_ACTION,
  DownloadKubeconfigFromSecretRefButtonSettings,
} from '@platform-mesh/portal-ui-lib/models';
import { firstValueFrom, of, throwError } from 'rxjs';

describe('KubeconfigSecretService', () => {
  let service: KubeconfigSecretService;
  let resourceService: {
    read: ReturnType<typeof vi.fn>;
    getNamespace: ReturnType<typeof vi.fn>;
  };

  const context: any = {
    token: 'token',
    namespaceId: 'context-namespace',
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
  const downloadButtonSettings: DownloadKubeconfigFromSecretRefButtonSettings =
    {
      action: DOWNLOAD_KUBECONFIG_FROM_SECRET_REF_ACTION,
      text: 'Download cluster kubeconfig',
      resourceProperty: 'status.kubeconfig.secretRef.name',
      namespaceProperty: 'status.kubeconfig.secretRef.namespace',
    };
  const localReferenceButtonSettings: DownloadKubeconfigFromSecretRefButtonSettings =
    {
      action: DOWNLOAD_KUBECONFIG_FROM_SECRET_REF_ACTION,
      text: 'Download cluster kubeconfig',
      resourceProperty: 'status.kubeconfigSecretRef.name',
    };
  const navigateButtonSettings = {
    action: 'navigate',
    text: 'Open',
  };
  const resource: any = {
    metadata: { name: 'cluster-1', namespace: 'claim-namespace' },
    status: {
      kubeconfig: {
        secretRef: {
          name: 'cluster-kubeconfig',
          namespace: 'provider-namespace',
        },
      },
      kubeconfigSecretRef: { name: 'local-kubeconfig' },
    },
  };
  const encoded = (value: string) => btoa(value);

  beforeEach(() => {
    resourceService = {
      read: vi.fn(),
      getNamespace: vi.fn((context) => context.namespaceId),
    };

    TestBed.configureTestingModule({
      providers: [
        KubeconfigSecretService,
        { provide: ResourceService, useValue: resourceService },
      ],
    });

    service = TestBed.inject(KubeconfigSecretService);
  });

  describe('isDownloadKubeconfigButtonSettings', () => {
    it('recognizes the download action and rejects everything else', () => {
      expect(isDownloadKubeconfigButtonSettings(downloadButtonSettings)).toBe(
        true,
      );
      expect(isDownloadKubeconfigButtonSettings(navigateButtonSettings)).toBe(
        false,
      );
      expect(isDownloadKubeconfigButtonSettings(undefined)).toBe(false);
    });
  });

  describe('secretReferenceQueryFields', () => {
    it('returns the name and namespace properties of a download action', () => {
      expect(
        service.secretReferenceQueryFields(downloadButtonSettings),
      ).toEqual([
        {
          property: 'status.kubeconfig.secretRef.name',
        },
        { property: 'status.kubeconfig.secretRef.namespace' },
      ]);
    });

    it('omits the namespace field when no namespaceProperty is configured', () => {
      const blankNamespaceSettings: DownloadKubeconfigFromSecretRefButtonSettings =
        {
          ...localReferenceButtonSettings,
          namespaceProperty: '   ',
        };

      expect(
        service.secretReferenceQueryFields(localReferenceButtonSettings),
      ).toEqual([{ property: 'status.kubeconfigSecretRef.name' }]);

      expect(
        service.secretReferenceQueryFields(blankNamespaceSettings),
      ).toEqual([{ property: 'status.kubeconfigSecretRef.name' }]);
    });

    it('returns nothing for non-download actions', () => {
      expect(
        service.secretReferenceQueryFields(navigateButtonSettings),
      ).toEqual([]);
    });

    it('returns nothing when runtime JSON omits resourceProperty', () => {
      expect(
        service.secretReferenceQueryFields({
          action: DOWNLOAD_KUBECONFIG_FROM_SECRET_REF_ACTION,
        }),
      ).toEqual([]);
    });
  });

  describe('isSecretReferenceAvailable', () => {
    it('accepts complete cross-namespace and namespace-local references', () => {
      expect(
        service.isSecretReferenceAvailable(
          downloadButtonSettings,
          resource,
          context,
        ),
      ).toBe(true);
      expect(
        service.isSecretReferenceAvailable(
          localReferenceButtonSettings,
          resource,
          context,
        ),
      ).toBe(true);
    });

    it('rejects absent or incomplete references', () => {
      expect(
        service.isSecretReferenceAvailable(
          downloadButtonSettings,
          undefined,
          context,
        ),
      ).toBe(false);
      expect(
        service.isSecretReferenceAvailable(
          downloadButtonSettings,
          { metadata: { namespace: 'claim-namespace' } } as any,
          context,
        ),
      ).toBe(false);
      expect(
        service.isSecretReferenceAvailable(
          downloadButtonSettings,
          {
            metadata: { namespace: 'claim-namespace' },
            status: {
              kubeconfig: { secretRef: { name: 'cluster-kubeconfig' } },
            },
          } as any,
          context,
        ),
      ).toBe(false);
      expect(
        service.isSecretReferenceAvailable(
          navigateButtonSettings,
          resource,
          context,
        ),
      ).toBe(false);
      expect(
        service.isSecretReferenceAvailable(
          { action: DOWNLOAD_KUBECONFIG_FROM_SECRET_REF_ACTION },
          resource,
          context,
        ),
      ).toBe(false);
    });
  });

  describe('readKubeconfig', () => {
    it('reads the referenced Secret and decodes the default data key', async () => {
      resourceService.read.mockReturnValue(
        of({ data: { kubeconfig: encoded('kubeconfig-content') } }),
      );

      const download = await firstValueFrom(
        service.readKubeconfig(downloadButtonSettings, resource, context),
      );

      expect(download).toEqual({
        contents: 'kubeconfig-content',
        filename: 'kubeconfig.yaml',
      });
      expect(resourceService.read).toHaveBeenCalledWith(
        'cluster-kubeconfig',
        expect.objectContaining({ entity: 'Secret', version: 'v1' }),
        ['data'],
        expect.objectContaining({ namespaceId: 'provider-namespace' }),
        false,
      );
    });

    it('falls back to the resource namespace, then the effective navigation namespace', async () => {
      resourceService.read.mockReturnValue(
        of({ data: { kubeconfig: encoded('content') } }),
      );

      await firstValueFrom(
        service.readKubeconfig(localReferenceButtonSettings, resource, context),
      );
      expect(resourceService.read).toHaveBeenLastCalledWith(
        'local-kubeconfig',
        expect.anything(),
        ['data'],
        expect.objectContaining({ namespaceId: 'claim-namespace' }),
        false,
      );

      const clusterScopedResource = {
        ...resource,
        metadata: { name: 'cluster-1' },
      };
      await firstValueFrom(
        service.readKubeconfig(
          localReferenceButtonSettings,
          clusterScopedResource,
          context,
        ),
      );
      expect(resourceService.read).toHaveBeenLastCalledWith(
        'local-kubeconfig',
        expect.anything(),
        ['data'],
        expect.objectContaining({ namespaceId: 'context-namespace' }),
        false,
      );

      resourceService.getNamespace.mockReturnValueOnce('route-namespace');
      await firstValueFrom(
        service.readKubeconfig(
          localReferenceButtonSettings,
          clusterScopedResource,
          { ...context, namespaceId: undefined },
        ),
      );
      expect(resourceService.read).toHaveBeenLastCalledWith(
        'local-kubeconfig',
        expect.anything(),
        ['data'],
        expect.objectContaining({ namespaceId: 'route-namespace' }),
        false,
      );
    });

    it('respects a configured data key and filename', async () => {
      const customButtonSettings: DownloadKubeconfigFromSecretRefButtonSettings =
        {
          action: DOWNLOAD_KUBECONFIG_FROM_SECRET_REF_ACTION,
          text: 'Download',
          resourceProperty: 'status.kubeconfigSecretRef.name',
          dataKey: 'value',
          filename: 'cluster.yaml',
        };
      resourceService.read.mockReturnValue(
        of({ data: { value: encoded('custom-content') } }),
      );

      const download = await firstValueFrom(
        service.readKubeconfig(customButtonSettings, resource, context),
      );

      expect(download).toEqual({
        contents: 'custom-content',
        filename: 'cluster.yaml',
      });
    });

    it('fails for non-download actions', async () => {
      await expect(
        firstValueFrom(
          service.readKubeconfig(navigateButtonSettings, resource, context),
        ),
      ).rejects.toThrow('Button is not a kubeconfig download action');
      expect(resourceService.read).not.toHaveBeenCalled();
    });

    it('fails when the Secret reference cannot be resolved', async () => {
      await expect(
        firstValueFrom(
          service.readKubeconfig(downloadButtonSettings, undefined, context),
        ),
      ).rejects.toThrow('Kubeconfig Secret reference is not available');

      const resourceWithoutRef: any = { metadata: { name: 'cluster-1' } };
      await expect(
        firstValueFrom(
          service.readKubeconfig(
            downloadButtonSettings,
            resourceWithoutRef,
            context,
          ),
        ),
      ).rejects.toThrow('Kubeconfig Secret reference is not available');
      expect(resourceService.read).not.toHaveBeenCalled();
    });

    it('maps Secret read failures to a stable error', async () => {
      resourceService.read.mockReturnValue(throwError(() => new Error('boom')));

      await expect(
        firstValueFrom(
          service.readKubeconfig(downloadButtonSettings, resource, context),
        ),
      ).rejects.toThrow('Kubeconfig Secret could not be read');
    });

    it('fails when the configured data key is missing on the Secret', async () => {
      resourceService.read.mockReturnValue(of({ data: {} }));

      await expect(
        firstValueFrom(
          service.readKubeconfig(downloadButtonSettings, resource, context),
        ),
      ).rejects.toThrow('Kubeconfig data key "kubeconfig" is not available');
    });
  });
});
