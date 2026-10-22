import { ResourceFormModal } from './resource-form-modal.component';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormFieldDefinition, ResourceFormDialog } from '@openmfp/ngx';
import { PlatformMeshFieldDefinition } from '@platform-mesh/portal-ui-lib/models';
import {
  ErrorHandlerService,
  ResourceService,
} from '@platform-mesh/portal-ui-lib/services';
import { of, throwError } from 'rxjs';
import { mock } from 'vitest-mock-extended';

describe('ResourceFormModal', () => {
  let component: ResourceFormModal;
  let fixture: ComponentFixture<ResourceFormModal>;
  let resourceService: ReturnType<typeof mock<ResourceService>>;
  let errorHandlerService: ReturnType<typeof mock<ErrorHandlerService>>;

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

  beforeEach(async () => {
    resourceService = mock<ResourceService>();
    errorHandlerService = mock<ErrorHandlerService>();

    await TestBed.configureTestingModule({
      imports: [ResourceFormModal],
      schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
      teardown: { destroyAfterEach: true },
      providers: [
        { provide: ResourceService, useValue: resourceService },
        { provide: ErrorHandlerService, useValue: errorHandlerService },
      ],
    })
      .overrideComponent(ResourceFormModal, {
        set: {
          template:
            '<mfp-resource-form-dialog [open]="dialogOpen()" [fields]="formFields()" [initialValues]="formInitialValues()" [fieldErrors]="fieldErrors()" (fieldChange)="onFieldChange($event)" (submitted)="onFormSubmit($event)" (cancelled)="close()" />',
          imports: [ResourceFormDialog],
          schemas: [CUSTOM_ELEMENTS_SCHEMA],
        },
      })
      .overrideComponent(ResourceFormDialog, { set: { template: '' } })
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
      await component.open();
      expect(component.dialogOpen()).toBe(true);
    });

    it('should set dialogOpen to false when close is called', async () => {
      await component.open();
      component.close();
      expect(component.dialogOpen()).toBe(false);
    });

    it('should clear fieldErrors when close is called', async () => {
      await component.open();
      component.onFieldChange({ fieldProperty: 'metadata.name', value: '' });
      component.close();
      expect(component.fieldErrors()).toEqual({});
    });

    it('should leave isEditMode false after close', async () => {
      await component.open({ metadata: { name: 'r1' } } as any);
      component.close();
      expect(component.isEditMode()).toBe(false);
    });

    it('should support re-opening after close', async () => {
      await component.open();
      component.close();
      await component.open();
      expect(component.dialogOpen()).toBe(true);
    });

    it('should reset originalResource to null when close is called', async () => {
      await component.open({ metadata: { name: 'r1' } } as any);
      component.close();
      expect(component.isEditMode()).toBe(false);
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

    it('should disable immutable fields (spec.alias) when opened for edit', async () => {
      fixture.componentRef.setInput('fields', [
        { property: 'spec.alias', required: true, label: 'Alias' },
        { property: 'spec.displayName', label: 'Display name' },
      ]);
      await component.open({
        metadata: { name: 'test2' },
        spec: { alias: 'test2', displayName: 'test-display' },
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

    it('should append a metadata.namespace field for namespaced resources without a resolved namespace', async () => {
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

    it('should not append a metadata.namespace field when a namespace is already resolved', async () => {
      resourceService.getNamespace.mockReturnValue('default');
      fixture.componentRef.setInput('context', namespacedContext);
      fixture.detectChanges();
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

    it('should pass a dynamic values read error to the error handler', async () => {
      const error = new Error('list failed');
      resourceService.list.mockReturnValue(throwError(() => error));

      await expect(
        (component as any).resolveDynamicValues({
          dynamicValuesDefinition: {
            operation: 'v1.Namespaces.items',
            gqlQuery:
              'query { v1 { Namespaces { items { metadata { name } } } } }',
            value: 'metadata.name',
          },
        }),
      ).resolves.toBeUndefined();

      expect(errorHandlerService.handleError).toHaveBeenCalledWith(error);
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
        { variables: {} },
      );
    });

    describe('dynamic values that require $namespace', () => {
      const secretField: PlatformMeshFieldDefinition = {
        property: 'spec.clusterRef.kubeconfigSecretName',
        label: 'BYOC Cluster',
        dynamicValuesDefinition: {
          operation: 'v1.Secrets.items',
          gqlQuery:
            'query ($namespace: String!) { v1 { Secrets(namespace: $namespace) { items { metadata { name } } } } }',
          value: 'metadata.name',
          key: 'metadata.name',
        },
      };

      const secretCalls = () =>
        resourceService.list.mock.calls.filter(
          (call) => call[0] === 'v1.Secrets.items',
        );

      beforeEach(() => {
        resourceService.list.mockReturnValue(
          of([{ metadata: { name: 'kubeconfig-a' } }]),
        );
      });

      it('does not send the query when no namespace resolves', async () => {
        resourceService.getNamespace.mockReturnValue(undefined);
        fixture.componentRef.setInput('fields', [secretField]);
        fixture.componentRef.setInput('context', namespacedContext);
        fixture.detectChanges();

        await component.open();

        expect(secretCalls()).toHaveLength(0);
        expect(component.dialogOpen()).toBe(true);
        const field = component
          .formFields()
          .find((f) => f.name === 'spec.clusterRef.kubeconfigSecretName');
        expect(field?.values).toBeUndefined();
        expect(
          component.formFields().some((f) => f.name === 'metadata.namespace'),
        ).toBe(true);
      });

      it('does not send the query for a cluster-scoped context', async () => {
        fixture.componentRef.setInput('fields', [secretField]);
        fixture.detectChanges();

        await component.open();

        expect(secretCalls()).toHaveLength(0);
      });

      it('sends the query when the context resolves a namespace', async () => {
        resourceService.getNamespace.mockReturnValue('default');
        fixture.componentRef.setInput('fields', [secretField]);
        fixture.componentRef.setInput('context', namespacedContext);
        fixture.detectChanges();

        await component.open();

        expect(secretCalls()).toHaveLength(1);
        const field = component
          .formFields()
          .find((f) => f.name === 'spec.clusterRef.kubeconfigSecretName');
        expect(field?.values).toEqual(['kubeconfig-a']);
      });

      it('sends the query when gqlQueryVariables supply the namespace', async () => {
        resourceService.getNamespace.mockReturnValue(undefined);
        fixture.componentRef.setInput('fields', [
          {
            ...secretField,
            dynamicValuesDefinition: {
              ...secretField.dynamicValuesDefinition!,
              gqlQueryVariables: { namespace: 'shared' },
            },
          },
        ]);
        fixture.componentRef.setInput('context', namespacedContext);
        fixture.detectChanges();

        await component.open();

        expect(secretCalls()).toHaveLength(1);
        expect(secretCalls()[0][3]).toEqual({
          variables: { namespace: { type: 'String', value: 'shared' } },
        });
      });
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
      await component.open();

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

    it('should store static values from field.values in formField.values', async () => {
      const staticFields: PlatformMeshFieldDefinition[] = [
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

  describe('computed signals', () => {
    it('dialogTitle should be "Create" in create mode', async () => {
      await component.open();
      expect(component.dialogTitle()).toBe('Create');
    });

    it('dialogTitle should be "Edit" in edit mode', async () => {
      await component.open({ metadata: { name: 'r1' } } as any);
      expect(component.dialogTitle()).toBe('Edit');
    });

    it('confirmLabel should be "Create" in create mode', async () => {
      await component.open();
      expect(component.confirmLabel()).toBe('Create');
    });

    it('confirmLabel should be "Save" in edit mode', async () => {
      await component.open({ metadata: { name: 'r1' } } as any);
      expect(component.confirmLabel()).toBe('Save');
    });

    it('dataTestidPrefix should be "create-resource-dialog" in create mode', async () => {
      await component.open();
      expect(component.dataTestidPrefix()).toBe('create-resource-dialog');
    });

    it('dataTestidPrefix should be "edit-resource-dialog" in edit mode', async () => {
      await component.open({ metadata: { name: 'r1' } } as any);
      expect(component.dataTestidPrefix()).toBe('edit-resource-dialog');
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
        metadata: { name: 'existing' },
        spec: { description: 'updated' },
      });
      expect(spy).toHaveBeenCalledWith({
        metadata: { name: 'existing' },
        spec: { description: 'updated' },
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

    it('should omit empty write-only fields on edit submit', async () => {
      const fieldsWithSecret: PlatformMeshFieldDefinition[] = [
        { property: 'metadata.name', required: true, label: 'Name' },
        {
          property: 'spec.oidc.clientSecret',
          label: 'Client secret',
          writeOnly: true,
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
          writeOnly: true,
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

  describe('onFieldChange / K8S name validation', () => {
    beforeEach(async () => {
      await component.open();
    });

    it('should set a fieldError when metadata.name is empty', () => {
      component.onFieldChange({ fieldProperty: 'metadata.name', value: '' });
      expect(component.fieldErrors()['metadata.name']).toBe(
        'This field is required',
      );
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

    it('should clear errors for a valid k8s name', () => {
      component.onFieldChange({
        fieldProperty: 'metadata.name',
        value: 'valid-name',
      });
      expect(component.fieldErrors()['metadata.name']).toBeNull();
    });

    it('should accept a single-character lowercase name as valid', () => {
      component.onFieldChange({ fieldProperty: 'metadata.name', value: 'a' });
      expect(component.fieldErrors()['metadata.name']).toBeNull();
    });

    it('should reject a name starting with a digit', () => {
      component.onFieldChange({
        fieldProperty: 'metadata.name',
        value: '1bad',
      });
      expect(component.fieldErrors()['metadata.name']).toBeTruthy();
    });

    it('should reject a name ending with a hyphen', () => {
      component.onFieldChange({
        fieldProperty: 'metadata.name',
        value: 'bad-',
      });
      expect(component.fieldErrors()['metadata.name']).toBeTruthy();
    });

    it('should not set an error for an optional non-name field with an empty value', () => {
      component.onFieldChange({
        fieldProperty: 'spec.description',
        value: '',
      });
      expect(component.fieldErrors()['spec.description']).toBeNull();
    });

    it('should set a required error for a required non-name field with an empty value', async () => {
      fixture.componentRef.setInput('fields', [
        { property: 'spec.type', required: true, label: 'Type' },
      ]);
      await component.open();
      component.onFieldChange({ fieldProperty: 'spec.type', value: '' });
      expect(component.fieldErrors()['spec.type']).toBe(
        'This field is required',
      );
    });

    it('should not require empty write-only fields in edit mode', async () => {
      const fieldsWithSecret: PlatformMeshFieldDefinition[] = [
        { property: 'metadata.name', required: true, label: 'Name' },
        {
          property: 'spec.oidc.clientSecret',
          label: 'Client secret',
          inputType: 'Password',
          required: true,
          writeOnly: true,
        },
      ];
      fixture.componentRef.setInput('fields', fieldsWithSecret);
      await component.open({ metadata: { name: 'existing' } } as any);

      component.onFieldChange({
        fieldProperty: 'spec.oidc.clientSecret',
        value: '',
      });

      expect(component.fieldErrors()['spec.oidc.clientSecret']).toBeNull();
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

  // ---------------------------------------------------------------------------
  // field-to-field dependencies
  // ---------------------------------------------------------------------------

  describe('field-to-field dependencies', () => {
    const nsQuery =
      'query ($namespace: String!) { v1 { Secrets(namespace: $namespace) { items { metadata { name } } } } }';

    const namespaceField: PlatformMeshFieldDefinition = {
      property: 'metadata.namespace',
      required: true,
      label: 'Namespace',
      dynamicValuesDefinition: {
        operation: 'v1.Namespaces.items',
        gqlQuery: 'query { v1 { Namespaces { items { metadata { name } } } } }',
        value: 'metadata.name',
        key: 'metadata.name',
      },
    };

    const secretField: PlatformMeshFieldDefinition = {
      property: 'spec.secretName',
      label: 'Secret',
      dynamicValuesDefinition: {
        operation: 'v1.Secrets.items',
        gqlQuery: nsQuery,
        value: 'metadata.name',
        key: 'metadata.name',
        gqlQueryVariables: { namespace: '{form.metadata.namespace}' },
        dependsOn: ['metadata.namespace'],
      },
    };

    const regionField: PlatformMeshFieldDefinition = {
      property: 'spec.region',
      required: true,
      label: 'Region',
      dynamicValuesDefinition: {
        operation: 'regions.items',
        gqlQuery: 'query { regions { items { name } } }',
        value: 'name',
        key: 'name',
      },
    };

    const zoneField: PlatformMeshFieldDefinition = {
      property: 'spec.zone',
      label: 'Zone',
      dynamicValuesDefinition: {
        operation: 'zones.items',
        gqlQuery: 'query ($region: String!) { zones(region: $region) { items { name } } }',
        value: 'name',
        key: 'name',
        gqlQueryVariables: { region: '{form.spec.region}' },
        dependsOn: ['spec.region'],
      },
    };

    beforeEach(() => {
      resourceService.list.mockReturnValue(of([]));
    });

    describe('open (create mode) — resolveDynamicValues with {form.X}', () => {
      it('skips the secret query on create when no parent value is available', async () => {
        fixture.componentRef.setInput('fields', [namespaceField, secretField]);
        fixture.componentRef.setInput('context', namespacedContext);
        resourceService.getNamespace.mockReturnValue(undefined);
        fixture.detectChanges();

        await component.open();

        const secretCalls = resourceService.list.mock.calls.filter(
          (c) => c[0] === 'v1.Secrets.items',
        );
        expect(secretCalls).toHaveLength(0);
        const sf = component.formFields().find((f) => f.name === 'spec.secretName');
        expect(sf?.values).toBeUndefined();
      });

      it('resolves a dependent from the parent initial value in edit mode', async () => {
        resourceService.getNamespace.mockReturnValue(undefined);
        resourceService.list.mockImplementation((op) => {
          if (op === 'v1.Namespaces.items')
            return of([{ metadata: { name: 'my-ns' } }]);
          if (op === 'v1.Secrets.items')
            return of([{ metadata: { name: 'my-secret' } }]);
          return of([]);
        });

        fixture.componentRef.setInput('fields', [namespaceField, secretField]);
        fixture.componentRef.setInput('context', namespacedContext);
        fixture.detectChanges();

        // Open in edit mode with a resource that already has a namespace value
        await component.open({
          metadata: { name: 'res1', namespace: 'my-ns' },
        } as any);

        const secretCalls = resourceService.list.mock.calls.filter(
          (c) => c[0] === 'v1.Secrets.items',
        );
        expect(secretCalls).toHaveLength(1);
        expect(secretCalls[0][3]).toEqual({
          variables: { namespace: { type: 'String', value: 'my-ns' } },
        });

        const sf = component.formFields().find((f) => f.name === 'spec.secretName');
        expect(sf?.values).toEqual(['my-secret']);
      });
    });

    describe('open() — trigger wiring', () => {
      it('sets validation:onChange on a parent field that has dependents', async () => {
        resourceService.getNamespace.mockReturnValue('default');
        fixture.componentRef.setInput('fields', [namespaceField, secretField]);
        fixture.componentRef.setInput('context', namespacedContext);
        fixture.detectChanges();

        await component.open();

        const nff = component.formFields().find((f) => f.name === 'metadata.namespace');
        expect(nff?.validation).toBe('onChange');
      });

      it('does not force onChange on a field that is not a parent', async () => {
        resourceService.getNamespace.mockReturnValue('default');
        fixture.componentRef.setInput('fields', [namespaceField, secretField]);
        fixture.componentRef.setInput('context', namespacedContext);
        fixture.detectChanges();

        await component.open();

        // secretField is a dependent, not a parent — no forced onChange beyond defaults
        const sf = component.formFields().find((f) => f.name === 'spec.secretName');
        // its validation is whatever buildFormField set (it's not required, so undefined)
        expect(sf?.validation).toBeUndefined();
      });
    });

    describe('onFieldChange — parent triggers dependent update', () => {
      beforeEach(async () => {
        resourceService.getNamespace.mockReturnValue(undefined);
        fixture.componentRef.setInput('fields', [namespaceField, secretField]);
        fixture.componentRef.setInput('context', namespacedContext);
        fixture.detectChanges();
        await component.open();
        resourceService.list.mockReset();
      });

      // The host's `resolveDependents` policy is called by the ngx dialog
      // through `dialogConfig.onFieldChange`. The dialog owns the race-guard
      // and applies the returned fields/initialValues; these tests invoke the
      // policy directly and inspect its return shape.
      const invokeHook = (
        event: { fieldProperty: string; value: unknown },
      ): Promise<
        | {
            fields: FormFieldDefinition[];
            initialValues?: Record<string, unknown>;
          }
        | undefined
      > => component.dialogConfig().onFieldChange!(event, component.formFields());

      it('replaces dependent values when the parent changes', async () => {
        resourceService.list.mockReturnValue(
          of([{ metadata: { name: 'secret-a' } }]),
        );

        const result = await invokeHook({
          fieldProperty: 'metadata.namespace',
          value: 'my-ns',
        });

        const sf = result?.fields.find((f) => f.name === 'spec.secretName');
        expect(sf?.values).toEqual(['secret-a']);
      });

      it('calls list with the resolved {form.X} variable', async () => {
        resourceService.list.mockReturnValue(of([]));

        await invokeHook({
          fieldProperty: 'metadata.namespace',
          value: 'team-a',
        });

        const secretCalls = resourceService.list.mock.calls.filter(
          (c) => c[0] === 'v1.Secrets.items',
        );
        expect(secretCalls).toHaveLength(1);
        expect(secretCalls[0][3]).toEqual({
          variables: { namespace: { type: 'String', value: 'team-a' } },
        });
      });

      it('clears the dependent value via a partial initialValues push', async () => {
        resourceService.list.mockReturnValue(
          of([{ metadata: { name: 'secret-b' } }]),
        );

        const result = await invokeHook({
          fieldProperty: 'metadata.namespace',
          value: 'other-ns',
        });

        // The partial push should only contain the dependent key — the dialog
        // then applies this as initialValues override, which the inner form
        // treats as patchValue.
        expect(result?.initialValues).toEqual({ 'spec.secretName': '' });
      });

      it('clears the dependent field error', async () => {
        // Seed a pre-existing error on the dependent
        component['fieldErrors'].set({ 'spec.secretName': 'This field is required' });

        resourceService.list.mockReturnValue(of([]));

        await invokeHook({
          fieldProperty: 'metadata.namespace',
          value: 'ns1',
        });

        expect(component.fieldErrors()['spec.secretName']).toBeNull();
      });

      it('returns undefined (loop-safety) when the changed field has no dependents', async () => {
        const result = await invokeHook({
          fieldProperty: 'spec.description',
          value: 'hello',
        });

        expect(result).toBeUndefined();
        expect(resourceService.list).not.toHaveBeenCalled();
      });

      it('returns [] values when parent value is empty (no list call for secrets)', async () => {
        const result = await invokeHook({
          fieldProperty: 'metadata.namespace',
          value: '',
        });

        // The {form.metadata.namespace} placeholder stays literal → namespace-skip fires
        expect(resourceService.list).not.toHaveBeenCalledWith(
          'v1.Secrets.items',
          expect.anything(),
          expect.anything(),
          expect.anything(),
        );
        const sf = result?.fields.find((f) => f.name === 'spec.secretName');
        expect(sf?.values).toEqual([]);
      });
    });

    describe('onFieldChange — multiple dependents on one parent', () => {
      it('updates all dependents in one call', async () => {
        const secondSecret: PlatformMeshFieldDefinition = {
          property: 'spec.anotherSecret',
          label: 'Another Secret',
          dynamicValuesDefinition: {
            operation: 'v1.Secrets.items',
            gqlQuery: nsQuery,
            value: 'metadata.name',
            key: 'metadata.name',
            gqlQueryVariables: { namespace: '{form.metadata.namespace}' },
            dependsOn: ['metadata.namespace'],
          },
        };

        resourceService.getNamespace.mockReturnValue(undefined);
        fixture.componentRef.setInput('fields', [
          namespaceField,
          secretField,
          secondSecret,
        ]);
        fixture.componentRef.setInput('context', namespacedContext);
        fixture.detectChanges();
        await component.open();

        resourceService.list.mockReset();
        resourceService.list.mockReturnValue(
          of([{ metadata: { name: 'sec-x' } }]),
        );

        const result = await component.dialogConfig().onFieldChange!(
          { fieldProperty: 'metadata.namespace', value: 'shared' },
          component.formFields(),
        );

        const sf1 = result?.fields.find((f) => f.name === 'spec.secretName');
        const sf2 = result?.fields.find((f) => f.name === 'spec.anotherSecret');
        expect(sf1?.values).toEqual(['sec-x']);
        expect(sf2?.values).toEqual(['sec-x']);
        // partial initialValues must clear both
        expect(result?.initialValues).toEqual({
          'spec.secretName': '',
          'spec.anotherSecret': '',
        });
      });
    });

    describe('backward compatibility', () => {
      it('fields without dependsOn behave as before', async () => {
        resourceService.getNamespace.mockReturnValue('default');
        fixture.componentRef.setInput('fields', [regionField]);
        fixture.componentRef.setInput('context', namespacedContext);
        fixture.detectChanges();

        await component.open();

        // region has no dependents; changing it should not push signals
        const listCallsBefore = resourceService.list.mock.calls.length;

        await component.onFieldChange({
          fieldProperty: 'spec.region',
          value: 'eu-west',
        });

        expect(resourceService.list.mock.calls).toHaveLength(listCallsBefore);
      });

      it('resolveDynamicValues works when called without formValues (existing call sites)', async () => {
        resourceService.getNamespace.mockReturnValue('default');
        resourceService.list.mockReturnValue(
          of([{ name: 'region-a' }]),
        );

        const result = await (component as any).resolveDynamicValues(regionField);
        expect(result).toEqual(['region-a']);
      });
    });

    describe('unresolved {form.X} placeholder acts as no-namespace (skip guard)', () => {
      it('does not call list when the {form.X} namespace placeholder is unresolved', async () => {
        resourceService.getNamespace.mockReturnValue(undefined);
        fixture.componentRef.setInput('fields', [namespaceField, secretField]);
        fixture.componentRef.setInput('context', namespacedContext);
        fixture.detectChanges();

        // call resolveDynamicValues directly with an empty formValues
        const result = await (component as any).resolveDynamicValues(
          secretField,
          {},
        );

        expect(result).toBeUndefined();
        expect(
          resourceService.list.mock.calls.some((c) => c[0] === 'v1.Secrets.items'),
        ).toBe(false);
      });
    });
  });
});
