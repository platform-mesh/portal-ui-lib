import { DetailView } from './detail-view.component';
import { NgTemplateOutlet } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EnvConfigService } from '@openmfp/portal-ui-lib';
import { AccountInfo } from '@platform-mesh/portal-ui-lib/models/models';
import {
  AccountInfoService,
  ErrorHandlerService,
  GatewayService,
  KubeconfigSecretService,
  ResourceService,
} from '@platform-mesh/portal-ui-lib/services';
import { Subject, of, throwError } from 'rxjs';
import { MockedObject } from 'vitest';
import { mock } from 'vitest-mock-extended';

describe('DetailViewComponent', () => {
  let component: DetailView;
  let fixture: ComponentFixture<DetailView>;
  let mockResourceService: any;
  let mockGatewayService: any;
  let envConfigServiceMock: MockedObject<EnvConfigService>;
  let accountInfoServiceMock: MockedObject<AccountInfoService>;
  let kubeconfigSecretServiceMock: {
    secretReferenceQueryFields: ReturnType<typeof vi.fn>;
    isSecretReferenceAvailable: ReturnType<typeof vi.fn>;
    readKubeconfig: ReturnType<typeof vi.fn>;
  };
  let luigiClientLinkManagerNavigate = vi.fn();
  let errorHandlerServiceMock: MockedObject<ErrorHandlerService>;
  const secretAction = {
    uiSettings: {
      displayAs: 'button',
      buttonSettings: {
        action: 'download-kubeconfig-from-secret-ref',
        text: 'Download cluster access',
        icon: 'download-from-cloud',
        design: 'Emphasized',
        resourceProperty: 'status.kubeconfig.secretRef.name',
        dataKey: 'config',
        filename: 'cluster.yaml',
        namespaceProperty: 'status.kubeconfig.secretRef.namespace',
      },
    },
  } as const;

  beforeEach(() => {
    envConfigServiceMock = mock();
    accountInfoServiceMock = mock();
    kubeconfigSecretServiceMock = {
      secretReferenceQueryFields: vi.fn((buttonSettings) =>
        buttonSettings?.action === 'download-kubeconfig-from-secret-ref'
          ? [
              {
                property: buttonSettings.resourceProperty,
              },
              ...(buttonSettings.namespaceProperty
                ? [
                    {
                      property: buttonSettings.namespaceProperty,
                    },
                  ]
                : []),
            ]
          : [],
      ),
      isSecretReferenceAvailable: vi.fn().mockReturnValue(true),
      readKubeconfig: vi
        .fn()
        .mockReturnValue(
          of({ contents: 'apiVersion: v1', filename: 'kubeconfig.yaml' }),
        ),
    };

    const accountInfo: AccountInfo = {
      metadata: {
        annotations: {
          'kcp.io/cluster': 'ly4pjqo89u2llqcg',
        },
        name: 'account',
      },
      spec: {
        account: {
          originClusterId: 'originClusterId',
        },
        clusterInfo: {
          ca: 'ca',
        },
        oidc: {
          clients: {
            kubectl: { clientId: 'f1aefb48-bc47-41ca-8e92-e11bf1fc37ec' },
          },
          issuerUrl: 'https://portal.local/keycloak/realms/sub',
        },
        organization: {
          originClusterId: 'mwi4ti5r3vtng851',
          name: 'org',
        },
      },
    };
    accountInfoServiceMock.read.mockReturnValue(of(accountInfo));

    mockResourceService = {
      read: vi.fn().mockReturnValue(of({ name: 'test-resource' })),
      readAccountInfo: vi.fn().mockReturnValue(of('mock-ca-data')),
      delete: vi.fn().mockReturnValue(of({})),
      update: vi.fn().mockReturnValue(of({})),
      getNamespace: vi.fn((context) => context.namespaceId),
    };

    mockGatewayService = {
      resolveKcpPath: vi.fn().mockReturnValue('https://example.com'),
    };
    errorHandlerServiceMock = mock();

    TestBed.configureTestingModule({
      providers: [
        { provide: ResourceService, useValue: mockResourceService },
        { provide: AccountInfoService, useValue: accountInfoServiceMock },
        { provide: GatewayService, useValue: mockGatewayService },
        {
          provide: KubeconfigSecretService,
          useValue: kubeconfigSecretServiceMock,
        },
        { provide: EnvConfigService, useValue: envConfigServiceMock },
        { provide: ErrorHandlerService, useValue: errorHandlerServiceMock },
      ],
    }).overrideComponent(DetailView, {
      set: { template: '<div></div>' },
    });

    fixture = TestBed.createComponent(DetailView);
    component = fixture.componentInstance;

    component.context = (() => ({
      resourceId: 'cluster-1',
      token: 'abc123',
      accountPath: 'account-123',
      accountId: 'account-123',
      organization: 'org-123',
      kcpCA: 'kcp-ca-data',
      resourceDefinition: {
        version: 'v1alpha1',
        entity: 'Cluster',
        entityCollection: 'clusters',
        apiGroup: 'core_k8s_io',
        ui: {
          detailView: {
            fields: [],
          },
        },
      },
      portalContext: { kcpWorkspaceUrl: 'https://example.com' },
      entityName: 'test-resource',
      parentNavigationContexts: ['project'],
    })) as any;

    component.LuigiClient = (() => ({
      linkManager: () => ({
        fromContext: vi.fn().mockReturnThis(),
        navigate: luigiClientLinkManagerNavigate,
        withParams: vi.fn().mockReturnThis(),
      }),
      uxManager: () => ({
        showAlert: vi.fn(),
      }),
      getNodeParams: vi.fn(),
      getActiveFeatureToggles: () => [],
    })) as any;

    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete (global as any).URL.createObjectURL;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should resolve workspace path with gateway service', () => {
    expect(component.workspacePath()).toBe('https://example.com');
    expect(mockGatewayService.resolveKcpPath).toHaveBeenCalledWith(
      component.context(),
    );
  });

  it('should call read on init', () => {
    expect(mockResourceService.read).toHaveBeenCalled();
  });

  it('should compute showDownloadKubeconfig as false by default', () => {
    expect(component.showDownloadKubeconfig()).toBe(false);
  });

  it('should compute showDownloadKubeconfig as true when enabled in definition', () => {
    const newFixture = TestBed.createComponent(DetailView);
    const newComponent = newFixture.componentInstance;

    newComponent.context = (() => ({
      resourceId: 'cluster-1',
      token: 'abc123',
      accountPath: 'account-123',
      accountId: 'account-123',
      organization: 'org-123',
      kcpCA: 'kcp-ca-data',
      resourceDefinition: {
        version: 'v1alpha1',
        entity: 'Cluster',
        entityCollection: 'clusters',
        apiGroup: 'core_k8s_io',
        ui: {
          detailView: {
            fields: [],
            showDownloadKubeconfig: true,
          },
        },
      },
      portalContext: { kcpWorkspaceUrl: 'https://example.com' },
      entityName: 'test-resource',
      parentNavigationContexts: ['project'],
    })) as any;

    newComponent.LuigiClient = (() => ({
      linkManager: () => ({
        fromContext: vi.fn().mockReturnThis(),
        navigate: vi.fn(),
        withParams: vi.fn().mockReturnThis(),
      }),
      uxManager: () => ({
        showAlert: vi.fn(),
      }),
      getNodeParams: vi.fn(),
      getActiveFeatureToggles: () => [],
    })) as any;

    newFixture.detectChanges();

    expect(newComponent.showDownloadKubeconfig()).toBe(true);
  });

  it('should compute showDownloadKubeconfig as false when detailView is missing', () => {
    const newFixture = TestBed.createComponent(DetailView);
    const newComponent = newFixture.componentInstance;

    newComponent.context = (() => ({
      entityName: 'cluster-1',
      resourceId: 'cluster-1',
      token: 'abc123',
      resourceDefinition: {
        version: 'v1alpha1',
        entity: 'Cluster',
        entityCollection: 'clusters',
        apiGroup: 'core_k8s_io',
      },
      entity: {
        metadata: { name: 'test-resource' },
      },
      parentNavigationContexts: ['project'],
    })) as any;

    newComponent.LuigiClient = (() => ({
      linkManager: () => ({
        fromContext: vi.fn().mockReturnThis(),
        navigate: vi.fn(),
        withParams: vi.fn().mockReturnThis(),
      }),
      uxManager: () => ({
        showAlert: vi.fn(),
      }),
      getNodeParams: vi.fn(),
      getActiveFeatureToggles: () => [],
    })) as any;

    newFixture.detectChanges();

    expect(newComponent.showDownloadKubeconfig()).toBe(false);
  });

  it('should navigate to parent', () => {
    component.navigateToParent();
    expect(luigiClientLinkManagerNavigate).toHaveBeenCalledWith('/');
  });

  it('should navigate to first parent navigation context', () => {
    const fromContextSpy = vi.fn().mockReturnThis();
    const navigateSpy = vi.fn();

    component.LuigiClient = (() => ({
      linkManager: () => ({
        fromContext: fromContextSpy,
        navigate: navigateSpy,
        withParams: vi.fn().mockReturnThis(),
      }),
      uxManager: () => ({
        showAlert: vi.fn(),
      }),
      getNodeParams: vi.fn(),
      getActiveFeatureToggles: () => [],
    })) as any;

    component.context = (() => ({
      resourceId: 'cluster-1',
      token: 'abc123',
      accountPath: 'account-123',
      accountId: 'account-123',
      organization: 'org-123',
      kcpCA: 'kcp-ca-data',
      resourceDefinition: {
        version: 'v1alpha1',
        entity: 'Cluster',
        entityCollection: 'clusters',
        apiGroup: 'core_k8s_io',
        ui: {
          detailView: {
            fields: [],
          },
        },
      },
      portalContext: { kcpWorkspaceUrl: 'https://example.com' },
      entityName: 'test-resource',
      parentNavigationContexts: ['organizations', 'projects'],
    })) as any;

    component.navigateToParent();

    expect(fromContextSpy).toHaveBeenCalledWith('organizations');
    expect(navigateSpy).toHaveBeenCalledWith('/');
  });

  describe('Modal operations', () => {
    it('should open delete resource modal', () => {
      const mockDeleteModal = {
        open: vi.fn(),
      };
      (component as any).deleteModal = () => mockDeleteModal;

      const resource: any = {
        metadata: { name: 'test-resource' },
      };
      const event = new MouseEvent('click');
      const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');

      component.openDeleteResourceModal(event, resource);

      expect(stopPropagationSpy).toHaveBeenCalled();
      expect(mockDeleteModal.open).toHaveBeenCalledWith({
        ...resource,
        metadata: { name: 'cluster-1' },
      });
    });

    it('should refetch the resource with createView fields and open the edit modal', () => {
      const mockCreateModal = {
        open: vi.fn(),
      };
      (component as any).createModal = () => mockCreateModal;

      const fetchedResource = {
        metadata: { name: 'test-resource' },
        spec: { createOnlyField: 'current-value' },
      };
      mockResourceService.read.mockClear();
      mockResourceService.read.mockReturnValue(of(fetchedResource));

      const event = new MouseEvent('click');
      const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');

      component.openEditResourceModal(event);

      expect(stopPropagationSpy).toHaveBeenCalled();
      expect(mockResourceService.read).toHaveBeenCalled();
      expect(mockCreateModal.open).toHaveBeenCalledWith(fetchedResource);
    });

    it('should delete resource successfully', () => {
      const mockDeleteModal = {
        close: vi.fn(),
      };
      (component as any).deleteModal = () => mockDeleteModal;
      mockResourceService.delete = vi.fn().mockReturnValue(of({}));

      const resource: any = {
        metadata: { name: 'test-resource' },
      };

      component.delete(resource);

      expect(mockResourceService.delete).toHaveBeenCalledWith(
        {
          ...resource,
          metadata: { name: 'cluster-1' },
        },
        expect.any(Object),
        expect.any(Object),
        false,
      );
    });

    it('should navigate to parent after successful delete', () => {
      const mockDeleteModal = {
        close: vi.fn(),
      };
      (component as any).deleteModal = () => mockDeleteModal;
      mockResourceService.delete = vi.fn().mockReturnValue(of({}));
      const navigateSpy = vi.spyOn(component, 'navigateToParent');

      const resource: any = {
        metadata: { name: 'test-resource' },
      };

      component.delete(resource);

      expect(mockDeleteModal.close).toHaveBeenCalled();
      expect(navigateSpy).toHaveBeenCalled();
    });

    it('should handle delete error', () => {
      const showAlertSpy = vi.fn();
      component.LuigiClient = (() => ({
        linkManager: () => ({
          fromContext: vi.fn().mockReturnThis(),
          navigate: vi.fn(),
          withParams: vi.fn().mockReturnThis(),
        }),
        uxManager: () => ({
          showAlert: showAlertSpy,
        }),
        getNodeParams: vi.fn(),
        getActiveFeatureToggles: () => [],
      })) as any;

      mockResourceService.delete = vi
        .fn()
        .mockReturnValue(throwError(() => new Error('Delete failed')));

      const resource: any = {
        metadata: { name: 'test-resource' },
      };

      component.delete(resource);

      expect(showAlertSpy).toHaveBeenCalledWith({
        text: 'Failure! Could not delete resource: test-resource.',
        type: 'error',
      });
    });

    it('should delete account resource with account flag', () => {
      const mockDeleteModal = {
        close: vi.fn(),
      };
      const newFixture = TestBed.createComponent(DetailView);
      const newComponent = newFixture.componentInstance;

      newComponent.context = (() => ({
        resourceId: 'account-1',
        token: 'abc123',
        resourceDefinition: {
          version: 'v1alpha1',
          entity: 'Account',
          entityCollection: 'accounts',
          apiGroup: 'core_k8s_io',
          ui: {
            detailView: {
              fields: [],
            },
          },
        },
        entityName: 'account-1',
        parentNavigationContexts: ['project'],
      })) as any;

      newComponent.LuigiClient = component.LuigiClient;
      (newComponent as any).deleteModal = () => mockDeleteModal;
      mockResourceService.delete = vi.fn().mockReturnValue(of({}));

      newFixture.detectChanges();

      const resource: any = {
        metadata: { name: 'account-1' },
      };

      newComponent.delete(resource);

      expect(mockResourceService.delete).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        true,
      );
    });

    it('should update resource successfully', () => {
      const mockCreateModal = {
        close: vi.fn(),
      };
      (component as any).createModal = () => mockCreateModal;
      const updatedResource = { metadata: { name: 'cluster-1' }, spec: {} };
      mockResourceService.update = vi.fn().mockReturnValue(of(updatedResource));

      const resource: any = {
        metadata: { name: 'test-resource' },
      };

      component.update(resource);

      expect(mockResourceService.update).toHaveBeenCalled();
      expect(component.resource()).toEqual(updatedResource);
      expect(mockCreateModal.close).toHaveBeenCalled();
    });

    it('should handle update error', () => {
      const showAlertSpy = vi.fn();
      component.LuigiClient = (() => ({
        linkManager: () => ({
          fromContext: vi.fn().mockReturnThis(),
          navigate: vi.fn(),
          withParams: vi.fn().mockReturnThis(),
        }),
        uxManager: () => ({
          showAlert: showAlertSpy,
        }),
        getNodeParams: vi.fn(),
        getActiveFeatureToggles: () => [],
      })) as any;

      mockResourceService.update = vi
        .fn()
        .mockReturnValue(throwError(() => new Error('Update failed')));

      const resource: any = {
        metadata: { name: 'test-resource' },
      };

      component.update(resource);

      expect(showAlertSpy).toHaveBeenCalledWith({
        text: 'Failure! Could not update resource: test-resource.',
        type: 'error',
      });
    });

    it('should update account resource with account flag', () => {
      const mockCreateModal = {
        close: vi.fn(),
      };
      const updateSpy = vi.fn().mockReturnValue(of({}));
      mockResourceService.update = updateSpy;

      const newFixture = TestBed.createComponent(DetailView);
      const newComponent = newFixture.componentInstance;

      newComponent.context = (() => ({
        resourceId: 'account-1',
        token: 'abc123',
        resourceDefinition: {
          version: 'v1alpha1',
          entity: 'Account',
          entityCollection: 'accounts',
          apiGroup: 'core_k8s_io',
          ui: {
            detailView: {
              fields: [{ property: 'spec.name' }],
            },
          },
        },
        entityName: 'account-1',
        parentNavigationContexts: ['project'],
      })) as any;

      newComponent.LuigiClient = component.LuigiClient;
      (newComponent as any).createModal = () => mockCreateModal;

      newFixture.detectChanges();

      const resource: any = {
        metadata: { name: 'account-1' },
      };

      newComponent.update(resource);

      expect(updateSpy).toHaveBeenCalled();
      const callArgs = updateSpy.mock.calls[0];
      expect(callArgs[3]).toBe(true);
      expect(callArgs.length).toBe(5);
    });
  });

  describe('getResourceId', () => {
    it('should return resourceId when defined', () => {
      const resourceId = (component as any).getResourceId();
      expect(resourceId).toBe('cluster-1');
    });

    it('should throw error and show alert when resourceId is undefined', () => {
      const showAlertSpy = vi.fn();
      const newFixture = TestBed.createComponent(DetailView);
      const newComponent = newFixture.componentInstance;

      const mockReadResource = vi.fn();
      (newComponent as any).readResource = mockReadResource;

      newComponent.LuigiClient = (() => ({
        linkManager: () => ({
          fromContext: vi.fn().mockReturnThis(),
          navigate: vi.fn(),
          withParams: vi.fn().mockReturnThis(),
        }),
        uxManager: () => ({
          showAlert: showAlertSpy,
        }),
        getNodeParams: vi.fn(),
        getActiveFeatureToggles: () => [],
      })) as any;

      newComponent.context = (() => ({
        resourceId: undefined,
        token: 'abc123',
        resourceDefinition: {
          version: 'v1alpha1',
          entity: 'Cluster',
          entityCollection: 'clusters',
          apiGroup: 'core_k8s_io',
          ui: {
            detailView: {
              fields: [],
            },
          },
        },
        entityName: 'test-resource',
        parentNavigationContexts: ['project'],
      })) as any;

      newFixture.detectChanges();

      expect(() => {
        (newComponent as any).getResourceId();
      }).toThrow('Resource ID is not defined');

      expect(showAlertSpy).toHaveBeenCalledWith({
        text: 'Resource ID is not defined',
        type: 'error',
      });
    });
  });

  it('should have namespaceId in context when provided', () => {
    const testNamespace = 'test-namespace';
    component.context = (() => ({
      resourceId: 'cluster-1',
      token: 'abc123',
      namespaceId: testNamespace,
      resourceDefinition: {
        entity: 'Cluster',
        entityCollection: 'clusters',
        apiGroup: 'core_k8s_io',
        ui: {
          detailView: {
            fields: [],
          },
        },
      },
      entityName: 'test-resource',
      parentNavigationContexts: ['project'],
    })) as any;

    fixture.detectChanges();

    expect(component.context().namespaceId).toBe(testNamespace);
  });

  it('should download kubeconfig', async () => {
    const mockAnchorElement = document.createElement('a');
    vi.spyOn(mockAnchorElement, 'click');
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockReturnValue(mockAnchorElement);
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob-url');

    envConfigServiceMock.getEnvConfig.mockResolvedValue({
      oidcIssuerUrl: 'oidcIssuerUrl',
    } as any);
    await component.downloadKubeConfig();

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(mockAnchorElement.href).toContain('blob-url');
    expect(mockAnchorElement.download).toBe('kubeconfig.yaml');
    expect(mockAnchorElement.click).toHaveBeenCalled();
  });

  it('should download kubeconfig when account info is missing', async () => {
    const mockAnchorElement = document.createElement('a');
    vi.spyOn(mockAnchorElement, 'click');
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchorElement);
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob-url');
    accountInfoServiceMock.read.mockReturnValueOnce(
      of(undefined as unknown as AccountInfo),
    );

    await component.downloadKubeConfig();

    expect(mockAnchorElement.href).toContain('blob-url');
    expect(mockAnchorElement.download).toBe('kubeconfig.yaml');
    expect(mockAnchorElement.click).toHaveBeenCalled();
  });

  it('should download kubeconfig when accountId and kcpCA are missing', async () => {
    const mockAnchorElement = document.createElement('a');
    vi.spyOn(mockAnchorElement, 'click');
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchorElement);
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob-url');
    accountInfoServiceMock.read.mockReturnValueOnce(
      of({
        spec: {
          oidc: {
            issuerUrl: 'issuer',
            clients: { kubectl: { clientId: 'client-id' } },
          },
        },
      } as AccountInfo),
    );
    component.context = (() => ({
      accountId: undefined,
      portalContext: { kcpWorkspaceUrl: 'https://example.com' },
      accountPath: 'account-123',
      kcpCA: undefined,
    })) as any;

    await component.downloadKubeConfig();

    expect(mockAnchorElement.href).toContain('blob-url');
    expect(mockAnchorElement.download).toBe('kubeconfig.yaml');
    expect(mockAnchorElement.click).toHaveBeenCalled();
  });

  it('should skip download when already downloading', async () => {
    const accountInfoSpy = accountInfoServiceMock.read;
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL');

    component.isDownloadingKubeConfig.set(true);
    await component.downloadKubeConfig();

    expect(accountInfoSpy).not.toHaveBeenCalled();
    expect(createObjectURLSpy).not.toHaveBeenCalled();
  });

  it('should show alert when downloadKubeConfig fails', async () => {
    const showAlertSpy = vi.fn();
    component.LuigiClient = (() => ({
      uxManager: () => ({ showAlert: showAlertSpy }),
      linkManager: () => ({
        fromContext: vi.fn().mockReturnThis(),
        navigate: vi.fn(),
        withParams: vi.fn().mockReturnThis(),
      }),
      getNodeParams: vi.fn(),
      getActiveFeatureToggles: () => [],
    })) as any;
    accountInfoServiceMock.read.mockReturnValueOnce(
      throwError(() => new Error('boom')),
    );

    await component.downloadKubeConfig();

    expect(showAlertSpy).toHaveBeenCalledWith({
      text: 'Failed to download kubeconfig: boom',
      type: 'error',
    });
  });

  it('should include Secret reference properties but not generic action properties in the detail query', () => {
    mockResourceService.read.mockClear();
    const newFixture = TestBed.createComponent(DetailView);
    const newComponent = newFixture.componentInstance;
    newComponent.context = (() => ({
      ...component.context(),
      resourceDefinition: {
        ...component.context().resourceDefinition,
        ui: {
          detailView: {
            fields: [],
            actions: [
              secretAction,
              {
                uiSettings: {
                  displayAs: 'button',
                  buttonSettings: {
                    action: 'download-kubeconfig-from-secret-ref',
                    resourceProperty: 'status.kubeconfigSecretRef.name',
                    text: 'Download local cluster access',
                  },
                },
              },
              {
                property: 'status.console.url',
                uiSettings: {
                  displayAs: 'button',
                  buttonSettings: { action: 'navigate', text: 'Console' },
                },
              },
            ],
          },
        },
      },
    })) as any;
    newComponent.LuigiClient = component.LuigiClient;

    newFixture.detectChanges();

    expect(mockResourceService.read.mock.calls[0][2]).toEqual([
      { metadata: ['deletionTimestamp'] },
      { status: [{ kubeconfig: [{ secretRef: ['name'] }] }] },
      { status: [{ kubeconfig: [{ secretRef: ['namespace'] }] }] },
      { status: [{ kubeconfigSecretRef: ['name'] }] },
    ]);
  });

  it('should hide a Secret action while its reference is unavailable', () => {
    kubeconfigSecretServiceMock.isSecretReferenceAvailable.mockReturnValue(
      false,
    );
    mockResourceService.read.mockReturnValueOnce(
      of({ metadata: { name: 'cluster-1', namespace: 'default' } }),
    );
    const newFixture = TestBed.createComponent(DetailView);
    const newComponent = newFixture.componentInstance;
    newComponent.context = (() => ({
      ...component.context(),
      resourceDefinition: {
        ...component.context().resourceDefinition,
        ui: { detailView: { fields: [], actions: [secretAction] } },
      },
    })) as any;
    newComponent.LuigiClient = component.LuigiClient;
    newFixture.detectChanges();

    expect(newComponent.customActions()).not.toContain(
      secretAction.uiSettings.buttonSettings,
    );
  });

  it('should render a generic action before the resource arrives', () => {
    const resourceRead = new Subject<any>();
    const navigateAction = {
      value: '/clusters',
      uiSettings: {
        displayAs: 'button',
        buttonSettings: { action: 'navigate', text: 'Clusters' },
      },
    };
    mockResourceService.read.mockReturnValueOnce(resourceRead);
    const newFixture = TestBed.createComponent(DetailView);
    const newComponent = newFixture.componentInstance;
    newComponent.context = (() => ({
      ...component.context(),
      resourceDefinition: {
        ...component.context().resourceDefinition,
        ui: { detailView: { fields: [], actions: [navigateAction] } },
      },
    })) as any;
    newComponent.LuigiClient = component.LuigiClient;
    newFixture.detectChanges();

    expect(newComponent.resource()).toBeUndefined();
    expect(newComponent.customActions()).toContain(
      navigateAction.uiSettings.buttonSettings,
    );
    newFixture.destroy();
  });

  it('should surface a click-time error when the kubeconfig download fails', async () => {
    const showAlert = vi.fn();
    component.LuigiClient = (() => ({
      uxManager: () => ({ showAlert }),
      linkManager: () => ({ navigate: vi.fn(), openAsModal: vi.fn() }),
      getActiveFeatureToggles: () => [],
    })) as any;
    kubeconfigSecretServiceMock.readKubeconfig.mockReturnValue(
      throwError(() => new Error('Kubeconfig Secret could not be read')),
    );

    await component.downloadKubeconfigFromSecretRef(
      secretAction.uiSettings.buttonSettings,
    );

    expect(showAlert).toHaveBeenCalledWith({
      text: 'Failed to download kubeconfig: Kubeconfig Secret could not be read',
      type: 'error',
    });
    expect(component.isDownloadingKubeConfig()).toBe(false);
  });

  it.each([
    { shape: 'a non-array value', actions: {} },
    { shape: 'a null array entry', actions: [null] },
  ])('should ignore actions configured as $shape', ({ actions }) => {
    mockResourceService.read.mockClear();
    const newFixture = TestBed.createComponent(DetailView);
    const newComponent = newFixture.componentInstance;
    newComponent.context = (() => ({
      ...component.context(),
      resourceDefinition: {
        ...component.context().resourceDefinition,
        ui: { detailView: { fields: [], actions } },
      },
    })) as any;
    newComponent.LuigiClient = component.LuigiClient;

    expect(() => newFixture.detectChanges()).not.toThrow();
    expect(mockResourceService.read.mock.calls[0][2]).toEqual([
      { metadata: ['deletionTimestamp'] },
    ]);
    expect(newComponent.configuredActions()).toEqual([]);
  });

  it('should render configured presentation when the Secret reference is ready', () => {
    kubeconfigSecretServiceMock.isSecretReferenceAvailable.mockReturnValue(
      true,
    );
    mockResourceService.read.mockReturnValueOnce(
      of({
        metadata: { name: 'cluster-1', namespace: 'default' },
        status: {
          kubeconfig: {
            secretRef: {
              name: 'cluster-kubeconfig',
              namespace: 'provider-ns',
            },
          },
        },
      }),
    );
    const newFixture = TestBed.createComponent(DetailView);
    const newComponent = newFixture.componentInstance;
    newComponent.context = (() => ({
      ...component.context(),
      resourceDefinition: {
        ...component.context().resourceDefinition,
        ui: { detailView: { fields: [], actions: [secretAction] } },
      },
    })) as any;
    newComponent.LuigiClient = component.LuigiClient;
    newFixture.detectChanges();

    expect(newComponent.customActions()).toContain(
      secretAction.uiSettings.buttonSettings,
    );
    expect(
      kubeconfigSecretServiceMock.isSecretReferenceAvailable,
    ).toHaveBeenCalledWith(
      secretAction.uiSettings.buttonSettings,
      expect.objectContaining({
        metadata: expect.objectContaining({ name: 'cluster-1' }),
      }),
      expect.anything(),
    );
  });

  it('should delegate Secret-backed download resolution to the service', async () => {
    const loadedResource = {
      metadata: { name: 'cluster-1', namespace: 'default' },
      status: {
        kubeconfig: {
          secretRef: { name: 'cluster-kubeconfig', namespace: 'provider-ns' },
        },
      },
    } as any;
    component.resource.set(loadedResource);
    kubeconfigSecretServiceMock.readKubeconfig.mockReturnValue(
      of({ contents: 'apiVersion: v1', filename: 'cluster.yaml' }),
    );
    const blobConstructor = vi.fn(function (parts, options) {
      return { parts, options };
    });
    vi.stubGlobal('Blob', blobConstructor);
    const anchor = document.createElement('a');
    vi.spyOn(anchor, 'click');
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob-url');
    global.URL.revokeObjectURL = vi.fn();

    await component.downloadKubeconfigFromSecretRef(
      secretAction.uiSettings.buttonSettings,
    );

    expect(kubeconfigSecretServiceMock.readKubeconfig).toHaveBeenCalledWith(
      secretAction.uiSettings.buttonSettings,
      loadedResource,
      component.context(),
    );
    expect(blobConstructor).toHaveBeenCalledWith(['apiVersion: v1'], {
      type: 'application/yaml',
    });
    expect(anchor.download).toBe('cluster.yaml');
    expect(anchor.click).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob-url');
    expect(component.isDownloadingKubeConfig()).toBe(false);
  });

  it('should not start a second Secret-backed download while one is running', async () => {
    component.isDownloadingKubeConfig.set(true);

    await component.downloadKubeconfigFromSecretRef(
      secretAction.uiSettings.buttonSettings,
    );

    expect(kubeconfigSecretServiceMock.readKubeconfig).not.toHaveBeenCalled();
  });

  it('should discard a Secret response after the displayed resource changes', async () => {
    const readResult = new Subject<{
      contents: string;
      filename: string;
    }>();
    component.resource.set({
      metadata: { name: 'cluster-1', namespace: 'default' },
    } as any);
    kubeconfigSecretServiceMock.readKubeconfig.mockReturnValue(readResult);
    global.URL.createObjectURL = vi.fn();

    const download = component.downloadKubeconfigFromSecretRef(
      secretAction.uiSettings.buttonSettings,
    );
    component.resource.set({
      metadata: { name: 'cluster-2', namespace: 'default' },
    } as any);
    readResult.next({
      contents: 'apiVersion: v1',
      filename: 'cluster-1.yaml',
    });
    readResult.complete();
    await download;

    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
    expect(component.isDownloadingKubeConfig()).toBe(false);
  });

  it('should suppress a Secret error after the displayed resource changes', async () => {
    const showAlert = vi.fn();
    const readResult = new Subject<{
      contents: string;
      filename: string;
    }>();
    component.resource.set({
      metadata: { name: 'cluster-1', namespace: 'default' },
    } as any);
    component.LuigiClient = (() => ({
      uxManager: () => ({ showAlert }),
      linkManager: () => ({ navigate: vi.fn(), openAsModal: vi.fn() }),
      getActiveFeatureToggles: () => [],
    })) as any;
    kubeconfigSecretServiceMock.readKubeconfig.mockReturnValue(readResult);

    const download = component.downloadKubeconfigFromSecretRef(
      secretAction.uiSettings.buttonSettings,
    );
    component.resource.set({
      metadata: { name: 'cluster-2', namespace: 'default' },
    } as any);
    readResult.error(new Error('stale failure'));
    await download;

    expect(showAlert).not.toHaveBeenCalled();
    expect(component.isDownloadingKubeConfig()).toBe(false);
  });

  it('should cancel a pending Secret read when the context changes', async () => {
    const showAlert = vi.fn();
    const readResult = new Subject<{
      contents: string;
      filename: string;
    }>();
    const newFixture = TestBed.createComponent(DetailView);
    const newComponent = newFixture.componentInstance;
    const oldContext = {
      ...component.context(),
      resourceId: 'cluster-1',
      kcpPath: 'root:orgs:showroom:old-account',
    };
    newFixture.componentRef.setInput('context', oldContext);
    newFixture.componentRef.setInput('LuigiClient', (() => ({
      uxManager: () => ({ showAlert }),
      linkManager: () => ({ navigate: vi.fn(), openAsModal: vi.fn() }),
      getActiveFeatureToggles: () => [],
    })) as any);
    newFixture.detectChanges();
    newComponent.resource.set({
      metadata: { name: 'cluster-1', namespace: 'default' },
    } as any);
    kubeconfigSecretServiceMock.readKubeconfig.mockReturnValue(readResult);
    global.URL.createObjectURL = vi.fn();

    const download = newComponent.downloadKubeconfigFromSecretRef(
      secretAction.uiSettings.buttonSettings,
    );
    expect(readResult.observed).toBe(true);

    newFixture.componentRef.setInput('context', {
      ...oldContext,
      resourceId: 'cluster-2',
      kcpPath: 'root:orgs:showroom:new-account',
    });
    newFixture.detectChanges();
    await download;

    expect(readResult.observed).toBe(false);
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
    expect(showAlert).not.toHaveBeenCalled();
    expect(newComponent.isDownloadingKubeConfig()).toBe(false);
    newFixture.destroy();
  });

  it('should cancel a pending Secret read when the view is destroyed', async () => {
    const showAlert = vi.fn();
    const readResult = new Subject<{
      contents: string;
      filename: string;
    }>();
    component.resource.set({
      metadata: { name: 'cluster-1', namespace: 'default' },
    } as any);
    component.LuigiClient = (() => ({
      uxManager: () => ({ showAlert }),
      linkManager: () => ({ navigate: vi.fn(), openAsModal: vi.fn() }),
      getActiveFeatureToggles: () => [],
    })) as any;
    kubeconfigSecretServiceMock.readKubeconfig.mockReturnValue(readResult);
    global.URL.createObjectURL = vi.fn();

    const download = component.downloadKubeconfigFromSecretRef(
      secretAction.uiSettings.buttonSettings,
    );
    expect(readResult.observed).toBe(true);

    fixture.destroy();
    await download;

    expect(readResult.observed).toBe(false);
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
    expect(showAlert).not.toHaveBeenCalled();
    expect(component.isDownloadingKubeConfig()).toBe(false);
  });

  it('should report the service error without attempting a download', async () => {
    const showAlertSpy = vi.fn();
    component.LuigiClient = (() => ({
      uxManager: () => ({ showAlert: showAlertSpy }),
      linkManager: () => ({
        fromContext: vi.fn().mockReturnThis(),
        navigate: vi.fn(),
      }),
      getActiveFeatureToggles: () => [],
    })) as any;
    kubeconfigSecretServiceMock.readKubeconfig.mockReturnValue(
      throwError(() => new Error('Kubeconfig Secret could not be read')),
    );
    global.URL.createObjectURL = vi.fn();

    await component.downloadKubeconfigFromSecretRef(
      secretAction.uiSettings.buttonSettings,
    );

    expect(showAlertSpy).toHaveBeenCalledWith({
      text: 'Failed to download kubeconfig: Kubeconfig Secret could not be read',
      type: 'error',
    });
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
    expect(component.isDownloadingKubeConfig()).toBe(false);
  });

  it('should dispatch a configured Secret-backed action to the download flow', () => {
    mockResourceService.read.mockReturnValueOnce(
      of({
        metadata: { name: 'cluster-1', namespace: 'default' },
        status: {
          kubeconfig: {
            secretRef: { name: 'cluster-kubeconfig', namespace: 'default' },
          },
        },
      }),
    );
    const newFixture = TestBed.createComponent(DetailView);
    const newComponent = newFixture.componentInstance;
    newComponent.context = (() => ({
      ...component.context(),
      resourceDefinition: {
        ...component.context().resourceDefinition,
        ui: { detailView: { fields: [], actions: [secretAction] } },
      },
    })) as any;
    newComponent.LuigiClient = component.LuigiClient;
    newFixture.detectChanges();
    const downloadSpy = vi
      .spyOn(newComponent, 'downloadKubeconfigFromSecretRef')
      .mockResolvedValue(undefined);

    newComponent.onActionButtonClick({
      event: new MouseEvent('click'),
      action: secretAction.uiSettings.buttonSettings,
    } as any);

    expect(downloadSpy).toHaveBeenCalledWith(
      secretAction.uiSettings.buttonSettings,
    );
  });

  it('should dispatch repeated generic actions independently', () => {
    const actions = [
      {
        value: '/clusters/one',
        uiSettings: {
          buttonSettings: { action: 'navigate', text: 'Cluster one' },
        },
      },
      {
        value: '/clusters/two',
        uiSettings: {
          buttonSettings: { action: 'navigate', text: 'Cluster two' },
        },
      },
    ];
    const newFixture = TestBed.createComponent(DetailView);
    const newComponent = newFixture.componentInstance;
    newComponent.context = (() => ({
      ...component.context(),
      resourceDefinition: {
        ...component.context().resourceDefinition,
        ui: { detailView: { fields: [], actions } },
      },
    })) as any;
    newComponent.LuigiClient = component.LuigiClient;
    newFixture.detectChanges();

    expect(newComponent.customActions()).toContain(
      actions[0].uiSettings.buttonSettings,
    );
    expect(newComponent.customActions()).toContain(
      actions[1].uiSettings.buttonSettings,
    );

    newComponent.onActionButtonClick({
      event: new MouseEvent('click'),
      action: actions[1].uiSettings.buttonSettings,
    } as any);

    expect(luigiClientLinkManagerNavigate).toHaveBeenCalledWith(
      '/clusters/two',
    );
  });

  it('should render an unsupported generic action and alert when it is clicked', () => {
    const showAlert = vi.fn();
    mockResourceService.read.mockClear();
    const unsupportedAction = {
      property: 'status.console.url',
      uiSettings: {
        buttonSettings: {
          action: 'providerSpecificAction',
          text: 'Provider action',
        },
      },
    };
    const newFixture = TestBed.createComponent(DetailView);
    const newComponent = newFixture.componentInstance;
    newComponent.context = (() => ({
      ...component.context(),
      resourceDefinition: {
        ...component.context().resourceDefinition,
        ui: { detailView: { fields: [], actions: [unsupportedAction] } },
      },
    })) as any;
    newComponent.LuigiClient = (() => ({
      linkManager: () => ({ navigate: vi.fn(), openAsModal: vi.fn() }),
      uxManager: () => ({ showAlert }),
      getActiveFeatureToggles: () => [],
    })) as any;
    newFixture.detectChanges();

    expect(newComponent.customActions()).toContain(
      unsupportedAction.uiSettings.buttonSettings,
    );
    expect(mockResourceService.read.mock.calls[0][2]).toEqual([
      { metadata: ['deletionTimestamp'] },
    ]);

    newComponent.onActionButtonClick({
      event: new MouseEvent('click'),
      action: unsupportedAction.uiSettings.buttonSettings,
    } as any);

    expect(showAlert).toHaveBeenCalledWith({
      text: 'Configured action could not be executed',
      type: 'error',
    });
  });

  it('should render a generic action without a target and alert on click', () => {
    const showAlert = vi.fn();
    mockResourceService.read.mockClear();
    const missingTargetAction = {
      uiSettings: {
        buttonSettings: { action: 'navigate', text: 'Console' },
      },
    };
    const newFixture = TestBed.createComponent(DetailView);
    const newComponent = newFixture.componentInstance;
    newComponent.context = (() => ({
      ...component.context(),
      resourceDefinition: {
        ...component.context().resourceDefinition,
        ui: { detailView: { fields: [], actions: [missingTargetAction] } },
      },
    })) as any;
    newComponent.LuigiClient = (() => ({
      linkManager: () => ({ navigate: vi.fn(), openAsModal: vi.fn() }),
      uxManager: () => ({ showAlert }),
      getActiveFeatureToggles: () => [],
    })) as any;
    newFixture.detectChanges();

    expect(newComponent.customActions()).toContain(
      missingTargetAction.uiSettings.buttonSettings,
    );

    newComponent.onActionButtonClick({
      event: new MouseEvent('click'),
      action: missingTargetAction.uiSettings.buttonSettings,
    } as any);

    expect(showAlert).toHaveBeenCalledWith({
      text: 'Configured action could not be executed',
      type: 'error',
    });
  });

  it('should not add a generic action with an invalid JSONPath to the query', () => {
    mockResourceService.read.mockClear();
    mockResourceService.read.mockReturnValueOnce(
      of({
        metadata: { name: 'cluster-1' },
        status: { console: { url: '/console' } },
      }),
    );
    const invalidJsonPathAction = {
      property: 'status.console.url',
      jsonPathExpression: '$[?(',
      uiSettings: {
        buttonSettings: { action: 'navigate', text: 'Console' },
      },
    };
    const newFixture = TestBed.createComponent(DetailView);
    const newComponent = newFixture.componentInstance;
    newComponent.context = (() => ({
      ...component.context(),
      resourceDefinition: {
        ...component.context().resourceDefinition,
        ui: {
          detailView: { fields: [], actions: [invalidJsonPathAction] },
        },
      },
    })) as any;
    newComponent.LuigiClient = component.LuigiClient;
    newFixture.detectChanges();

    expect(() => newComponent.customActions()).not.toThrow();
    expect(mockResourceService.read.mock.calls[0][2]).toEqual([
      { metadata: ['deletionTimestamp'] },
    ]);
  });

  it('should neither render nor query a Secret action when its required permission is denied', () => {
    mockResourceService.read.mockClear();
    kubeconfigSecretServiceMock.secretReferenceQueryFields.mockClear();
    mockResourceService.read.mockReturnValueOnce(
      of({
        metadata: { name: 'cluster-1', namespace: 'default' },
      }),
    );
    const newFixture = TestBed.createComponent(DetailView);
    const newComponent = newFixture.componentInstance;
    newComponent.context = (() => ({
      ...component.context(),
      namespaceId: 'default',
      portalPermissions: { 'clusters/default/cluster-1': ['get'] },
      resourceDefinition: {
        ...component.context().resourceDefinition,
        permissionsDefinition: { resource: 'clusters' },
        ui: {
          detailView: {
            fields: [],
            actions: [
              {
                ...secretAction,
                requirePermission: 'update',
              },
            ],
          },
        },
      },
    })) as any;
    newComponent.LuigiClient = component.LuigiClient;
    newFixture.detectChanges();

    expect(
      newComponent.customActions().map((action) => action.text),
    ).not.toContain('Download cluster access');
    expect(newComponent.configuredActions()).toEqual([]);
    expect(
      kubeconfigSecretServiceMock.secretReferenceQueryFields,
    ).not.toHaveBeenCalled();
    expect(mockResourceService.read.mock.calls[0][2]).toEqual([
      { metadata: ['deletionTimestamp'] },
    ]);
  });

  it('should use the effective route namespace before querying a permission-gated Secret reference', () => {
    mockResourceService.read.mockClear();
    kubeconfigSecretServiceMock.secretReferenceQueryFields.mockClear();
    mockResourceService.getNamespace.mockReturnValue('route-namespace');
    mockResourceService.read.mockReturnValueOnce(
      of({
        metadata: { name: 'cluster-1', namespace: 'route-namespace' },
      }),
    );
    const newFixture = TestBed.createComponent(DetailView);
    const newComponent = newFixture.componentInstance;
    newComponent.context = (() => ({
      ...component.context(),
      namespaceId: undefined,
      portalPermissions: {
        'clusters/route-namespace/cluster-1': ['get'],
      },
      resourceDefinition: {
        ...component.context().resourceDefinition,
        permissionsDefinition: { resource: 'clusters' },
        ui: {
          detailView: {
            fields: [],
            actions: [
              {
                ...secretAction,
                requirePermission: 'update',
              },
            ],
          },
        },
      },
    })) as any;
    newComponent.LuigiClient = component.LuigiClient;
    newFixture.detectChanges();

    expect(mockResourceService.getNamespace).toHaveBeenCalledWith(
      newComponent.context(),
    );
    expect(newComponent.configuredActions()).toEqual([]);
    expect(
      kubeconfigSecretServiceMock.secretReferenceQueryFields,
    ).not.toHaveBeenCalled();
    expect(mockResourceService.read.mock.calls[0][2]).toEqual([
      { metadata: ['deletionTimestamp'] },
    ]);
  });

  it('should restore configured modal actions', () => {
    const openAsModal = vi.fn();
    const modalAction = {
      value: '/help',
      uiSettings: {
        buttonSettings: {
          action: 'openInModal',
          text: 'Help',
          modalSettings: { title: 'Help', size: 'm' },
        },
      },
    };
    const newFixture = TestBed.createComponent(DetailView);
    const newComponent = newFixture.componentInstance;
    newComponent.context = (() => ({
      ...component.context(),
      resourceDefinition: {
        ...component.context().resourceDefinition,
        ui: { detailView: { fields: [], actions: [modalAction] } },
      },
    })) as any;
    newComponent.LuigiClient = (() => ({
      linkManager: () => ({
        fromContext: vi.fn().mockReturnThis(),
        navigate: vi.fn(),
        openAsModal,
      }),
      uxManager: () => ({ showAlert: vi.fn() }),
      getActiveFeatureToggles: () => [],
    })) as any;
    newFixture.detectChanges();

    newComponent.onActionButtonClick({
      event: new MouseEvent('click'),
      action: modalAction.uiSettings.buttonSettings,
    } as any);

    expect(openAsModal).toHaveBeenCalledWith('/help', {
      title: 'Help',
      size: 'm',
    });
  });

  it('should call resource service with correct parameters for account kind', () => {
    vi.clearAllMocks();
    const newFixture = TestBed.createComponent(DetailView);
    const newComponent = newFixture.componentInstance;

    newComponent.context = (() => ({
      resourceId: 'test-account',
      token: 'abc123',
      resourceDefinition: {
        entity: 'Account',
        entityCollection: 'accounts',
        apiGroup: 'core_k8s_io',
        version: 'v1alpha1',
        ui: {
          detailView: {
            fields: [],
          },
        },
      },
      entityName: 'test-account',
      parentNavigationContexts: ['project'],
    })) as any;

    newComponent.LuigiClient = (() => ({
      linkManager: () => ({
        fromContext: vi.fn().mockReturnThis(),
        navigate: vi.fn(),
        withParams: vi.fn().mockReturnThis(),
      }),
      uxManager: () => ({
        showAlert: vi.fn(),
      }),
      getNodeParams: vi.fn(),
      getActiveFeatureToggles: () => [],
    })) as any;

    newFixture.detectChanges();

    expect(mockResourceService.read).toHaveBeenCalled();
    const readCall = mockResourceService.read.mock.calls[0];
    const fieldsArg = readCall[2];
    const fieldsStr = JSON.stringify(fieldsArg);

    expect(readCall[0]).toBe('test-account');
    expect(readCall[1]).toEqual(
      expect.objectContaining({
        entity: 'Account',
        apiGroup: 'core_k8s_io',
        version: 'v1alpha1',
      }),
    );
    expect(fieldsStr).toContain('metadata');
    expect(fieldsStr).toContain('deletionTimestamp');
    expect(readCall[3]).toEqual(expect.any(Object));
    expect(readCall[4]).toBe(true);
  });

  it('should handle resource service read error', () => {
    vi.clearAllMocks();
    mockResourceService.read.mockReturnValueOnce(
      throwError(() => new Error('Read failed')),
    );

    const newFixture = TestBed.createComponent(DetailView);
    const newComponent = newFixture.componentInstance;

    newComponent.context = (() => ({
      resourceId: 'cluster-1',
      token: 'abc123',
      resourceDefinition: {
        entity: 'Cluster',
        entityCollection: 'clusters',
        apiGroup: 'core_k8s_io',
        ui: {
          detailView: {
            fields: [],
          },
        },
      },
      entityName: 'test-resource',
      parentNavigationContexts: ['project'],
    })) as any;

    newComponent.LuigiClient = (() => ({
      linkManager: () => ({
        fromContext: vi.fn().mockReturnThis(),
        navigate: vi.fn(),
        withParams: vi.fn().mockReturnThis(),
      }),
      uxManager: () => ({
        showAlert: vi.fn(),
      }),
      getNodeParams: vi.fn(),
      getActiveFeatureToggles: () => [],
    })) as any;

    newFixture.detectChanges();

    // Component should still be created even if read fails
    expect(newComponent).toBeTruthy();
  });

  it('should clear the old resource and ignore a stale read after the context changes', () => {
    vi.clearAllMocks();
    const oldRead = new Subject<any>();
    const newRead = new Subject<any>();
    mockResourceService.read.mockReset();
    mockResourceService.read
      .mockReturnValueOnce(oldRead)
      .mockReturnValueOnce(newRead);

    const newFixture = TestBed.createComponent(DetailView);
    const newComponent = newFixture.componentInstance;
    const oldContext = {
      ...component.context(),
      resourceId: 'old-cluster',
      kcpPath: 'root:orgs:showroom:old-account',
      resourceDefinition: {
        ...component.context().resourceDefinition,
        ui: { detailView: { fields: [], actions: [secretAction] } },
      },
    };
    const newContext = {
      ...oldContext,
      resourceId: 'new-cluster',
      kcpPath: 'root:orgs:showroom:new-account',
    };
    newFixture.componentRef.setInput('context', oldContext);
    newFixture.componentRef.setInput('LuigiClient', component.LuigiClient());
    newFixture.detectChanges();

    oldRead.next({
      metadata: { name: 'old-cluster', namespace: 'default' },
      status: {
        kubeconfig: {
          secretRef: { name: 'old-secret', namespace: 'default' },
        },
      },
    });
    newFixture.detectChanges();
    expect(newComponent.resource()?.metadata?.name).toBe('old-cluster');

    newFixture.componentRef.setInput('context', newContext);
    newFixture.detectChanges();

    expect(mockResourceService.read).toHaveBeenCalledTimes(2);
    expect(newComponent.resource()).toBeUndefined();

    newRead.next({
      metadata: { name: 'new-cluster', namespace: 'default' },
    });
    oldRead.next({
      metadata: { name: 'old-cluster', namespace: 'default' },
      status: {
        kubeconfig: {
          secretRef: { name: 'old-secret', namespace: 'default' },
        },
      },
    });
    newFixture.detectChanges();

    expect(newComponent.resource()?.metadata?.name).toBe('new-cluster');
    newFixture.destroy();
  });

  describe('Null and undefined checks', () => {
    let mockUxManager: any;

    beforeEach(() => {
      mockUxManager = {
        showAlert: vi.fn(),
      };
    });

    it('should handle undefined resourceId in readResource method', () => {
      vi.clearAllMocks();
      const newFixture = TestBed.createComponent(DetailView);
      const newComponent = newFixture.componentInstance;

      newComponent.context = (() => ({
        entityName: undefined,
        token: 'abc123',
        resourceDefinition: {
          entity: 'Cluster',
          entityCollection: 'clusters',
          apiGroup: 'core_k8s_io',
          ui: {
            detailView: {
              fields: [],
            },
          },
        },
        parentNavigationContexts: ['project'],
      })) as any;

      newComponent.LuigiClient = (() => ({
        linkManager: () => ({
          fromContext: vi.fn().mockReturnThis(),
          navigate: vi.fn(),
          withParams: vi.fn().mockReturnThis(),
        }),
        uxManager: () => mockUxManager,
        getNodeParams: vi.fn(),
        getActiveFeatureToggles: () => [],
      })) as any;

      expect(() => {
        newFixture.detectChanges();
      }).toThrow('Resource ID is not defined');

      expect(mockUxManager.showAlert).toHaveBeenCalledWith({
        text: 'Resource ID is not defined',
        type: 'error',
      });
    });

    it('should call handleResourcePendingDeletionError during readResource if resource has deletionTimestamp', () => {
      const terminatingResource = {
        metadata: {
          name: 'test-resource',
          deletionTimestamp: '2026-02-04T12:00:00Z',
        },
      };

      mockResourceService.read.mockReturnValue(of(terminatingResource));

      const newFixture = TestBed.createComponent(DetailView);
      const newComponent = newFixture.componentInstance;

      newComponent.context = component.context;
      newComponent.LuigiClient = component.LuigiClient;

      newFixture.detectChanges();

      expect(
        errorHandlerServiceMock.handleResourcePendingDeletion,
      ).toHaveBeenCalledWith(terminatingResource);
    });

    it('should handle undefined parentNavigationContext in navigateToParent method', () => {
      vi.clearAllMocks();
      const newFixture = TestBed.createComponent(DetailView);
      const newComponent = newFixture.componentInstance;

      newComponent.context = (() => ({
        resourceId: 'cluster-1',
        token: 'abc123',
        resourceDefinition: {
          entity: 'Cluster',
          entityCollection: 'clusters',
          apiGroup: 'core_k8s_io',
          ui: {
            detailView: {
              fields: [],
            },
          },
        },
        entityName: 'test-resource',
        parentNavigationContexts: undefined, // undefined parentNavigationContexts
      })) as any;

      newComponent.LuigiClient = (() => ({
        linkManager: () => ({
          fromContext: vi.fn().mockReturnThis(),
          navigate: vi.fn(),
          withParams: vi.fn().mockReturnThis(),
        }),
        uxManager: () => mockUxManager,
        getNodeParams: vi.fn(),
        getActiveFeatureToggles: () => [],
      })) as any;

      newFixture.detectChanges();

      expect(() => {
        newComponent.navigateToParent();
      }).toThrow('Parent navigation context is not defined');

      expect(mockUxManager.showAlert).toHaveBeenCalledWith({
        text: 'Parent navigation context is not defined',
        type: 'error',
      });
    });

    it('should handle empty parentNavigationContexts array in navigateToParent method', () => {
      vi.clearAllMocks();
      const newFixture = TestBed.createComponent(DetailView);
      const newComponent = newFixture.componentInstance;

      newComponent.context = (() => ({
        resourceId: 'cluster-1',
        token: 'abc123',
        resourceDefinition: {
          entity: 'Cluster',
          entityCollection: 'clusters',
          apiGroup: 'core_k8s_io',
          ui: {
            detailView: {
              fields: [],
            },
          },
        },
        entityName: 'test-resource',
        parentNavigationContexts: [], // empty array
      })) as any;

      newComponent.LuigiClient = (() => ({
        linkManager: () => ({
          fromContext: vi.fn().mockReturnThis(),
          navigate: vi.fn(),
          withParams: vi.fn().mockReturnThis(),
        }),
        uxManager: () => mockUxManager,
        getNodeParams: vi.fn(),
        getActiveFeatureToggles: () => [],
      })) as any;

      newFixture.detectChanges();

      expect(() => {
        newComponent.navigateToParent();
      }).toThrow('Parent navigation context is not defined');

      expect(mockUxManager.showAlert).toHaveBeenCalledWith({
        text: 'Parent navigation context is not defined',
        type: 'error',
      });
    });

    it('should handle undefined resourceDefinition in getResourceDefinition method', () => {
      vi.clearAllMocks();
      const newFixture = TestBed.createComponent(DetailView);
      const newComponent = newFixture.componentInstance;

      newComponent.context = (() => ({
        resourceId: 'cluster-1',
        token: 'abc123',
        resourceDefinition: undefined, // undefined resourceDefinition
        entityName: 'test-resource',
        parentNavigationContexts: ['project'],
      })) as any;

      newComponent.LuigiClient = (() => ({
        linkManager: () => ({
          fromContext: vi.fn().mockReturnThis(),
          navigate: vi.fn(),
          withParams: vi.fn().mockReturnThis(),
        }),
        uxManager: () => mockUxManager,
        getNodeParams: vi.fn(),
        getActiveFeatureToggles: () => [],
      })) as any;

      expect(() => {
        newFixture.detectChanges();
      }).toThrow('Resource definition is not defined');

      expect(mockUxManager.showAlert).toHaveBeenCalledWith({
        text: 'Resource definition is not defined',
        type: 'error',
      });
    });
  });

  describe('Resource description definition', () => {
    it('should include resourceDescription in query fields', () => {
      vi.clearAllMocks();
      const newFixture = TestBed.createComponent(DetailView);
      const newComponent = newFixture.componentInstance;

      newComponent.context = (() => ({
        resourceId: 'cluster-1',
        token: 'abc123',
        resourceDefinition: {
          version: 'v1alpha1',
          entity: 'Cluster',
          entityCollection: 'clusters',
          apiGroup: 'core_k8s_io',
          ui: {
            detailView: {
              fields: [{ property: 'metadata.name' }],
              resourceDescription: {
                property: 'spec.description',
              },
            },
          },
        },
        entityName: 'test-resource',
        parentNavigationContexts: ['project'],
      })) as any;

      newComponent.LuigiClient = (() => ({
        linkManager: () => ({
          fromContext: vi.fn().mockReturnThis(),
          navigate: vi.fn(),
          withParams: vi.fn().mockReturnThis(),
        }),
        uxManager: () => ({
          showAlert: vi.fn(),
        }),
        getNodeParams: vi.fn(),
        getActiveFeatureToggles: () => [],
      })) as any;

      newFixture.detectChanges();

      expect(mockResourceService.read).toHaveBeenCalled();
      const readCall = mockResourceService.read.mock.calls[0];
      const fieldsArg = readCall[2];
      const fieldsStr = JSON.stringify(fieldsArg);
      expect(fieldsStr).toContain('spec');
      expect(fieldsStr).toContain('description');
      expect(fieldsStr).toContain('metadata');
      expect(fieldsStr).toContain('deletionTimestamp');
    });
  });

  describe('Resource title definition', () => {
    it('should include resourceTitle in query fields', () => {
      vi.clearAllMocks();
      const newFixture = TestBed.createComponent(DetailView);
      const newComponent = newFixture.componentInstance;

      newComponent.context = (() => ({
        resourceId: 'cluster-1',
        token: 'abc123',
        resourceDefinition: {
          version: 'v1alpha1',
          entity: 'Cluster',
          entityCollection: 'clusters',
          apiGroup: 'core_k8s_io',
          ui: {
            detailView: {
              fields: [{ property: 'metadata.name' }],
              resourceTitle: {
                property: 'spec.displayName',
              },
            },
          },
        },
        entityName: 'test-resource',
        parentNavigationContexts: ['project'],
      })) as any;

      newComponent.LuigiClient = (() => ({
        linkManager: () => ({
          fromContext: vi.fn().mockReturnThis(),
          navigate: vi.fn(),
          withParams: vi.fn().mockReturnThis(),
        }),
        uxManager: () => ({
          showAlert: vi.fn(),
        }),
        getNodeParams: vi.fn(),
        getActiveFeatureToggles: () => [],
      })) as any;

      newFixture.detectChanges();

      expect(mockResourceService.read).toHaveBeenCalled();
      const readCall = mockResourceService.read.mock.calls[0];
      const fieldsArg = readCall[2];
      const fieldsStr = JSON.stringify(fieldsArg);
      expect(fieldsStr).toContain('spec');
      expect(fieldsStr).toContain('displayName');
      expect(fieldsStr).toContain('metadata');
      expect(fieldsStr).toContain('deletionTimestamp');
    });

    it('should include both resourceTitle and resourceDescription in query fields', () => {
      vi.clearAllMocks();
      const newFixture = TestBed.createComponent(DetailView);
      const newComponent = newFixture.componentInstance;

      newComponent.context = (() => ({
        resourceId: 'cluster-1',
        token: 'abc123',
        resourceDefinition: {
          version: 'v1alpha1',
          entity: 'Cluster',
          entityCollection: 'clusters',
          apiGroup: 'core_k8s_io',
          ui: {
            detailView: {
              fields: [{ property: 'metadata.name' }],
              resourceTitle: {
                property: 'spec.displayName',
              },
              resourceDescription: {
                property: 'spec.description',
              },
            },
          },
        },
        entityName: 'test-resource',
        parentNavigationContexts: ['project'],
      })) as any;

      newComponent.LuigiClient = (() => ({
        linkManager: () => ({
          fromContext: vi.fn().mockReturnThis(),
          navigate: vi.fn(),
          withParams: vi.fn().mockReturnThis(),
        }),
        uxManager: () => ({
          showAlert: vi.fn(),
        }),
        getNodeParams: vi.fn(),
        getActiveFeatureToggles: () => [],
      })) as any;

      newFixture.detectChanges();

      expect(mockResourceService.read).toHaveBeenCalled();
      const readCall = mockResourceService.read.mock.calls[0];
      const fieldsArg = readCall[2];
      const fieldsStr = JSON.stringify(fieldsArg);
      expect(fieldsStr).toContain('spec');
      expect(fieldsStr).toContain('displayName');
      expect(fieldsStr).toContain('description');
      expect(fieldsStr).toContain('metadata');
      expect(fieldsStr).toContain('deletionTimestamp');
    });
  });

  describe('dashboardConfig', () => {
    it('should include download-kubeconfig action when showDownloadKubeconfig is true', () => {
      const newFixture = TestBed.createComponent(DetailView);
      const newComponent = newFixture.componentInstance;

      newComponent.context = (() => ({
        resourceId: 'cluster-1',
        token: 'abc123',
        resourceDefinition: {
          version: 'v1alpha1',
          entity: 'Cluster',
          entityCollection: 'clusters',
          apiGroup: 'core_k8s_io',
          ui: {
            detailView: {
              fields: [],
              showDownloadKubeconfig: true,
            },
          },
        },
        entityName: 'test-resource',
        parentNavigationContexts: ['project'],
      })) as any;

      newComponent.LuigiClient = (() => ({
        linkManager: () => ({
          fromContext: vi.fn().mockReturnThis(),
          navigate: vi.fn(),
        }),
        uxManager: () => ({ showAlert: vi.fn() }),
        getNodeParams: vi.fn(),
        getActiveFeatureToggles: () => [],
      })) as any;

      newFixture.detectChanges();

      const actions = newComponent.customActions();
      expect(actions.some((a) => a.action === 'download-kubeconfig')).toBe(
        true,
      );
    });

    it('should not include edit/delete actions when resource is not loaded', () => {
      const newFixture = TestBed.createComponent(DetailView);
      const newComponent = newFixture.componentInstance;
      mockResourceService.read = vi.fn().mockReturnValue(of(undefined));
      newComponent.context = (() => ({
        resourceId: 'cluster-1',
        token: 'abc123',
        resourceDefinition: {
          version: 'v1alpha1',
          entity: 'Cluster',
          entityCollection: 'clusters',
          apiGroup: 'core_k8s_io',
          ui: { detailView: { fields: [] } },
        },
        entityName: 'test-resource',
        parentNavigationContexts: ['project'],
      })) as any;
      newComponent.LuigiClient = (() => ({
        linkManager: () => ({
          fromContext: vi.fn().mockReturnThis(),
          navigate: vi.fn(),
        }),
        uxManager: () => ({ showAlert: vi.fn() }),
        getNodeParams: vi.fn(),
        getActiveFeatureToggles: () => [],
      })) as any;
      newFixture.detectChanges();
      const actions = newComponent.customActions();
      expect(actions.some((a) => a.action === 'edit')).toBe(false);
      expect(actions.some((a) => a.action === 'delete')).toBe(false);
    });
  });

  describe('onActionButtonClick', () => {
    it('should call downloadKubeConfig for download-kubeconfig action', () => {
      const downloadSpy = vi
        .spyOn(component, 'downloadKubeConfig')
        .mockResolvedValue(undefined);
      component.onActionButtonClick({
        event: new MouseEvent('click'),
        action: { action: 'download-kubeconfig' },
      } as any);
      expect(downloadSpy).toHaveBeenCalled();
    });

    it('should call openEditResourceModal for edit action when resource exists', () => {
      const resource = { metadata: { name: 'cluster-1' } } as any;
      component.resource.set(resource);
      const openEditSpy = vi.spyOn(component, 'openEditResourceModal');
      const event = new MouseEvent('click');
      component.onActionButtonClick({
        event,
        action: { action: 'edit' },
      } as any);
      expect(openEditSpy).toHaveBeenCalledWith(event);
    });

    it('should call openDeleteResourceModal for delete action when resource exists', () => {
      const resource = { metadata: { name: 'cluster-1' } } as any;
      component.resource.set(resource);
      const openDeleteSpy = vi.spyOn(component, 'openDeleteResourceModal');
      const event = new MouseEvent('click');
      component.onActionButtonClick({
        event,
        action: { action: 'delete' },
      } as any);
      expect(openDeleteSpy).toHaveBeenCalledWith(event, resource);
    });

    it('should not call openEditResourceModal for edit action when resource is undefined', () => {
      component.resource.set(undefined);
      const openEditSpy = vi.spyOn(component, 'openEditResourceModal');
      component.onActionButtonClick({
        event: new MouseEvent('click'),
        action: { action: 'edit' },
      } as any);
      expect(openEditSpy).not.toHaveBeenCalled();
    });

    it('should not call openDeleteResourceModal for delete action when resource is undefined', () => {
      component.resource.set(undefined);
      const openDeleteSpy = vi.spyOn(component, 'openDeleteResourceModal');
      component.onActionButtonClick({
        event: new MouseEvent('click'),
        action: { action: 'delete' },
      } as any);
      expect(openDeleteSpy).not.toHaveBeenCalled();
    });
  });

  describe('dashboardConfigurationChanged', () => {
    it('should write config to localStorage', () => {
      const writeConfigSpy = vi.spyOn(localStorage, 'setItem');
      const config = { cards: [], sections: [] };
      (component as any).dashboardConfigurationChanged(config);
      expect(writeConfigSpy).toHaveBeenCalled();
    });
  });

  describe('Computed branches', () => {
    it('should use spec.displayName for defaultTitle when present', () => {
      component.resource.set({
        metadata: { name: 'cluster-1' },
        spec: { displayName: 'My Cluster' },
      } as any);
      expect(component.defaultTitle()).toBe('My Cluster');
    });

    it('should fall back to resourceId for defaultTitle when spec.displayName is absent', () => {
      component.resource.set({ metadata: { name: 'cluster-1' } } as any);
      expect(component.defaultTitle()).toBe('cluster-1');
    });

    it('should return empty string for defaultTitle when resource has no displayName and resourceId is undefined', () => {
      const newFixture = TestBed.createComponent(DetailView);
      const newComponent = newFixture.componentInstance;
      newComponent.context = (() => ({
        resourceId: undefined,
        token: 'abc123',
        resourceDefinition: {
          version: 'v1alpha1',
          entity: 'Cluster',
          entityCollection: 'clusters',
          apiGroup: 'core_k8s_io',
          ui: { detailView: { fields: [] } },
        },
        entityName: 'test-resource',
        parentNavigationContexts: ['project'],
      })) as any;
      newComponent.LuigiClient = (() => ({
        linkManager: () => ({
          fromContext: vi.fn().mockReturnThis(),
          navigate: vi.fn(),
        }),
        uxManager: () => ({ showAlert: vi.fn() }),
        getNodeParams: vi.fn(),
        getActiveFeatureToggles: () => [],
      })) as any;
      newComponent.resource.set({ metadata: { name: 'cluster-1' } } as any);
      expect(newComponent.defaultTitle()).toBe('');
    });

    it('should read saved sections from localStorage via sections computed', () => {
      const savedConfig = {
        cards: [
          { id: 'card-1', component: 'pm-card', type: 'angular', w: 6, h: 10 },
        ],
        sections: [{ id: 'section-1', label: 'Section 1', cards: [] }],
      };
      localStorage.setItem(
        `pm.workspace:https://example.com.resourceType:Cluster.resourceId:cluster-1.user:undefined`,
        JSON.stringify(savedConfig),
      );

      expect(component.sections().length).toBe(1);
      expect(component.sections()[0].id).toBe('section-1');

      localStorage.removeItem(
        `pm.workspace:https://example.com.resourceType:Cluster.resourceId:cluster-1.user:undefined`,
      );
    });

    it('should read saved cards from localStorage via cards computed', () => {
      const savedConfig = {
        cards: [
          { id: 'card-1', component: 'pm-card', type: 'angular', w: 6, h: 10 },
        ],
        sections: [],
      };
      localStorage.setItem(
        `pm.workspace:https://example.com.resourceType:Cluster.resourceId:cluster-1.user:undefined`,
        JSON.stringify(savedConfig),
      );

      expect(component.cards().length).toBe(1);
      expect(component.cards()[0].id).toBe('card-1');

      localStorage.removeItem(
        `pm.workspace:https://example.com.resourceType:Cluster.resourceId:cluster-1.user:undefined`,
      );
    });
  });
  describe('Luigi page-dirty shim', () => {
    it('should not post luigi.set-page-dirty on init', () => {
      const postSpy = vi.spyOn(window, 'postMessage');

      const newFixture = TestBed.createComponent(DetailView);
      const newComponent = newFixture.componentInstance;
      newComponent.context = component.context;
      newComponent.LuigiClient = component.LuigiClient;
      newFixture.detectChanges();

      expect(
        postSpy.mock.calls.some(
          (call) => (call[0] as any)?.msg === 'luigi.set-page-dirty',
        ),
      ).toBe(false);
    });

    it('should post luigi.set-page-dirty when the dashboard emits unsavedChangesChange', () => {
      const postSpy = vi.spyOn(window, 'postMessage');

      // Drive the template handler directly — this is what the
      // (unsavedChangesChange)="setLuigiPageDirty($event)" binding does.
      (component as any).setLuigiPageDirty(true);

      const dirtyCalls = postSpy.mock.calls.filter(
        (call) => (call[0] as any)?.msg === 'luigi.set-page-dirty',
      );
      expect(dirtyCalls.length).toBe(1);
      expect(dirtyCalls[0][0]).toEqual({
        msg: 'luigi.set-page-dirty',
        dirty: true,
      });

      (component as any).setLuigiPageDirty(false);

      const finalCalls = postSpy.mock.calls.filter(
        (call) => (call[0] as any)?.msg === 'luigi.set-page-dirty',
      );
      expect(finalCalls.length).toBe(2);
      expect(finalCalls[1][0]).toEqual({
        msg: 'luigi.set-page-dirty',
        dirty: false,
      });
    });

    it('should post dirty=false when the component is destroyed', () => {
      const newFixture = TestBed.createComponent(DetailView);
      const newComponent = newFixture.componentInstance;
      newComponent.context = component.context;
      newComponent.LuigiClient = component.LuigiClient;

      newFixture.detectChanges();

      // Reset spy so we only assert what destroy emits.
      const postSpy = vi.spyOn(window, 'postMessage');
      newFixture.destroy();

      const dirtyCalls = postSpy.mock.calls.filter(
        (call) => (call[0] as any)?.msg === 'luigi.set-page-dirty',
      );
      expect(dirtyCalls.length).toBe(1);
      expect(dirtyCalls[0][0]).toEqual({
        msg: 'luigi.set-page-dirty',
        dirty: false,
      });
    });
  });

  describe('getDetailViewQueryFields', () => {
    it('should build the read query from detailView fields', () => {
      mockResourceService.read.mockClear();

      const localFixture = TestBed.createComponent(DetailView);
      const localComponent = localFixture.componentInstance;
      localComponent.context = (() => ({
        ...component.context(),
        resourceDefinition: {
          version: 'v1alpha1',
          entity: 'Cluster',
          entityCollection: 'clusters',
          apiGroup: 'core_k8s_io',
          ui: {
            createView: {
              fields: [{ property: 'spec.createOnlyField' }],
            },
            detailView: {
              fields: [
                { property: 'metadata.name' },
                { property: 'spec.detailOnlyField' },
              ],
            },
          },
        },
      })) as any;
      localComponent.LuigiClient = component.LuigiClient;
      localFixture.detectChanges();

      expect(mockResourceService.read).toHaveBeenCalled();
      const fields = JSON.stringify(mockResourceService.read.mock.calls[0][2]);
      expect(fields).toContain('detailOnlyField');
      expect(fields).toContain('name');
      expect(fields).not.toContain('createOnlyField');
    });
  });
});

