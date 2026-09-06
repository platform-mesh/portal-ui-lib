import { ResourceFormModal } from './resource-form-modal.component';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeclarativeForm } from '@openmfp/ngx';
import { PlatformMeshFieldDefinition } from '@platform-mesh/portal-ui-lib/models';
import { ResourceService } from '@platform-mesh/portal-ui-lib/services';
import { of } from 'rxjs';
import { mock } from 'vitest-mock-extended';

describe('ResourceFormModalComponent', () => {
  let component: ResourceFormModal;
  let fixture: ComponentFixture<ResourceFormModal>;
  let resourceService: ReturnType<typeof mock<ResourceService>>;

  const testFields: PlatformMeshFieldDefinition[] = [
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

  const editResource = { metadata: { name: 'valid-name' } } as any;

  beforeEach(async () => {
    resourceService = mock<ResourceService>();

    await TestBed.configureTestingModule({
      imports: [ResourceFormModal],
      schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
      teardown: { destroyAfterEach: true },
      providers: [{ provide: ResourceService, useValue: resourceService }],
    })
      .overrideComponent(ResourceFormModal, {
        set: {
          template:
            '<mfp-declarative-form [fields]="formFields()" [initialValues]="formInitialValues()" [fieldErrors]="fieldErrors()" (fieldChange)="onFieldChange($event)" (formSubmit)="onFormSubmit($event)" />',
          imports: [DeclarativeForm],
          schemas: [CUSTOM_ELEMENTS_SCHEMA],
        },
      })
      .overrideComponent(DeclarativeForm, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(ResourceFormModal);
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
      await component.open(editResource);
      expect(component.dialogOpen()).toBe(true);
    });

    it('should set dialogOpen to false and reset state when close is called', async () => {
      await component.open(editResource);
      component.close();
      expect(component.dialogOpen()).toBe(false);
      expect(component.isFormValid()).toBe(false);
    });

    it('should clear fieldErrors when close is called', async () => {
      await component.open(editResource);
      component.close();
      expect(component.fieldErrors()).toEqual({});
    });

    it('should return to isFormValid false after close even if form was valid', async () => {
      await component.open({ metadata: { name: 'valid-name' } } as any);
      expect(component.isFormValid()).toBe(true);
      component.close();
      expect(component.isFormValid()).toBe(false);
    });

    it('should support re-opening after close', async () => {
      await component.open(editResource);
      component.close();
      await component.open(editResource);
      expect(component.dialogOpen()).toBe(true);
    });
  });

  describe('formFields building', () => {
    it('should be empty before open is called', () => {
      expect(component.formFields()).toHaveLength(0);
    });

    it('should build formFields from fields input after open', async () => {
      await component.open(editResource);
      expect(component.formFields()).toHaveLength(testFields.length);
    });

    it('should use dot-notation field names', async () => {
      await component.open(editResource);
      const names = component.formFields().map((f) => f.name);
      expect(names).toContain('metadata.name');
      expect(names).toContain('spec.description');
    });

    it('should set validation: onChange on the metadata.name field', async () => {
      await component.open(editResource);
      const nameField = component
        .formFields()
        .find((f) => f.name === 'metadata.name');
      expect(nameField?.validation).toBe('onChange');
    });

    it('should set validation: onChange on other required fields', async () => {
      const requiredFields: PlatformMeshFieldDefinition[] = [
        { property: 'spec.type', required: true, label: 'Type' },
        { property: 'spec.description', required: false, label: 'Description' },
      ];
      fixture.componentRef.setInput('fields', requiredFields);
      await component.open(editResource);
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
      await component.open(editResource);
      const descField = component
        .formFields()
        .find((f) => f.name === 'spec.description');
      expect(descField?.validation).toBeUndefined();
    });

    it('should disable metadata.name when opened for edit', async () => {
      await component.open({ metadata: { name: 'existing' } } as any);
      const nameField = component
        .formFields()
        .find((f) => f.name === 'metadata.name');
      expect(nameField?.disabled).toBe(true);
    });

    it('should disable spec.alias when opened for edit', async () => {
      fixture.componentRef.setInput('fields', [
        { property: 'spec.alias', required: true, label: 'Alias' },
        { property: 'spec.displayName', label: 'Display name' },
      ]);
      await component.open({
        metadata: { name: 'test2' },
        spec: { alias: 'test2', displayName: 'test-dex-dex-dex' },
      } as any);
      const aliasField = component
        .formFields()
        .find((f) => f.name === 'spec.alias');
      expect(aliasField?.disabled).toBe(true);
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
      await component.open(editResource);
      const nsField = component
        .formFields()
        .find((f) => f.name === 'metadata.namespace');
      expect(nsField).toBeDefined();
    });

    it('should not append a metadata.namespace field for cluster-scoped resources', async () => {
      await component.open(editResource);
      const nsField = component
        .formFields()
        .find((f) => f.name === 'metadata.namespace');
      expect(nsField).toBeUndefined();
    });

    it('should not append a metadata.namespace field when a namespace is already resolved', async () => {
      resourceService.getNamespace.mockReturnValue('default');
      fixture.componentRef.setInput('context', namespacedContext);
      fixture.detectChanges();
      await component.open(editResource);
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
      await component.open(editResource);
      const nsField = component
        .formFields()
        .find((f) => f.name === 'metadata.namespace');
      expect(nsField?.values).toEqual(['default', 'kube-system']);
    });

    it('should call resourceService.list with the correct operation and query when prefetching', async () => {
      resourceService.list.mockReturnValue(of([]));
      fixture.componentRef.setInput('context', namespacedContext);
      fixture.detectChanges();
      await component.open(editResource);
      expect(resourceService.list).toHaveBeenCalledWith(
        'v1.Namespaces.items',
        'query { v1 { Namespaces { items { metadata { name } } } } }',
        namespacedContext,
        { variables: {} },
      );
    });

    it('resolves dynamicValuesDefinition.gqlQueryVariables (context placeholder + literal) and passes them to list', async () => {
      resourceService.list.mockReturnValue(of([]));

      const ctx: any = {
        resourceDefinition: { scope: 'Namespaced' },
        namespaceId: 'team-a',
        portalContext: { crdGatewayApiUrl: 'http://example.com' },
      };
      const fieldsWithVars: PlatformMeshFieldDefinition[] = [
        {
          property: 'spec.region',
          label: 'Region',
          required: true,
          dynamicValuesDefinition: {
            operation: 'inventory.v1alpha1.Regions.items',
            gqlQuery:
              'query ($namespace: String, $provider: String) { inventory { v1alpha1 { Regions(namespace: $namespace, provider: $provider) { items { metadata { name } } } } } }',
            value: 'metadata.name',
            key: 'metadata.name',
            gqlQueryVariables: {
              namespace: '{context.namespaceId}',
              provider: 'aws',
            },
          },
        },
      ];

      fixture.componentRef.setInput('fields', fieldsWithVars);
      fixture.componentRef.setInput('context', ctx);
      fixture.detectChanges();
      await component.open(editResource);

      const call = resourceService.list.mock.calls.find(
        (c) => c[0] === 'inventory.v1alpha1.Regions.items',
      )!;
      expect(call[3]).toEqual({
        variables: {
          namespace: { type: 'String', value: 'team-a' },
          provider: { type: 'String', value: 'aws' },
        },
      });
    });

    it('wraps each gqlQueryVariable as a String-typed list variable', async () => {
      resourceService.list.mockReturnValue(of([]));

      const ctx: any = {
        resourceDefinition: { scope: 'Namespaced' },
        namespaceId: 'team-a',
        portalContext: { crdGatewayApiUrl: 'http://example.com' },
      };
      const fieldsWithVars: PlatformMeshFieldDefinition[] = [
        {
          property: 'spec.region',
          label: 'Region',
          dynamicValuesDefinition: {
            operation: 'inventory.v1alpha1.Regions.items',
            gqlQuery: 'query ($namespace: String) { x }',
            value: 'metadata.name',
            key: 'metadata.name',
            gqlQueryVariables: {
              namespace: '{context.namespaceId}',
            },
          },
        },
      ];

      fixture.componentRef.setInput('fields', fieldsWithVars);
      fixture.componentRef.setInput('context', ctx);
      fixture.detectChanges();
      await component.open(editResource);

      const call = resourceService.list.mock.calls.find(
        (c) => c[0] === 'inventory.v1alpha1.Regions.items',
      )!;
      expect(call[3]).toEqual({
        variables: { namespace: { type: 'String', value: 'team-a' } },
      });
    });

    it('should store static values from field.values in formField.values', async () => {
      const staticFields: PlatformMeshFieldDefinition[] = [
        {
          property: 'spec.type',
          label: 'Type',
          values: ['A', 'B', 'C'],
        },
      ];
      fixture.componentRef.setInput('fields', staticFields);
      await component.open(editResource);
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
    it('should restore immutable fields from the original resource on submit', async () => {
      fixture.componentRef.setInput('fields', [
        { property: 'metadata.name', required: true, label: 'Name' },
        { property: 'spec.alias', required: true, label: 'Alias' },
        { property: 'spec.displayName', label: 'Display name' },
      ]);
      await component.open({
        metadata: { name: 'dex' },
        spec: { alias: 'dex', displayName: 'Dex' },
      } as any);
      const spy = vi.spyOn(component.updateResource, 'emit');
      component.onFormSubmit({
        spec: { displayName: 'Dex (updated)' },
      });
      expect(spy).toHaveBeenCalledWith({
        metadata: { name: 'dex' },
        spec: { alias: 'dex', displayName: 'Dex (updated)' },
      });
    });

    it('should emit updateResource with sanitized values', async () => {
      await component.open({ metadata: { name: 'existing' } } as any);
      const spy = vi.spyOn(component.updateResource, 'emit');
      component.onFormSubmit({
        metadata: { name: 'existing' },
        spec: { description: 'updated' },
      });
      expect(spy).toHaveBeenCalledWith({
        metadata: { name: 'existing' },
        spec: { description: 'updated' },
      });
    });

    it('should omit empty write-only fields on edit submit', async () => {
      const fieldsWithSecret: PlatformMeshFieldDefinition[] = [
        { property: 'metadata.name', required: true, label: 'Name' },
        {
          property: 'spec.oidc.clientSecret',
          label: 'Client secret',
          uiSettings: { writeOnly: true },
        },
      ];
      fixture.componentRef.setInput('fields', fieldsWithSecret);
      await component.open({ metadata: { name: 'existing' } } as any);
      const spy = vi.spyOn(component.updateResource, 'emit');
      component.onFormSubmit({
        metadata: { name: 'existing' },
        spec: { oidc: { clientSecret: '' } },
      });
      expect(spy).toHaveBeenCalledWith({ metadata: { name: 'existing' } });
    });

    it('should keep non-empty write-only fields on edit submit', async () => {
      const fieldsWithSecret: PlatformMeshFieldDefinition[] = [
        { property: 'metadata.name', required: true, label: 'Name' },
        {
          property: 'spec.oidc.clientSecret',
          label: 'Client secret',
          uiSettings: { writeOnly: true },
        },
      ];
      fixture.componentRef.setInput('fields', fieldsWithSecret);
      await component.open({ metadata: { name: 'existing' } } as any);
      const spy = vi.spyOn(component.updateResource, 'emit');
      component.onFormSubmit({
        metadata: { name: 'existing' },
        spec: { oidc: { clientSecret: 'new-secret' } },
      });
      expect(spy).toHaveBeenCalledWith({
        metadata: { name: 'existing' },
        spec: { oidc: { clientSecret: 'new-secret' } },
      });
    });
  });

  describe('onFieldChange / validation', () => {
    beforeEach(async () => {
      fixture.componentRef.setInput('fields', [
        { property: 'metadata.name', required: true, label: 'Name' },
        { property: 'spec.type', required: true, label: 'Type' },
        { property: 'spec.description', required: false, label: 'Description' },
      ]);
      await component.open(editResource);
    });

    it('should set isFormValid to false when a required field is empty', () => {
      component.onFieldChange({ fieldProperty: 'spec.type', value: '' });
      expect(component.isFormValid()).toBe(false);
    });

    it('should set a fieldError when a required field is empty', () => {
      component.onFieldChange({ fieldProperty: 'spec.type', value: '' });
      expect(component.fieldErrors()['spec.type']).toBe('This field is required');
    });

    it('should set isFormValid to true and clear errors for a valid value', () => {
      component.onFieldChange({
        fieldProperty: 'spec.type',
        value: 'oidc',
      });
      expect(component.isFormValid()).toBe(true);
      expect(component.fieldErrors()['spec.type']).toBeNull();
    });

    it('should not require empty write-only fields in edit mode', async () => {
      const fieldsWithSecret: PlatformMeshFieldDefinition[] = [
        { property: 'metadata.name', required: true, label: 'Name' },
        {
          property: 'spec.oidc.clientSecret',
          label: 'Client secret',
          required: true,
          uiSettings: { writeOnly: true },
        },
      ];
      fixture.componentRef.setInput('fields', fieldsWithSecret);
      await component.open({ metadata: { name: 'existing' } } as any);

      component.onFieldChange({
        fieldProperty: 'spec.oidc.clientSecret',
        value: '',
      });

      expect(component.fieldErrors()['spec.oidc.clientSecret']).toBeNull();
      expect(component.isFormValid()).toBe(true);
    });

    it('should not set an error for an optional field regardless of value', () => {
      component.onFieldChange({
        fieldProperty: 'spec.description',
        value: '',
      });
      expect(component.fieldErrors()['spec.description']).toBeNull();
    });
  });

  describe('submitForm', () => {
    it('should delegate to the declarative form submit handler', async () => {
      await component.open(editResource);
      const formRef = (component as any).declarativeFormRef();
      const submitSpy = vi.spyOn(formRef, 'submit');
      (component as any).submitForm();
      expect(submitSpy).toHaveBeenCalled();
    });
  });

  describe('onFormSubmit without open', () => {
    it('should emit the payload unchanged when no resource was loaded', () => {
      const spy = vi.spyOn(component.updateResource, 'emit');
      component.onFormSubmit({ spec: { displayName: 'updated' } });
      expect(spy).toHaveBeenCalledWith({ spec: { displayName: 'updated' } });
    });

    it('should skip immutable fields missing on the original resource', async () => {
      fixture.componentRef.setInput('fields', [
        { property: 'metadata.name', required: true, label: 'Name' },
        { property: 'spec.alias', required: true, label: 'Alias' },
        { property: 'spec.displayName', label: 'Display name' },
      ]);
      await component.open({ metadata: { name: 'dex' } } as any);
      const spy = vi.spyOn(component.updateResource, 'emit');
      component.onFormSubmit({ spec: { displayName: 'Dex (updated)' } });
      expect(spy).toHaveBeenCalledWith({
        metadata: { name: 'dex' },
        spec: { displayName: 'Dex (updated)' },
      });
    });
  });

  describe('resolveDynamicValues', () => {
    it('returns undefined when the field has no dynamicValuesDefinition', async () => {
      const result = await (component as any).resolveDynamicValues({
        property: 'spec.displayName',
      });
      expect(result).toBeUndefined();
    });
  });
});
