import { CreateResourceModal } from './create-resource-modal.component';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FieldDefinition } from '@platform-mesh/portal-ui-lib/models';
import { ResourceService } from '@platform-mesh/portal-ui-lib/services';
import { of } from 'rxjs';
import { mock } from 'vitest-mock-extended';

describe('CreateResourceModalComponent', () => {
  let component: CreateResourceModal;
  let fixture: ComponentFixture<CreateResourceModal>;
  let resourceService: ReturnType<typeof mock<ResourceService>>;

  const testFields: FieldDefinition[] = [
    { property: 'metadata.name', required: true, label: 'Name' },
    { property: 'spec.description', required: false, label: 'Description' },
  ];

  const clusterContext: any = {
    resourceDefinition: { scope: 'Cluster' },
  };

  const namespacedContext: any = {
    resourceDefinition: { scope: 'Namespaced' },
  };

  beforeEach(async () => {
    resourceService = mock<ResourceService>();

    await TestBed.configureTestingModule({
      imports: [CreateResourceModal],
      schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
      teardown: { destroyAfterEach: true },
      providers: [{ provide: ResourceService, useValue: resourceService }],
    })
      .overrideComponent(CreateResourceModal, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(CreateResourceModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('fields', testFields);
    fixture.componentRef.setInput('context', clusterContext);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('open / close', () => {
    it('should set dialogOpen to true when open is called', () => {
      component.open();
      expect(component.dialogOpen()).toBeTruthy();
    });

    it('should set dialogOpen to false and reset state when close is called', () => {
      component.open();
      component.close();
      expect(component.dialogOpen()).toBeFalsy();
      expect(component.isFormValid()).toBeFalsy();
    });

    it('should not be in edit mode when opened without a resource', () => {
      component.open();
      expect(component.isEditMode()).toBeFalsy();
    });

    it('should be in edit mode when opened with a resource', () => {
      component.open({ metadata: { name: 'res1' } } as any);
      expect(component.isEditMode()).toBeTruthy();
    });
  });

  describe('formFields building', () => {
    it('should build formFields from fields input on ngOnInit', () => {
      expect(component.formFields().length).toBe(testFields.length);
    });

    it('should set disabled on metadata.name field if edit', () => {
      component.open({} as any);
      const nameField = component
        .formFields()
        .find((f) => f.name === 'metadata_name');
      expect(nameField?.disabled).toBeTruthy();
    });

    it('should not set disabled on metadata.name field if not edit', () => {
      component.open();
      const nameField = component
        .formFields()
        .find((f) => f.name === 'metadata_name');
      expect(nameField?.disabled).toBeFalsy();
    });

    it('should not set disabled on non-create-only field', () => {
      component.open({} as any);
      const descField = component
        .formFields()
        .find((f) => f.name === 'spec_description');
      expect(descField?.disabled).toBeFalsy();
    });

    it('should attach k8sNameValidator to metadata.name field', () => {
      component.open();
      const nameField = component
        .formFields()
        .find((f) => f.name === 'metadata_name');
      expect(nameField?.validators?.length).toBeGreaterThan(0);
    });

    it('should not attach validators to other fields', () => {
      component.open();
      const descField = component
        .formFields()
        .find((f) => f.name === 'spec_description');
      expect(descField?.validators ?? []).toHaveLength(0);
    });

    it('should append namespace field for namespaced resources', () => {
      fixture.componentRef.setInput('context', namespacedContext);
      component.open();
      const nsField = component
        .formFields()
        .find((f) => f.name === 'metadata_namespace');
      expect(nsField).toBeDefined();
    });

    it('should not append namespace field for cluster-scoped resources', () => {
      component.open();
      const nsField = component
        .formFields()
        .find((f) => f.name === 'metadata_namespace');
      expect(nsField).toBeUndefined();
    });

    it('should set loadValues for fields with dynamicValuesDefinition', () => {
      const dynamicFields: FieldDefinition[] = [
        {
          property: 'metadata.namespace',
          required: true,
          label: 'Namespace',
          dynamicValuesDefinition: {
            operation: 'v1.Namespaces.items',
            gqlQuery:
              'query { v1 { Namespaces { items { metadata { name } } } } }',
            value: 'metadata.name',
            key: 'metadata.name',
          },
        },
      ];
      fixture.componentRef.setInput('fields', dynamicFields);
      component.open();
      const nsField = component
        .formFields()
        .find((f) => f.name === 'metadata_namespace');
      expect(typeof nsField?.loadValues).toBe('function');
    });

    it('should call resourceService.list when loadValues is invoked', async () => {
      resourceService.list.mockReturnValue(
        of([{ metadata: { name: 'default' } }]),
      );
      const dynamicFields: FieldDefinition[] = [
        {
          property: 'metadata.namespace',
          required: true,
          label: 'Namespace',
          dynamicValuesDefinition: {
            operation: 'v1.Namespaces.items',
            gqlQuery:
              'query { v1 { Namespaces { items { metadata { name } } } } }',
            value: 'metadata.name',
            key: 'metadata.name',
          },
        },
      ];
      fixture.componentRef.setInput('fields', dynamicFields);
      component.open();
      const nsField = component
        .formFields()
        .find((f) => f.name === 'metadata_namespace');
      const options = await nsField!.loadValues!();
      expect(options).toEqual([{ value: 'default', label: 'default' }]);
    });
  });

  describe('formInitialValues', () => {
    it('should be empty when opened without a resource', () => {
      component.open();
      expect(component.formInitialValues()).toEqual({});
    });

    it('should populate from resource when opened with one', () => {
      component.open({
        metadata: { name: 'res1' },
        spec: { description: 'hello' },
      } as any);
      expect(component.formInitialValues()['metadata_name']).toBe('res1');
      expect(component.formInitialValues()['spec_description']).toBe('hello');
    });
  });

  describe('submit', () => {
    it('should emit resource when not in edit mode and form value is set', () => {
      component.open();
      component.onFormValue({ metadata: { name: 'new-res' } });
      const spy = vi.spyOn(component.resource, 'emit');
      component.submit();
      expect(spy).toHaveBeenCalledWith({ metadata: { name: 'new-res' } });
    });

    it('should emit updateResource when in edit mode and form value is set', () => {
      component.open({ metadata: { name: 'existing' } } as any);
      component.onFormValue({
        metadata: { name: 'existing' },
        spec: { description: 'updated' },
      });
      const spy = vi.spyOn(component.updateResource, 'emit');
      component.submit();
      expect(spy).toHaveBeenCalledWith({
        metadata: { name: 'existing' },
        spec: { description: 'updated' },
      });
    });

    it('should not emit if no form value has been received', () => {
      component.open();
      const spy = vi.spyOn(component.resource, 'emit');
      component.submit();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('onFormValidChange', () => {
    it('should update isFormValid signal', () => {
      component.onFormValidChange(true);
      expect(component.isFormValid()).toBeTruthy();
      component.onFormValidChange(false);
      expect(component.isFormValid()).toBeFalsy();
    });
  });

  describe('isEditMode', () => {
    it('should return false by default', () => {
      expect(component.isEditMode()).toBeFalsy();
    });

    it('should return true after opening with a resource', () => {
      component.open({ metadata: { name: 'r1' } } as any);
      expect(component.isEditMode()).toBeTruthy();
    });

    it('should return false after close', () => {
      component.open({ metadata: { name: 'r1' } } as any);
      component.close();
      expect(component.isEditMode()).toBeFalsy();
    });
  });
});
