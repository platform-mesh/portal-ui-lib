import { FieldDefinitionService } from '../../../services/field-definition.service';
import { GenericView } from './generic-view.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  FieldDefinition,
  Resource,
  ResourceDefinition,
  UIDefinition,
} from '@platform-mesh/portal-ui-lib/models';
import { ResourceNodeContext } from '@platform-mesh/portal-ui-lib/services';

describe('GenericView', () => {
  let component: GenericView;
  let fixture: ComponentFixture<GenericView>;
  let mockLuigiClient: any;
  let mockContext: ResourceNodeContext;
  let mockResourceDefinition: ResourceDefinition;
  let mockFieldDefinitionService: any;

  beforeEach(async () => {
    mockLuigiClient = {
      linkManager: vi.fn(),
    };

    mockFieldDefinitionService = {
      executeButtonAction: vi.fn(),
    };

    mockResourceDefinition = {
      ui: {
        detailView: {
          fields: [],
          actions: [
            { property: 'action1', uiSettings: { displayAs: 'button' } },
            { property: 'action2', uiSettings: { displayAs: 'link' } },
            { property: 'action3', uiSettings: { displayAs: 'button' } },
          ],
          resourceTitle: 'title',
          resourceDescription: 'description',
        },
      } as UIDefinition,
    } as ResourceDefinition;

    mockContext = {
      resourceDefinition: mockResourceDefinition,
      resourceId: 'test-id',
    } as ResourceNodeContext;

    await TestBed.configureTestingModule({
      imports: [GenericView],
      providers: [
        {
          provide: FieldDefinitionService,
          useValue: mockFieldDefinitionService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GenericView);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('LuigiClient', mockLuigiClient);
    fixture.componentRef.setInput('context', mockContext);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('computed properties', () => {
    it('should compute resourceDefinition from context', () => {
      expect(component.resourceDefinition()).toEqual(mockResourceDefinition);
    });

    it('should compute resourceTitleDefinition from resourceDefinition', () => {
      expect(component.resourceTitleDefinition()).toBe('title');
    });

    it('should compute resourceDescriptionDefinition from resourceDefinition', () => {
      expect(component.resourceDescriptionDefinition()).toBe('description');
    });

    it('should compute viewActions filtering only button actions', () => {
      expect(component.viewActions()).toEqual([
        { property: 'action1', uiSettings: { displayAs: 'button' } },
        { property: 'action3', uiSettings: { displayAs: 'button' } },
      ]);
    });

    it('should return empty array when resourceDefinition has no actions', () => {
      const noActionsContext = {
        resourceDefinition: { ui: { detailView: {} } } as any,
        resourceId: 'test-id',
      } as ResourceNodeContext;
      fixture.componentRef.setInput('context', noActionsContext);
      expect(component.viewActions()).toEqual([]);
    });

    it('should return empty array when resourceDefinition has no button actions', () => {
      const noButtonActionsContext = {
        resourceDefinition: {
          ui: {
            detailView: {
              actions: [
                { property: 'action1', uiSettings: { displayAs: 'link' } },
              ],
            },
          },
        } as any,
        resourceId: 'test-id',
      } as ResourceNodeContext;
      fixture.componentRef.setInput('context', noButtonActionsContext);
      expect(component.viewActions()).toEqual([]);
    });
  });

  describe('buttonAction', () => {
    it('should stop event propagation', () => {
      const mockEvent = { stopPropagation: vi.fn() };
      const mockField = {
        property: 'testField',
        uiSettings: {
          displayAs: 'button',
          buttonSettings: { action: 'navigate' },
        },
      } as FieldDefinition;

      component.buttonAction(mockEvent, mockField);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should call fieldDefinitionService.executeButtonAction with correct parameters', () => {
      const mockEvent = { stopPropagation: vi.fn() };
      const mockField = { property: 'testField' } as FieldDefinition;
      const mockResource = { metadata: { name: 'resource-1' } } as Resource;

      fixture.componentRef.setInput('resource', mockResource);
      component.buttonAction(mockEvent, mockField);

      expect(
        mockFieldDefinitionService.executeButtonAction,
      ).toHaveBeenCalledWith(mockLuigiClient, mockField, mockResource);
    });

    it('should call fieldDefinitionService.executeButtonAction with undefined resource when not set', () => {
      const mockEvent = { stopPropagation: vi.fn() };
      const mockField = { property: 'testField' } as FieldDefinition;

      component.buttonAction(mockEvent, mockField);

      expect(
        mockFieldDefinitionService.executeButtonAction,
      ).toHaveBeenCalledWith(mockLuigiClient, mockField, undefined);
    });
  });

  describe('input properties', () => {
    it('should accept defaultTitle input', () => {
      fixture.componentRef.setInput('defaultTitle', 'Default Title');
      expect(component.defaultTitle()).toBe('Default Title');
    });

    it('should accept defaultDescription input', () => {
      fixture.componentRef.setInput(
        'defaultDescription',
        'Default Description',
      );
      expect(component.defaultDescription()).toBe('Default Description');
    });

    it('should accept resource input', () => {
      const mockResource = { metadata: { name: 'test-resource' } } as Resource;
      fixture.componentRef.setInput('resource', mockResource);
      expect(component.resource()).toEqual(mockResource);
    });
  });

  describe('injected services', () => {
    it('should inject FieldDefinitionService', () => {
      expect(component.fieldDefinitionService).toBeDefined();
      expect(component.fieldDefinitionService).toBe(mockFieldDefinitionService);
    });
  });
});
