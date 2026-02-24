import { DetailView } from './detail-view.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EnvConfigService } from '@openmfp/portal-ui-lib';
import { AccountInfo } from '@platform-mesh/portal-ui-lib/models/models';
import {
  AccountInfoService,
  ErrorHandlerService,
  GatewayService,
  ResourceService,
} from '@platform-mesh/portal-ui-lib/services';
import { of, throwError } from 'rxjs';
import { MockedObject } from 'vitest';
import { mock } from 'vitest-mock-extended';

describe('DetailViewComponent', () => {
  let component: DetailView;
  let fixture: ComponentFixture<DetailView>;
  let mockResourceService: any;
  let mockGatewayService: any;
  let envConfigServiceMock: MockedObject<EnvConfigService>;
  let accountInfoServiceMock: MockedObject<AccountInfoService>;
  let luigiClientLinkManagerNavigate = vi.fn();
  let errorHandlerServiceMock: MockedObject<ErrorHandlerService>;

  beforeEach(() => {
    envConfigServiceMock = mock();
    accountInfoServiceMock = mock();

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
        kind: 'Cluster',
        group: 'core.k8s.io',
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
    })) as any;

    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
        kind: 'Cluster',
        group: 'core.k8s.io',
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
        kind: 'Cluster',
        group: 'core.k8s.io',
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
    })) as any;

    newFixture.detectChanges();

    expect(newComponent.showDownloadKubeconfig()).toBe(false);
  });

  it('should navigate to parent', () => {
    component.navigateToParent();
    expect(luigiClientLinkManagerNavigate).toHaveBeenCalledWith('/');
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

    it('should open edit resource modal', () => {
      const mockCreateModal = {
        open: vi.fn(),
      };
      (component as any).createModal = () => mockCreateModal;

      const resource: any = {
        metadata: { name: 'test-resource' },
      };
      const event = new MouseEvent('click');
      const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');

      component.openEditResourceModal(event, resource);

      expect(stopPropagationSpy).toHaveBeenCalled();
      expect(mockCreateModal.open).toHaveBeenCalledWith(resource);
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
          kind: 'Account',
          group: 'core.k8s.io',
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
          kind: 'Account',
          group: 'core.k8s.io',
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
      })) as any;

      newComponent.context = (() => ({
        resourceId: undefined,
        token: 'abc123',
        resourceDefinition: {
          version: 'v1alpha1',
          kind: 'Cluster',
          group: 'core.k8s.io',
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
        kind: 'Cluster',
        group: 'core.k8s.io',
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

  it('should call resource service with correct parameters for account kind', () => {
    vi.clearAllMocks();
    const newFixture = TestBed.createComponent(DetailView);
    const newComponent = newFixture.componentInstance;

    newComponent.context = (() => ({
      resourceId: 'test-account',
      token: 'abc123',
      resourceDefinition: {
        kind: 'Account',
        group: 'core.k8s.io',
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
    })) as any;

    newFixture.detectChanges();

    expect(mockResourceService.read).toHaveBeenCalled();
    const readCall = mockResourceService.read.mock.calls[0];
    const fieldsArg = readCall[2];
    const fieldsStr = JSON.stringify(fieldsArg);

    expect(readCall[0]).toBe('test-account');
    expect(readCall[1]).toEqual({
      kind: 'Account',
      group: 'core_k8s_io',
      version: 'v1alpha1',
    });
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
        kind: 'Cluster',
        group: 'core.k8s.io',
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
    })) as any;

    newFixture.detectChanges();

    // Component should still be created even if read fails
    expect(newComponent).toBeTruthy();
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
          kind: 'Cluster',
          group: 'core.k8s.io',
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
          kind: 'Cluster',
          group: 'core.k8s.io',
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
          kind: 'Cluster',
          group: 'core.k8s.io',
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
    it('should return resourceDescription when defined', () => {
      const newFixture = TestBed.createComponent(DetailView);
      const newComponent = newFixture.componentInstance;

      const resourceDescription: any = {
        property: 'spec.description',
      };

      newComponent.context = (() => ({
        resourceId: 'cluster-1',
        token: 'abc123',
        resourceDefinition: {
          version: 'v1alpha1',
          kind: 'Cluster',
          group: 'core.k8s.io',
          singular: 'cluster',
          ui: {
            detailView: {
              fields: [],
              resourceDescription,
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
      })) as any;

      newFixture.detectChanges();

      expect(newComponent.resourceDescriptionDefinition()).toEqual(
        resourceDescription,
      );
    });

    it('should return undefined when resourceDescription is not defined', () => {
      const newFixture = TestBed.createComponent(DetailView);
      const newComponent = newFixture.componentInstance;

      newComponent.context = (() => ({
        resourceId: 'cluster-1',
        token: 'abc123',
        resourceDefinition: {
          version: 'v1alpha1',
          kind: 'Cluster',
          group: 'core.k8s.io',
          singular: 'cluster',
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
      })) as any;

      newFixture.detectChanges();

      expect(newComponent.resourceDescriptionDefinition()).toBeUndefined();
    });

    it('should include resourceDescription in query fields', () => {
      vi.clearAllMocks();
      const newFixture = TestBed.createComponent(DetailView);
      const newComponent = newFixture.componentInstance;

      newComponent.context = (() => ({
        resourceId: 'cluster-1',
        token: 'abc123',
        resourceDefinition: {
          version: 'v1alpha1',
          kind: 'Cluster',
          group: 'core.k8s.io',
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
    it('should return resourceTitle when defined', () => {
      const newFixture = TestBed.createComponent(DetailView);
      const newComponent = newFixture.componentInstance;

      const resourceTitle: any = {
        property: 'spec.displayName',
      };

      newComponent.context = (() => ({
        resourceId: 'cluster-1',
        token: 'abc123',
        resourceDefinition: {
          version: 'v1alpha1',
          kind: 'Cluster',
          group: 'core.k8s.io',
          singular: 'cluster',
          ui: {
            detailView: {
              fields: [],
              resourceTitle,
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
      })) as any;

      newFixture.detectChanges();

      expect(newComponent.resourceTitleDefinition()).toEqual(resourceTitle);
    });

    it('should return undefined when resourceTitle is not defined', () => {
      const newFixture = TestBed.createComponent(DetailView);
      const newComponent = newFixture.componentInstance;

      newComponent.context = (() => ({
        resourceId: 'cluster-1',
        token: 'abc123',
        resourceDefinition: {
          version: 'v1alpha1',
          kind: 'Cluster',
          group: 'core.k8s.io',
          singular: 'cluster',
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
      })) as any;

      newFixture.detectChanges();

      expect(newComponent.resourceTitleDefinition()).toBeUndefined();
    });

    it('should include resourceTitle in query fields', () => {
      vi.clearAllMocks();
      const newFixture = TestBed.createComponent(DetailView);
      const newComponent = newFixture.componentInstance;

      newComponent.context = (() => ({
        resourceId: 'cluster-1',
        token: 'abc123',
        resourceDefinition: {
          version: 'v1alpha1',
          kind: 'Cluster',
          group: 'core.k8s.io',
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
          kind: 'Cluster',
          group: 'core.k8s.io',
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
});

describe('DetailViewComponent template', () => {
  let mockResourceService: any;
  let mockGatewayService: any;
  let envConfigServiceMock: MockedObject<EnvConfigService>;
  let accountInfoServiceMock: MockedObject<AccountInfoService>;

  beforeEach(() => {
    envConfigServiceMock = mock();
    accountInfoServiceMock = mock();
    mockResourceService = {
      read: vi.fn().mockReturnValue(of({ name: 'test-resource' })),
      readAccountInfo: vi.fn().mockReturnValue(of('mock-ca-data')),
    };
    mockGatewayService = {
      resolveKcpPath: vi.fn().mockReturnValue('https://example.com'),
    };

    TestBed.configureTestingModule({
      imports: [DetailView],
      providers: [
        { provide: ResourceService, useValue: mockResourceService },
        { provide: GatewayService, useValue: mockGatewayService },
        { provide: EnvConfigService, useValue: envConfigServiceMock },
        { provide: AccountInfoService, useValue: accountInfoServiceMock },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    });

    TestBed.overrideComponent(DetailView, {
      set: { schemas: [CUSTOM_ELEMENTS_SCHEMA] },
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
        kind: 'Cluster',
        group: 'core.k8s.io',
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
    })) as any;

    fixture.detectChanges();

    const el = fixture.nativeElement.shadowRoot?.querySelector(
      '[test-id="generic-detail-view-download"]',
    );
    expect(el).toBeFalsy();
  });

  it('should render download button and call downloadKubeConfig on click when enabled', async () => {
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
        kind: 'Cluster',
        group: 'core.k8s.io',
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
    })) as any;

    const downloadSpy = vi
      .spyOn(component, 'downloadKubeConfig')
      .mockResolvedValue(undefined as any);

    fixture.detectChanges();

    const el = fixture.nativeElement.shadowRoot?.querySelector(
      '[test-id="generic-detail-view-download"]',
    ) as HTMLElement | null;
    expect(el).toBeTruthy();

    el?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();

    expect(downloadSpy).toHaveBeenCalled();
  });

  it('should render resourceTitle in title when defined', () => {
    const fixture = TestBed.createComponent(DetailView);
    const component = fixture.componentInstance;

    const resource = {
      metadata: { name: 'test-resource' },
      spec: {
        displayName: 'Test Resource',
      },
    };

    component.context = (() => ({
      resourceId: 'cluster-1',
      token: 'abc123',
      accountPath: 'account-123',
      accountId: 'account-123',
      organization: 'org-123',
      kcpCA: 'kcp-ca-data',
      resourceDefinition: {
        version: 'v1alpha1',
        kind: 'Cluster',
        group: 'core.k8s.io',
        singular: 'cluster',
        ui: {
          detailView: {
            fields: [],
            resourceTitle: {
              property: 'spec.displayName',
            },
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
    })) as any;

    mockResourceService.read.mockReturnValueOnce(of(resource));
    fixture.detectChanges();

    const titleEl = fixture.nativeElement.shadowRoot?.querySelector(
      '[test-id="generic-detail-view-title"]',
    );
    expect(titleEl).toBeTruthy();
    const valueCell = titleEl?.querySelector('pm-value-cell');
    expect(valueCell).toBeTruthy();
  });

  it('should render default title when resourceTitle is not defined', () => {
    const fixture = TestBed.createComponent(DetailView);
    const component = fixture.componentInstance;

    const resource = {
      metadata: { name: 'test-resource' },
      spec: {
        displayName: 'Test Resource',
      },
    };

    component.context = (() => ({
      resourceId: 'cluster-1',
      token: 'abc123',
      accountPath: 'account-123',
      accountId: 'account-123',
      organization: 'org-123',
      kcpCA: 'kcp-ca-data',
      resourceDefinition: {
        version: 'v1alpha1',
        kind: 'Cluster',
        group: 'core.k8s.io',
        singular: 'cluster',
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
    })) as any;

    mockResourceService.read.mockReturnValueOnce(of(resource));
    fixture.detectChanges();

    const titleEl = fixture.nativeElement.shadowRoot?.querySelector(
      '[test-id="generic-detail-view-title"]',
    );
    expect(titleEl).toBeTruthy();
    expect(titleEl?.textContent?.trim()).toContain('Test Resource');
  });

  it('should render resourceDescription in subtitle when defined', () => {
    const fixture = TestBed.createComponent(DetailView);
    const component = fixture.componentInstance;

    const resource = {
      metadata: { name: 'test-resource' },
      spec: {
        displayName: 'Test Resource',
        description: 'Custom description',
      },
    };

    component.context = (() => ({
      resourceId: 'cluster-1',
      token: 'abc123',
      accountPath: 'account-123',
      accountId: 'account-123',
      organization: 'org-123',
      kcpCA: 'kcp-ca-data',
      resourceDefinition: {
        version: 'v1alpha1',
        kind: 'Cluster',
        group: 'core.k8s.io',
        singular: 'cluster',
        ui: {
          detailView: {
            fields: [],
            resourceDescription: {
              property: 'spec.description',
            },
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
    })) as any;

    mockResourceService.read.mockReturnValueOnce(of(resource));
    fixture.detectChanges();

    const subtitleEl = fixture.nativeElement.shadowRoot?.querySelector(
      '[test-id="generic-detail-view-subtitle"]',
    );
    expect(subtitleEl).toBeTruthy();
    const valueCell = subtitleEl?.querySelector('pm-value-cell');
    expect(valueCell).toBeTruthy();
  });

  it('should render default description when resourceDescription is not defined', () => {
    const fixture = TestBed.createComponent(DetailView);
    const component = fixture.componentInstance;

    const resource = {
      metadata: { name: 'test-resource' },
      spec: {
        displayName: 'Test Resource',
      },
    };

    component.context = (() => ({
      resourceId: 'cluster-1',
      token: 'abc123',
      accountPath: 'account-123',
      accountId: 'account-123',
      organization: 'org-123',
      kcpCA: 'kcp-ca-data',
      resourceDefinition: {
        version: 'v1alpha1',
        kind: 'Cluster',
        group: 'core.k8s.io',
        singular: 'cluster',
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
    })) as any;

    mockResourceService.read.mockReturnValueOnce(of(resource));
    fixture.detectChanges();

    const subtitleEl = fixture.nativeElement.shadowRoot?.querySelector(
      '[test-id="generic-detail-view-subtitle"]',
    );
    expect(subtitleEl).toBeTruthy();
    expect(subtitleEl?.textContent?.trim()).toContain('The cluster for Test Resource');
  });
});
