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

  it('should return default fields when ui.detailView.fields is undefined', () => {
    // Reset mocks and create new component instance
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
            // fields is undefined
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
      getNodeParams: jest.fn(),
    })) as any;

    newFixture.detectChanges();

    const defaultFields = [
      {
        label: 'Workspace Status',
        jsonPathExpression: 'status.conditions[?(@.type=="Ready")].status',
        property: ['status.conditions.status', 'status.conditions.type'],
      },
    ];

    expect(newComponent.resourceFields()).toEqual(defaultFields);
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
      getNodeParams: jest.fn(),
    })) as any;

    newFixture.detectChanges();

    // Component should still be created even if read fails
    expect(newComponent).toBeTruthy();
  });
});