describe('DetailViewComponent template', () => {
  let mockResourceService: any;
  let mockGatewayService: any;
  let envConfigServiceMock: MockedObject<EnvConfigService>;
  let accountInfoServiceMock: MockedObject<AccountInfoService>;
  let errorHandlerServiceMock: MockedObject<ErrorHandlerService>;

  beforeEach(() => {
    envConfigServiceMock = mock();
    accountInfoServiceMock = mock();
    errorHandlerServiceMock = mock();
    mockResourceService = {
      read: vi.fn().mockReturnValue(of({ name: 'test-resource' })),
      readAccountInfo: vi.fn().mockReturnValue(of('mock-ca-data')),
      getNamespace: vi.fn((context) => context.namespaceId),
    };
    mockGatewayService = {
      resolveKcpPath: vi.fn().mockReturnValue('https://example.com'),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ResourceService, useValue: mockResourceService },
        { provide: GatewayService, useValue: mockGatewayService },
        { provide: EnvConfigService, useValue: envConfigServiceMock },
        { provide: AccountInfoService, useValue: accountInfoServiceMock },
        { provide: ErrorHandlerService, useValue: errorHandlerServiceMock },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).overrideComponent(DetailView, {
      set: { imports: [NgTemplateOutlet], schemas: [CUSTOM_ELEMENTS_SCHEMA] },
    });
  });

  it('should not render download button when disabled', () => {
    const fixture = TestBed.createComponent(DetailView);
    const component = fixture.componentInstance;

    component.context = (() => ({
      resourceId: 'cluster-1',
      token: 'abc123',
      accountPath: 'account-123',
      accountId: 'account-123',
      organization: 'org-123',
      kcpCA: 'kcp-ca-data',
      resourceDefinition: {
        version: 'v1alpha1',
        entity: 'Cluster',
        entityCollection: 'clusters',
        apiGroup: 'core_k8s_io',
        ui: {
          detailView: {
            fields: [],
          },
        },
      },
      portalContext: { kcpWorkspaceUrl: 'https://example.com' },
      entityName: 'test-resource',
      parentNavigationContexts: ['project'],
    })) as any;

    component.LuigiClient = (() => ({
      linkManager: () => ({
        fromContext: vi.fn().mockReturnThis(),
        navigate: vi.fn(),
        withParams: vi.fn().mockReturnThis(),
      }),
      uxManager: () => ({
        showAlert: vi.fn(),
      }),
      getNodeParams: vi.fn(),
      getActiveFeatureToggles: () => [],
    })) as any;

    fixture.detectChanges();

    const el = fixture.nativeElement.shadowRoot?.querySelector(
      '[data-testid="generic-detail-view-download"]',
    );
    expect(el).toBeFalsy();
  });
});

