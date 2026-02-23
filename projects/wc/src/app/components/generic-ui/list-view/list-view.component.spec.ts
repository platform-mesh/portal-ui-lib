import { ListView } from './list-view.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import {
  ResourceDefinition,
  ResourceSubscriptionResult,
} from '@platform-mesh/portal-ui-lib/models';
import {
  ErrorHandlerService,
  ResourceService,
} from '@platform-mesh/portal-ui-lib/services';
import * as utils from '@platform-mesh/portal-ui-lib/utils';
import { Subject, of, throwError } from 'rxjs';
import { MockedObject } from 'vitest';
import { mock } from 'vitest-mock-extended';

describe('ListViewComponent', () => {
  let component: ListView;
  let fixture: ComponentFixture<ListView>;
  let mockResourceService: MockedObject<ResourceService>;
  let mockErrorHandlerService: MockedObject<ErrorHandlerService>;
  let mockLuigiCoreService: any;

  beforeEach(() => {
    mockResourceService = mock();
    mockResourceService.list.mockReturnValue(
      of({
        items: [
          {
            metadata: { name: 'test' },
            status: {
              conditions: [{ type: 'Ready', status: 'True' }],
            },
          },
        ],
        resourceVersion: '1234567890',
      }),
    );
    mockResourceService.resourceChangeSubscription.mockReturnValue(
      of(undefined),
    );
    mockResourceService.delete.mockReturnValue(of({ data: {} } as any));
    mockResourceService.create.mockReturnValue(of({ data: { name: 'test' } }));
    mockResourceService.update.mockReturnValue(of({ data: { name: 'test' } }));
    mockLuigiCoreService = mock();
    mockErrorHandlerService = mock();

    TestBed.configureTestingModule({
      providers: [
        { provide: ResourceService, useValue: mockResourceService },
        { provide: LuigiCoreService, useValue: mockLuigiCoreService },
        { provide: ErrorHandlerService, useValue: mockErrorHandlerService },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).overrideComponent(ListView, {
      set: {
        template: '',
        imports: [],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
      },
    });

    fixture = TestBed.createComponent(ListView);
    component = fixture.componentInstance;

    component.context = (() => ({
      resourceDefinition: {
        plural: 'clusters',
        kind: 'Cluster',
        group: 'core.k8s.io',
        version: 'v1alpha1',
        ui: {
          listView: {
            fields: [],
          },
          detailView: {
            fields: [],
          },
        },
      },
    })) as any;

    component.LuigiClient = (() => ({
      linkManager: () => ({
        fromContext: vi.fn().mockReturnThis(),
        navigate: vi.fn(),
        withParams: vi.fn().mockReturnThis(),
      }),
      getNodeParams: vi.fn(),
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

  it('should include ready fields when listing resources', () => {
    mockResourceService.list = vi.fn().mockReturnValue(of([]));

    const readyCondition = {
      jsonPathExpression: '$.status.ready',
      property: 'status.ready',
    };

    const newFixture = TestBed.createComponent(ListView);
    const newComponent = newFixture.componentInstance;

    newComponent.context = (() => ({
      resourceDefinition: {
        plural: 'clusters',
        kind: 'Cluster',
        group: 'core.k8s.io',
        version: 'v1alpha1',
        readyCondition,
        ui: {
          listView: {
            fields: [{ property: 'metadata.name' }],
          },
        },
      } as ResourceDefinition,
    })) as any;

    newComponent.LuigiClient = (() => ({
      linkManager: () => ({
        fromContext: vi.fn().mockReturnThis(),
        navigate: vi.fn(),
        withParams: vi.fn().mockReturnThis(),
      }),
      getNodeParams: vi.fn(),
    })) as any;

    const expectedContext = newComponent.context();

    newFixture.detectChanges();

    const expectedFields = utils.generateGraphQLFields([
      { property: 'metadata.name' },
      readyCondition,
    ]);

    expect(mockResourceService.list).toHaveBeenCalledWith(
      'core_k8s_io_v1alpha1_clusters',
      expectedFields,
      expectedContext,
      false,
      { continue: undefined, limit: 5 },
    );
  });

  it('should create a resource', () => {
    const resource = { metadata: { name: 'test' } };

    component.create(resource as any);
    expect(mockResourceService.create).toHaveBeenCalled();
  });

  it('should navigate to resource', () => {
    const resource = { metadata: { name: 'res1' } };
    const navSpy = vi.fn();
    component.LuigiClient = (() => ({
      linkManager: () => ({
        navigate: navSpy,
      }),
    })) as any;

    component.navigateToResource(resource as any);
    expect(navSpy).toHaveBeenCalledWith('res1');
  });

  it('should not navigate when detailView is not defined', () => {
    const newFixture = TestBed.createComponent(ListView);
    const newComponent = newFixture.componentInstance;

    newComponent.context = (() => ({
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

    const resource = { metadata: { name: 'res1' } };
    const navSpy = vi.fn();
    newComponent.LuigiClient = (() => ({
      linkManager: () => ({
        navigate: navSpy,
      }),
    })) as any;

    newComponent.navigateToResource(resource as any);
    expect(navSpy).not.toHaveBeenCalled();
  });

  it('should not navigate when ui is not defined', () => {
    const newFixture = TestBed.createComponent(ListView);
    const newComponent = newFixture.componentInstance;

    newComponent.context = (() => ({
      resourceDefinition: {
        plural: 'clusters',
        kind: 'Cluster',
        group: 'core.k8s.io',
      },
    })) as any;

    const resource = { metadata: { name: 'res1' } };
    const navSpy = vi.fn();
    newComponent.LuigiClient = (() => ({
      linkManager: () => ({
        navigate: navSpy,
      }),
    })) as any;

    newComponent.navigateToResource(resource as any);
    expect(navSpy).not.toHaveBeenCalled();
  });

  it('should open create resource modal', () => {
    const openSpy = vi.fn();
    (component as any).createModal = () => ({ open: openSpy });
    component.openCreateResourceModal();
    expect(openSpy).toHaveBeenCalledWith();
  });

  it('should check create view fields existence', () => {
    const newFixture = TestBed.createComponent(ListView);
    const newComponent = newFixture.componentInstance;

    const mockContext = {
      resourceDefinition: {
        kind: 'Cluster',
        group: 'core.k8s.io',
        plural: 'clusters',
        ui: {
          createView: {
            fields: [{ property: 'any' }],
          },
          listView: { fields: [] },
        },
      },
    } as any;

    newComponent.context = (() => mockContext) as any;
    newComponent.LuigiClient = (() => ({
      linkManager: () => ({
        fromContext: vi.fn().mockReturnThis(),
        navigate: vi.fn(),
        withParams: vi.fn().mockReturnThis(),
      }),
      getNodeParams: vi.fn(),
    })) as any;

    newFixture.detectChanges();

    expect(newComponent.resourceDefinition()).toEqual(
      mockContext.resourceDefinition,
    );
    expect(newComponent.hasUiCreateViewFields()).toBe(true);
  });

  it('should compute heading correctly with capitalized plural', () => {
    const newFixture = TestBed.createComponent(ListView);
    const newComponent = newFixture.componentInstance;

    newComponent.context = (() => ({
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

    newFixture.detectChanges();

    expect(newComponent.defaultHeading()).toBe('Clusters');
  });

  it('should handle empty plural in heading', () => {
    const newFixture = TestBed.createComponent(ListView);
    const newComponent = newFixture.componentInstance;

    newComponent.context = (() => ({
      resourceDefinition: {
        plural: '',
        kind: 'Cluster',
        group: 'core.k8s.io',
        ui: {
          listView: {
            fields: [],
          },
        },
      },
    })) as any;

    newFixture.detectChanges();

    expect(newComponent.defaultHeading()).toBe('');
  });

  it('should handle single character plural in heading', () => {
    const newFixture = TestBed.createComponent(ListView);
    const newComponent = newFixture.componentInstance;

    newComponent.context = (() => ({
      resourceDefinition: {
        plural: 'a',
        kind: 'Cluster',
        group: 'core.k8s.io',
        ui: {
          listView: {
            fields: [],
          },
        },
      },
    })) as any;

    newFixture.detectChanges();

    expect(newComponent.defaultHeading()).toBe('A');
  });

  it('should handle resource service list error', () => {
    mockResourceService.list.mockReturnValueOnce(
      throwError(() => new Error('List failed')),
    );

    const newFixture = TestBed.createComponent(ListView);
    const newComponent = newFixture.componentInstance;

    newComponent.context = (() => ({
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

    newComponent.LuigiClient = (() => ({
      linkManager: () => ({
        fromContext: vi.fn().mockReturnThis(),
        navigate: vi.fn(),
        withParams: vi.fn().mockReturnThis(),
      }),
      getNodeParams: vi.fn(),
    })) as any;

    newFixture.detectChanges();

    // Component should still be created even if list fails
    expect(newComponent).toBeTruthy();
  });

  describe('Availability and Accessible Name', () => {
    it('isAvailable: should return true when resource is ready and not pending deletion', () => {
      const resource = {
        ready: true,
        metadata: { name: 'res1' },
      } as any;

      expect(component.isAvailable(resource)).toBe(true);
    });

    it('isAvailable: should return false when resource is not ready', () => {
      const resource = {
        ready: false,
        metadata: { name: 'res1' },
      } as any;

      expect(component.isAvailable(resource)).toBe(false);
    });

    it('isAvailable: should return false when resource has a deletionTimestamp', () => {
      const resource = {
        ready: true,
        metadata: {
          name: 'res1',
          deletionTimestamp: '2023-10-27T10:00:00Z',
        },
      } as any;

      expect(component.isAvailable(resource)).toBe(false);
    });

    it('getAccessibleName: should return empty string for a healthy, ready resource', () => {
      const resource = {
        ready: true,
        metadata: { name: 'res1' },
      } as any;

      expect(component.getAccessibleName(resource)).toBe('');
    });

    it('getAccessibleName: should return "Resource is pending deletion" when deletionTimestamp is present', () => {
      const resource = {
        ready: true,
        metadata: {
          name: 'res1',
          deletionTimestamp: '2023-10-27T10:00:00Z',
        },
      } as any;

      expect(component.getAccessibleName(resource)).toBe(
        'Resource is pending deletion',
      );
    });

    it('getAccessibleName: should prioritize deletion message over not ready message', () => {
      const resource = {
        ready: false,
        metadata: {
          name: 'res1',
          deletionTimestamp: '2023-10-27T10:00:00Z',
        },
      } as any;

      // Since deletionTimestamp check comes first in the if/else logic
      expect(component.getAccessibleName(resource)).toBe(
        'Resource is pending deletion',
      );
    });

    it('getAccessibleName: should return "Resource is not ready" when not ready and not deleting', () => {
      const resource = {
        ready: false,
        metadata: { name: 'res1' },
      } as any;

      expect(component.getAccessibleName(resource)).toBe(
        'Resource is not ready',
      );
    });
  });

  describe('Undefined checks', () => {
    it('should show alert and throw error when resourceDefinition is undefined in list method', () => {
      const newFixture = TestBed.createComponent(ListView);
      const newComponent = newFixture.componentInstance;

      // Set context to return undefined resourceDefinition
      newComponent.context = (() => ({
        resourceDefinition: undefined,
      })) as any;

      const showAlertSpy = vi.fn();
      newComponent.LuigiClient = (() => ({
        linkManager: () => ({
          fromContext: vi.fn().mockReturnThis(),
          navigate: vi.fn(),
          withParams: vi.fn().mockReturnThis(),
        }),
        uxManager: () => ({
          showAlert: showAlertSpy,
        }),
        getNodeParams: vi.fn(),
      })) as any;

      // Test that list() method throws error when resourceDefinition is undefined
      expect(() => newComponent.list()).toThrow(
        'Resource definition is not defined',
      );
      expect(showAlertSpy).toHaveBeenCalledWith({
        text: 'Resource definition is not defined',
        type: 'error',
      });
    });

    it('should show alert and throw error when resourceDefinition is undefined in create method', () => {
      const newFixture = TestBed.createComponent(ListView);
      const newComponent = newFixture.componentInstance;

      // Set context to return undefined resourceDefinition
      newComponent.context = (() => ({
        resourceDefinition: undefined,
      })) as any;

      const showAlertSpy = vi.fn();
      newComponent.LuigiClient = (() => ({
        linkManager: () => ({
          fromContext: vi.fn().mockReturnThis(),
          navigate: vi.fn(),
          withParams: vi.fn().mockReturnThis(),
        }),
        uxManager: () => ({
          showAlert: showAlertSpy,
        }),
        getNodeParams: vi.fn(),
      })) as any;

      const resource = { metadata: { name: 'test' } } as any;

      // Test that create() method throws error when resourceDefinition is undefined
      expect(() => newComponent.create(resource)).toThrow(
        'Resource definition is not defined',
      );
      expect(showAlertSpy).toHaveBeenCalledWith({
        text: 'Resource definition is not defined',
        type: 'error',
      });
    });

    it('should show alert and throw error when navigating to resource with undefined name', () => {
      const resource = { metadata: {} } as any;
      const showAlertSpy = vi.fn();
      component.LuigiClient = (() => ({
        linkManager: () => ({
          navigate: vi.fn(),
        }),
        uxManager: () => ({
          showAlert: showAlertSpy,
        }),
      })) as any;

      expect(() => component.navigateToResource(resource)).toThrow(
        'Resource name is not defined',
      );
      expect(showAlertSpy).toHaveBeenCalledWith({
        text: 'Resource name is not defined',
        type: 'error',
      });
    });
  });

  // NEW TEST CASES FOR MISSING COVERAGE

  describe('Pagination', () => {
    it('should update pagination limit when onLimitChange is called', () => {
      const event = {
        detail: {
          selectedOption: {
            value: '10',
          },
        },
      };

      component.onLimitChange(event);

      expect(component.paginationLimit()).toBe(10);
    });

    it('should reset pagination when limit changes', () => {
      // Setup initial state with some resources
      component.resources.set([
        { metadata: { name: 'res1' } },
        { metadata: { name: 'res2' } },
        { metadata: { name: 'res3' } },
        { metadata: { name: 'res4' } },
        { metadata: { name: 'res5' } },
      ] as any);
      component.remainingItemCount.set(10);

      const event = {
        detail: {
          selectedOption: {
            value: '3',
          },
        },
      };

      component.onLimitChange(event);

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

      const initialResources = [{ metadata: { name: 'existing' } }] as any;
      mockResourceService.list.mockReturnValue(
        of({ items: initialResources, resourceVersion: '1' }),
      );

      const newFixture = TestBed.createComponent(ListView);
      const newComponent = newFixture.componentInstance;

      newComponent.context = (() => ({
        resourceDefinition: {
          plural: 'clusters',
          kind: 'Cluster',
          group: 'core.k8s.io',
          version: 'v1alpha1',
          ui: {
            listView: { fields: [] },
          },
        },
      })) as any;

      newComponent.LuigiClient = (() => ({
        linkManager: () => ({
          fromContext: vi.fn().mockReturnThis(),
          navigate: vi.fn(),
          withParams: vi.fn().mockReturnThis(),
        }),
        getNodeParams: vi.fn(),
      })) as any;

      newFixture.detectChanges();

      // Trigger subscription with ADDED
      subscriptionSubject.next({
        type: 'ADDED',
        object: { metadata: { name: 'new-resource' } },
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

      const initialResources = [
        { metadata: { name: 'existing' }, spec: { type: 'v1' } },
      ] as any;
      mockResourceService.list.mockReturnValue(
        of({ items: initialResources, resourceVersion: '1' }),
      );

      const newFixture = TestBed.createComponent(ListView);
      const newComponent = newFixture.componentInstance;

      newComponent.context = (() => ({
        resourceDefinition: {
          plural: 'clusters',
          kind: 'Cluster',
          group: 'core.k8s.io',
          version: 'v1alpha1',
          ui: {
            listView: { fields: [] },
          },
        },
      })) as any;

      newComponent.LuigiClient = (() => ({
        linkManager: () => ({
          fromContext: vi.fn().mockReturnThis(),
          navigate: vi.fn(),
          withParams: vi.fn().mockReturnThis(),
        }),
        getNodeParams: vi.fn(),
      })) as any;

      newFixture.detectChanges();

      // Trigger subscription with MODIFIED
      subscriptionSubject.next({
        type: 'MODIFIED',
        object: { metadata: { name: 'existing' }, spec: { type: 'v2' } },
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

      const initialResources = [
        { metadata: { name: 'to-delete' } },
        { metadata: { name: 'to-keep' } },
      ] as any;
      mockResourceService.list.mockReturnValue(
        of({ items: initialResources, resourceVersion: '1' }),
      );

      const newFixture = TestBed.createComponent(ListView);
      const newComponent = newFixture.componentInstance;

      newComponent.context = (() => ({
        resourceDefinition: {
          plural: 'clusters',
          kind: 'Cluster',
          group: 'core.k8s.io',
          version: 'v1alpha1',
          ui: {
            listView: { fields: [] },
          },
        },
      })) as any;

      newComponent.LuigiClient = (() => ({
        linkManager: () => ({
          fromContext: vi.fn().mockReturnThis(),
          navigate: vi.fn(),
          withParams: vi.fn().mockReturnThis(),
        }),
        getNodeParams: vi.fn(),
      })) as any;

      newFixture.detectChanges();

      // Trigger subscription with DELETED
      subscriptionSubject.next({
        type: 'DELETED',
        object: { metadata: { name: 'to-delete' } },
      });

      expect(newComponent.resources().length).toBe(1);
      expect(newComponent.resources()[0].metadata.name).toBe('to-keep');
    });

    it('should not modify resources when MODIFIED resource does not exist in list', () => {
      const subscriptionSubject = new Subject<
        ResourceSubscriptionResult | undefined
      >();
      mockResourceService.resourceChangeSubscription.mockReturnValue(
        subscriptionSubject,
      );

      const newFixture = TestBed.createComponent(ListView);
      const newComponent = newFixture.componentInstance;

      newComponent.context = (() => ({
        resourceDefinition: {
          plural: 'clusters',
          kind: 'Cluster',
          group: 'core.k8s.io',
          version: 'v1alpha1',
          ui: {
            listView: { fields: [] },
          },
        },
      })) as any;

      newComponent.LuigiClient = (() => ({
        linkManager: () => ({
          fromContext: vi.fn().mockReturnThis(),
          navigate: vi.fn(),
          withParams: vi.fn().mockReturnThis(),
        }),
        getNodeParams: vi.fn(),
      })) as any;

      newFixture.detectChanges();

      newComponent.resources.set([{ metadata: { name: 'existing' } }] as any);

      // Trigger subscription with MODIFIED for non-existent resource
      subscriptionSubject.next({
        type: 'MODIFIED',
        object: { metadata: { name: 'non-existent' } },
      });

      expect(newComponent.resources().length).toBe(1);
      expect(newComponent.resources()[0].metadata.name).toBe('existing');
    });

    it('should handle null/undefined subscription results', () => {
      const subscriptionSubject = new Subject<
        ResourceSubscriptionResult | undefined
      >();
      const initialResources = [{ metadata: { name: 'existing' } }] as any;
      mockResourceService.list.mockReturnValue(
        of({ items: initialResources, resourceVersion: '1' }),
      );

      const newFixture = TestBed.createComponent(ListView);
      const newComponent = newFixture.componentInstance;

      newComponent.context = (() => ({
        resourceDefinition: {
          plural: 'clusters',
          kind: 'Cluster',
          group: 'core.k8s.io',
          version: 'v1alpha1',
          ui: {
            listView: { fields: [] },
          },
        },
      })) as any;

      newComponent.LuigiClient = (() => ({
        linkManager: () => ({
          fromContext: vi.fn().mockReturnThis(),
          navigate: vi.fn(),
          withParams: vi.fn().mockReturnThis(),
        }),
        getNodeParams: vi.fn(),
      })) as any;

      newFixture.detectChanges();

      // Trigger subscription with MODIFIED for non-existent resource
      subscriptionSubject.next({
        type: 'MODIFIED',
        object: { metadata: { name: 'non-existent' } },
      });

      expect(newComponent.resources().length).toBe(1);
      expect(newComponent.resources()[0].metadata.name).toBe('existing');
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

      const newFixture = TestBed.createComponent(ListView);
      const newComponent = newFixture.componentInstance;

      newComponent.context = (() => ({
        resourceDefinition: {
          plural: 'clusters',
          kind: 'Cluster',
          group: 'core.k8s.io',
          version: 'v1alpha1',
          ui: {
            listView: { fields: [] },
          },
        },
      })) as any;

      newComponent.LuigiClient = (() => ({
        linkManager: () => ({
          fromContext: vi.fn().mockReturnThis(),
          navigate: vi.fn(),
          withParams: vi.fn().mockReturnThis(),
        }),
        getNodeParams: vi.fn(),
      })) as any;

      newFixture.detectChanges();

      // Trigger subscription with null
      subscriptionSubject.next(undefined);

      // Resources should remain unchanged
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

      const newFixture = TestBed.createComponent(ListView);
      const newComponent = newFixture.componentInstance;

      newComponent.context = (() => ({
        resourceDefinition: {
          plural: 'clusters',
          kind: 'Cluster',
          group: 'core.k8s.io',
          version: 'v1alpha1',
          ui: {
            listView: { fields: [] },
          },
        },
      })) as any;

      newComponent.LuigiClient = (() => ({
        linkManager: () => ({
          fromContext: vi.fn().mockReturnThis(),
          navigate: vi.fn(),
          withParams: vi.fn().mockReturnThis(),
        }),
        getNodeParams: vi.fn(),
      })) as any;

      newFixture.detectChanges();

      // Change resourceVersion to trigger new subscription
      newComponent.resourceVersion.set('new-version');
      newFixture.detectChanges();

      // The old subscription should have been unsubscribed
      expect(subscription.unsubscribe).toHaveBeenCalled();
    });

    describe('List method', () => {
      it('should not call list twice if already loading', () => {
        const listSpy = vi.fn().mockReturnValueOnce(
          of({
            items: [],
            resourceVersion: '123',
          }),
        );
        mockResourceService.list = listSpy;

        // Manually set isLoadingList to true
        (component as any).isLoadingList = true;

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

        const newFixture = TestBed.createComponent(ListView);
        const newComponent = newFixture.componentInstance;

        newComponent.context = (() => ({
          resourceDefinition: {
            plural: 'clusters',
            kind: 'Cluster',
            group: 'core.k8s.io',
            version: 'v1alpha1',
            ui: {
              listView: { fields: [] },
            },
          },
        })) as any;

        newComponent.LuigiClient = (() => ({
          linkManager: () => ({
            fromContext: vi.fn().mockReturnThis(),
            navigate: vi.fn(),
            withParams: vi.fn().mockReturnThis(),
          }),
          getNodeParams: vi.fn(),
        })) as any;

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

        const newFixture = TestBed.createComponent(ListView);
        const newComponent = newFixture.componentInstance;

        newComponent.context = (() => ({
          resourceDefinition: {
            plural: 'clusters',
            kind: 'Cluster',
            group: 'core.k8s.io',
            version: 'v1alpha1',
            ui: {
              listView: { fields: [] },
            },
          },
        })) as any;

        newComponent.LuigiClient = (() => ({
          linkManager: () => ({
            fromContext: vi.fn().mockReturnThis(),
            navigate: vi.fn(),
            withParams: vi.fn().mockReturnThis(),
          }),
          getNodeParams: vi.fn(),
        })) as any;

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

        const newFixture = TestBed.createComponent(ListView);
        const newComponent = newFixture.componentInstance;

        newComponent.context = (() => ({
          resourceDefinition: {
            plural: 'clusters',
            kind: 'Cluster',
            group: 'core.k8s.io',
            version: 'v1alpha1',
            ui: {
              listView: { fields: [] },
            },
          },
        })) as any;

        newComponent.LuigiClient = (() => ({
          linkManager: () => ({
            fromContext: vi.fn().mockReturnThis(),
            navigate: vi.fn(),
            withParams: vi.fn().mockReturnThis(),
          }),
          getNodeParams: vi.fn(),
        })) as any;

        newFixture.detectChanges();

        // First call creates initial resources
        expect(newComponent.resources().length).toBe(1);

        // Manually trigger second list call
        newComponent.list();

        // Should have merged resources
        expect(newComponent.resources().length).toBe(2);
        const res1 = newComponent
          .resources()
          .find((r) => r.metadata.name === 'res1');
        expect(res1?.spec?.version).toBe('v2'); // Updated version
      });

      it('should handle error and call error handler service', () => {
        const error = new Error('Unauthorized');
        mockResourceService.list.mockReturnValue(throwError(() => error));

        const newFixture = TestBed.createComponent(ListView);
        const newComponent = newFixture.componentInstance;

        newComponent.context = (() => ({
          resourceDefinition: {
            plural: 'clusters',
            kind: 'Cluster',
            group: 'core.k8s.io',
            version: 'v1alpha1',
            ui: {
              listView: { fields: [] },
            },
          },
        })) as any;

        newComponent.LuigiClient = (() => ({
          linkManager: () => ({
            fromContext: vi.fn().mockReturnThis(),
            navigate: vi.fn(),
            withParams: vi.fn().mockReturnThis(),
          }),
          getNodeParams: vi.fn(),
        })) as any;

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

        const newFixture = TestBed.createComponent(ListView);
        const newComponent = newFixture.componentInstance;

        newComponent.context = (() => ({
          resourceDefinition: {
            plural: 'clusters',
            kind: 'Cluster',
            group: 'core.k8s.io',
            version: 'v1alpha1',
            ui: {
              listView: { fields: [] },
            },
          },
        })) as any;

        newComponent.LuigiClient = (() => ({
          linkManager: () => ({
            fromContext: vi.fn().mockReturnThis(),
            navigate: vi.fn(),
            withParams: vi.fn().mockReturnThis(),
          }),
          getNodeParams: vi.fn(),
        })) as any;

        newFixture.detectChanges();

        expect(newComponent.remainingItemCount()).toBe(0);
      });
    });

    describe('Modal operations', () => {
      it('should close create modal after successful creation', () => {
        const resource = { metadata: { name: 'test' } } as any;
        const closeSpy = vi.fn();
        (component as any).createModal = () => ({ close: closeSpy });

        component.create(resource);

        expect(closeSpy).toHaveBeenCalled();
      });
    });

    describe('Computed properties', () => {
      it('should return false for hasUiCreateViewFields when createView is undefined', () => {
        const newFixture = TestBed.createComponent(ListView);
        const newComponent = newFixture.componentInstance;

        newComponent.context = (() => ({
          resourceDefinition: {
            plural: 'clusters',
            kind: 'Cluster',
            group: 'core.k8s.io',
            ui: {
              listView: { fields: [] },
            },
          },
        })) as any;

        newComponent.LuigiClient = (() => ({
          linkManager: () => ({
            fromContext: vi.fn().mockReturnThis(),
            navigate: vi.fn(),
            withParams: vi.fn().mockReturnThis(),
          }),
          getNodeParams: vi.fn(),
        })) as any;

        newFixture.detectChanges();

        expect(newComponent.hasUiCreateViewFields()).toBe(false);
      });

      it('should return false for hasUiCreateViewFields when fields array is empty', () => {
        const newFixture = TestBed.createComponent(ListView);
        const newComponent = newFixture.componentInstance;

        newComponent.context = (() => ({
          resourceDefinition: {
            plural: 'clusters',
            kind: 'Cluster',
            group: 'core.k8s.io',
            ui: {
              createView: {
                fields: [],
              },
              listView: { fields: [] },
            },
          },
        })) as any;

        newComponent.LuigiClient = (() => ({
          linkManager: () => ({
            fromContext: vi.fn().mockReturnThis(),
            navigate: vi.fn(),
            withParams: vi.fn().mockReturnThis(),
          }),
          getNodeParams: vi.fn(),
        })) as any;

        newFixture.detectChanges();

        expect(newComponent.hasUiCreateViewFields()).toBe(false);
      });

      it('should compute viewColumns correctly', () => {
        const newFixture = TestBed.createComponent(ListView);
        const newComponent = newFixture.componentInstance;

        newComponent.context = (() => ({
          resourceDefinition: {
            plural: 'clusters',
            kind: 'Cluster',
            group: 'core.k8s.io',
            ui: {
              listView: {
                fields: [
                  { property: 'metadata.name' },
                  { property: 'spec.version' },
                ],
              },
            },
          },
        })) as any;

        newComponent.LuigiClient = (() => ({
          linkManager: () => ({
            fromContext: vi.fn().mockReturnThis(),
            navigate: vi.fn(),
            withParams: vi.fn().mockReturnThis(),
          }),
          getNodeParams: vi.fn(),
        })) as any;

        newFixture.detectChanges();

        expect(newComponent.columns().length).toBe(2);
      });

      it('should return resourceTitle when defined', () => {
        const newFixture = TestBed.createComponent(ListView);
        const newComponent = newFixture.componentInstance;

        const resourceTitle: any = {
          property: 'spec.displayName',
        };

        newComponent.context = (() => ({
          resourceDefinition: {
            plural: 'clusters',
            kind: 'Cluster',
            group: 'core.k8s.io',
            ui: {
              listView: {
                fields: [],
                resourceTitle,
              },
            },
          },
        })) as any;

        newComponent.LuigiClient = (() => ({
          linkManager: () => ({
            fromContext: vi.fn().mockReturnThis(),
            navigate: vi.fn(),
            withParams: vi.fn().mockReturnThis(),
          }),
          getNodeParams: vi.fn(),
        })) as any;

        newFixture.detectChanges();

        expect(newComponent.resourceTitleDefinition()).toEqual(resourceTitle);
      });

      it('should return undefined when resourceTitle is not defined', () => {
        const newFixture = TestBed.createComponent(ListView);
        const newComponent = newFixture.componentInstance;

        newComponent.context = (() => ({
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

        newComponent.LuigiClient = (() => ({
          linkManager: () => ({
            fromContext: vi.fn().mockReturnThis(),
            navigate: vi.fn(),
            withParams: vi.fn().mockReturnThis(),
          }),
          getNodeParams: vi.fn(),
        })) as any;

        newFixture.detectChanges();

        expect(newComponent.resourceTitleDefinition()).toBeUndefined();
      });

      it('should use defaultHeading when resourceTitle is not defined', () => {
        const newFixture = TestBed.createComponent(ListView);
        const newComponent = newFixture.componentInstance;

        newComponent.context = (() => ({
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

        newComponent.LuigiClient = (() => ({
          linkManager: () => ({
            fromContext: vi.fn().mockReturnThis(),
            navigate: vi.fn(),
            withParams: vi.fn().mockReturnThis(),
          }),
          getNodeParams: vi.fn(),
        })) as any;

        newFixture.detectChanges();

        expect(newComponent.resourceTitleDefinition()).toBeUndefined();
        expect(newComponent.defaultHeading()).toBe('Clusters');
      });
    });
  });
});
