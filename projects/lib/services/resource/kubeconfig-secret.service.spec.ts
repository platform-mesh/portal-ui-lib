import { KubeconfigSecretService } from './kubeconfig-secret.service';
import { ResourceService } from './resource.service';
import { TestBed } from '@angular/core/testing';
import {
  DOWNLOAD_KUBECONFIG_FROM_SECRET_REF_ACTION,
  DownloadKubeconfigFromSecretRefAction,
} from '@platform-mesh/portal-ui-lib/models';
import { firstValueFrom, of, throwError } from 'rxjs';

describe('KubeconfigSecretService', () => {
  let service: KubeconfigSecretService;
  let resourceService: { read: ReturnType<typeof vi.fn> };

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
  const action: DownloadKubeconfigFromSecretRefAction = {
    property: 'status.kubeconfig.secretRef.name',
    uiSettings: {
      displayAs: 'button',
      buttonSettings: {
        action: DOWNLOAD_KUBECONFIG_FROM_SECRET_REF_ACTION,
        text: 'Download cluster kubeconfig',
        namespaceProperty: 'status.kubeconfig.secretRef.namespace',
      },
    },
  };
  const localReferenceAction: DownloadKubeconfigFromSecretRefAction = {
    property: 'status.kubeconfigSecretRef.name',
    uiSettings: {
      displayAs: 'button',
      buttonSettings: {
        action: DOWNLOAD_KUBECONFIG_FROM_SECRET_REF_ACTION,
        text: 'Download cluster kubeconfig',
      },
    },
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

  it('recognizes the typed action by its configured button action', () => {
    expect(service.isDownloadActionIdentifier(action)).toBe(true);
    expect(service.isDownloadAction(action)).toBe(true);
    expect(
      service.isDownloadAction({
        value: '/clusters',
        uiSettings: {
          displayAs: 'button',
          buttonSettings: { action: 'navigate' },
        },
      }),
    ).toBe(false);
  });

  it('accepts omitted displayAs and rejects malformed reserved configurations', () => {
    const missingProperty = {
      uiSettings: action.uiSettings,
    } as any;
    const missingDisplayAs = {
      property: action.property,
      uiSettings: {
        buttonSettings: action.uiSettings.buttonSettings,
      },
    } as any;

    expect(service.isDownloadActionIdentifier(missingProperty)).toBe(true);
    expect(service.isDownloadAction(missingProperty)).toBe(false);
    expect(service.isDownloadActionIdentifier(missingDisplayAs)).toBe(true);
    expect(service.isDownloadAction(missingDisplayAs)).toBe(true);
    expect(
      service.isDownloadAction({
        ...action,
        uiSettings: { ...action.uiSettings, displayAs: 'link' },
      } as any),
    ).toBe(false);
    expect(service.isDownloadAction({ ...action, property: ' ' })).toBe(false);
    expect(
      service.isDownloadAction({
        ...action,
        property: 'status..kubeconfig.secretRef.name',
      }),
    ).toBe(false);
    expect(
      service.isDownloadAction({
        ...action,
        uiSettings: {
          ...action.uiSettings,
          buttonSettings: {
            ...action.uiSettings.buttonSettings,
            namespaceProperty: ' ',
          },
        },
      } as DownloadKubeconfigFromSecretRefAction),
    ).toBe(false);
    expect(
      service.isDownloadAction({
        ...action,
        uiSettings: {
          ...action.uiSettings,
          buttonSettings: {
            ...action.uiSettings.buttonSettings,
            namespaceProperty: 'status.kubeconfig.secret-ref.namespace',
          },
        },
      } as DownloadKubeconfigFromSecretRefAction),
    ).toBe(false);
    expect(
      service.isDownloadAction({
        ...action,
        propertyCollection: [{ property: 'status..bad' }],
      } as any),
    ).toBe(false);
  });

  it('queries the configured Secret name and namespace fields', () => {
    expect(service.getSecretReferenceFields(action)).toEqual([
      { property: 'status.kubeconfig.secretRef.name' },
      { property: 'status.kubeconfig.secretRef.namespace' },
    ]);
    expect(
      service.getSecretReferenceFields({
        ...action,
        property: '$.status.kubeconfig.secretRef.name',
        uiSettings: {
          ...action.uiSettings,
          buttonSettings: {
            ...action.uiSettings.buttonSettings,
            namespaceProperty: '$.status.kubeconfig.secretRef.namespace',
          },
        },
      }),
    ).toEqual([
      { property: 'status.kubeconfig.secretRef.name' },
      { property: 'status.kubeconfig.secretRef.namespace' },
    ]);

    expect(
      service.getSecretReferenceFields({ ...action, property: ' ' }),
    ).toEqual([]);
    expect(
      service.getSecretReferenceFields({ ...action, property: '$.' }),
    ).toEqual([]);
    expect(
      service.getSecretReferenceFields({
        ...action,
        property: 'status..kubeconfig.secretRef.name',
      }),
    ).toEqual([]);
  });

  it('queries only the Secret name for a namespace-local reference', () => {
    expect(service.getSecretReferenceFields(localReferenceAction)).toEqual([
      { property: 'status.kubeconfigSecretRef.name' },
    ]);
  });

  it('resolves and trims the referenced Secret name and namespace', () => {
    expect(
      service.resolveSecretReference(
        action,
        {
          ...resource,
          status: {
            kubeconfig: {
              secretRef: {
                name: ' cluster-kubeconfig ',
                namespace: ' provider-namespace ',
              },
            },
          },
        },
        context,
      ),
    ).toEqual({
      name: 'cluster-kubeconfig',
      namespace: 'provider-namespace',
    });
    expect(
      service.resolveSecretReference(
        {
          ...action,
          property: '$.status.kubeconfig.secretRef.name',
          uiSettings: {
            ...action.uiSettings,
            buttonSettings: {
              ...action.uiSettings.buttonSettings,
              namespaceProperty: '$.status.kubeconfig.secretRef.namespace',
            },
          },
        },
        resource,
        context,
      ),
    ).toEqual({
      name: 'cluster-kubeconfig',
      namespace: 'provider-namespace',
    });
  });

  it('uses the resource namespace for a namespace-local reference', () => {
    expect(
      service.resolveSecretReference(
        localReferenceAction,
        {
          metadata: { name: 'cluster-1', namespace: 'claim-namespace' },
          status: { kubeconfigSecretRef: { name: 'cluster-kubeconfig' } },
        } as any,
        context,
      ),
    ).toEqual({
      name: 'cluster-kubeconfig',
      namespace: 'claim-namespace',
    });
  });

  it('uses the navigation namespace when a local reference resource omits namespace', () => {
    expect(
      service.resolveSecretReference(
        localReferenceAction,
        {
          metadata: { name: 'cluster-1' },
          status: { kubeconfigSecretRef: { name: 'cluster-kubeconfig' } },
        } as any,
        context,
      ),
    ).toEqual({
      name: 'cluster-kubeconfig',
      namespace: 'context-namespace',
    });
  });

  it('does not fall back when a configured namespace is absent, null, or blank', () => {
    expect(
      service.resolveSecretReference(
        action,
        {
          ...resource,
          status: {
            kubeconfig: { secretRef: { name: 'cluster-kubeconfig' } },
          },
        },
        context,
      ),
    ).toBeUndefined();
    expect(
      service.resolveSecretReference(
        action,
        {
          ...resource,
          status: {
            kubeconfig: {
              secretRef: { name: 'cluster-kubeconfig', namespace: '-all-' },
            },
          },
        } as any,
        context,
      ),
    ).toBeUndefined();
    expect(
      service.resolveSecretReference(
        action,
        {
          ...resource,
          status: {
            kubeconfig: {
              secretRef: { name: 'cluster-kubeconfig', namespace: null },
            },
          },
        } as any,
        context,
      ),
    ).toBeUndefined();
    expect(
      service.resolveSecretReference(
        action,
        {
          ...resource,
          status: {
            kubeconfig: {
              secretRef: { name: 'cluster-kubeconfig', namespace: ' ' },
            },
          },
        },
        context,
      ),
    ).toBeUndefined();
    expect(
      service.resolveSecretReference(
        localReferenceAction,
        {
          metadata: { name: 'cluster-1' },
          status: { kubeconfigSecretRef: { name: 'cluster-kubeconfig' } },
        } as any,
        { ...context, namespaceId: undefined },
      ),
    ).toBeUndefined();
    expect(
      service.resolveSecretReference(
        localReferenceAction,
        {
          metadata: { name: 'cluster-1' },
          status: { kubeconfigSecretRef: { name: 'cluster-kubeconfig' } },
        } as any,
        { ...context, namespaceId: '-all-' },
      ),
    ).toBeUndefined();
  });

  it('returns undefined for an absent or malformed reference', () => {
    expect(
      service.resolveSecretReference(action, undefined, context),
    ).toBeUndefined();
    expect(
      service.resolveSecretReference(
        { ...action, property: ' ' },
        resource,
        context,
      ),
    ).toBeUndefined();
    expect(
      service.resolveSecretReference(
        action,
        { metadata: { name: 'cluster-1', namespace: 'default' } } as any,
        context,
      ),
    ).toBeUndefined();
    expect(
      service.resolveSecretReference(
        action,
        {
          metadata: { name: 'cluster-1', namespace: 'default' },
          status: { kubeconfig: { secretRef: 'not-an-object' } },
        } as any,
        context,
      ),
    ).toBeUndefined();
  });

  it('reads and decodes the selected Secret key in the current workspace', async () => {
    resourceService.read.mockReturnValue(
      of({
        data: {
          kubeconfig: btoa('apiVersion: v1'),
          unrelated: 'encoded-unrelated-value',
        },
      }),
    );

    await expect(
      firstValueFrom(service.readKubeconfig(action, resource, context)),
    ).resolves.toEqual({
      contents: 'apiVersion: v1',
      filename: 'kubeconfig.yaml',
    });
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
        namespaceId: 'provider-namespace',
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

  it('uses configured data key and filename', async () => {
    const configuredAction: DownloadKubeconfigFromSecretRefAction = {
      ...action,
      uiSettings: {
        ...action.uiSettings,
        buttonSettings: {
          ...action.uiSettings.buttonSettings,
          dataKey: 'config',
          filename: 'cluster.yaml',
        },
      },
    };
    resourceService.read.mockReturnValue(
      of({ data: { config: btoa('apiVersion: v1') } }),
    );

    await expect(
      firstValueFrom(
        service.readKubeconfig(configuredAction, resource, context),
      ),
    ).resolves.toEqual({
      contents: 'apiVersion: v1',
      filename: 'cluster.yaml',
    });
  });

  it('fails before reading when the Secret reference is unavailable', async () => {
    await expect(
      firstValueFrom(
        service.readKubeconfig(
          action,
          { metadata: { name: 'cluster-1', namespace: 'default' } } as any,
          context,
        ),
      ),
    ).rejects.toThrow('Kubeconfig Secret reference is not available');
    expect(resourceService.read).not.toHaveBeenCalled();
  });

  it('fails without exposing Secret data when the selected key is absent', async () => {
    resourceService.read.mockReturnValue(
      of({ data: { unrelated: 'sensitive-value' } }),
    );

    await expect(
      firstValueFrom(service.readKubeconfig(action, resource, context)),
    ).rejects.toThrow('Kubeconfig data key "kubeconfig" is not available');
  });

  it.each([undefined, null])(
    'fails cleanly when the Secret response is %s',
    async (secret) => {
      resourceService.read.mockReturnValue(of(secret as any));

      await expect(
        firstValueFrom(service.readKubeconfig(action, resource, context)),
      ).rejects.toThrow('Kubeconfig data key "kubeconfig" is not available');
    },
  );

  it('rejects malformed base64 kubeconfig data', async () => {
    resourceService.read.mockReturnValue(
      of({ data: { kubeconfig: 'not-valid-base64!' } }),
    );

    await expect(
      firstValueFrom(service.readKubeconfig(action, resource, context)),
    ).rejects.toThrow('Failed to decode Base64 string');
  });

  it('does not expose gateway error details to the caller', async () => {
    resourceService.read.mockReturnValue(
      throwError(() => new Error('forbidden')),
    );

    await expect(
      firstValueFrom(service.readKubeconfig(action, resource, context)),
    ).rejects.toThrow('Kubeconfig Secret could not be read');
  });
});
