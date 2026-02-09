import { ApolloFactory } from './apollo-factory';
import { ResourceService } from './resource.service';
import { TestBed } from '@angular/core/testing';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import { mock } from 'jest-mock-extended';
import { Subject, of, throwError } from 'rxjs';

describe('ResourceService', () => {
  let service: ResourceService;
  let mockApollo: any;
  let mockApolloFactory: any;
  let mockLuigiCoreService: jest.Mocked<LuigiCoreService>;

  const resourceDefinition: any = {
    group: 'core.k8s.io',
    kind: 'TestKind',
    version: 'v1',
    scope: 'Namespaced',
    namespace: 'default',
    plural: 'testkinds',
  };

  const unversionedResourceDefinition: any = {
    ...resourceDefinition,
    version: undefined,
  };

  const grouplessResourceDefinition: any = {
    ...resourceDefinition,
    group: undefined,
  };

  const grouplessUnversionedResourceDefinition: any = {
    ...resourceDefinition,
    group: undefined,
    version: undefined,
  };

  const namespacedNodeContext: any = {
    cluster: 'test',
    namespaceId: 'test-namespace',
    resourceDefinition: {
      group: 'core.k8s.io',
      kind: 'TestKind',
      version: 'v1',
      scope: 'Namespaced',
      namespace: 'default',
      plural: 'testkinds',
    },
  };

  const unversionedNamespacedNodeContext: any = {
    ...namespacedNodeContext,
    resourceDefinition: {
      ...namespacedNodeContext.resourceDefinition,
      version: undefined,
    },
  };

  const grouplessNamespacedNodeContext: any = {
    ...namespacedNodeContext,
    resourceDefinition: {
      ...namespacedNodeContext.resourceDefinition,
      group: undefined,
    },
  };

  const grouplessUnversionedNamespacedNodeContext: any = {
    ...namespacedNodeContext,
    resourceDefinition: {
      ...namespacedNodeContext.resourceDefinition,
      group: undefined,
      version: undefined,
    },
  };

  const clusterScopeNodeContext: any = {
    namespaceId: 'test-namespace',
    resourceDefinition: {
      group: 'core.k8s.io',
      kind: 'TestKind',
      version: 'v1',
      scope: 'Cluster',
      namespace: 'default',
      plural: 'testkinds',
    },
  };

  const unversionedClusterScopeNodeContext: any = {
    ...clusterScopeNodeContext,
    resourceDefinition: {
      ...clusterScopeNodeContext.resourceDefinition,
      version: undefined,
    },
  };

  const grouplessClusterScopeNodeContext: any = {
    ...clusterScopeNodeContext,
    resourceDefinition: {
      ...clusterScopeNodeContext.resourceDefinition,
      group: undefined,
    },
  };

  const grouplessUnversionedClusterScopeNodeContext: any = {
    ...clusterScopeNodeContext,
    resourceDefinition: {
      ...clusterScopeNodeContext.resourceDefinition,
      group: undefined,
      version: undefined,
    },
  };

  const resource: any = { metadata: { name: 'test-name' } };

  beforeEach(() => {
    mockLuigiCoreService = mock();
    mockApollo = {
      query: jest.fn(),
      subscribe: jest.fn(),
      mutate: jest.fn(),
    };

    mockApolloFactory = {
      apollo: jest.fn().mockReturnValue(mockApollo),
    };

    TestBed.configureTestingModule({
      providers: [
        ResourceService,
        { provide: ApolloFactory, useValue: mockApolloFactory },
        { provide: LuigiCoreService, useValue: mockLuigiCoreService },
      ],
    });

    service = TestBed.inject(ResourceService);
  });

  describe('read', () => {
    it('should catch gql parsing error and complete the observable', (done) => {
      const invalidQuery =
        `query { core_k8s_io { TestKind(name: "test-name") {` as unknown as any;

      service['luigiCoreService'].showAlert = jest.fn();

      service
        .read(
          'test-name',
          { kind: 'TestKind', version: 'v1', group: 'core_k8s_io' },
          invalidQuery,
          namespacedNodeContext,
        )
        .subscribe({
          complete: () => {
            expect(mockLuigiCoreService.showAlert).toHaveBeenCalledWith({
              text: expect.any(String),
              type: 'error',
            });
            done();
          },
        });
    });

    it('should read resource using fields', (done) => {
      mockApollo.query.mockReturnValue(
        of({
          data: { core_k8s_io: { v1: { TestKind: { name: 'test' } } } },
        }),
      );

      service
        .read(
          'test-name',
          { kind: 'TestKind', version: 'v1', group: 'core_k8s_io' },
          ['name'],
          namespacedNodeContext,
        )
        .subscribe((res) => {
          expect(res).toEqual({ name: 'test' });
          expect(mockApollo.query).toHaveBeenCalledWith({
            query: expect.anything(),
            variables: {
              name: 'test-name',
              namespace: 'test-namespace',
            },
          });
          done();
        });
    });

    it('should read resource using fields with namespaced scope', (done) => {
      mockApollo.query.mockReturnValue(
        of({
          data: { core_k8s_io: { v1: { TestKind: { name: 'test' } } } },
        }),
      );

      service
        .read(
          'test-name',
          { kind: 'TestKind', version: 'v1', group: 'core_k8s_io' },
          ['name'],
          namespacedNodeContext,
        )
        .subscribe((res) => {
          expect(res).toEqual({ name: 'test' });
          expect(mockApollo.query).toHaveBeenCalledWith({
            query: expect.anything(),
            variables: {
              name: 'test-name',
              namespace: namespacedNodeContext.namespaceId,
            },
          });
          done();
        });
    });

    it('should read resource using fields with cluster scope', (done) => {
      mockApollo.query.mockReturnValue(
        of({
          data: { core_k8s_io: { v1: { TestKind: { name: 'test' } } } },
        }),
      );

      service
        .read(
          'test-name',
          { kind: 'TestKind', version: 'v1', group: 'core_k8s_io' },
          ['name'],
          clusterScopeNodeContext,
        )
        .subscribe((res) => {
          expect(res).toEqual({ name: 'test' });
          expect(mockApollo.query).toHaveBeenCalledWith({
            query: expect.anything(),
            variables: {
              name: 'test-name',
            },
          });
          done();
        });
    });

    it('should read resource using raw query, namespaced scope', (done) => {
      const rawQuery = `query { core_k8s_io { TestKind(name: "test-name") { name } } }`;
      mockApollo.query.mockReturnValue(
        of({
          data: { core_k8s_io: { v1: { TestKind: { name: 'test' } } } },
        }),
      );

      service
        .read(
          'test-name',
          { kind: 'TestKind', version: 'v1', group: 'core_k8s_io' },
          rawQuery,
          namespacedNodeContext,
        )
        .subscribe((res) => {
          expect(res).toEqual({ name: 'test' });
          expect(mockApollo.query).toHaveBeenCalledWith({
            query: expect.anything(),
            variables: {
              name: 'test-name',
              namespace: 'test-namespace',
            },
          });
          done();
        });
    });

    it('should read resource using raw query, cluster scope', (done) => {
      const rawQuery = `query { core_k8s_io { TestKind(name: "test") { name } } }`;
      mockApollo.query.mockReturnValue(
        of({
          data: { core_k8s_io: { v1: { TestKind: { name: 'test' } } } },
        }),
      );

      service
        .read(
          'test',
          { kind: 'TestKind', version: 'v1', group: 'core_k8s_io' },
          rawQuery,
          clusterScopeNodeContext,
        )
        .subscribe((res) => {
          expect(res).toEqual({ name: 'test' });
          expect(mockApollo.query).toHaveBeenCalledWith({
            query: expect.anything(),
            variables: {
              name: 'test',
            },
          });
          done();
        });
    });

    it('should read resource using raw query with namespace', (done) => {
      const rawQuery = `query { core_k8s_io { TestKind(name: "test-name", namespace: "test-namespace") { name } } }`;
      mockApollo.query.mockReturnValue(
        of({
          data: { core_k8s_io: { v1: { TestKind: { name: 'test' } } } },
        }),
      );

      service
        .read(
          'test-name',
          { kind: 'TestKind', version: 'v1', group: 'core_k8s_io' },
          rawQuery,
          namespacedNodeContext,
        )
        .subscribe((res) => {
          expect(res).toEqual({ name: 'test' });
          expect(mockApollo.query).toHaveBeenCalledWith({
            query: expect.anything(),
            variables: {
              name: 'test-name',
              namespace: namespacedNodeContext.namespaceId,
            },
          });
          done();
        });
    });

    it('should read resource with readFromParentKcpPath set to false', (done) => {
      mockApollo.query.mockReturnValue(
        of({
          data: { core_k8s_io: { v1: { TestKind: { name: 'test' } } } },
        }),
      );

      service
        .read(
          'test-name',
          { kind: 'TestKind', version: 'v1', group: 'core_k8s_io' },
          ['name'],
          namespacedNodeContext,
          false,
        )
        .subscribe((res) => {
          expect(mockApolloFactory.apollo).toHaveBeenCalledWith(
            namespacedNodeContext,
            false,
          );
          done();
        });
    });

    it('should read resource without group', (done) => {
      mockApollo.query.mockReturnValue(
        of({
          data: { v1: { TestKind: { name: 'test' } } },
        }),
      );

      service
        .read(
          'test-name',
          { kind: 'TestKind', version: 'v1', group: undefined },
          ['name'],
          grouplessNamespacedNodeContext,
        )
        .subscribe((res) => {
          expect(res).toEqual({ name: 'test' });
          done();
        });
    });
  });

  describe('list', () => {
    it('should throw error when resourceDefinition is missing', (done) => {
      const contextWithoutDefinition: any = {
        cluster: 'test',
        namespaceId: 'test-namespace',
      };

      service.list('myList', ['name'], contextWithoutDefinition).subscribe({
        error: (err) => {
          expect(err.message).toBe('Resource definition is required');
          done();
        },
      });
    });

    it('should throw when list query wrappers are empty', () => {
      const invalidContext: any = {
        ...namespacedNodeContext,
        resourceDefinition: {
          ...namespacedNodeContext.resourceDefinition,
          group: undefined,
          version: undefined,
          plural: '',
        },
      };

      expect(() => service.list('myList', ['name'], invalidContext)).toThrow(
        'At least one wrapper or inner fields is required',
      );
    });

    it('should throw error when initialListQuery returns empty result', (done) => {
      mockApollo.query.mockReturnValue(
        of({
          data: {
            core_k8s_io: {},
          },
        }),
      );

      service.list('myList', ['name'], namespacedNodeContext).subscribe({
        error: (err) => {
          expect(err.message).toBe('Resource list result not found');
          done();
        },
      });
    });

    it('should return initial items from query via startWith', (done) => {
      mockApollo.query.mockReturnValue(
        of({
          data: {
            core_k8s_io: {
              v1: {
                Testkinds: {
                  resourceVersion: '123',
                  items: [
                    { name: 'res1', metadata: { uid: 'uid1' } },
                    { name: 'res2', metadata: { uid: 'uid2' } },
                  ],
                },
              },
            },
          },
        }),
      );
      const subject = new Subject();
      mockApollo.subscribe.mockReturnValue(subject.asObservable());

      const results: any[] = [];
      service.list('myList', ['name'], namespacedNodeContext).subscribe({
        next: (res) => results.push(res),
      });

      expect(results[0]).toEqual({
        items: [
          {
            metadata: {
              uid: 'uid1',
            },
            name: 'res1',
            ready: false,
          },
          {
            metadata: {
              uid: 'uid2',
            },
            name: 'res2',
            ready: false,
          },
        ],
        resourceVersion: '123',
      });
      done();
    });

    it('should list namespaced resources', (done) => {
      mockApollo.query.mockReturnValue(
        of({
          data: {
            core_k8s_io: {
              v1: {
                Testkinds: {
                  resourceVersion: '123',
                  items: [{ name: 'res1', metadata: { uid: 'uid1' } }],
                },
              },
            },
          },
        }),
      );
      mockApollo.subscribe.mockReturnValue(
        of({
          data: {
            mylist: {
              type: 'ADDED',
              object: { name: 'res2', metadata: { uid: 'uid2' } },
            },
          },
        }),
      );
      service
        .list('mylist', ['name'], namespacedNodeContext)
        .subscribe((res) => {
          expect(mockApollo.query).toHaveBeenCalled();
          done();
        });
    });

    it('should list namespaced resources without version', (done) => {
      mockApollo.query.mockReturnValue(
        of({
          data: {
            core_k8s_io: {
              Testkinds: {
                resourceVersion: '123',
                items: [{ name: 'res1', metadata: { uid: 'uid1' } }],
              },
            },
          },
        }),
      );
      mockApollo.subscribe.mockReturnValue(
        of({
          data: {
            myList: {
              type: 'ADDED',
              object: { name: 'res2', metadata: { uid: 'uid2' } },
            },
          },
        }),
      );
      service
        .list('myList', ['name'], unversionedNamespacedNodeContext)
        .subscribe(() => {
          expect(mockApollo.query).toHaveBeenCalled();
          done();
        });
    });

    it('should list namespaced resources without group', (done) => {
      mockApollo.query.mockReturnValue(
        of({
          data: {
            v1: {
              Testkinds: {
                resourceVersion: '123',
                items: [{ name: 'res1', metadata: { uid: 'uid1' } }],
              },
            },
          },
        }),
      );
      mockApollo.subscribe.mockReturnValue(
        of({
          data: {
            myList: {
              type: 'ADDED',
              object: { name: 'res2', metadata: { uid: 'uid2' } },
            },
          },
        }),
      );
      service
        .list('myList', ['name'], grouplessNamespacedNodeContext)
        .subscribe(() => {
          expect(mockApollo.query).toHaveBeenCalled();
          done();
        });
    });

    it('should list namespaced resources without group and version', (done) => {
      mockApollo.query.mockReturnValue(
        of({
          data: {
            Testkinds: {
              resourceVersion: '123',
              items: [{ name: 'res1', metadata: { uid: 'uid1' } }],
            },
          },
        }),
      );
      mockApollo.subscribe.mockReturnValue(
        of({
          data: {
            myList: {
              type: 'ADDED',
              object: { name: 'res2', metadata: { uid: 'uid2' } },
            },
          },
        }),
      );
      service
        .list('myList', ['name'], grouplessUnversionedNamespacedNodeContext)
        .subscribe(() => {
          expect(mockApollo.query).toHaveBeenCalled();
          done();
        });
    });

    it('should list cluster resources', (done) => {
      mockApollo.query.mockReturnValue(
        of({
          data: {
            core_k8s_io: {
              v1: {
                Testkinds: {
                  resourceVersion: '123',
                  items: [{ name: 'res1', metadata: { uid: 'uid1' } }],
                },
              },
            },
          },
        }),
      );
      mockApollo.subscribe.mockReturnValue(
        of({
          data: {
            myList: {
              type: 'ADDED',
              object: { name: 'res2', metadata: { uid: 'uid2' } },
            },
          },
        }),
      );
      service
        .list('myList', ['name'], clusterScopeNodeContext)
        .subscribe((res) => {
          expect(mockApollo.query).toHaveBeenCalled();
          done();
        });
    });

    it('should list cluster resources without version', (done) => {
      mockApollo.query.mockReturnValue(
        of({
          data: {
            core_k8s_io: {
              Testkinds: {
                resourceVersion: '123',
                items: [{ name: 'res1', metadata: { uid: 'uid1' } }],
              },
            },
          },
        }),
      );
      mockApollo.subscribe.mockReturnValue(
        of({
          data: {
            myList: {
              type: 'ADDED',
              object: { name: 'res2', metadata: { uid: 'uid2' } },
            },
          },
        }),
      );
      service
        .list('myList', ['name'], unversionedClusterScopeNodeContext)
        .subscribe(() => {
          expect(mockApollo.query).toHaveBeenCalled();
          done();
        });
    });

    it('should list cluster resources without group', (done) => {
      mockApollo.query.mockReturnValue(
        of({
          data: {
            v1: {
              Testkinds: {
                resourceVersion: '123',
                items: [{ name: 'res1', metadata: { uid: 'uid1' } }],
              },
            },
          },
        }),
      );
      mockApollo.subscribe.mockReturnValue(
        of({
          data: {
            myList: {
              type: 'ADDED',
              object: { name: 'res2', metadata: { uid: 'uid2' } },
            },
          },
        }),
      );
      service
        .list('myList', ['name'], grouplessClusterScopeNodeContext)
        .subscribe(() => {
          expect(mockApollo.query).toHaveBeenCalled();
          done();
        });
    });

    it('should list cluster resources without group and version', (done) => {
      mockApollo.query.mockReturnValue(
        of({
          data: {
            Testkinds: {
              resourceVersion: '123',
              items: [{ name: 'res1', metadata: { uid: 'uid1' } }],
            },
          },
        }),
      );
      mockApollo.subscribe.mockReturnValue(
        of({
          data: {
            myList: {
              type: 'ADDED',
              object: { name: 'res2', metadata: { uid: 'uid2' } },
            },
          },
        }),
      );
      service
        .list('myList', ['name'], grouplessUnversionedClusterScopeNodeContext)
        .subscribe(() => {
          expect(mockApollo.query).toHaveBeenCalled();
          done();
        });
    });

    it('should list resources with namespace', (done) => {
      mockApollo.query.mockReturnValue(
        of({
          data: {
            core_k8s_io: {
              v1: {
                Testkinds: {
                  resourceVersion: '123',
                  items: [{ name: 'res1', metadata: { uid: 'uid1' } }],
                },
              },
            },
          },
        }),
      );
      mockApollo.subscribe.mockReturnValue(
        of({
          data: {
            myList: {
              type: 'ADDED',
              object: { name: 'res2', metadata: { uid: 'uid2' } },
            },
          },
        }),
      );

      service
        .list('myList', ['name'], namespacedNodeContext)
        .subscribe((res) => {
          expect(mockApollo.query).toHaveBeenCalled();
          done();
        });
    });

    it('should list namespaced resources (raw query string)', (done) => {
      const rawQuery = `
      query {
        mylist {
          mydata {
            name
          }
        }
      }
    `;
      mockApollo.query.mockReturnValue(
        of({ data: { mylist: { mydata: [{ name: 'res2' }] } } }),
      );

      service
        .list('mylist.mydata', rawQuery, namespacedNodeContext)
        .subscribe((res) => {
          expect(res).toEqual([{ name: 'res2' }]);
          expect(mockApollo.query).toHaveBeenCalledWith({
            query: expect.anything(),
            variables: {
              namespace: namespacedNodeContext.namespaceId,
            },
          });
          done();
        });
    });

    it('should return empty array for raw query when path is missing', (done) => {
      const rawQuery = `
      query {
        mylist {
          mydata {
            name
          }
        }
      }
    `;
      mockApollo.query.mockReturnValue(
        of({ data: { mylist: { mydata: [{ name: 'res2' }] } } }),
      );

      service
        .list('mylist.missing', rawQuery, namespacedNodeContext)
        .subscribe((res) => {
          expect(res).toEqual([]);
          done();
        });
    });

    it('should list cluster resources (raw query string)', (done) => {
      const rawQuery = `
      query {
        mylist {
          name
        }
      }
    `;
      mockApollo.query.mockReturnValue(
        of({ data: { mylist: [{ name: 'res2' }] } }),
      );

      service
        .list('mylist', rawQuery, clusterScopeNodeContext)
        .subscribe((res) => {
          expect(res).toEqual([{ name: 'res2' }]);
          expect(mockApollo.query).toHaveBeenCalledWith({
            query: expect.anything(),
            variables: {},
          });
          done();
        });
    });

    it('should handle raw query list error', (done) => {
      const rawQuery = `query { myList { name } }`;
      const error = new Error('raw query fail');
      mockApollo.query.mockReturnValue(throwError(() => error));
      console.error = jest.fn();

      service.list('myList', rawQuery, namespacedNodeContext).subscribe({
        error: (err) => {
          expect(console.error).toHaveBeenCalledWith(
            'Error executing GraphQL query.',
            error,
          );
          expect(mockLuigiCoreService.showAlert).toHaveBeenCalledWith({
            text: 'raw query fail',
            type: 'error',
          });
          done();
        },
      });
    });

    it('should list resources with pagination limit', (done) => {
      mockApollo.query.mockReturnValue(
        of({
          data: {
            core_k8s_io: {
              v1: {
                Testkinds: {
                  resourceVersion: '123',
                  items: [{ name: 'res1', metadata: { uid: 'uid1' } }],
                  continue: 'token-abc',
                  remainingItemCount: 10,
                },
              },
            },
          },
        }),
      );

      service
        .list('myList', ['name'], namespacedNodeContext, false, {
          limit: 5,
          continue: undefined,
        })
        .subscribe((res) => {
          expect(res.continue).toBe('token-abc');
          expect(res.remainingItemCount).toBe(10);
          done();
        });
    });

    it('should list resources with pagination continue token', (done) => {
      mockApollo.query.mockReturnValue(
        of({
          data: {
            core_k8s_io: {
              v1: {
                Testkinds: {
                  resourceVersion: '123',
                  items: [{ name: 'res1', metadata: { uid: 'uid1' } }],
                },
              },
            },
          },
        }),
      );

      service
        .list('myList', ['name'], namespacedNodeContext, false, {
          limit: 5,
          continue: 'token-123',
        })
        .subscribe(() => {
          expect(mockApollo.query).toHaveBeenCalled();
          done();
        });
    });

    it('should list resources with readFromParentKcpPath set to true', (done) => {
      mockApollo.query.mockReturnValue(
        of({
          data: {
            core_k8s_io: {
              v1: {
                Testkinds: {
                  resourceVersion: '123',
                  items: [{ name: 'res1', metadata: { uid: 'uid1' } }],
                },
              },
            },
          },
        }),
      );

      service
        .list('myList', ['name'], namespacedNodeContext, true)
        .subscribe(() => {
          expect(mockApolloFactory.apollo).toHaveBeenCalledWith(
            namespacedNodeContext,
            true,
          );
          done();
        });
    });

    it('should determine ready status from custom readyCondition', (done) => {
      const contextWithReadyCondition: any = {
        ...namespacedNodeContext,
        resourceDefinition: {
          ...namespacedNodeContext.resourceDefinition,
          readyCondition: {
            jsonPathExpression: '$.status.ready',
            property: 'status.ready',
          },
        },
      };

      mockApollo.query.mockReturnValue(
        of({
          data: {
            core_k8s_io: {
              v1: {
                Testkinds: {
                  resourceVersion: '123',
                  items: [
                    {
                      name: 'res1',
                      metadata: { uid: 'uid1' },
                      status: { ready: true },
                    },
                  ],
                },
              },
            },
          },
        }),
      );

      service
        .list('myList', ['name', 'status'], contextWithReadyCondition)
        .subscribe((res) => {
          expect(res.items[0].ready).toBe(true);
          done();
        });
    });

    it('should determine ready status from conditions when readyCondition is not defined', (done) => {
      mockApollo.query.mockReturnValue(
        of({
          data: {
            core_k8s_io: {
              v1: {
                Testkinds: {
                  resourceVersion: '123',
                  items: [
                    {
                      name: 'res1',
                      metadata: { uid: 'uid1' },
                      status: {
                        conditions: [{ type: 'Ready', status: 'True' }],
                      },
                    },
                  ],
                },
              },
            },
          },
        }),
      );

      service
        .list('myList', ['name', 'status'], namespacedNodeContext)
        .subscribe((res) => {
          expect(res.items[0].ready).toBe(true);
          done();
        });
    });

    it('should set ready to false when no Ready condition is found', (done) => {
      mockApollo.query.mockReturnValue(
        of({
          data: {
            core_k8s_io: {
              v1: {
                Testkinds: {
                  resourceVersion: '123',
                  items: [
                    {
                      name: 'res1',
                      metadata: { uid: 'uid1' },
                      status: {
                        conditions: [{ type: 'Other', status: 'True' }],
                      },
                    },
                  ],
                },
              },
            },
          },
        }),
      );

      service
        .list('myList', ['name', 'status'], namespacedNodeContext)
        .subscribe((res) => {
          expect(res.items[0].ready).toBe(false);
          done();
        });
    });

    it('should set ready to false when Ready condition status is not True', (done) => {
      mockApollo.query.mockReturnValue(
        of({
          data: {
            core_k8s_io: {
              v1: {
                Testkinds: {
                  resourceVersion: '123',
                  items: [
                    {
                      name: 'res1',
                      metadata: { uid: 'uid1' },
                      status: {
                        conditions: [{ type: 'Ready', status: 'False' }],
                      },
                    },
                  ],
                },
              },
            },
          },
        }),
      );

      service
        .list('myList', ['name', 'status'], namespacedNodeContext)
        .subscribe((res) => {
          expect(res.items[0].ready).toBe(false);
          done();
        });
    });

    it('should set ready to false when no status exists', (done) => {
      mockApollo.query.mockReturnValue(
        of({
          data: {
            core_k8s_io: {
              v1: {
                Testkinds: {
                  resourceVersion: '123',
                  items: [{ name: 'res1', metadata: { uid: 'uid1' } }],
                },
              },
            },
          },
        }),
      );

      service
        .list('myList', ['name'], namespacedNodeContext)
        .subscribe((res) => {
          expect(res.items[0].ready).toBe(false);
          done();
        });
    });
  });

  describe('listSubscription', () => {
    it('should subscribe to namespaced resource changes', (done) => {
      mockApollo.subscribe.mockReturnValue(
        of({
          data: {
            mySubscription: {
              type: 'ADDED',
              object: { name: 'res1', metadata: { uid: 'uid1' } },
            },
          },
        }),
      );

      service
        .resourceChangeSubscription(
          'mySubscription',
          ['name'],
          namespacedNodeContext,
          '123',
          false,
        )
        .subscribe((res) => {
          expect(res?.type).toBe('ADDED');
          expect(res?.object.name).toBe('res1');
          done();
        });
    });

    it('should subscribe to cluster resource changes', (done) => {
      mockApollo.subscribe.mockReturnValue(
        of({
          data: {
            mySubscription: {
              type: 'MODIFIED',
              object: { name: 'res1', metadata: { uid: 'uid1' } },
            },
          },
        }),
      );

      service
        .resourceChangeSubscription(
          'mySubscription',
          ['name'],
          clusterScopeNodeContext,
          '123',
          false,
        )
        .subscribe((res) => {
          expect(res?.type).toBe('MODIFIED');
          done();
        });
    });

    it('should include namespace in subscription variables for namespaced resources', (done) => {
      mockApollo.subscribe.mockReturnValue(
        of({
          data: {
            mySubscription: {
              type: 'ADDED',
              object: { name: 'res1', metadata: { uid: 'uid1' } },
            },
          },
        }),
      );

      service
        .resourceChangeSubscription(
          'mySubscription',
          ['name'],
          namespacedNodeContext,
          '123',
          false,
        )
        .subscribe(() => {
          expect(mockApollo.subscribe).toHaveBeenCalledWith({
            query: expect.anything(),
            variables: expect.objectContaining({
              namespace: 'test-namespace',
              resourceVersion: '123',
            }),
          });
          done();
        });
    });

    it('should not include namespace in subscription variables for cluster resources', (done) => {
      mockApollo.subscribe.mockReturnValue(
        of({
          data: {
            mySubscription: {
              type: 'ADDED',
              object: { name: 'res1', metadata: { uid: 'uid1' } },
            },
          },
        }),
      );

      service
        .resourceChangeSubscription(
          'mySubscription',
          ['name'],
          clusterScopeNodeContext,
          '123',
          false,
        )
        .subscribe(() => {
          expect(mockApollo.subscribe).toHaveBeenCalledWith({
            query: expect.anything(),
            variables: expect.objectContaining({
              resourceVersion: '123',
            }),
          });
          const callArgs = mockApollo.subscribe.mock.calls[0][0];
          expect(callArgs.variables.namespace).toBeUndefined();
          done();
        });
    });

    it('should set ready status on subscription object using readyCondition', (done) => {
      const contextWithReadyCondition: any = {
        ...namespacedNodeContext,
        resourceDefinition: {
          ...namespacedNodeContext.resourceDefinition,
          readyCondition: {
            jsonPathExpression: '$.status.ready',
            property: 'status.ready',
          },
        },
      };

      mockApollo.subscribe.mockReturnValue(
        of({
          data: {
            mySubscription: {
              type: 'ADDED',
              object: {
                name: 'res1',
                metadata: { uid: 'uid1' },
                status: { ready: true },
              },
            },
          },
        }),
      );

      service
        .resourceChangeSubscription(
          'mySubscription',
          ['name', 'status'],
          contextWithReadyCondition,
          '123',
          false,
        )
        .subscribe((res) => {
          expect(res?.object.ready).toBe(true);
          done();
        });
    });

    it('should set ready status on subscription object using conditions', (done) => {
      mockApollo.subscribe.mockReturnValue(
        of({
          data: {
            mySubscription: {
              type: 'ADDED',
              object: {
                name: 'res1',
                metadata: { uid: 'uid1' },
                status: {
                  conditions: [{ type: 'Ready', status: 'True' }],
                },
              },
            },
          },
        }),
      );

      service
        .resourceChangeSubscription(
          'mySubscription',
          ['name', 'status'],
          namespacedNodeContext,
          '123',
          false,
        )
        .subscribe((res) => {
          expect(res?.object.ready).toBe(true);
          done();
        });
    });

    it('should return undefined when subscription result is undefined', (done) => {
      mockApollo.subscribe.mockReturnValue(
        of({
          data: {
            someOtherField: {},
          },
        }),
      );

      service
        .resourceChangeSubscription(
          'mySubscription',
          ['name'],
          namespacedNodeContext,
          '123',
          false,
        )
        .subscribe((res) => {
          expect(res).toBeUndefined();
          done();
        });
    });

    it('should use readFromParentKcpPath parameter', (done) => {
      mockApollo.subscribe.mockReturnValue(
        of({
          data: {
            mySubscription: {
              type: 'ADDED',
              object: { name: 'res1', metadata: { uid: 'uid1' } },
            },
          },
        }),
      );

      service
        .resourceChangeSubscription(
          'mySubscription',
          ['name'],
          namespacedNodeContext,
          '123',
          true,
        )
        .subscribe(() => {
          expect(mockApolloFactory.apollo).toHaveBeenCalledWith(
            namespacedNodeContext,
            true,
          );
          done();
        });
    });
  });

  describe('delete', () => {
    it('should delete resource', (done) => {
      mockApollo.mutate.mockReturnValue(of({}));
      service
        .delete(resource, resourceDefinition, namespacedNodeContext)
        .subscribe((res) => {
          expect(mockApollo.mutate).toHaveBeenCalled();
          done();
        });
    });

    it('should delete namespaced resource', (done) => {
      mockApollo.mutate.mockReturnValue(of({}));

      service
        .delete(resource, resourceDefinition, namespacedNodeContext)
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            variables: {
              name: 'test-name',
              namespace: namespacedNodeContext.namespaceId,
            },
          });
          done();
        });
    });

    it('should delete namespaced resource without version', (done) => {
      mockApollo.mutate.mockReturnValue(of({}));

      service
        .delete(
          resource,
          unversionedResourceDefinition,
          unversionedNamespacedNodeContext,
        )
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            variables: {
              name: 'test-name',
              namespace: unversionedNamespacedNodeContext.namespaceId,
            },
          });
          done();
        });
    });

    it('should delete namespaced resource without group', (done) => {
      mockApollo.mutate.mockReturnValue(of({}));

      service
        .delete(
          resource,
          grouplessResourceDefinition,
          grouplessNamespacedNodeContext,
        )
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            variables: {
              name: 'test-name',
              namespace: grouplessNamespacedNodeContext.namespaceId,
            },
          });
          done();
        });
    });

    it('should delete namespaced resource without group and version', (done) => {
      mockApollo.mutate.mockReturnValue(of({}));

      service
        .delete(
          resource,
          grouplessUnversionedResourceDefinition,
          grouplessUnversionedNamespacedNodeContext,
        )
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            variables: {
              name: 'test-name',
              namespace: grouplessUnversionedNamespacedNodeContext.namespaceId,
            },
          });
          done();
        });
    });

    it('should delete cluster resource', (done) => {
      mockApollo.mutate.mockReturnValue(of({}));

      service
        .delete(resource, resourceDefinition, clusterScopeNodeContext)
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            variables: {
              name: 'test-name',
            },
          });
          done();
        });
    });

    it('should handle delete error', (done) => {
      const error = new Error('fail');
      mockApollo.mutate.mockReturnValue(throwError(() => error));
      console.error = jest.fn();

      service
        .delete(resource, resourceDefinition, clusterScopeNodeContext)
        .subscribe({
          error: () => {
            expect(console.error).toHaveBeenCalledWith(
              'Error executing GraphQL query.',
              error,
            );
            expect(mockLuigiCoreService.showAlert).toHaveBeenCalledWith({
              text: 'fail',
              type: 'error',
            });
            done();
          },
        });
    });
  });

  describe('create', () => {
    it('should create resource', (done) => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );
      service
        .create(resource, resourceDefinition, namespacedNodeContext)
        .subscribe((res) => {
          expect(mockApollo.mutate).toHaveBeenCalled();
          done();
        });
    });

    it('should create namespaced resource ', (done) => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      service
        .create(resource, resourceDefinition, namespacedNodeContext)
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            fetchPolicy: 'no-cache',
            variables: {
              object: resource,
              namespace: namespacedNodeContext.namespaceId,
            },
          });
          done();
        });
    });

    it('should create namespaced resource without version', (done) => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      service
        .create(
          resource,
          unversionedResourceDefinition,
          unversionedNamespacedNodeContext,
        )
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            fetchPolicy: 'no-cache',
            variables: {
              object: resource,
              namespace: unversionedNamespacedNodeContext.namespaceId,
            },
          });
          done();
        });
    });

    it('should create namespaced resource without group', (done) => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      service
        .create(
          resource,
          grouplessResourceDefinition,
          grouplessNamespacedNodeContext,
        )
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            fetchPolicy: 'no-cache',
            variables: {
              object: resource,
              namespace: grouplessNamespacedNodeContext.namespaceId,
            },
          });
          done();
        });
    });

    it('should create namespaced resource without group and version', (done) => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      service
        .create(
          resource,
          grouplessUnversionedResourceDefinition,
          grouplessUnversionedNamespacedNodeContext,
        )
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            fetchPolicy: 'no-cache',
            variables: {
              object: resource,
              namespace: grouplessUnversionedNamespacedNodeContext.namespaceId,
            },
          });
          done();
        });
    });

    it('should create cluster resource ', (done) => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      service
        .create(resource, resourceDefinition, clusterScopeNodeContext)
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            fetchPolicy: 'no-cache',
            variables: {
              object: resource,
            },
          });
          done();
        });
    });

    it('should handle create error', (done) => {
      const error = new Error('fail');
      mockApollo.mutate.mockReturnValue(throwError(() => error));
      console.error = jest.fn();

      service
        .create(resource, resourceDefinition, clusterScopeNodeContext)
        .subscribe({
          error: () => {
            expect(console.error).toHaveBeenCalledWith(
              'Error executing GraphQL query.',
              error,
            );
            expect(mockLuigiCoreService.showAlert).toHaveBeenCalledWith({
              text: 'fail',
              type: 'error',
            });
            done();
          },
        });
    });
  });

  describe('update', () => {
    it('should strip __typename recursively from update payload', (done) => {
      const dirtyResource: any = {
        metadata: { name: 'test-name', __typename: 'Meta' },
        spec: {
          __typename: 'Spec',
          items: [
            { key: 'a', __typename: 'Item' },
            { key: 'b', nested: { foo: 'bar', __typename: 'Nested' } },
          ],
          map: {
            one: { val: 1, __typename: 'Val' },
            two: [{ x: 1, __typename: 'X' }, { y: 2 }],
          },
        },
      };

      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      service
        .update(dirtyResource, resourceDefinition, namespacedNodeContext)
        .subscribe(() => {
          const mutateCall = mockApollo.mutate.mock.calls[0][0];
          const passedObject = mutateCall.variables.object;
          expect(passedObject).toEqual({
            metadata: { name: 'test-name' },
            spec: {
              items: [{ key: 'a' }, { key: 'b', nested: { foo: 'bar' } }],
              map: {
                one: { val: 1 },
                two: [{ x: 1 }, { y: 2 }],
              },
            },
          });
          done();
        });
    });
    it('should update resource', (done) => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );
      service
        .update(resource, resourceDefinition, namespacedNodeContext)
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalled();
          done();
        });
    });

    it('should update namespaced resource', (done) => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      service
        .update(resource, resourceDefinition, namespacedNodeContext)
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            fetchPolicy: 'no-cache',
            variables: {
              name: resource.metadata.name,
              object: resource,
              namespace: namespacedNodeContext.namespaceId,
            },
          });
          done();
        });
    });

    it('should update namespaced resource without version', (done) => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      service
        .update(
          resource,
          unversionedResourceDefinition,
          unversionedNamespacedNodeContext,
        )
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            fetchPolicy: 'no-cache',
            variables: {
              name: resource.metadata.name,
              object: resource,
              namespace: unversionedNamespacedNodeContext.namespaceId,
            },
          });
          done();
        });
    });

    it('should update namespaced resource without group', (done) => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      service
        .update(
          resource,
          grouplessResourceDefinition,
          grouplessNamespacedNodeContext,
        )
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            fetchPolicy: 'no-cache',
            variables: {
              name: resource.metadata.name,
              object: resource,
              namespace: grouplessNamespacedNodeContext.namespaceId,
            },
          });
          done();
        });
    });

    it('should update namespaced resource without group and version', (done) => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      service
        .update(
          resource,
          grouplessUnversionedResourceDefinition,
          grouplessUnversionedNamespacedNodeContext,
        )
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            fetchPolicy: 'no-cache',
            variables: {
              name: resource.metadata.name,
              object: resource,
              namespace: grouplessUnversionedNamespacedNodeContext.namespaceId,
            },
          });
          done();
        });
    });

    it('should update cluster resource', (done) => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      service
        .update(resource, resourceDefinition, clusterScopeNodeContext)
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            fetchPolicy: 'no-cache',
            variables: {
              name: resource.metadata.name,
              object: resource,
            },
          });
          done();
        });
    });

    it('should handle update error', (done) => {
      const error = new Error('fail');
      mockApollo.mutate.mockReturnValue(throwError(() => error));
      console.error = jest.fn();

      service
        .update(resource, resourceDefinition, clusterScopeNodeContext)
        .subscribe({
          error: () => {
            expect(console.error).toHaveBeenCalledWith(
              'Error executing GraphQL query.',
              error,
            );
            expect(mockLuigiCoreService.showAlert).toHaveBeenCalledWith({
              text: 'fail',
              type: 'error',
            });
            done();
          },
        });
    });
  });

  // NEW TEST CASES FOR MISSING COVERAGE

  describe('Private methods and edge cases', () => {
    describe('isNamespacedResource', () => {
      it('should return true for Namespaced scope', () => {
        const result = service['isNamespacedResource'](namespacedNodeContext);
        expect(result).toBe(true);
      });

      it('should return false for Cluster scope', () => {
        const result = service['isNamespacedResource'](clusterScopeNodeContext);
        expect(result).toBe(false);
      });

      it('should handle undefined scope', () => {
        const context: any = {
          resourceDefinition: {},
        };
        const result = service['isNamespacedResource'](context);
        expect(result).toBe(false);
      });

      it('should handle undefined resourceDefinition', () => {
        const context: any = {};
        const result = service['isNamespacedResource'](context);
        expect(result).toBe(false);
      });
    });

    describe('normalizeGqlBuilderVariables', () => {
      it('should convert gql-builder format to simple key-value pairs', () => {
        const variables = {
          name: { type: 'String!', value: 'test' },
          namespace: { type: 'String', value: 'default' },
          limit: { type: 'Int', value: 10 },
        };

        const result = service['normalizeGqlBuilderVariables'](variables);

        expect(result).toEqual({
          name: 'test',
          namespace: 'default',
          limit: 10,
        });
      });

      it('should handle empty variables', () => {
        const result = service['normalizeGqlBuilderVariables']({});
        expect(result).toEqual({});
      });
    });

    describe('calcQueryOptions', () => {
      it('should build query options with multiple wrappers', () => {
        const innerFields = [
          {
            operation: 'TestKind',
            fields: ['name', 'namespace'],
            variables: { name: { type: 'String!', value: 'test' } },
          },
        ];

        const wrappers = [{ operation: 'core_k8s_io' }, { operation: 'v1' }];

        const result = service['calcQueryOptions'](innerFields, wrappers);

        expect(result.operation).toBe('core_k8s_io');
        expect(result.fields).toBeDefined();
      });

      it('should handle single wrapper', () => {
        const innerFields = [
          {
            operation: 'TestKind',
            fields: ['name'],
          },
        ];

        const wrappers = [{ operation: 'v1' }];

        const result = service['calcQueryOptions'](innerFields, wrappers);

        expect(result.operation).toBe('v1');
      });

      it('should handle no wrappers and return innerField as complete query', () => {
        const innerFields = [
          {
            operation: 'TestKind',
            fields: ['name'],
          },
        ];

        const wrappers: any[] = [];

        const result = service['calcQueryOptions'](innerFields, wrappers);

        expect(result.operation).toBe('TestKind');
        expect(result.fields).toEqual(['name']);
      });

      it('should throw error when no wrappers and innerFields is invalid', () => {
        const innerFields: any[] = [];
        const wrappers: any[] = [];

        expect(() =>
          service['calcQueryOptions'](innerFields, wrappers),
        ).toThrow('At least one wrapper or inner fields is required');
      });

      it('should filter out wrappers without operation', () => {
        const innerFields = [
          {
            operation: 'TestKind',
            fields: ['name'],
          },
        ];

        const wrappers = [
          { operation: undefined },
          { operation: 'v1' },
          { operation: null },
        ] as any;

        const result = service['calcQueryOptions'](innerFields, wrappers);

        expect(result.operation).toBe('v1');
      });

      it('should handle wrapper with variables', () => {
        const innerFields = [
          {
            operation: 'TestKind',
            fields: ['name'],
          },
        ];

        const wrappers = [
          { operation: 'v1', variables: { limit: { type: 'Int', value: 10 } } },
        ];

        const result = service['calcQueryOptions'](innerFields, wrappers);

        expect(result.variables).toBeDefined();
      });
    });

    describe('getResourceReadyStatus', () => {
      it('should use readyCondition when defined', () => {
        const contextWithReadyCondition: any = {
          resourceDefinition: {
            readyCondition: {
              jsonPathExpression: '$.status.ready',
              property: 'status.ready',
            },
          },
        };

        const resource: any = {
          status: { ready: true },
        };

        const result = service['getResourceReadyStatus'](
          resource,
          contextWithReadyCondition,
        );

        expect(result).toBe(true);
      });

      it('should fallback to conditions when readyCondition is not defined', () => {
        const resource: any = {
          status: {
            conditions: [{ type: 'Ready', status: 'True' }],
          },
        };

        const result = service['getResourceReadyStatus'](
          resource,
          namespacedNodeContext,
        );

        expect(result).toBe(true);
      });

      it('should return false when Ready condition status is False', () => {
        const resource: any = {
          status: {
            conditions: [{ type: 'Ready', status: 'False' }],
          },
        };

        const result = service['getResourceReadyStatus'](
          resource,
          namespacedNodeContext,
        );

        expect(result).toBe(false);
      });

      it('should return false when no conditions exist', () => {
        const resource: any = {
          status: {},
        };

        const result = service['getResourceReadyStatus'](
          resource,
          namespacedNodeContext,
        );

        expect(result).toBe(false);
      });

      it('should return false when status is undefined', () => {
        const resource: any = {};

        const result = service['getResourceReadyStatus'](
          resource,
          namespacedNodeContext,
        );

        expect(result).toBe(false);
      });

      it('should handle readyCondition that returns falsy value', () => {
        const contextWithReadyCondition: any = {
          resourceDefinition: {
            readyCondition: {
              jsonPathExpression: '$.status.ready',
              property: 'status.ready',
            },
          },
        };

        const resource: any = {
          status: { ready: false },
        };

        const result = service['getResourceReadyStatus'](
          resource,
          contextWithReadyCondition,
        );

        expect(result).toBe(false);
      });
    });

    describe('resolveReadQuery', () => {
      it('should build query from fields array', () => {
        const params = {
          kind: 'TestKind',
          version: 'v1',
          group: 'core_k8s_io',
        };
        const fields = ['name', 'namespace'];
        const resourceId = 'test-id';
        const namespace = 'test-namespace';

        const result = service['resolveReadQuery'](
          params,
          fields,
          resourceId,
          namespace,
        );

        expect(result).toContain('TestKind');
        expect(result).toContain('name');
        expect(result).toContain('namespace');
      });

      it('should return raw query string when provided', () => {
        const params = {
          kind: 'TestKind',
          version: 'v1',
          group: 'core_k8s_io',
        };
        const rawQuery = 'query { TestKind { name } }';
        const resourceId = 'test-id';
        const namespace = undefined;

        const result = service['resolveReadQuery'](
          params,
          rawQuery,
          resourceId,
          namespace,
        );

        expect(result).toBe(rawQuery);
      });

      it('should build query without namespace when namespace is undefined', () => {
        const params = {
          kind: 'TestKind',
          version: 'v1',
          group: 'core_k8s_io',
        };
        const fields = ['name'];
        const resourceId = 'test-id';
        const namespace = undefined;

        const result = service['resolveReadQuery'](
          params,
          fields,
          resourceId,
          namespace,
        );

        expect(result).toContain('TestKind');
        expect(result).not.toContain('namespace');
      });
    });
  });

  describe('Error handling edge cases', () => {
    it('should handle list error with fields', (done) => {
      const error = new Error('list failed');
      mockApollo.query.mockReturnValue(throwError(() => error));

      service.list('myList', ['name'], namespacedNodeContext).subscribe({
        error: (err) => {
          expect(err).toBeDefined();
          done();
        },
      });
    });

    it('should handle read error', (done) => {
      const error = new Error('read failed');
      mockApollo.query.mockReturnValue(throwError(() => error));

      service
        .read(
          'test-name',
          { kind: 'TestKind', version: 'v1', group: 'core_k8s_io' },
          ['name'],
          namespacedNodeContext,
        )
        .subscribe({
          error: (err) => {
            expect(err).toBeDefined();
            done();
          },
        });
    });

    it('should handle subscription error', (done) => {
      const error = new Error('subscription failed');
      mockApollo.subscribe.mockReturnValue(throwError(() => error));

      service
        .resourceChangeSubscription(
          'mySubscription',
          ['name'],
          namespacedNodeContext,
          '123',
          false,
        )
        .subscribe({
          error: (err) => {
            expect(err).toBeDefined();
            done();
          },
        });
    });
  });

  describe('Complex pagination scenarios', () => {
    it('should handle pagination with both limit and continue', (done) => {
      mockApollo.query.mockReturnValue(
        of({
          data: {
            core_k8s_io: {
              v1: {
                Testkinds: {
                  resourceVersion: '123',
                  items: [{ name: 'res1', metadata: { uid: 'uid1' } }],
                  continue: 'next-token',
                  remainingItemCount: 5,
                },
              },
            },
          },
        }),
      );

      service
        .list('myList', ['name'], namespacedNodeContext, false, {
          limit: 10,
          continue: 'prev-token',
        })
        .subscribe((res) => {
          const queryCall = mockApollo.query.mock.calls[0][0];
          expect(queryCall.variables).toEqual(
            expect.objectContaining({
              limit: 10,
              continue: 'prev-token',
            }),
          );
          done();
        });
    });

    it('should not include pagination variables when not provided', (done) => {
      mockApollo.query.mockReturnValue(
        of({
          data: {
            core_k8s_io: {
              v1: {
                Testkinds: {
                  resourceVersion: '123',
                  items: [{ name: 'res1', metadata: { uid: 'uid1' } }],
                },
              },
            },
          },
        }),
      );

      service
        .list('myList', ['name'], namespacedNodeContext, false, undefined)
        .subscribe(() => {
          const queryCall = mockApollo.query.mock.calls[0][0];
          expect(queryCall.variables.limit).toBeUndefined();
          expect(queryCall.variables.continue).toBeUndefined();
          done();
        });
    });
  });

  describe('Apollo factory calls', () => {
    it('should call apollo factory with correct parameters for read', (done) => {
      mockApollo.query.mockReturnValue(
        of({
          data: { core_k8s_io: { v1: { TestKind: { name: 'test' } } } },
        }),
      );

      service
        .read(
          'test-name',
          { kind: 'TestKind', version: 'v1', group: 'core_k8s_io' },
          ['name'],
          namespacedNodeContext,
          true,
        )
        .subscribe(() => {
          expect(mockApolloFactory.apollo).toHaveBeenCalledWith(
            namespacedNodeContext,
            true,
          );
          done();
        });
    });

    it('should default readFromParentKcpPath to false for delete', (done) => {
      mockApollo.mutate.mockReturnValue(of({}));

      service
        .delete(resource, resourceDefinition, namespacedNodeContext)
        .subscribe(() => {
          expect(mockApolloFactory.apollo).toHaveBeenCalledWith(
            namespacedNodeContext,
          );
          done();
        });
    });

    it('should default readFromParentKcpPath to false for create', (done) => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      service
        .create(resource, resourceDefinition, namespacedNodeContext)
        .subscribe(() => {
          expect(mockApolloFactory.apollo).toHaveBeenCalledWith(
            namespacedNodeContext,
          );
          done();
        });
    });

    it('should default readFromParentKcpPath to false for update', (done) => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      service
        .update(resource, resourceDefinition, namespacedNodeContext)
        .subscribe(() => {
          expect(mockApolloFactory.apollo).toHaveBeenCalledWith(
            namespacedNodeContext,
          );
          done();
        });
    });
  });

  describe('Delete operation variations', () => {
    it('should delete cluster resource without version', (done) => {
      mockApollo.mutate.mockReturnValue(of({}));

      service
        .delete(
          resource,
          unversionedResourceDefinition,
          unversionedClusterScopeNodeContext,
        )
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            variables: {
              name: 'test-name',
            },
          });
          done();
        });
    });

    it('should delete cluster resource without group', (done) => {
      mockApollo.mutate.mockReturnValue(of({}));

      service
        .delete(
          resource,
          grouplessResourceDefinition,
          grouplessClusterScopeNodeContext,
        )
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalled();
          done();
        });
    });

    it('should delete cluster resource without group and version', (done) => {
      mockApollo.mutate.mockReturnValue(of({}));

      service
        .delete(
          resource,
          grouplessUnversionedResourceDefinition,
          grouplessUnversionedClusterScopeNodeContext,
        )
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalled();
          done();
        });
    });
  });

  describe('Create operation variations', () => {
    it('should create cluster resource without version', (done) => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      service
        .create(
          resource,
          unversionedResourceDefinition,
          unversionedClusterScopeNodeContext,
        )
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            fetchPolicy: 'no-cache',
            variables: {
              object: resource,
            },
          });
          done();
        });
    });

    it('should create cluster resource without group', (done) => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      service
        .create(
          resource,
          grouplessResourceDefinition,
          grouplessClusterScopeNodeContext,
        )
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalled();
          done();
        });
    });

    it('should create cluster resource without group and version', (done) => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      service
        .create(
          resource,
          grouplessUnversionedResourceDefinition,
          grouplessUnversionedClusterScopeNodeContext,
        )
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalled();
          done();
        });
    });
  });

  describe('Update operation variations', () => {
    it('should update cluster resource without version', (done) => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      service
        .update(
          resource,
          unversionedResourceDefinition,
          unversionedClusterScopeNodeContext,
        )
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            fetchPolicy: 'no-cache',
            variables: {
              name: resource.metadata.name,
              object: resource,
            },
          });
          done();
        });
    });

    it('should update cluster resource without group', (done) => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      service
        .update(
          resource,
          grouplessResourceDefinition,
          grouplessClusterScopeNodeContext,
        )
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalled();
          done();
        });
    });

    it('should update cluster resource without group and version', (done) => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      service
        .update(
          resource,
          grouplessUnversionedResourceDefinition,
          grouplessUnversionedClusterScopeNodeContext,
        )
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalled();
          done();
        });
    });
  });
});
