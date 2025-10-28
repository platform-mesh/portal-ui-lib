import { ListViewComponent } from './list-view.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import { ResourceService } from '@platform-mesh/portal-ui-lib/services';
import { of, throwError } from 'rxjs';

describe('ListViewComponent', () => {
  let component: ListViewComponent;
  let fixture: ComponentFixture<ListViewComponent>;
  let mockResourceService: any;
  let mockLuigiCoreService: any;

  beforeEach(() => {
    mockResourceService = {
      list: jest.fn().mockReturnValue(
        of([
          {
            metadata: { name: 'test' },
            status: {
              conditions: [{ type: 'Ready', status: 'True' }],
            },
          },
        ]),
      ),
      delete: jest.fn().mockReturnValue(of({})),
      create: jest.fn().mockReturnValue(of({ data: { name: 'test' } })),
      update: jest.fn().mockReturnValue(of({ data: { name: 'test' } })),
      read: jest.fn().mockReturnValue(of({})),
    };

    mockLuigiCoreService = {
      showAlert: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ResourceService, useValue: mockResourceService },
        { provide: LuigiCoreService, useValue: mockLuigiCoreService },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
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

  it('should not show alert when delete is called', () => {
    const resource = { metadata: { name: 'test' } } as any;
    component.delete(resource);
    expect(mockLuigiCoreService.showAlert).not.toHaveBeenCalled();
  });

  it('should show alert when delete errors', () => {
    const resource = { metadata: { name: 'bad' } } as any;
    mockResourceService.delete.mockReturnValueOnce(
      throwError(() => new Error('boom')),
    );
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

  it('should handle update from modal', () => {
    const consoleSpy = jest
      .spyOn(console, 'debug')
      .mockImplementation(() => {});
    const updated = { metadata: { name: 'x' }, spec: { a: 1 } } as any;
    component.update(updated);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
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
    expect(openSpy).toHaveBeenCalledWith();
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

  it('should open edit resource modal and stop propagation', () => {
    const event = { stopPropagation: jest.fn() } as any;
    const resource = { metadata: { name: 'to-edit' } } as any;
    const openSpy = jest.fn();
    (component as any).createModal = () => ({ open: openSpy });

    mockResourceService.read.mockReturnValueOnce(of(resource));

    component.openEditResourceModal(event, resource);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(openSpy).toHaveBeenCalledWith(resource);
  });

  it('should check create view fields existence', () => {
    const newFixture = TestBed.createComponent(ListViewComponent);
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
        fromContext: jest.fn().mockReturnThis(),
        navigate: jest.fn(),
        withParams: jest.fn().mockReturnThis(),
      }),
      getNodeParams: jest.fn(),
    })) as any;

    newFixture.detectChanges();

    expect(newComponent.resourceDefinition()).toEqual(
      mockContext.resourceDefinition,
    );
    expect(newComponent.hasUiCreateViewFields()).toBe(true);
  });

  it('should use default columns when no listView fields are defined', () => {
    // Create a new component instance with different context
    const newFixture = TestBed.createComponent(ListViewComponent);
    const newComponent = newFixture.componentInstance;

    newComponent.context = (() => ({
      resourceDefinition: {
        plural: 'clusters',
        kind: 'Cluster',
        group: 'core.k8s.io',
        ui: {
          // No listView fields defined
        },
      },
    })) as any;

    newComponent.LuigiClient = (() => ({
      linkManager: () => ({
        fromContext: jest.fn().mockReturnThis(),
        navigate: jest.fn(),
        withParams: jest.fn().mockReturnThis(),
      }),
      getNodeParams: jest.fn(),
    })) as any;

    newFixture.detectChanges();

    expect(newComponent.columns().length).toBeGreaterThan(0);
    expect(newComponent.columns()[0].label).toBe('Name');
  });

  it('should compute heading correctly with capitalized plural', () => {
    const newFixture = TestBed.createComponent(ListViewComponent);
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

    expect(newComponent.heading()).toBe('Clusters');
  });

  it('should handle empty plural in heading', () => {
    const newFixture = TestBed.createComponent(ListViewComponent);
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

    expect(newComponent.heading()).toBe('');
  });

  it('should handle single character plural in heading', () => {
    const newFixture = TestBed.createComponent(ListViewComponent);
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

    expect(newComponent.heading()).toBe('A');
  });

  it('should handle resource service list error', () => {
    mockResourceService.list.mockReturnValueOnce(
      throwError(() => new Error('List failed')),
    );

    const newFixture = TestBed.createComponent(ListViewComponent);
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
        fromContext: jest.fn().mockReturnThis(),
        navigate: jest.fn(),
        withParams: jest.fn().mockReturnThis(),
      }),
      getNodeParams: jest.fn(),
    })) as any;

    newFixture.detectChanges();

    // Component should still be created even if list fails
    expect(newComponent).toBeTruthy();
  });

  describe('Ready Status Functionality', () => {
    it('should mark resource as ready when Ready condition status is True', () => {
      const readyResource = {
        metadata: { name: 'ready-resource' },
        status: {
          conditions: [{ type: 'Ready', status: 'True' }],
        },
      };

      mockResourceService.list.mockReturnValueOnce(of([readyResource]));

      const newFixture = TestBed.createComponent(ListViewComponent);
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
          fromContext: jest.fn().mockReturnThis(),
          navigate: jest.fn(),
          withParams: jest.fn().mockReturnThis(),
        }),
        getNodeParams: jest.fn(),
      })) as any;

      newFixture.detectChanges();

      const resources = newComponent.resources();
      expect(resources).toHaveLength(1);
      expect(resources[0].ready).toBe(true);
      expect(resources[0].metadata.name).toBe('ready-resource');
    });

    // it('should mark resource as not ready when Ready condition status is False', () => {
    //   const notReadyResource = {
    //     metadata: { name: 'not-ready-resource' },
    //     status: {
    //       conditions: [{ type: 'Ready', status: 'False' }],
    //     },
    //   };

    //   mockResourceService.list.mockReturnValueOnce(of([notReadyResource]));

    //   const newFixture = TestBed.createComponent(ListViewComponent);
    //   const newComponent = newFixture.componentInstance;

    //   newComponent.context = (() => ({
    //     resourceDefinition: {
    //       plural: 'clusters',
    //       kind: 'Cluster',
    //       group: 'core.k8s.io',
    //       ui: {
    //         listView: {
    //           fields: [],
    //         },
    //       },
    //     },
    //   })) as any;

    //   newComponent.LuigiClient = (() => ({
    //     linkManager: () => ({
    //       fromContext: jest.fn().mockReturnThis(),
    //       navigate: jest.fn(),
    //       withParams: jest.fn().mockReturnThis(),
    //     }),
    //     getNodeParams: jest.fn(),
    //   })) as any;

    //   newFixture.detectChanges();

    //   const resources = newComponent.resources();
    //   expect(resources).toHaveLength(1);
    //   expect(resources[0].ready).toBe(false);
    //   expect(resources[0].metadata.name).toBe('not-ready-resource');
    // });

    // it('should mark resource as not ready when Ready condition is missing', () => {
    //   const resourceWithoutReadyCondition = {
    //     metadata: { name: 'no-ready-condition' },
    //     status: {
    //       conditions: [{ type: 'Other', status: 'True' }],
    //     },
    //   };

    //   mockResourceService.list.mockReturnValueOnce(
    //     of([resourceWithoutReadyCondition]),
    //   );

    //   const newFixture = TestBed.createComponent(ListViewComponent);
    //   const newComponent = newFixture.componentInstance;

    //   newComponent.context = (() => ({
    //     resourceDefinition: {
    //       plural: 'clusters',
    //       kind: 'Cluster',
    //       group: 'core.k8s.io',
    //       ui: {
    //         listView: {
    //           fields: [],
    //         },
    //       },
    //     },
    //   })) as any;

    //   newComponent.LuigiClient = (() => ({
    //     linkManager: () => ({
    //       fromContext: jest.fn().mockReturnThis(),
    //       navigate: jest.fn(),
    //       withParams: jest.fn().mockReturnThis(),
    //     }),
    //     getNodeParams: jest.fn(),
    //   })) as any;

    //   newFixture.detectChanges();

    //   const resources = newComponent.resources();
    //   expect(resources).toHaveLength(1);
    //   expect(resources[0].ready).toBe(false);
    //   expect(resources[0].metadata.name).toBe('no-ready-condition');
    // });

    // it('should mark resource as not ready when status.conditions is missing', async () => {
    //   const resourceWithoutConditions = {
    //     metadata: { name: 'no-conditions' },
    //     status: {
    //       conditions: [],
    //     },
    //   };

    //   mockResourceService.list.mockReturnValueOnce(
    //     of([resourceWithoutConditions]),
    //   );

    //   const newFixture = TestBed.createComponent(ListViewComponent);
    //   const newComponent = newFixture.componentInstance;

    //   newComponent.context = (() => ({
    //     resourceDefinition: {
    //       plural: 'clusters',
    //       kind: 'Cluster',
    //       group: 'core.k8s.io',
    //       ui: {
    //         listView: {
    //           fields: [],
    //         },
    //       },
    //     },
    //   })) as any;

    //   newComponent.LuigiClient = (() => ({
    //     linkManager: () => ({
    //       fromContext: jest.fn().mockReturnThis(),
    //       navigate: jest.fn(),
    //       withParams: jest.fn().mockReturnThis(),
    //     }),
    //     getNodeParams: jest.fn(),
    //   })) as any;

    //   newFixture.detectChanges();
    //   await newFixture.whenStable();

    //   const resources = newComponent.resources();
    //   expect(resources).toHaveLength(1);
    //   expect(resources[0].ready).toBe(false);
    //   expect(resources[0].metadata.name).toBe('no-conditions');
    // });

    // it('should handle mixed ready statuses in resource list', () => {
    //   const mixedResources = [
    //     {
    //       metadata: { name: 'ready-1' },
    //       status: {
    //         conditions: [{ type: 'Ready', status: 'True' }],
    //       },
    //     },
    //     {
    //       metadata: { name: 'not-ready-1' },
    //       status: {
    //         conditions: [{ type: 'Ready', status: 'False' }],
    //       },
    //     },
    //     {
    //       metadata: { name: 'ready-2' },
    //       status: {
    //         conditions: [{ type: 'Ready', status: 'True' }],
    //       },
    //     },
    //   ];

    //   mockResourceService.list.mockReturnValueOnce(of(mixedResources));

    //   const newFixture = TestBed.createComponent(ListViewComponent);
    //   const newComponent = newFixture.componentInstance;

    //   newComponent.context = (() => ({
    //     resourceDefinition: {
    //       plural: 'clusters',
    //       kind: 'Cluster',
    //       group: 'core.k8s.io',
    //       ui: {
    //         listView: {
    //           fields: [],
    //         },
    //       },
    //     },
    //   })) as any;

    //   newComponent.LuigiClient = (() => ({
    //     linkManager: () => ({
    //       fromContext: jest.fn().mockReturnThis(),
    //       navigate: jest.fn(),
    //       withParams: jest.fn().mockReturnThis(),
    //     }),
    //     getNodeParams: jest.fn(),
    //   })) as any;

    //   newFixture.detectChanges();

    //   const resources = newComponent.resources();
    //   expect(resources).toHaveLength(3);
    //   expect(resources[0].ready).toBe(true);
    //   expect(resources[1].ready).toBe(false);
    //   expect(resources[2].ready).toBe(true);
    // });

    it('should call generateGqlFieldsWithStatusProperties when listing resources', () => {
      const generateGqlFieldsSpy = jest.spyOn(
        component as any,
        'generateGqlFieldsWithStatusProperties',
      );

      component.list();

      expect(generateGqlFieldsSpy).toHaveBeenCalled();
      generateGqlFieldsSpy.mockRestore();
    });
  });

  describe('Undefined checks', () => {
    it('should show alert and throw error when resourceDefinition is undefined in list method', () => {
      const newFixture = TestBed.createComponent(ListViewComponent);
      const newComponent = newFixture.componentInstance;

      // Set context to return undefined resourceDefinition
      newComponent.context = (() => ({
        resourceDefinition: undefined,
      })) as any;

      const showAlertSpy = jest.fn();
      newComponent.LuigiClient = (() => ({
        linkManager: () => ({
          fromContext: jest.fn().mockReturnThis(),
          navigate: jest.fn(),
          withParams: jest.fn().mockReturnThis(),
        }),
        uxManager: () => ({
          showAlert: showAlertSpy,
        }),
        getNodeParams: jest.fn(),
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

    it('should show alert and throw error when resourceDefinition is undefined in delete method', () => {
      const newFixture = TestBed.createComponent(ListViewComponent);
      const newComponent = newFixture.componentInstance;

      // Set context to return undefined resourceDefinition
      newComponent.context = (() => ({
        resourceDefinition: undefined,
      })) as any;

      const showAlertSpy = jest.fn();
      newComponent.LuigiClient = (() => ({
        linkManager: () => ({
          fromContext: jest.fn().mockReturnThis(),
          navigate: jest.fn(),
          withParams: jest.fn().mockReturnThis(),
        }),
        uxManager: () => ({
          showAlert: showAlertSpy,
        }),
        getNodeParams: jest.fn(),
      })) as any;

      const resource = { metadata: { name: 'test' } } as any;

      // Test that delete() method throws error when resourceDefinition is undefined
      expect(() => newComponent.delete(resource)).toThrow(
        'Resource definition is not defined',
      );
      expect(showAlertSpy).toHaveBeenCalledWith({
        text: 'Resource definition is not defined',
        type: 'error',
      });
    });

    it('should show alert and throw error when resourceDefinition is undefined in create method', () => {
      const newFixture = TestBed.createComponent(ListViewComponent);
      const newComponent = newFixture.componentInstance;

      // Set context to return undefined resourceDefinition
      newComponent.context = (() => ({
        resourceDefinition: undefined,
      })) as any;

      const showAlertSpy = jest.fn();
      newComponent.LuigiClient = (() => ({
        linkManager: () => ({
          fromContext: jest.fn().mockReturnThis(),
          navigate: jest.fn(),
          withParams: jest.fn().mockReturnThis(),
        }),
        uxManager: () => ({
          showAlert: showAlertSpy,
        }),
        getNodeParams: jest.fn(),
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

    it('should show alert and throw error when resourceDefinition is undefined in update method', () => {
      const newFixture = TestBed.createComponent(ListViewComponent);
      const newComponent = newFixture.componentInstance;

      // Set context to return undefined resourceDefinition
      newComponent.context = (() => ({
        resourceDefinition: undefined,
      })) as any;

      const showAlertSpy = jest.fn();
      newComponent.LuigiClient = (() => ({
        linkManager: () => ({
          fromContext: jest.fn().mockReturnThis(),
          navigate: jest.fn(),
          withParams: jest.fn().mockReturnThis(),
        }),
        uxManager: () => ({
          showAlert: showAlertSpy,
        }),
        getNodeParams: jest.fn(),
      })) as any;

      const resource = { metadata: { name: 'test' } } as any;
      // Test that update() method throws error when resourceDefinition is undefined
      expect(() => newComponent.update(resource)).toThrow(
        'Resource definition is not defined',
      );
      expect(showAlertSpy).toHaveBeenCalledWith({
        text: 'Resource definition is not defined',
        type: 'error',
      });
    });

    it('should handle edit resource modal with undefined resource name', () => {
      const event = { stopPropagation: jest.fn() } as any;
      const resource = { metadata: {} } as any; // metadata.name is undefined
      const openSpy = jest.fn();
      (component as any).createModal = () => ({ open: openSpy });

      mockResourceService.read.mockReturnValueOnce(of(resource));

      component.openEditResourceModal(event, resource);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(mockResourceService.read).toHaveBeenCalledWith(
        '', // Should use empty string when name is undefined
        expect.any(String),
        expect.any(String),
        expect.any(Array),
        expect.any(Object),
        false,
      );
      expect(openSpy).toHaveBeenCalledWith(resource);
    });

    it('should show alert and throw error when navigating to resource with undefined name', () => {
      const resource = { metadata: {} } as any;
      const showAlertSpy = jest.fn();
      component.LuigiClient = (() => ({
        linkManager: () => ({
          navigate: jest.fn(),
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
  })
});
