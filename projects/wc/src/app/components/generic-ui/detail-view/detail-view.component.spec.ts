import { DetailViewComponent } from './detail-view.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EnvConfigService } from '@openmfp/portal-ui-lib';
import { AccountInfo } from '@platform-mesh/portal-ui-lib/models/models';
import {
  AccountInfoService,
  GatewayService,
  ResourceService,
} from '@platform-mesh/portal-ui-lib/services';
import { mock } from 'jest-mock-extended';
import { of, throwError } from 'rxjs';

describe('DetailViewComponent', () => {
  let component: DetailViewComponent;
  let fixture: ComponentFixture<DetailViewComponent>;
  let mockResourceService: any;
  let mockGatewayService: any;
  let envConfigServiceMock: jest.Mocked<EnvConfigService>;
  let accountInfoServiceMock: jest.Mocked<AccountInfoService>;
  let luigiClientLinkManagerNavigate = jest.fn();

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
        },
      },
    };
    accountInfoServiceMock.read.mockReturnValue(of(accountInfo));

    mockResourceService = {
      read: jest.fn().mockReturnValue(of({ name: 'test-resource' })),
      readAccountInfo: jest.fn().mockReturnValue(of('mock-ca-data')),
    };

    mockGatewayService = {
      resolveKcpPath: jest.fn().mockReturnValue('https://example.com'),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ResourceService, useValue: mockResourceService },
        { provide: AccountInfoService, useValue: accountInfoServiceMock },
        { provide: GatewayService, useValue: mockGatewayService },
        { provide: EnvConfigService, useValue: envConfigServiceMock },
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
      entity: {
        metadata: { name: 'test-resource' },
      },
      parentNavigationContexts: ['project'],
    })) as any;

    component.LuigiClient = (() => ({
      linkManager: () => ({
        fromContext: jest.fn().mockReturnThis(),
        navigate: luigiClientLinkManagerNavigate,
        withParams: jest.fn().mockReturnThis(),
      }),
      uxManager: () => ({
        showAlert: jest.fn(),
      }),
      getNodeParams: jest.fn(),
    })) as any;

    fixture.detectChanges();
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
      entity: {
        metadata: { name: 'test-resource' },
      },
      parentNavigationContexts: ['project'],
    })) as any;

    newComponent.LuigiClient = (() => ({
      linkManager: () => ({
        fromContext: jest.fn().mockReturnThis(),
        navigate: jest.fn(),
        withParams: jest.fn().mockReturnThis(),
      }),
      uxManager: () => ({
        showAlert: jest.fn(),
      }),
      getNodeParams: jest.fn(),
    })) as any;

    newFixture.detectChanges();

    expect(newComponent.showDownloadKubeconfig()).toBe(true);
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
      entity: { metadata: { name: 'test-resource' } },
      parentNavigationContexts: ['project'],
    })) as any;

    fixture.detectChanges();

    expect(component.context().namespaceId).toBe(testNamespace);
  });

  it('should download kubeconfig', async () => {
    const mockAnchorElement = document.createElement('a');
    jest.spyOn(mockAnchorElement, 'click');
    const createElementSpy = jest
      .spyOn(document, 'createElement')
      .mockReturnValue(mockAnchorElement);
    global.URL.createObjectURL = jest.fn().mockReturnValue('blob-url');

    envConfigServiceMock.getEnvConfig.mockResolvedValue({
      oidcIssuerUrl: 'oidcIssuerUrl',
    } as any);
    await component.downloadKubeConfig();

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(mockAnchorElement.href).toEqual('http://localhost/blob-url');
    expect(mockAnchorElement.download).toBe('kubeconfig.yaml');
    expect(mockAnchorElement.click).toHaveBeenCalled();
  });

  it('should call resource service with correct parameters for account kind', () => {
    jest.clearAllMocks();
    const newFixture = TestBed.createComponent(DetailViewComponent);
    const newComponent = newFixture.componentInstance;

    newComponent.context = (() => ({
      resourceId: 'cluster-1',
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
      entity: {
        metadata: { name: 'test-account' },
      },
      parentNavigationContexts: ['project'],
    })) as any;

    newComponent.LuigiClient = (() => ({
      linkManager: () => ({
        fromContext: jest.fn().mockReturnThis(),
        navigate: jest.fn(),
        withParams: jest.fn().mockReturnThis(),
      }),
      uxManager: () => ({
        showAlert: jest.fn(),
      }),
      getNodeParams: jest.fn(),
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
    jest.clearAllMocks();
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
      entity: {
        metadata: { name: 'test-resource' },
      },
      parentNavigationContexts: ['project'],
    })) as any;

    newComponent.LuigiClient = (() => ({
      linkManager: () => ({
        fromContext: jest.fn().mockReturnThis(),
        navigate: jest.fn(),
        withParams: jest.fn().mockReturnThis(),
      }),
      uxManager: () => ({
        showAlert: jest.fn(),
      }),
      getNodeParams: jest.fn(),
    })) as any;

    newFixture.detectChanges();

    // Component should still be created even if read fails
    expect(newComponent).toBeTruthy();
  });

  describe('Null and undefined checks', () => {
    let mockUxManager: any;

    beforeEach(() => {
      mockUxManager = {
        showAlert: jest.fn(),
      };
    });

    it('should handle undefined resourceId in readResource method', () => {
      jest.clearAllMocks();
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
        entity: {
          metadata: { name: undefined }, // undefined name should make resourceId() return undefined
        },
        parentNavigationContexts: ['project'],
      })) as any;

      newComponent.LuigiClient = (() => ({
        linkManager: () => ({
          fromContext: jest.fn().mockReturnThis(),
          navigate: jest.fn(),
          withParams: jest.fn().mockReturnThis(),
        }),
        uxManager: () => mockUxManager,
        getNodeParams: jest.fn(),
      })) as any;

      expect(() => {
        newFixture.detectChanges();
      }).toThrow('Resource ID is not defined');

      expect(mockUxManager.showAlert).toHaveBeenCalledWith({
        text: 'Resource ID is not defined',
        type: 'error',
      });
    });

    it('should handle undefined parentNavigationContext in navigateToParent method', () => {
      jest.clearAllMocks();
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
        entity: {
          metadata: { name: 'test-resource' },
        },
        parentNavigationContexts: undefined, // undefined parentNavigationContexts
      })) as any;

      newComponent.LuigiClient = (() => ({
        linkManager: () => ({
          fromContext: jest.fn().mockReturnThis(),
          navigate: jest.fn(),
          withParams: jest.fn().mockReturnThis(),
        }),
        uxManager: () => mockUxManager,
        getNodeParams: jest.fn(),
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
      jest.clearAllMocks();
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
        entity: {
          metadata: { name: 'test-resource' },
        },
        parentNavigationContexts: [], // empty array
      })) as any;

      newComponent.LuigiClient = (() => ({
        linkManager: () => ({
          fromContext: jest.fn().mockReturnThis(),
          navigate: jest.fn(),
          withParams: jest.fn().mockReturnThis(),
        }),
        uxManager: () => mockUxManager,
        getNodeParams: jest.fn(),
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
      jest.clearAllMocks();
      const newFixture = TestBed.createComponent(DetailViewComponent);
      const newComponent = newFixture.componentInstance;

      newComponent.context = (() => ({
        resourceId: 'cluster-1',
        token: 'abc123',
        resourceDefinition: undefined, // undefined resourceDefinition
        entity: {
          metadata: { name: 'test-resource' },
        },
        parentNavigationContexts: ['project'],
      })) as any;

      newComponent.LuigiClient = (() => ({
        linkManager: () => ({
          fromContext: jest.fn().mockReturnThis(),
          navigate: jest.fn(),
          withParams: jest.fn().mockReturnThis(),
        }),
        uxManager: () => mockUxManager,
        getNodeParams: jest.fn(),
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
  let envConfigServiceMock: jest.Mocked<EnvConfigService>;
  let accountInfoServiceMock: jest.Mocked<AccountInfoService>;

  beforeEach(() => {
    envConfigServiceMock = mock();
    accountInfoServiceMock = mock();
    mockResourceService = {
      read: jest.fn().mockReturnValue(of({ name: 'test-resource' })),
      readAccountInfo: jest.fn().mockReturnValue(of('mock-ca-data')),
    };
    mockGatewayService = {
      resolveKcpPath: jest.fn().mockReturnValue('https://example.com'),
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
      entity: {
        metadata: { name: 'test-resource' },
      },
      parentNavigationContexts: ['project'],
    })) as any;

    component.LuigiClient = (() => ({
      linkManager: () => ({
        fromContext: jest.fn().mockReturnThis(),
        navigate: jest.fn(),
        withParams: jest.fn().mockReturnThis(),
      }),
      uxManager: () => ({
        showAlert: jest.fn(),
      }),
      getNodeParams: jest.fn(),
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
      entity: {
        metadata: { name: 'test-resource' },
      },
      parentNavigationContexts: ['project'],
    })) as any;

    component.LuigiClient = (() => ({
      linkManager: () => ({
        fromContext: jest.fn().mockReturnThis(),
        navigate: jest.fn(),
        withParams: jest.fn().mockReturnThis(),
      }),
      uxManager: () => ({
        showAlert: jest.fn(),
      }),
      getNodeParams: jest.fn(),
    })) as any;

    const downloadSpy = jest
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
