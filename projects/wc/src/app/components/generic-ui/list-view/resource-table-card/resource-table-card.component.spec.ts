import { InstancePermissionsStore } from '../../store/instance-permissions-store.service';
import { ResourceTableCard } from './resource-table-card.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ResourceDefinition,
  ResourceSubscriptionResult,
} from '@platform-mesh/portal-ui-lib/models';
import {
  ErrorHandlerService,
  InstancePermissionsService,
  ResourceService,
} from '@platform-mesh/portal-ui-lib/services';
import * as utils from '@platform-mesh/portal-ui-lib/utils';
import { Subject, of, throwError } from 'rxjs';
import { MockedObject } from 'vitest';
import { mock } from 'vitest-mock-extended';

describe('ResourceTableCard', () => {
  let component: ResourceTableCard;
  let fixture: ComponentFixture<ResourceTableCard>;
  let mockResourceService: MockedObject<ResourceService>;
  let mockErrorHandlerService: MockedObject<ErrorHandlerService>;
  let mockInstancePermissionsService: MockedObject<InstancePermissionsService>;
  let mockInstancePermissionsLocalStore: MockedObject<InstancePermissionsStore>;

  const makeContext = (overrides: object = {}) =>
    (() => ({
      resourceDefinition: {
        entityCollection: 'clusters',
        entity: 'Cluster',
        apiGroup: 'core_k8s_io',
        version: 'v1alpha1',
        ui: {
          listView: { fields: [] },
          detailView: { fields: [] },
        },
        ...overrides,
      },
    })) as any;

  const makeLuigiClient = (navSpy = vi.fn()) =>
    (() => ({
      linkManager: () => ({ navigate: navSpy }),
      uxManager: () => ({ showAlert: vi.fn() }),
      getNodeParams: vi.fn(),
    })) as any;

  beforeEach(() => {
    mockResourceService = mock();
    mockResourceService.list.mockReturnValue(
      of({
        items: [
          {
            metadata: { name: 'test' },
            status: { conditions: [{ type: 'Ready', status: 'True' }] },
          },
        ],
        resourceVersion: '1234567890',
      }),
    );
    mockResourceService.resourceChangeSubscription.mockReturnValue(
      of(undefined),
    );
    mockErrorHandlerService = mock();
    mockInstancePermissionsService = mock();
    // Default: checkInstances returns empty array so InstancePermissionsStore doesn't blow up
    mockInstancePermissionsService.checkInstances.mockReturnValue(of([]));
    mockInstancePermissionsLocalStore = mock();
    // Default: all instances are "missing" so checkInstances is called
    mockInstancePermissionsLocalStore.missing.mockReturnValue([]);

    TestBed.configureTestingModule({
      providers: [
        { provide: ResourceService, useValue: mockResourceService },
        { provide: ErrorHandlerService, useValue: mockErrorHandlerService },
        {
          provide: InstancePermissionsService,
          useValue: mockInstancePermissionsService,
        },
        {
          provide: InstancePermissionsStore,
          useValue: mockInstancePermissionsLocalStore,
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).overrideComponent(ResourceTableCard, {
      set: { template: '', imports: [], schemas: [CUSTOM_ELEMENTS_SCHEMA] },
    });

    fixture = TestBed.createComponent(ResourceTableCard);
    component = fixture.componentInstance;
    component.context = makeContext();
    component.LuigiClient = makeLuigiClient();

    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch resources on init', () => {
    expect(mockResourceService.list).toHaveBeenCalled();
    expect(component.resources().length).toBeGreaterThan(0);
  });

  it('should include ready fields when listing resources', () => {
    mockResourceService.list = vi.fn().mockReturnValue(of([]));

    const readyCondition = {
      jsonPathExpression: '$.status.ready',
      property: 'status.ready',
    };

    const newFixture = TestBed.createComponent(ResourceTableCard);
    const newComponent = newFixture.componentInstance;

    newComponent.context = (() => ({
      resourceDefinition: {
        entityCollection: 'clusters',
        entity: 'Cluster',
        apiGroup: 'core_k8s_io',
        version: 'v1alpha1',
        readyCondition,
        ui: { listView: { fields: [{ property: 'metadata.name' }] } },
      } as ResourceDefinition,
    })) as any;
    newComponent.LuigiClient = makeLuigiClient();

    const expectedContext = newComponent.context();
    newFixture.detectChanges();

    const expectedFields = utils.generateGraphQLFields([
      { property: 'status.ready' },
      { property: 'metadata.name' },
      { property: 'metadata.deletionTimestamp' },
    ]);

    expect(mockResourceService.list).toHaveBeenCalledWith(
      'core_k8s_io_v1alpha1_clusters',
      expectedFields,
      expectedContext,
      { pagination: { continue: undefined, limit: 5 } },
    );
  });

  it('should include metadata.namespace in query fields for namespaced resources', () => {
    mockResourceService.list = vi.fn().mockReturnValue(of([]));

    const newFixture = TestBed.createComponent(ResourceTableCard);
    const newComponent = newFixture.componentInstance;

    newComponent.context = (() => ({
      resourceDefinition: {
        entityCollection: 'clusters',
        entity: 'Cluster',
        apiGroup: 'core_k8s_io',
        version: 'v1alpha1',
        scope: 'Namespaced',
        ui: { listView: { fields: [{ property: 'metadata.name' }] } },
      } as ResourceDefinition,
    })) as any;
    newComponent.LuigiClient = makeLuigiClient();

    newFixture.detectChanges();

    const fields = mockResourceService.list.mock.calls.at(-1)?.[1];
    const fieldsAsString = JSON.stringify(fields);
    expect(fieldsAsString).toContain('metadata');
    expect(fieldsAsString).toContain('namespace');
  });

  describe('Navigation', () => {
    it('should navigate to resource for namespaced resource', () => {
      const navSpy = vi.fn();
      history.replaceState(null, '', '/?namespace=old&view=list');

      const newFixture = TestBed.createComponent(ResourceTableCard);
      const newComponent = newFixture.componentInstance;
      newComponent.context = makeContext({ scope: 'Namespaced' });
      newComponent.LuigiClient = makeLuigiClient(navSpy);
      newFixture.detectChanges();

      newComponent.navigateToResource({
        metadata: { name: 'res1', namespace: 'test-namespace' },
      } as any);

      expect(window.location.search).toContain('namespace=test-namespace');
      expect(window.location.search).toContain('view=list');
      expect(navSpy).toHaveBeenCalledWith('res1');
    });

    it('should clear namespace param for cluster-scoped resource', () => {
      const navSpy = vi.fn();
      history.replaceState(null, '', '/?namespace=old&view=list');
      component.LuigiClient = makeLuigiClient(navSpy);

      component.navigateToResource({
        metadata: { name: 'res1', namespace: 'test-namespace' },
      } as any);

      expect(window.location.search).not.toContain('namespace=');
      expect(window.location.search).toContain('view=list');
      expect(navSpy).toHaveBeenCalledWith('res1');
    });

    it('should not navigate when detailView is not defined', () => {
      const navSpy = vi.fn();
      component.context = makeContext({ ui: { listView: { fields: [] } } });
      component.LuigiClient = makeLuigiClient(navSpy);

      component.navigateToResource({ metadata: { name: 'res1' } } as any);

      expect(navSpy).not.toHaveBeenCalled();
    });

    it('should not navigate when ui is not defined', () => {
      const navSpy = vi.fn();
      component.context = (() => ({
        resourceDefinition: {
          entityCollection: 'clusters',
          entity: 'Cluster',
          apiGroup: 'core_k8s_io',
        },
      })) as any;
      component.LuigiClient = makeLuigiClient(navSpy);

      component.navigateToResource({ metadata: { name: 'res1' } } as any);

      expect(navSpy).not.toHaveBeenCalled();
    });

    it('should show alert and throw when resource name is undefined', () => {
      const showAlertSpy = vi.fn();
      component.LuigiClient = (() => ({
        linkManager: () => ({ navigate: vi.fn() }),
        uxManager: () => ({ showAlert: showAlertSpy }),
      })) as any;

      expect(() =>
        component.navigateToResource({ metadata: {} } as any),
      ).toThrow('Resource name is not defined');
      expect(showAlertSpy).toHaveBeenCalledWith({
        text: 'Resource name is not defined',
        type: 'error',
      });
    });
  });

  describe('Delete resource', () => {
    it('should delegate non-delete button actions to executeButtonAction', () => {
      // executeAction now always calls executeButtonAction - delete is handled
      // by DeclarativeTableCard via deleteResourceConfirmationConfig, not here
      const resource = { metadata: { name: 'test' } } as any;
      const event = {
        stopPropagation: vi.fn(),
      } as unknown as MouseEvent;

      // A non-delete action (e.g. navigate) should not throw
      expect(() =>
        component.executeAction({
          event,
          resource,
          field: {
            property: 'metadata.name',
            uiSettings: {
              displayAs: 'button',
              buttonSettings: { action: 'navigate' },
            },
          },
        }),
      ).not.toThrow();
    });

    it('should delete the resource and close the dialog via tableCard', () => {
      const resource = { metadata: { name: 'test' } } as any;
      const closeDeleteDialog = vi.fn();
      mockResourceService.delete.mockReturnValue(of(resource));
      vi.spyOn(component as any, 'tableCard', 'get').mockReturnValue(
        () => ({ closeDeleteDialog }),
      );

      component.delete(resource);

      expect(mockResourceService.delete).toHaveBeenCalledWith(
        resource,
        component.resourceDefinition(),
        component.context(),
      );
      expect(closeDeleteDialog).toHaveBeenCalled();
    });

    it('should handle delete errors', () => {
      const resource = { metadata: { name: 'test' } } as any;
      const error = new Error('delete failed');
      mockResourceService.delete.mockReturnValue(throwError(() => error));

      component.delete(resource);

      expect(mockErrorHandlerService.handleError).toHaveBeenCalledWith(error);
    });

    it('should build the delete confirmation config from the resource via config()', () => {
      const deleteConfig = component.config().deleteResourceConfirmationConfig!({
        metadata: { name: 'My-Cluster' },
      } as any);

      // name is lower-cased and used as the confirmation text
      expect(deleteConfig.title).toBe('Delete my-cluster');
      expect(deleteConfig.confirmationText).toBe('my-cluster');
      expect(deleteConfig.message).toContain('<b>my-cluster</b>');
      expect(deleteConfig.message).toContain('Cluster');
      expect(deleteConfig.confirmLabel).toBe('Delete');
      expect(deleteConfig.cancelLabel).toBe('Cancel');
      expect(deleteConfig.confirmationPlaceholder).toBe('Type name');
    });

    it('should fall back to an empty confirmation name when metadata.name is missing', () => {
      const deleteConfig = component.config().deleteResourceConfirmationConfig!({
        metadata: {},
      } as any);

      expect(deleteConfig.title).toBe('Delete ');
      expect(deleteConfig.confirmationText).toBe('');
    });
  });

  describe('Pagination', () => {
    it('should update pagination limit when onLimitChange is called', () => {
      component.onLimitChange(10);
      expect(component.paginationLimit()).toBe(10);
    });

    it('should reset pagination when limit changes', () => {
      component.resources.set([
        { metadata: { name: 'res1' } },
        { metadata: { name: 'res2' } },
        { metadata: { name: 'res3' } },
        { metadata: { name: 'res4' } },
        { metadata: { name: 'res5' } },
      ] as any);
      component.remainingItemCount.set(10);

      component.onLimitChange(3);

      expect(component.paginationLimit()).toBe(3);
      expect(component.resources().length).toBe(3);
      expect(component.hasMore()).toBe(true);
    });

    it('should load more resources when loadMore is called and hasMore is true', () => {
      const listSpy = vi.spyOn(component, 'list');
      component.hasMore.set(true);
      component.loadMore();
      expect(listSpy).toHaveBeenCalled();
    });

    it('should not load more resources when hasMore is false', () => {
      const listSpy = vi.spyOn(component, 'list');
      component.hasMore.set(false);
      component.loadMore();
      expect(listSpy).not.toHaveBeenCalled();
    });

    it('should calculate totalItemsCount correctly', () => {
      component.resources.set([
        { metadata: { name: 'res1' } },
        { metadata: { name: 'res2' } },
      ] as any);
      component.remainingItemCount.set(8);
      expect(component.totalItemsCount()).toBe(10);
    });
  });

  describe('Create resource', () => {
    it('should detect hasUiCreateViewFields when createView fields are defined', () => {
      const newFixture = TestBed.createComponent(ResourceTableCard);
      const newComponent = newFixture.componentInstance;
      newComponent.context = (() => ({
        resourceDefinition: {
          entityCollection: 'clusters',
          entity: 'Cluster',
          apiGroup: 'core_k8s_io',
          version: 'v1alpha1',
          ui: {
            createView: { fields: [{ property: 'metadata.name' }] },
            listView: { fields: [] },
          },
        },
      })) as any;
      newComponent.LuigiClient = makeLuigiClient();
      newFixture.detectChanges();
      expect(newComponent.hasUiCreateViewFields()).toBe(true);
    });

    it('should return false for hasUiCreateViewFields when createView is undefined', () => {
      expect(component.hasUiCreateViewFields()).toBe(false);
    });

    it('should include createResourceFormConfig with a lazy fields thunk when createView fields exist', async () => {
      const newFixture = TestBed.createComponent(ResourceTableCard);
      const newComponent = newFixture.componentInstance;
      newComponent.context = (() => ({
        resourceDefinition: {
          entityCollection: 'clusters',
          entity: 'Cluster',
          apiGroup: 'core_k8s_io',
          version: 'v1alpha1',
          ui: {
            createView: {
              fields: [
                { property: 'metadata.name', label: 'Name', required: true },
              ],
            },
            listView: { fields: [] },
          },
        },
      })) as any;
      newComponent.LuigiClient = makeLuigiClient();
      newFixture.detectChanges();

      const formConfig = newComponent.config().createResourceFormConfig;
      expect(formConfig).toBeDefined();
      // `fields` is a thunk resolved lazily on dialog open (fetches dynamic
      // options on demand rather than prefetching them on render).
      expect(typeof formConfig!.fields).toBe('function');

      const resolved = await (formConfig!.fields as () => Promise<any[]>)();
      expect(resolved[0].name).toBe('metadata.name');
      expect(resolved[0].label).toBe('Name');
      expect(resolved[0].required).toBe(true);
    });

    it('should not include createResourceFormConfig when no createView fields', () => {
      expect(component.config().createResourceFormConfig).toBeUndefined();
    });

    it('should call resourceService.create on onCreateSubmit', () => {
      mockResourceService.create = vi
        .fn()
        .mockReturnValue(of({ metadata: { name: 'new' } }));
      const mockCloseDialog = vi.fn();
      vi.spyOn(component as any, 'tableCard', 'get').mockReturnValue(() => ({
        closeCreateDialog: mockCloseDialog,
      }));
      component.onCreateSubmit({ metadata: { name: 'new' } });
      expect(mockResourceService.create).toHaveBeenCalled();
    });

    it('should reset createFieldErrors after successful create', () => {
      mockResourceService.create = vi
        .fn()
        .mockReturnValue(of({ metadata: { name: 'new' } }));
      vi.spyOn(component as any, 'tableCard', 'get').mockReturnValue(() => ({
        closeCreateDialog: vi.fn(),
      }));
      component.onCreateFieldChange({
        fieldProperty: 'metadata.name',
        value: 'bad value!!',
      });
      component.onCreateSubmit({ metadata: { name: 'new' } });
      expect(component.createFormState().fieldErrors).toEqual({});
    });

    it('should set k8s name error for invalid metadata.name', () => {
      component.onCreateFieldChange({
        fieldProperty: 'metadata.name',
        value: 'Invalid Name!!',
      });
      expect(
        component.createFormState().fieldErrors?.['metadata.name'],
      ).toBeTruthy();
    });

    it('should clear k8s name error for valid metadata.name', () => {
      component.onCreateFieldChange({
        fieldProperty: 'metadata.name',
        value: 'Invalid Name!!',
      });
      component.onCreateFieldChange({
        fieldProperty: 'metadata.name',
        value: 'valid-name',
      });
      expect(
        component.createFormState().fieldErrors?.['metadata.name'],
      ).toBeFalsy();
    });

    const makeNamespacedCreateContext = () =>
      (() => ({
        resourceDefinition: {
          entityCollection: 'clusters',
          entity: 'Cluster',
          apiGroup: 'core_k8s_io',
          version: 'v1alpha1',
          scope: 'Namespaced',
          ui: {
            createView: { fields: [{ property: 'metadata.name' }] },
            listView: { fields: [] },
          },
        },
      })) as any;

    it('should not add a metadata.namespace field when a namespace is already resolved', () => {
      mockResourceService.getNamespace.mockReturnValue('default');
      const newFixture = TestBed.createComponent(ResourceTableCard);
      const newComponent = newFixture.componentInstance;
      newComponent.context = makeNamespacedCreateContext();
      newComponent.LuigiClient = makeLuigiClient();
      newFixture.detectChanges();
      const properties = newComponent.createFormFields().map((f) => f.property);
      expect(properties).not.toContain('metadata.namespace');
    });

    it('should add a metadata.namespace field when no namespace is resolved', () => {
      mockResourceService.getNamespace.mockReturnValue(undefined);
      const newFixture = TestBed.createComponent(ResourceTableCard);
      const newComponent = newFixture.componentInstance;
      newComponent.context = makeNamespacedCreateContext();
      newComponent.LuigiClient = makeLuigiClient();
      newFixture.detectChanges();
      const properties = newComponent.createFormFields().map((f) => f.property);
      expect(properties).toContain('metadata.namespace');
    });

    it('should set required error for empty required field', async () => {
      const newFixture = TestBed.createComponent(ResourceTableCard);
      const newComponent = newFixture.componentInstance;
      newComponent.context = (() => ({
        resourceDefinition: {
          entityCollection: 'clusters',
          entity: 'Cluster',
          apiGroup: 'core_k8s_io',
          version: 'v1alpha1',
          ui: {
            createView: { fields: [{ property: 'spec.type', required: true }] },
            listView: { fields: [] },
          },
        },
      })) as any;
      newComponent.LuigiClient = makeLuigiClient();
      newFixture.detectChanges();
      await newComponent.onCreateFieldChange({
        fieldProperty: 'spec.type',
        value: '',
      });
      expect(newComponent.createFormState().fieldErrors?.['spec.type']).toBe(
        'This field is required',
      );
    });
  });

  describe('List subscription', () => {
    beforeEach(() => {
      mockResourceService.list.mockReturnValue(
        of({ items: [], resourceVersion: '1' }),
      );
    });

    it('should handle ADDED operation in subscription', () => {
      const subscriptionSubject = new Subject<
        ResourceSubscriptionResult | undefined
      >();
      mockResourceService.resourceChangeSubscription.mockReturnValue(
        subscriptionSubject,
      );
      mockResourceService.list.mockReturnValue(
        of({
          items: [{ metadata: { name: 'existing' } }],
          resourceVersion: '1',
        }),
      );

      const newFixture = TestBed.createComponent(ResourceTableCard);
      const newComponent = newFixture.componentInstance;
      newComponent.context = makeContext();
      newComponent.LuigiClient = makeLuigiClient();
      newFixture.detectChanges();

      subscriptionSubject.next({
        type: 'ADDED',
        object: { id: '', metadata: { name: 'new-resource' } },
      });

      expect(newComponent.resources().length).toBe(2);
      expect(
        newComponent
          .resources()
          .some((r) => r.metadata.name === 'new-resource'),
      ).toBe(true);
    });

    it('should handle MODIFIED operation in subscription', () => {
      const subscriptionSubject = new Subject<
        ResourceSubscriptionResult | undefined
      >();
      mockResourceService.resourceChangeSubscription.mockReturnValue(
        subscriptionSubject,
      );
      mockResourceService.list.mockReturnValue(
        of({
          items: [{ metadata: { name: 'existing' }, spec: { type: 'v1' } }],
          resourceVersion: '1',
        }),
      );

      const newFixture = TestBed.createComponent(ResourceTableCard);
      const newComponent = newFixture.componentInstance;
      newComponent.context = makeContext();
      newComponent.LuigiClient = makeLuigiClient();
      newFixture.detectChanges();

      subscriptionSubject.next({
        type: 'MODIFIED',
        object: {
          id: '',
          metadata: { name: 'existing' },
          spec: { type: 'v2' },
        },
      });

      expect(newComponent.resources().length).toBe(1);
      expect(newComponent.resources()[0]?.spec?.type).toBe('v2');
    });

    it('should handle DELETED operation in subscription', () => {
      const subscriptionSubject = new Subject<
        ResourceSubscriptionResult | undefined
      >();
      mockResourceService.resourceChangeSubscription.mockReturnValue(
        subscriptionSubject,
      );
      mockResourceService.list.mockReturnValue(
        of({
          items: [
            { metadata: { name: 'to-delete' } },
            { metadata: { name: 'to-keep' } },
          ],
          resourceVersion: '1',
        }),
      );

      const newFixture = TestBed.createComponent(ResourceTableCard);
      const newComponent = newFixture.componentInstance;
      newComponent.context = makeContext();
      newComponent.LuigiClient = makeLuigiClient();
      newFixture.detectChanges();

      subscriptionSubject.next({
        type: 'DELETED',
        object: { id: '', metadata: { name: 'to-delete' } },
      });

      expect(newComponent.resources().length).toBe(1);
      expect(newComponent.resources()[0].metadata.name).toBe('to-keep');
    });

    it('should handle null/undefined subscription results', () => {
      const subscriptionSubject = new Subject<
        ResourceSubscriptionResult | undefined
      >();
      mockResourceService.resourceChangeSubscription.mockReturnValue(
        subscriptionSubject,
      );
      const initialResources = [{ metadata: { name: 'existing' } }] as any;
      mockResourceService.list.mockReturnValue(
        of({ items: initialResources, resourceVersion: '1' }),
      );

      const newFixture = TestBed.createComponent(ResourceTableCard);
      const newComponent = newFixture.componentInstance;
      newComponent.context = makeContext();
      newComponent.LuigiClient = makeLuigiClient();
      newFixture.detectChanges();

      subscriptionSubject.next(undefined);

      expect(newComponent.resources()).toEqual(initialResources);
    });

    it('should unsubscribe from subscription on cleanup', () => {
      const subscription = { unsubscribe: vi.fn() } as any;
      const subscriptionSubject: MockedObject<
        Subject<ResourceSubscriptionResult | undefined>
      > = mock();
      subscriptionSubject.subscribe.mockReturnValue(subscription);
      mockResourceService.resourceChangeSubscription.mockReturnValue(
        subscriptionSubject,
      );

      const newFixture = TestBed.createComponent(ResourceTableCard);
      const newComponent = newFixture.componentInstance;
      newComponent.context = makeContext();
      newComponent.LuigiClient = makeLuigiClient();
      newFixture.detectChanges();

      newComponent.resourceVersion.set('new-version');
      newFixture.detectChanges();

      expect(subscription.unsubscribe).toHaveBeenCalled();
    });

    describe('List method', () => {
      it('should not call list twice if already loading', () => {
        const listSpy = vi
          .fn()
          .mockReturnValueOnce(of({ items: [], resourceVersion: '123' }));
        mockResourceService.list = listSpy;
        component.loading.set(true);
        component.list();
        expect(listSpy).not.toHaveBeenCalled();
      });

      it('should set hasMore to false when continue token is not present', () => {
        mockResourceService.list.mockReturnValue(
          of({
            items: [{ metadata: { name: 'test' } }],
            resourceVersion: '123',
            continue: undefined,
            remainingItemCount: 0,
          }),
        );

        const newFixture = TestBed.createComponent(ResourceTableCard);
        const newComponent = newFixture.componentInstance;
        newComponent.context = makeContext();
        newComponent.LuigiClient = makeLuigiClient();
        newFixture.detectChanges();

        expect(newComponent.hasMore()).toBe(false);
      });

      it('should set hasMore to true when continue token is present', () => {
        mockResourceService.list.mockReturnValue(
          of({
            items: [{ metadata: { name: 'test' } }],
            resourceVersion: '123',
            continue: 'next-token',
            remainingItemCount: 5,
          }),
        );

        const newFixture = TestBed.createComponent(ResourceTableCard);
        const newComponent = newFixture.componentInstance;
        newComponent.context = makeContext();
        newComponent.LuigiClient = makeLuigiClient();
        newFixture.detectChanges();

        expect(newComponent.hasMore()).toBe(true);
        expect((newComponent as any).currentContinueToken).toBe('next-token');
      });

      it('should merge existing resources with new ones from list', () => {
        const firstResponse = {
          items: [{ metadata: { name: 'res1' }, spec: { version: 'v1' } }],
          resourceVersion: '123',
          continue: 'token1',
        };
        const secondResponse = {
          items: [
            { metadata: { name: 'res1' }, spec: { version: 'v2' } },
            { metadata: { name: 'res2' }, spec: { version: 'v1' } },
          ],
          resourceVersion: '124',
        };

        let callCount = 0;
        mockResourceService.list.mockImplementation(() => {
          callCount++;
          return of(callCount === 1 ? firstResponse : secondResponse);
        });

        const newFixture = TestBed.createComponent(ResourceTableCard);
        const newComponent = newFixture.componentInstance;
        newComponent.context = makeContext();
        newComponent.LuigiClient = makeLuigiClient();
        newFixture.detectChanges();

        expect(newComponent.resources().length).toBe(1);

        newComponent.list();

        expect(newComponent.resources().length).toBe(2);
        const res1 = newComponent
          .resources()
          .find((r) => r.metadata.name === 'res1');
        expect(res1?.spec?.version).toBe('v2');
      });

      it('should handle error and call error handler service', () => {
        const error = new Error('Unauthorized');
        mockResourceService.list.mockReturnValue(throwError(() => error));

        const newFixture = TestBed.createComponent(ResourceTableCard);
        const newComponent = newFixture.componentInstance;
        newComponent.context = makeContext();
        newComponent.LuigiClient = makeLuigiClient();
        newFixture.detectChanges();

        expect(mockErrorHandlerService.handleError).toHaveBeenCalledWith(error);
      });

      it('should set remainingItemCount to 0 when not provided in response', () => {
        mockResourceService.list.mockReturnValue(
          of({
            items: [{ metadata: { name: 'test' } }],
            resourceVersion: '123',
          }),
        );

        const newFixture = TestBed.createComponent(ResourceTableCard);
        const newComponent = newFixture.componentInstance;
        newComponent.context = makeContext();
        newComponent.LuigiClient = makeLuigiClient();
        newFixture.detectChanges();

        expect(newComponent.remainingItemCount()).toBe(0);
      });

      it('should show alert and throw when resourceDefinition is undefined', () => {
        const newFixture = TestBed.createComponent(ResourceTableCard);
        const newComponent = newFixture.componentInstance;
        newComponent.context = (() => ({
          resourceDefinition: undefined,
        })) as any;

        const showAlertSpy = vi.fn();
        newComponent.LuigiClient = (() => ({
          linkManager: () => ({ navigate: vi.fn() }),
          uxManager: () => ({ showAlert: showAlertSpy }),
        })) as any;

        expect(() => newComponent.list()).toThrow(
          'Resource definition is not defined',
        );
        expect(showAlertSpy).toHaveBeenCalledWith({
          text: 'Resource definition is not defined',
          type: 'error',
        });
      });
    });

    describe('Computed properties', () => {
      it('should compute columns correctly', () => {
        const newFixture = TestBed.createComponent(ResourceTableCard);
        const newComponent = newFixture.componentInstance;
        newComponent.context = makeContext({
          ui: {
            listView: {
              fields: [
                { property: 'metadata.name' },
                { property: 'spec.version' },
              ],
            },
          },
        });
        newComponent.LuigiClient = makeLuigiClient();
        newFixture.detectChanges();
        expect(newComponent.columns().length).toBe(2);
      });
    });
  });

  describe('Permissions', () => {
    it('should include createResourceFormConfig when canCreate=true (no permissionsDefinition)', () => {
      const newFixture = TestBed.createComponent(ResourceTableCard);
      const newComponent = newFixture.componentInstance;
      newComponent.context = (() => ({
        resourceDefinition: {
          entityCollection: 'clusters',
          entity: 'Cluster',
          apiGroup: 'core_k8s_io',
          version: 'v1alpha1',
          ui: {
            createView: { fields: [{ property: 'metadata.name' }] },
            listView: { fields: [] },
          },
          // no permissionsDefinition — canCreate defaults to true
        },
      })) as any;
      newComponent.LuigiClient = makeLuigiClient();
      newFixture.detectChanges();
      expect(newComponent.config().createResourceFormConfig).toBeDefined();
    });

    it('should omit createResourceFormConfig when portalPermissions does not include create', () => {
      const newFixture = TestBed.createComponent(ResourceTableCard);
      const newComponent = newFixture.componentInstance;
      newComponent.context = (() => ({
        portalPermissions: { clusters: ['get'] }, // no 'create'
        resourceDefinition: {
          entityCollection: 'clusters',
          entity: 'Cluster',
          apiGroup: 'core_k8s_io',
          version: 'v1alpha1',
          permissionsDefinition: {
            group: 'core.k8s.io',
            resource: 'clusters',
            entityActions: ['get', 'delete'],
            resourceActions: ['create'],
            entityContextKey: 'entityName',
          },
          ui: {
            createView: { fields: [{ property: 'metadata.name' }] },
            listView: { fields: [] },
          },
        },
      })) as any;
      newComponent.LuigiClient = makeLuigiClient();
      newFixture.detectChanges();
      expect(newComponent.config().createResourceFormConfig).toBeUndefined();
    });

    it('should include createResourceFormConfig when portalPermissions includes create', () => {
      const newFixture = TestBed.createComponent(ResourceTableCard);
      const newComponent = newFixture.componentInstance;
      newComponent.context = (() => ({
        portalPermissions: { clusters: ['get', 'create'] },
        resourceDefinition: {
          entityCollection: 'clusters',
          entity: 'Cluster',
          apiGroup: 'core_k8s_io',
          version: 'v1alpha1',
          permissionsDefinition: {
            group: 'core.k8s.io',
            resource: 'clusters',
            entityActions: ['get', 'delete'],
            resourceActions: ['create'],
            entityContextKey: 'entityName',
          },
          ui: {
            createView: { fields: [{ property: 'metadata.name' }] },
            listView: { fields: [] },
          },
        },
      })) as any;
      newComponent.LuigiClient = makeLuigiClient();
      newFixture.detectChanges();
      expect(newComponent.config().createResourceFormConfig).toBeDefined();
    });

    it('should generate tableResources id using permissionsDefinition.resource via permissionKey', () => {
      mockResourceService.list.mockReturnValue(
        of({
          items: [{ metadata: { name: 'c1', namespace: 'ns1' } }],
          resourceVersion: '1',
        }),
      );
      const newFixture = TestBed.createComponent(ResourceTableCard);
      const newComponent = newFixture.componentInstance;
      newComponent.context = (() => ({
        resourceDefinition: {
          entityCollection: 'clusters',
          entity: 'Cluster',
          apiGroup: 'core_k8s_io',
          version: 'v1alpha1',
          scope: 'Namespaced',
          permissionsDefinition: {
            group: 'core.k8s.io',
            resource: 'clusters',
            entityActions: ['get'],
            resourceActions: [],
            entityContextKey: 'entityName',
          },
          ui: { listView: { fields: [] } },
        },
      })) as any;
      newComponent.LuigiClient = makeLuigiClient();
      newFixture.detectChanges();
      // permissionKey({ resource: 'clusters', namespace: 'ns1', name: 'c1' }) = 'clusters/ns1/c1'
      expect(newComponent.tableResources()[0].id).toBe('clusters/ns1/c1');
    });

    it('should generate tableResources id without resource prefix when no permissionsDefinition', () => {
      mockResourceService.list.mockReturnValue(
        of({
          items: [{ metadata: { name: 'c1' } }],
          resourceVersion: '1',
        }),
      );
      const newFixture = TestBed.createComponent(ResourceTableCard);
      const newComponent = newFixture.componentInstance;
      newComponent.context = (() => ({
        resourceDefinition: {
          entityCollection: 'clusters',
          entity: 'Cluster',
          apiGroup: 'core_k8s_io',
          version: 'v1alpha1',
          ui: { listView: { fields: [] } },
        },
      })) as any;
      newComponent.LuigiClient = makeLuigiClient();
      newFixture.detectChanges();
      // permissionKey({ resource: undefined, name: 'c1' }) = 'c1'
      expect(newComponent.tableResources()[0].id).toBe('c1');
    });

    it('should NOT call instancePermissionsService.checkInstances when permissionsDefinition is absent', () => {
      mockResourceService.list.mockReturnValue(
        of({ items: [{ metadata: { name: 'c1' } }], resourceVersion: '1' }),
      );
      const newFixture = TestBed.createComponent(ResourceTableCard);
      const newComponent = newFixture.componentInstance;
      newComponent.context = (() => ({
        resourceDefinition: {
          entityCollection: 'clusters',
          entity: 'Cluster',
          apiGroup: 'core_k8s_io',
          version: 'v1alpha1',
          ui: { listView: { fields: [] } },
        },
      })) as any;
      newComponent.LuigiClient = makeLuigiClient();
      newFixture.detectChanges();
      expect(mockInstancePermissionsService.checkInstances).not.toHaveBeenCalled();
    });

    it('should NOT call instancePermissionsService.checkInstances when entityActions is empty', () => {
      mockResourceService.list.mockReturnValue(
        of({ items: [{ metadata: { name: 'c1' } }], resourceVersion: '1' }),
      );
      const newFixture = TestBed.createComponent(ResourceTableCard);
      const newComponent = newFixture.componentInstance;
      newComponent.context = (() => ({
        resourceDefinition: {
          entityCollection: 'clusters',
          entity: 'Cluster',
          apiGroup: 'core_k8s_io',
          version: 'v1alpha1',
          permissionsDefinition: {
            group: 'core.k8s.io',
            resource: 'clusters',
            entityActions: [],
            resourceActions: [],
            entityContextKey: 'entityName',
          },
          ui: { listView: { fields: [] } },
        },
      })) as any;
      newComponent.LuigiClient = makeLuigiClient();
      newFixture.detectChanges();
      expect(mockInstancePermissionsService.checkInstances).not.toHaveBeenCalled();
    });

    it('should call instancePermissionsService.checkInstances with correct args when entityActions are set', () => {
      const pd = {
        group: 'core.k8s.io',
        resource: 'clusters',
        entityActions: ['get', 'delete'],
        resourceActions: [],
        entityContextKey: 'entityName',
      };
      mockResourceService.list.mockReturnValue(
        of({ items: [{ metadata: { name: 'c1' } }], resourceVersion: '1' }),
      );
      const newFixture = TestBed.createComponent(ResourceTableCard);
      const newComponent = newFixture.componentInstance;
      newComponent.context = (() => ({
        organization: 'my-org',
        resourceDefinition: {
          entityCollection: 'clusters',
          entity: 'Cluster',
          apiGroup: 'core_k8s_io',
          version: 'v1alpha1',
          permissionsDefinition: pd,
          ui: { listView: { fields: [] } },
        },
      })) as any;
      newComponent.LuigiClient = makeLuigiClient();
      newFixture.detectChanges();
      expect(mockInstancePermissionsService.checkInstances).toHaveBeenCalledWith(
        expect.any(Object),
        pd,
        expect.arrayContaining([expect.objectContaining({ name: 'c1' })]),
      );
    });

    describe('list() guard (canDo("list"))', () => {
      const makePermissionedContext = (perms: Record<string, string[]> | undefined) =>
        (() => ({
          portalPermissions: perms,
          resourceDefinition: {
            entityCollection: 'clusters',
            entity: 'Cluster',
            apiGroup: 'core_k8s_io',
            version: 'v1alpha1',
            permissionsDefinition: {
              group: 'core.k8s.io',
              resource: 'clusters',
              entityActions: [],
              resourceActions: ['list'],
              entityContextKey: 'entityName',
            },
            ui: { listView: { fields: [] } },
          },
        })) as any;

      it('does NOT call resourceService.list when portalPermissions has the resource entry without "list"', () => {
        mockResourceService.list.mockClear();
        const newFixture = TestBed.createComponent(ResourceTableCard);
        const newComponent = newFixture.componentInstance;
        newComponent.context = makePermissionedContext({ clusters: ['get'] });
        newComponent.LuigiClient = makeLuigiClient();
        newFixture.detectChanges();
        expect(mockResourceService.list).not.toHaveBeenCalled();
      });

      it('keeps loading false when list() is blocked by missing "list" permission', () => {
        const newFixture = TestBed.createComponent(ResourceTableCard);
        const newComponent = newFixture.componentInstance;
        newComponent.context = makePermissionedContext({ clusters: ['get'] });
        newComponent.LuigiClient = makeLuigiClient();
        newFixture.detectChanges();
        // Calling list() directly should still be a no-op
        newComponent.list();
        expect(newComponent.loading()).toBe(false);
      });

      it('calls resourceService.list when "list" verb is present in portalPermissions', () => {
        mockResourceService.list.mockClear();
        mockResourceService.list.mockReturnValue(
          of({ items: [], resourceVersion: '1' }),
        );
        const newFixture = TestBed.createComponent(ResourceTableCard);
        const newComponent = newFixture.componentInstance;
        newComponent.context = makePermissionedContext({ clusters: ['list', 'get'] });
        newComponent.LuigiClient = makeLuigiClient();
        newFixture.detectChanges();
        expect(mockResourceService.list).toHaveBeenCalled();
      });

      it('calls resourceService.list when portalPermissions has no entry for the resource (fail-open)', () => {
        mockResourceService.list.mockClear();
        mockResourceService.list.mockReturnValue(
          of({ items: [], resourceVersion: '1' }),
        );
        const newFixture = TestBed.createComponent(ResourceTableCard);
        const newComponent = newFixture.componentInstance;
        // No entry for 'clusters' → fail-open → list proceeds
        newComponent.context = makePermissionedContext({ other: ['get'] });
        newComponent.LuigiClient = makeLuigiClient();
        newFixture.detectChanges();
        expect(mockResourceService.list).toHaveBeenCalled();
      });

      it('calls resourceService.list when portalPermissions is undefined (fail-open)', () => {
        mockResourceService.list.mockClear();
        mockResourceService.list.mockReturnValue(
          of({ items: [], resourceVersion: '1' }),
        );
        const newFixture = TestBed.createComponent(ResourceTableCard);
        const newComponent = newFixture.componentInstance;
        newComponent.context = makePermissionedContext(undefined);
        newComponent.LuigiClient = makeLuigiClient();
        newFixture.detectChanges();
        expect(mockResourceService.list).toHaveBeenCalled();
      });
    });

    describe('watch effect guard (canDo("watch"))', () => {
      const makeWatchContext = (perms: Record<string, string[]> | undefined) =>
        (() => ({
          portalPermissions: perms,
          resourceDefinition: {
            entityCollection: 'clusters',
            entity: 'Cluster',
            apiGroup: 'core_k8s_io',
            version: 'v1alpha1',
            permissionsDefinition: {
              group: 'core.k8s.io',
              resource: 'clusters',
              entityActions: [],
              resourceActions: ['list', 'watch'],
              entityContextKey: 'entityName',
            },
            ui: { listView: { fields: [] } },
          },
        })) as any;

      it('does NOT open a watch subscription when portalPermissions lacks "watch" for the resource', () => {
        mockResourceService.list.mockReturnValue(
          of({ items: [], resourceVersion: 'v1' }),
        );
        mockResourceService.resourceChangeSubscription.mockClear();

        const newFixture = TestBed.createComponent(ResourceTableCard);
        const newComponent = newFixture.componentInstance;
        newComponent.context = makeWatchContext({ clusters: ['list'] }); // 'watch' absent
        newComponent.LuigiClient = makeLuigiClient();
        newFixture.detectChanges();

        // resourceVersion is now set ('v1') but the watch effect should have bailed out
        expect(newComponent.resourceVersion()).toBe('v1');
        expect(mockResourceService.resourceChangeSubscription).not.toHaveBeenCalled();
      });

      it('opens the watch subscription when "watch" is present in portalPermissions', () => {
        mockResourceService.list.mockReturnValue(
          of({ items: [], resourceVersion: 'v1' }),
        );
        mockResourceService.resourceChangeSubscription.mockReturnValue(of(undefined));

        const newFixture = TestBed.createComponent(ResourceTableCard);
        const newComponent = newFixture.componentInstance;
        newComponent.context = makeWatchContext({ clusters: ['list', 'watch'] });
        newComponent.LuigiClient = makeLuigiClient();
        newFixture.detectChanges();

        expect(mockResourceService.resourceChangeSubscription).toHaveBeenCalled();
      });

      it('opens the watch subscription when portalPermissions has no entry for the resource (fail-open)', () => {
        mockResourceService.list.mockReturnValue(
          of({ items: [], resourceVersion: 'v1' }),
        );
        mockResourceService.resourceChangeSubscription.mockReturnValue(of(undefined));

        const newFixture = TestBed.createComponent(ResourceTableCard);
        const newComponent = newFixture.componentInstance;
        newComponent.context = makeWatchContext({ other: ['get'] }); // no 'clusters' entry
        newComponent.LuigiClient = makeLuigiClient();
        newFixture.detectChanges();

        expect(mockResourceService.resourceChangeSubscription).toHaveBeenCalled();
      });

      it('opens the watch subscription when portalPermissions is undefined (fail-open)', () => {
        mockResourceService.list.mockReturnValue(
          of({ items: [], resourceVersion: 'v1' }),
        );
        mockResourceService.resourceChangeSubscription.mockReturnValue(of(undefined));

        const newFixture = TestBed.createComponent(ResourceTableCard);
        const newComponent = newFixture.componentInstance;
        newComponent.context = makeWatchContext(undefined);
        newComponent.LuigiClient = makeLuigiClient();
        newFixture.detectChanges();

        expect(mockResourceService.resourceChangeSubscription).toHaveBeenCalled();
      });
    });
  });
});
