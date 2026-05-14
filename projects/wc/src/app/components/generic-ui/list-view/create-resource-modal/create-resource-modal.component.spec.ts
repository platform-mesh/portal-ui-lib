import { CreateResourceModal } from './create-resource-modal.component';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeclarativeForm } from '@openmfp/ngx';
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
    portalContext: { crdGatewayApiUrl: 'http://example.com' },
  };

  const namespacedContext: any = {
    resourceDefinition: { scope: 'Namespaced' },
    portalContext: { crdGatewayApiUrl: 'http://example.com' },
  };

  beforeEach(async () => {
    resourceService = mock<ResourceService>();

    await TestBed.configureTestingModule({
      imports: [CreateResourceModal],
      schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
      teardown: { destroyAfterEach: true },
      providers: [{ provide: ResourceService, useValue: resourceService }],
    })
      .overrideComponent(CreateResourceModal, {
        set: {
          template:
            '<mfp-declarative-form [fields]="formFields()" [initialValues]="formInitialValues()" [fieldErrors]="fieldErrors()" (fieldChange)="onFieldChange($event)" (formSubmit)="onFormSubmit($event)" />',
          imports: [DeclarativeForm],
          schemas: [CUSTOM_ELEMENTS_SCHEMA],
        },
      })
      .overrideComponent(DeclarativeForm, { set: { template: '' } })
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
    it('should set dialogOpen to true when open is called', async () => {
      await component.open();
      expect(component.dialogOpen()).toBe(true);
    });

    it('should set dialogOpen to false and reset state when close is called', async () => {
      await component.open();
      component.close();
      expect(component.dialogOpen()).toBe(false);
      expect(component.isFormValid()).toBe(false);
    });

    it('should clear fieldErrors when close is called', async () => {
      await component.open();
      component.close();
      expect(component.fieldErrors()).toEqual({});
    });

    it('should leave isEditMode false after close', async () => {
      await component.open({ metadata: { name: 'r1' } } as any);
      component.close();
      expect(component.isEditMode()).toBe(false);
    });

    it('should return to isFormValid false after close even if form was valid', async () => {
      await component.open({ metadata: { name: 'valid-name' } } as any);
      expect(component.isFormValid()).toBe(true);
      component.close();
      expect(component.isFormValid()).toBe(false);
    });

    it('should support re-opening after close', async () => {
      await component.open();
      component.close();
      await component.open();
      expect(component.dialogOpen()).toBe(true);
    });
  });

  describe('formFields building', () => {
    it('should be empty before open is called', () => {
      expect(component.formFields()).toHaveLength(0);
    });

    it('should build formFields from fields input after open', async () => {
      await component.open();
      expect(component.formFields()).toHaveLength(testFields.length);
    });

    it('should use dot-notation field names', async () => {
      await component.open();
      const names = component.formFields().map((f) => f.name);
      expect(names).toContain('metadata.name');
      expect(names).toContain('spec.description');
    });

    it('should set validation: onChange on the metadata.name field', async () => {
      await component.open();
      const nameField = component
        .formFields()
        .find((f) => f.name === 'metadata.name');
      expect(nameField?.validation).toBe('onChange');
    });

    it('should set validation: onChange on other required fields', async () => {
      const requiredFields: FieldDefinition[] = [
        { property: 'spec.type', required: true, label: 'Type' },
        { property: 'spec.description', required: false, label: 'Description' },
      ];
      fixture.componentRef.setInput('fields', requiredFields);
      await component.open();
      const requiredField = component
        .formFields()
        .find((f) => f.name === 'spec.type');
      const optionalField = component
        .formFields()
        .find((f) => f.name === 'spec.description');
      expect(requiredField?.validation).toBe('onChange');
      expect(optionalField?.validation).toBeUndefined();
    });

    it('should not set validation on non-required, non-name fields', async () => {
      await component.open();
      const descField = component
        .formFields()
        .find((f) => f.name === 'spec.description');
      expect(descField?.validation).toBeUndefined();
    });

    it('should disable metadata.name when opened in edit mode', async () => {
      await component.open({ metadata: { name: 'existing' } } as any);
      const nameField = component
        .formFields()
        .find((f) => f.name === 'metadata.name');
      expect(nameField?.disabled).toBe(true);
    });

    it('should not disable metadata.name when opened in create mode', async () => {
      await component.open();
      const nameField = component
        .formFields()
        .find((f) => f.name === 'metadata.name');
      expect(nameField?.disabled).toBe(false);
    });

    it('should not disable spec.description in edit mode', async () => {
      await component.open({ metadata: { name: 'existing' } } as any);
      const descField = component
        .formFields()
        .find((f) => f.name === 'spec.description');
      expect(descField?.disabled).toBe(false);
    });

    it('should append a metadata.namespace field for namespaced resources', async () => {
      resourceService.list.mockReturnValue(of([]));
      fixture.componentRef.setInput('context', namespacedContext);
      fixture.detectChanges();
      await component.open();
      const nsField = component
        .formFields()
        .find((f) => f.name === 'metadata.namespace');
      expect(nsField).toBeDefined();
    });

    it('should not append a metadata.namespace field for cluster-scoped resources', async () => {
      await component.open();
      const nsField = component
        .formFields()
        .find((f) => f.name === 'metadata.namespace');
      expect(nsField).toBeUndefined();
    });

    it('should prefetch dynamic values and store them in formField.values', async () => {
      resourceService.list.mockReturnValue(
        of([
          { metadata: { name: 'default' } },
          { metadata: { name: 'kube-system' } },
        ]),
      );
      fixture.componentRef.setInput('context', namespacedContext);
      fixture.detectChanges();
      await component.open();
      const nsField = component
        .formFields()
        .find((f) => f.name === 'metadata.namespace');
      expect(nsField?.values).toEqual(['default', 'kube-system']);
    });

    it('should call resourceService.list with the correct operation and query when prefetching', async () => {
      resourceService.list.mockReturnValue(of([]));
      fixture.componentRef.setInput('context', namespacedContext);
      fixture.detectChanges();
      await component.open();
      expect(resourceService.list).toHaveBeenCalledWith(
        'v1.Namespaces.items',
        'query { v1 { Namespaces { items { metadata { name } } } } }',
        namespacedContext,
      );
    });

    it('should store static values from field.values in formField.values', async () => {
      const staticFields: FieldDefinition[] = [
        {
          property: 'spec.type',
          label: 'Type',
          values: ['A', 'B', 'C'],
        },
      ];
      fixture.componentRef.setInput('fields', staticFields);
      await component.open();
      const typeField = component
        .formFields()
        .find((f) => f.name === 'spec.type');
      expect(typeField?.values).toEqual(['A', 'B', 'C']);
    });
  });

  describe('formInitialValues', () => {
    it('should be empty before open is called', () => {
      expect(component.formInitialValues()).toEqual({});
    });

    it('should be empty when opened without a resource', async () => {
      await component.open();
      expect(component.formInitialValues()).toEqual({});
    });

    it('should populate from resource properties using dot-notation keys', async () => {
      await component.open({
        metadata: { name: 'res1' },
        spec: { description: 'hello' },
      } as any);
      expect(component.formInitialValues()['metadata.name']).toBe('res1');
      expect(component.formInitialValues()['spec.description']).toBe('hello');
    });

    it('should fall back to empty string for fields whose property value is absent on the resource', async () => {
      await component.open({ metadata: { name: 'res1' } } as any);
      expect(component.formInitialValues()['spec.description']).toBe('');
    });
  });

  describe('onFormSubmit', () => {
    it('should emit resource when not in edit mode', async () => {
      await component.open();
      const spy = vi.spyOn(component.resource, 'emit');
      component.onFormSubmit({ 'metadata.name': 'new-res' });
      expect(spy).toHaveBeenCalledWith({ 'metadata.name': 'new-res' });
    });

    it('should emit updateResource when in edit mode', async () => {
      await component.open({ metadata: { name: 'existing' } } as any);
      const spy = vi.spyOn(component.updateResource, 'emit');
      component.onFormSubmit({
        'metadata.name': 'existing',
        'spec.description': 'updated',
      });
      expect(spy).toHaveBeenCalledWith({
        'metadata.name': 'existing',
        'spec.description': 'updated',
      });
    });

    it('should not emit updateResource when not in edit mode', async () => {
      await component.open();
      const spy = vi.spyOn(component.updateResource, 'emit');
      component.onFormSubmit({ 'metadata.name': 'new-res' });
      expect(spy).not.toHaveBeenCalled();
    });

    it('should not emit resource when in edit mode', async () => {
      await component.open({ metadata: { name: 'existing' } } as any);
      const spy = vi.spyOn(component.resource, 'emit');
      component.onFormSubmit({ 'metadata.name': 'existing' });
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('onFieldChange / validation', () => {
    beforeEach(async () => {
      await component.open();
    });

    it('should set isFormValid to false when a required field is empty', () => {
      component.onFieldChange({ fieldProperty: 'metadata.name', value: '' });
      expect(component.isFormValid()).toBe(false);
    });

    it('should set a fieldError when a required field is empty', () => {
      component.onFieldChange({ fieldProperty: 'metadata.name', value: '' });
      expect(component.fieldErrors()['metadata.name']).toBe(
        'This field is required',
      );
    });

    it('should set isFormValid to false for an invalid k8s name', () => {
      component.onFieldChange({
        fieldProperty: 'metadata.name',
        value: 'Invalid_Name',
      });
      expect(component.isFormValid()).toBe(false);
    });

    it('should set the RFC 1035 error message for an invalid k8s name', () => {
      component.onFieldChange({
        fieldProperty: 'metadata.name',
        value: 'Invalid_Name',
      });
      expect(component.fieldErrors()['metadata.name']).toBe(
        'Invalid resource name accrording to RFC 1035',
      );
    });

    it('should set isFormValid to true and clear errors for a valid k8s name', () => {
      component.onFieldChange({
        fieldProperty: 'metadata.name',
        value: 'valid-name',
      });
      expect(component.isFormValid()).toBe(true);
      expect(component.fieldErrors()['metadata.name']).toBeNull();
    });

    it('should accept a single-character lowercase name as valid', () => {
      component.onFieldChange({ fieldProperty: 'metadata.name', value: 'a' });
      expect(component.isFormValid()).toBe(true);
    });

    it('should reject a name starting with a digit', () => {
      component.onFieldChange({
        fieldProperty: 'metadata.name',
        value: '1bad',
      });
      expect(component.isFormValid()).toBe(false);
    });

    it('should reject a name ending with a hyphen', () => {
      component.onFieldChange({
        fieldProperty: 'metadata.name',
        value: 'bad-',
      });
      expect(component.isFormValid()).toBe(false);
    });

    it('should not set an error for an optional non-name field regardless of value', () => {
      component.onFieldChange({
        fieldProperty: 'spec.description',
        value: '',
      });
      expect(component.fieldErrors()['spec.description']).toBeNull();
    });

    it('should update formValues so a subsequent change event builds on prior state', () => {
      component.onFieldChange({ fieldProperty: 'metadata.name', value: 'ok' });
      component.onFieldChange({
        fieldProperty: 'spec.description',
        value: 'desc',
      });
      // Both changes are retained; valid name means form is valid
      expect(component.isFormValid()).toBe(true);
    });
  });

  describe('isEditMode', () => {
    it('should return false by default', () => {
      expect(component.isEditMode()).toBe(false);
    });

    it('should return true after opening with a resource', async () => {
      await component.open({ metadata: { name: 'r1' } } as any);
      expect(component.isEditMode()).toBe(true);
    });

    it('should return false when opened without a resource', async () => {
      await component.open();
      expect(component.isEditMode()).toBe(false);
    });

    it('should return false after close', async () => {
      await component.open({ metadata: { name: 'r1' } } as any);
      component.close();
      expect(component.isEditMode()).toBe(false);
    });
  });
});
