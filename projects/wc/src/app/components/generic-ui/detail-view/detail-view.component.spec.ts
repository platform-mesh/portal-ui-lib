import { DetailViewComponent } from './detail-view.component';
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
  let component: DetailViewComponent;
  let fixture: ComponentFixture<DetailViewComponent>;
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
    }).overrideComponent(DetailViewComponent, {
      set: { template: '<div></div>' },
    });

    fixture = TestBed.createComponent(DetailViewComponent);
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
    const newFixture = TestBed.createComponent(DetailViewComponent);
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
    const newFixture = TestBed.createComponent(DetailViewComponent);
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
    const newFixture = TestBed.createComponent(DetailViewComponent);
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

    expect(mockResourceService.read).toHaveBeenCalledWith(
      'test-account',
      { kind: 'Account', group: 'core_k8s_io', version: 'v1alpha1' },
      [],
      expect.any(Object),
      true,
    );
  });

  it('should handle resource service read error', () => {
    vi.clearAllMocks();
    mockResourceService.read.mockReturnValueOnce(
      throwError(() => new Error('Read failed')),
    );

    const newFixture = TestBed.createComponent(DetailViewComponent);
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
      const newFixture = TestBed.createComponent(DetailViewComponent);
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

      const newFixture = TestBed.createComponent(DetailViewComponent);
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
      const newFixture = TestBed.createComponent(DetailViewComponent);
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
      const newFixture = TestBed.createComponent(DetailViewComponent);
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
      const newFixture = TestBed.createComponent(DetailViewComponent);
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
      imports: [DetailViewComponent],
      providers: [
        { provide: ResourceService, useValue: mockResourceService },
        { provide: GatewayService, useValue: mockGatewayService },
        { provide: EnvConfigService, useValue: envConfigServiceMock },
        { provide: AccountInfoService, useValue: accountInfoServiceMock },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    });

    TestBed.overrideComponent(DetailViewComponent, {
      set: { schemas: [CUSTOM_ELEMENTS_SCHEMA] },
    });
  });

  it('should not render download button when disabled', () => {
    const fixture = TestBed.createComponent(DetailViewComponent);
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
    const fixture = TestBed.createComponent(DetailViewComponent);
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
});