describe('DetailViewComponent — instancePermissions and canDoAction', () => {
  let mockResourceService: any;
  let mockGatewayService: any;
  let envConfigServiceMock: MockedObject<EnvConfigService>;
  let accountInfoServiceMock: MockedObject<AccountInfoService>;
  let errorHandlerServiceMock: MockedObject<ErrorHandlerService>;

  const makeContextWithPermissions = (
    resource: string | undefined,
    name: string,
    portalPermissions: Record<string, string[]>,
  ) =>
    (() => ({
      resourceId: name,
      token: 'abc123',
      portalPermissions,
      resourceDefinition: {
        version: 'v1alpha1',
        entity: 'Cluster',
        entityCollection: 'clusters',
        apiGroup: 'core_k8s_io',
        ...(resource
          ? {
              permissionsDefinition: {
                group: 'core.k8s.io',
                resource,
                entityActions: ['get', 'update', 'delete'],
                resourceActions: [],
                entityContextKey: 'entityName',
              },
            }
          : {}),
        ui: { detailView: { fields: [] } },
      },
      entityName: name,
      parentNavigationContexts: ['project'],
    })) as any;

  const makeLuigiClient = () =>
    (() => ({
      linkManager: () => ({
        fromContext: vi.fn().mockReturnThis(),
        navigate: vi.fn(),
        withParams: vi.fn().mockReturnThis(),
      }),
      uxManager: () => ({ showAlert: vi.fn() }),
      getNodeParams: vi.fn(),
      getActiveFeatureToggles: () => [],
    })) as any;

  beforeEach(() => {
    envConfigServiceMock = mock();
    accountInfoServiceMock = mock();
    errorHandlerServiceMock = mock();
    mockResourceService = {
      read: vi.fn().mockReturnValue(of({ metadata: { name: 'c1' } })),
      readAccountInfo: vi.fn().mockReturnValue(of('mock-ca-data')),
      delete: vi.fn().mockReturnValue(of({})),
      update: vi.fn().mockReturnValue(of({})),
      getNamespace: vi.fn((context) => context.namespaceId),
    };
    mockGatewayService = {
      resolveKcpPath: vi.fn().mockReturnValue('https://example.com'),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ResourceService, useValue: mockResourceService },
        { provide: AccountInfoService, useValue: accountInfoServiceMock },
        { provide: GatewayService, useValue: mockGatewayService },
        { provide: EnvConfigService, useValue: envConfigServiceMock },
        { provide: ErrorHandlerService, useValue: errorHandlerServiceMock },
      ],
    }).overrideComponent(DetailView, {
      set: { template: '<div></div>' },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should show edit and delete when instancePermissions allows update and delete', () => {
    // permissionKey({ resource: 'clusters', name: 'c1' }) = 'clusters/c1'
    const fixture = TestBed.createComponent(DetailView);
    const component = fixture.componentInstance;
    component.context = makeContextWithPermissions('clusters', 'c1', {
      'clusters/c1': ['get', 'update', 'delete'],
    });
    component.LuigiClient = makeLuigiClient();
    fixture.detectChanges();
    component.resource.set({ metadata: { name: 'c1' } } as any);
    const actions = component.customActions();
    expect(actions.some((a) => a.action === 'edit')).toBe(true);
    expect(actions.some((a) => a.action === 'delete')).toBe(true);
  });

  it('should hide edit action when instancePermissions does not include update', () => {
    const fixture = TestBed.createComponent(DetailView);
    const component = fixture.componentInstance;
    component.context = makeContextWithPermissions('clusters', 'c1', {
      'clusters/c1': ['get', 'delete'],
    });
    component.LuigiClient = makeLuigiClient();
    fixture.detectChanges();
    component.resource.set({ metadata: { name: 'c1' } } as any);
    const actions = component.customActions();
    expect(actions.some((a) => a.action === 'edit')).toBe(false);
    expect(actions.some((a) => a.action === 'delete')).toBe(true);
  });

  it('should hide delete action when instancePermissions does not include delete', () => {
    const fixture = TestBed.createComponent(DetailView);
    const component = fixture.componentInstance;
    component.context = makeContextWithPermissions('clusters', 'c1', {
      'clusters/c1': ['get', 'update'],
    });
    component.LuigiClient = makeLuigiClient();
    fixture.detectChanges();
    component.resource.set({ metadata: { name: 'c1' } } as any);
    const actions = component.customActions();
    expect(actions.some((a) => a.action === 'edit')).toBe(true);
    expect(actions.some((a) => a.action === 'delete')).toBe(false);
  });

  it('should show edit and delete when no permissionsDefinition (defaults to allowed)', () => {
    // No permissionsDefinition — instancePermissions returns undefined → canDoAction returns true
    const fixture = TestBed.createComponent(DetailView);
    const component = fixture.componentInstance;
    component.context = makeContextWithPermissions(undefined, 'c1', {});
    component.LuigiClient = makeLuigiClient();
    fixture.detectChanges();
    component.resource.set({ metadata: { name: 'c1' } } as any);
    const actions = component.customActions();
    expect(actions.some((a) => a.action === 'edit')).toBe(true);
    expect(actions.some((a) => a.action === 'delete')).toBe(true);
  });

  it('should include namespace in permissionKey lookup for namespaced resource', () => {
    // permissionKey({ resource: 'clusters', namespace: 'ns1', name: 'pod-1' }) = 'clusters/ns1/pod-1'
    const fixture = TestBed.createComponent(DetailView);
    const component = fixture.componentInstance;
    component.context = makeContextWithPermissions('clusters', 'pod-1', {
      'clusters/ns1/pod-1': ['get', 'update', 'delete'],
    });
    component.LuigiClient = makeLuigiClient();
    fixture.detectChanges();
    component.resource.set({
      metadata: { name: 'pod-1', namespace: 'ns1' },
    } as any);
    const actions = component.customActions();
    expect(actions.some((a) => a.action === 'edit')).toBe(true);
    expect(actions.some((a) => a.action === 'delete')).toBe(true);
  });

  it('should default to allowed when portalPermissions key does not match (fail-open)', () => {
    // Key mismatch: portalPermissions has cluster-scoped key but resource has namespace
    const fixture = TestBed.createComponent(DetailView);
    const component = fixture.componentInstance;
    component.context = makeContextWithPermissions('clusters', 'pod-1', {
      'clusters/pod-1': ['get', 'update', 'delete'],
    });
    component.LuigiClient = makeLuigiClient();
    fixture.detectChanges();
    // resource with namespace: key becomes 'clusters/ns1/pod-1' — not found in map
    component.resource.set({
      metadata: { name: 'pod-1', namespace: 'ns1' },
    } as any);
    const actions = component.customActions();
    // instancePermissions() returns undefined → canDoAction defaults to true (fail-open)
    expect(actions.some((a) => a.action === 'edit')).toBe(true);
  });
});
