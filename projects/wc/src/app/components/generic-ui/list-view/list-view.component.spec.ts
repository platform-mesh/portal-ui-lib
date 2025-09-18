import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import { ResourceService } from '@platform-mesh/portal-ui-lib/services';
import { of, throwError } from 'rxjs';
import { ListViewComponent } from './list-view.component';

describe('ListViewComponent', () => {
  let component: ListViewComponent;
  let fixture: ComponentFixture<ListViewComponent>;
  let mockResourceService: any;
  let mockLuigiCoreService: any;

  beforeEach(() => {
    mockResourceService = {
      list: jest.fn().mockReturnValue(of([{ metadata: { name: 'test' } }])),
      delete: jest.fn().mockReturnValue(of({})),
      create: jest.fn().mockReturnValue(of({ data: { name: 'test' } })),
    };

    mockLuigiCoreService = {
      showAlert: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ResourceService, useValue: mockResourceService },
        { provide: LuigiCoreService, useValue: mockLuigiCoreService },
      ],
    }).overrideComponent(ListViewComponent, {
      set: { template: '' },
    });

    fixture = TestBed.createComponent(ListViewComponent);
    component = fixture.componentInstance;

    component.context = (() => ({
      resourceDefinition: {
        plural: 'clusters',
        kind: 'Cluster',
        group: 'core.k8s.io',
        ui: {
          listView: {
            fields: [],
          },
        },
      },
    })) as any;

    component.LuigiClient = (() => ({
      linkManager: () => ({
        fromContext: jest.fn().mockReturnThis(),
        navigate: jest.fn(),
        withParams: jest.fn().mockReturnThis(),
      }),
      getNodeParams: jest.fn(),
    })) as any;

    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch resources on init', () => {
    expect(mockResourceService.list).toHaveBeenCalled();
    expect(component.resources().length).toBeGreaterThan(0);
  });

  it('should not show alert when delete is called (no backend call)', () => {
    const resource = { metadata: { name: 'test' } } as any;
    component.delete(resource);
    expect(mockLuigiCoreService.showAlert).not.toHaveBeenCalled();
  });

  it('should show alert when delete errors', () => {
    const resource = { metadata: { name: 'bad' } } as any;
    mockResourceService.delete.mockReturnValueOnce(throwError(() => new Error('boom')));
    component.delete(resource);
    expect(mockLuigiCoreService.showAlert).toHaveBeenCalled();
    const callArg = mockLuigiCoreService.showAlert.mock.calls[0][0];
    expect(callArg.text).toContain('bad');
    expect(callArg.type).toBe('error');
  });

  it('should create a resource', () => {
    const resource = { metadata: { name: 'test' } };

    component.create(resource as any);
    expect(mockResourceService.create).toHaveBeenCalled();
  });

  it('should navigate to resource', () => {
    const resource = { metadata: { name: 'res1' } };
    const navSpy = jest.fn();
    component.LuigiClient = (() => ({
      linkManager: () => ({
        navigate: navSpy,
      }),
    })) as any;

    component.navigateToResource(resource as any);
    expect(navSpy).toHaveBeenCalledWith('res1');
  });

  it('should open create resource modal', () => {
    const openSpy = jest.fn();
    (component as any).createModal = () => ({ open: openSpy });
    component.openCreateResourceModal();
    expect(openSpy).toHaveBeenCalled();
  });

  it('should open delete resource modal and stop event propagation', () => {
    const event = { stopPropagation: jest.fn() } as any;
    const resource = { metadata: { name: 'to-delete' } } as any;
    const openSpy = jest.fn();
    (component as any).deleteModal = () => ({ open: openSpy });

    component.openDeleteResourceModal(event, resource);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(openSpy).toHaveBeenCalledWith(resource);
  });

  it('should check create view fields existence', () => {
    component.resourceDefinition().ui.createView = {
      fields: [{ property: 'any' }],
    };
    expect(component.hasUiCreateViewFields()).toBe(true);
  });
});
