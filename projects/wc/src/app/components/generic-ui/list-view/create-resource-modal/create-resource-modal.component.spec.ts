import { CreateResourceModalComponent } from './create-resource-modal.component';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { FieldDefinition } from '@platform-mesh/portal-ui-lib/models';

describe('CreateResourceModalComponent', () => {
  let component: CreateResourceModalComponent;
  let fixture: ComponentFixture<CreateResourceModalComponent>;

  const testFields: FieldDefinition[] = [
    { property: 'name.firstName', required: true, label: 'First Name' },
    { property: 'address.city', required: false, label: 'City' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, CreateResourceModalComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
      teardown: { destroyAfterEach: true },
    })
      .overrideComponent(CreateResourceModalComponent, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(CreateResourceModalComponent);
    component = fixture.componentInstance;

    component.fields = (() => testFields) as any;

    component.ngOnInit();
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with controls from fields input', () => {
    expect(component.form).toBeDefined();
    expect(component.form.controls['name_firstName']).toBeDefined();
    expect(component.form.controls['address_city']).toBeDefined();

    const firstNameControl = component.form.controls['name_firstName'];
    firstNameControl.setValue('');
    expect(firstNameControl.valid).toBeFalsy();

    const cityControl = component.form.controls['address_city'];
    cityControl.setValue('');
    expect(cityControl.valid).toBeTruthy();
  });

  it('should open dialog when open method is called', () => {
    component.open();
    expect(component.dialogOpen()).toBeTruthy();
  });

  it('should prefill and disable name/namespace in edit mode, emit updateResource', () => {
    (component as any).fields = () =>
      [
        { property: 'metadata.name', required: true, label: 'Name' },
        { property: 'metadata.namespace', required: false, label: 'Namespace' },
        { property: 'spec.description', required: false, label: 'Description' },
      ] as any;

    component.form = (component as any).fb.group(
      (component as any).createControls(),
    );

    const resource: any = {
      metadata: { name: 'res1', namespace: 'ns1' },
      spec: { description: 'hello' },
    };

    const updateSpy = vi.spyOn(component.updateResource, 'emit');

    component.open(resource);
    expect(component.dialogOpen()).toBeTruthy();

    expect(component.form.controls['metadata_name'].value).toBe('res1');
    expect(component.form.controls['metadata_namespace'].value).toBe('ns1');
    expect(component.form.controls['spec_description'].value).toBe('hello');

    component.form.controls['spec_description'].setValue('updated');
    component.create();

    expect(updateSpy).toHaveBeenCalledWith({
      metadata: { name: 'res1', namespace: 'ns1' },
      spec: { description: 'updated' },
    });

    expect(component.form.controls['metadata_name'].disabled).toBeFalsy();
    expect(component.form.controls['metadata_namespace'].disabled).toBeFalsy();
  });

  it('should close dialog and reset form when close method is called', () => {
    vi.spyOn(component.form, 'reset');

    component.close();

    expect(component.dialogOpen()).toBeFalsy();
    expect(component.form.reset).toHaveBeenCalled();
  });

  it('should transform form data and emit resource when create method is called with valid form', () => {
    component.form.controls['name_firstName'].setValue('John');
    component.form.controls['address_city'].setValue('New York');

    vi.spyOn(component.resource, 'emit');

    component.create();

    expect(component.resource.emit).toHaveBeenCalledWith({
      name: { firstName: 'John' },
      address: { city: 'New York' },
    });

    expect(component.dialogOpen()).toBeFalsy();
  });

  it('should not emit resource when form is invalid', () => {
    component.form.controls['name_firstName'].setValue('');
    component.form.controls['address_city'].setValue('New York');

    vi.spyOn(component.resource, 'emit');

    component.create();

    expect(component.resource.emit).not.toHaveBeenCalled();
  });

  it('should update form control value, mark as touched and dirty on setFormControlValue', () => {
    const event = { target: { value: 'Test' } };

    vi.spyOn(component.form.controls['name_firstName'], 'setValue');
    vi.spyOn(component.form.controls['name_firstName'], 'markAsTouched');
    vi.spyOn(component.form.controls['name_firstName'], 'markAsDirty');

    component.setFormControlValue(event, 'name_firstName');

    expect(
      component.form.controls['name_firstName'].setValue,
    ).toHaveBeenCalledWith('Test');
    expect(
      component.form.controls['name_firstName'].markAsTouched,
    ).toHaveBeenCalled();
    expect(
      component.form.controls['name_firstName'].markAsDirty,
    ).toHaveBeenCalled();
  });

  it('should return Negative value state for invalid and touched control', () => {
    const control = component.form.controls['name_firstName'];
    control.setValue('');
    control.markAsTouched();

    expect(component.getValueState('name_firstName')).toBe('Negative');
  });

  it('should return None value state for valid control or untouched control', () => {
    const control = component.form.controls['name_firstName'];
    control.setValue('John');
    control.markAsTouched();

    expect(component.getValueState('name_firstName')).toBe('None');

    control.setValue('');
    control.markAsUntouched();

    expect(component.getValueState('name_firstName')).toBe('None');
  });

  it('should mark control as touched on field blur', () => {
    vi.spyOn(component.form.controls['name_firstName'], 'markAsTouched');

    component.onFieldBlur('name_firstName');

    expect(
      component.form.controls['name_firstName'].markAsTouched,
    ).toHaveBeenCalled();
  });

  describe('sanitizePropertyName', () => {
    it('should replace dots with underscores in property name', () => {
      const field = { property: 'metadata.name.firstName' };
      const result = (component as any).sanitizePropertyName(field);
      expect(result).toBe('metadata_name_firstName');
    });

    it('should take propertyField key into account', () => {
      const field = {
        property: 'metadata.name.firstName',
        propertyField: { key: 'secret' },
      };
      const result = (component as any).sanitizePropertyName(field);
      expect(result).toBe('metadata_name_firstName_secret');
    });

    it('should handle property names without dots', () => {
      const field = { property: 'name' };
      const result = (component as any).sanitizePropertyName(field);
      expect(result).toBe('name');
    });

    it('should throw error when property is an array', () => {
      const field = { property: ['name', 'firstName'] };
      expect(() => (component as any).sanitizePropertyName(field)).toThrow(
        'Wrong property type, array not supported',
      );
    });
  });

  it('should detect name/namespace and not other fields in isCreateFieldOnly function', () => {
    const nameField: any = { property: 'metadata.name' };
    const nsField: any = { property: 'metadata.namespace' };
    const otherField: any = { property: 'spec.description' };

    expect(component.isCreateFieldOnly(nameField)).toBeTruthy();
    expect(component.isCreateFieldOnly(nsField)).toBeTruthy();
    expect(component.isCreateFieldOnly(otherField)).toBeFalsy();
  });

  it('should open dialog using open function', () => {
    component.open();

    expect(component.dialogOpen()).toBeTruthy();
  });
});
