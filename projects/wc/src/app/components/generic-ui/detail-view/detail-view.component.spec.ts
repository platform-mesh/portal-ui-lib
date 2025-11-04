import { DetailViewComponent } from './detail-view.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EnvConfigService } from '@openmfp/portal-ui-lib';
import {
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
  let luigiClientLinkManagerNavigate = jest.fn();

  beforeEach(() => {
    envConfigServiceMock = mock();
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
      accountId: 'account-123',
      organization: 'org-123',
      kcpCA: 'kcp-ca-data',
      resourceDefinition: {
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

  it('should call read on init', () => {
    expect(mockResourceService.read).toHaveBeenCalled();
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
      'core_k8s_io',
      'Account',
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

    it('should handle kubeconfig validation error in downloadKubeConfig method', async () => {
      jest.clearAllMocks();
      const newFixture = TestBed.createComponent(DetailViewComponent);
      const newComponent = newFixture.componentInstance;

      newComponent.context = (() => ({
        resourceId: 'cluster-1',
        token: 'abc123',
        accountId: null, // null accountId should cause validation error
        organization: 'org-123',
        kcpCA: 'kcp-ca-data',
        resourceDefinition: {
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

      newComponent.LuigiClient = (() => ({
        linkManager: () => ({
          fromContext: jest.fn().mockReturnThis(),
          navigate: jest.fn(),
          withParams: jest.fn().mockReturnThis(),
        }),
        uxManager: () => mockUxManager,
        getNodeParams: jest.fn(),
      })) as any;

      envConfigServiceMock.getEnvConfig.mockResolvedValue({
        oidcIssuerUrl: 'oidcIssuerUrl',
      } as any);

      newFixture.detectChanges();

      await expect(newComponent.downloadKubeConfig()).rejects.toThrow();

      expect(mockUxManager.showAlert).toHaveBeenCalledWith({
        text: expect.any(String),
        type: 'error',
      });
    });

    it('should handle missing kubeconfig properties in downloadKubeConfig method', async () => {
      jest.clearAllMocks();
      const newFixture = TestBed.createComponent(DetailViewComponent);
      const newComponent = newFixture.componentInstance;

      newComponent.context = (() => ({
        resourceId: 'cluster-1',
        token: 'abc123',
        accountId: 'account-123',
        organization: undefined, // undefined organization should cause validation error
        kcpCA: 'kcp-ca-data',
        resourceDefinition: {
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

      newComponent.LuigiClient = (() => ({
        linkManager: () => ({
          fromContext: jest.fn().mockReturnThis(),
          navigate: jest.fn(),
          withParams: jest.fn().mockReturnThis(),
        }),
        uxManager: () => mockUxManager,
        getNodeParams: jest.fn(),
      })) as any;

      envConfigServiceMock.getEnvConfig.mockResolvedValue({
        oidcIssuerUrl: 'oidcIssuerUrl',
      } as any);

      newFixture.detectChanges();

      await expect(newComponent.downloadKubeConfig()).rejects.toThrow();

      expect(mockUxManager.showAlert).toHaveBeenCalledWith({
        text: expect.any(String),
        type: 'error',
      });
    });
  });
});
