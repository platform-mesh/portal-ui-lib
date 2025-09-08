import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GatewayService, ResourceService } from '@platform-mesh/portal-ui-lib/services';
import { of } from 'rxjs';
import { DetailViewComponent } from './detail-view.component';

describe('DetailViewComponent', () => {
  let component: DetailViewComponent;
  let fixture: ComponentFixture<DetailViewComponent>;
  let mockResourceService: any;
  let mockGatewayService: any;
  let luigiClientLinkManagerNavigate = jest.fn();

  beforeEach(() => {
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
    fixture = TestBed.createComponent(DetailViewComponent);
    component = fixture.componentInstance;

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
    jest.spyOn(document, 'createElement').mockReturnValue(mockAnchorElement);

    global.URL.createObjectURL = jest.fn().mockReturnValue('blob-url');

    await component.downloadKubeConfig();

    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(mockAnchorElement.href).toEqual('http://localhost/blob-url');
    expect(mockAnchorElement.download).toBe('kubeconfig.yaml');
    expect(mockAnchorElement.click).toHaveBeenCalled();
  });
});
