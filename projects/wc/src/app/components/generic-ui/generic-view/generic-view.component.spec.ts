import * as fieldHelper from '../../../utils/field-helper';
import * as processFieldsUtil from '../../../utils/proccess-fields';
import { GenericView } from './generic-view.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  Resource,
  ResourceDefinition,
} from '@platform-mesh/portal-ui-lib/models';
import { ResourceNodeContext } from '@platform-mesh/portal-ui-lib/services';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('GenericView', () => {
  let component: GenericView;
  let fixture: ComponentFixture<GenericView>;
  let mockLuigiClient: any;
  let mockContext: ResourceNodeContext;
  let mockResourceDefinition: ResourceDefinition;

  beforeEach(async () => {
    mockLuigiClient = {
      linkManager: vi.fn(),
    };

    mockResourceDefinition = {
      ui: {
        detailView: {
          fields: [
            { name: 'field1', type: 'text' },
            { name: 'field2', type: 'text' },
          ],
          resourceTitle: 'title',
          resourceDescription: 'description',
          actions: [{ name: 'action1' }],
        },
      },
    } as any;

    mockContext = {
      resourceDefinition: mockResourceDefinition,
      resourceId: 'test-id',
    } as ResourceNodeContext;

    await TestBed.configureTestingModule({
      imports: [GenericView],
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

    it('should compute resourceFields from resourceDefinition', () => {
      expect(component.resourceFields()).toEqual([
        { name: 'field1', type: 'text' },
        { name: 'field2', type: 'text' },
      ]);
    });

    it('should return empty array when resourceDefinition has no fields', () => {
      const emptyContext = {
        resourceDefinition: { ui: { detailView: {} } } as any,
        resourceId: 'test-id',
      } as ResourceNodeContext;
      fixture.componentRef.setInput('context', emptyContext);
      expect(component.resourceFields()).toEqual([]);
    });

    it('should compute resourceId from context', () => {
      expect(component.resourceId()).toBe('test-id');
    });

    it('should compute viewFields by processing resourceFields', () => {
      const mockProcessedFields = [{ processed: true }];
      vi.spyOn(processFieldsUtil, 'processFields').mockReturnValue(
        mockProcessedFields as any,
      );
      expect(component.viewFields()).toEqual(mockProcessedFields);
      expect(processFieldsUtil.processFields).toHaveBeenCalledWith([
        { name: 'field1', type: 'text' },
        { name: 'field2', type: 'text' },
      ]);
    });

    it('should compute resourceTitleDefinition from resourceDefinition', () => {
      expect(component.resourceTitleDefinition()).toBe('title');
    });

    it('should compute resourceDescriptionDefinition from resourceDefinition', () => {
      expect(component.resourceDescriptionDefinition()).toBe('description');
    });

    it('should compute viewActions from resourceDefinition', () => {
      expect(component.viewActions()).toEqual([{ name: 'action1' }]);
    });

    it('should return empty array when resourceDefinition has no actions', () => {
      const noActionsContext = {
        resourceDefinition: { ui: { detailView: {} } } as any,
        resourceId: 'test-id',
      } as ResourceNodeContext;
      fixture.componentRef.setInput('context', noActionsContext);
      expect(component.viewActions()).toEqual([]);
    });
  });

  describe('buttonAction', () => {
    it('should stop event propagation', () => {
      const mockEvent = { stopPropagation: vi.fn() };
      const mockField = { name: 'testField' } as any;
      vi.spyOn(fieldHelper, 'executeButtonAction').mockImplementation(() => {});

      component.buttonAction(mockEvent, mockField);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should call executeButtonAction with correct parameters', () => {
      const mockEvent = { stopPropagation: vi.fn() };
      const mockField = { name: 'testField' } as any;
      const mockResource = { metadata: { name: 'resource-1' } } as Resource;
      vi.spyOn(fieldHelper, 'executeButtonAction').mockImplementation(() => {});

      fixture.componentRef.setInput('resource', mockResource);
      component.buttonAction(mockEvent, mockField);

      expect(fieldHelper.executeButtonAction).toHaveBeenCalledWith(
        mockLuigiClient,
        mockField,
        mockResource,
      );
    });

    it('should call executeButtonAction with undefined resource when not set', () => {
      const mockEvent = { stopPropagation: vi.fn() };
      const mockField = { name: 'testField' } as any;
      vi.spyOn(fieldHelper, 'executeButtonAction').mockImplementation(() => {});

      component.buttonAction(mockEvent, mockField);

      expect(fieldHelper.executeButtonAction).toHaveBeenCalledWith(
        mockLuigiClient,
        mockField,
        undefined,
      );
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
});
