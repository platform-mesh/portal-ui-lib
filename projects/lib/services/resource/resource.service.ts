import { ApolloFactory } from './apollo-factory';
import { ResourceNodeContext } from './resource-node-context';
import { Injectable, inject } from '@angular/core';
import { TypedDocumentNode } from '@apollo/client/core';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import {
  AccountInfo,
  Resource,
  ResourceDefinition,
  ResourceListResult,
  ResourceOperationTypeMap,
  ResourceSubscriptionResult,
} from '@platform-mesh/portal-ui-lib/models';
import {
  capitalize,
  getValueByPath,
  replaceDotsAndHyphensWithUnderscores,
  stripTypename,
} from '@platform-mesh/portal-ui-lib/utils';
import { gql } from 'apollo-angular';
import * as gqlBuilder from 'gql-query-builder';
import VariableOptions from 'gql-query-builder/build/VariableOptions';
import { EMPTY, Observable, throwError } from 'rxjs';
import { catchError, map, startWith, switchMap, tap } from 'rxjs/operators';

interface ResourceResponseError extends Record<string, any> {
  message: string;
}

export interface ResourceRequestParams {
  kind: string;
  version: string;
  operation: string;
}

@Injectable({
  providedIn: 'root',
})
export class ResourceService {
  private apolloFactory = inject(ApolloFactory);
  private luigiCoreService = inject(LuigiCoreService);

  read(
    resourceId: string,
    params: ResourceRequestParams,
    fieldsOrRawQuery: any[] | string,
    nodeContext: ResourceNodeContext,
    readFromParentKcpPath: boolean = true,
  ): Observable<Resource> {
    const isNamespacedResource = this.isNamespacedResource(nodeContext);

    let query: string | TypedDocumentNode<any, any> = this.resolveReadQuery(
      params,
      fieldsOrRawQuery,
      resourceId,
      isNamespacedResource ? nodeContext.namespaceId : undefined,
    );

    try {
      query = gql`
        ${query}
      `;
    } catch (error) {
      this.luigiCoreService.showAlert({
        text: `Could not read a resource: ${resourceId}. Wrong read query: <br/><br/> ${query}`,
        type: 'error',
      });
      return EMPTY;
    }

    return this.apolloFactory
      .apollo(nodeContext, readFromParentKcpPath)
      .query({
        query,
        variables: {
          name: resourceId,
          ...(isNamespacedResource && {
            namespace: nodeContext.namespaceId,
          }),
        },
      })
      .pipe(
        map(
          (res) =>
            res.data?.[params.operation]?.[params.version]?.[params.kind],
        ),
        catchError((error) => {
          this.alertErrors(error);
          console.error('Error executing GraphQL query.', error);

          if (
            error.message?.toLowerCase().includes('forbidden') ||
            error.message?.includes('access denied')
          ) {
            this.luigiCoreService.navigation().navigate('/error/403');
          } else {
            this.luigiCoreService.navigation().navigate('/error/404');
          }

          return error;
        }),
        tap((resource) => {
          if (resource.metadata?.deletionTimestamp) {
            const message = `The resource ${resourceId} is pending deletion.`;
            this.luigiCoreService.navigation().navigate('/error/422');
            throw new Error(message);
          }
        }),
      );
  }

  private resolveReadQuery(
    params: ResourceRequestParams,
    fieldsOrRawQuery: any[] | string,
    resourceId: string,
    namespace: string | undefined,
  ) {
    if (fieldsOrRawQuery instanceof Array) {
      const { kind, version, operation } = params;
      return (
        gqlBuilder
          .query({
            operation: kind,
            variables: {
              name: { value: resourceId, type: 'String!' },
              ...(namespace && {
                namespace: { value: namespace, type: 'String' },
              }),
            },
            fields: fieldsOrRawQuery,
          })
          .query.replace(kind, `${operation} { ${version} { ${kind}`)
          .trim() + '}}'
      );
    } else {
      return fieldsOrRawQuery;
    }
  }

  list(
    operation: string,
    fieldsOrRawQuery: any[] | string,
    nodeContext: ResourceNodeContext,
    readFromParentKcpPath: boolean = false,
  ): Observable<Resource[] | any> {
    return fieldsOrRawQuery instanceof Array
      ? this.listWithFields(
          operation,
          fieldsOrRawQuery,
          nodeContext,
          readFromParentKcpPath,
        )
      : this.listWithRawQuery(
          operation,
          fieldsOrRawQuery,
          nodeContext,
          readFromParentKcpPath,
        );
  }

  private listWithFields(
    operation: string,
    fields: any[],
    nodeContext: ResourceNodeContext,
    readFromParentKcpPath: boolean,
  ): Observable<Resource[] | any> {
    const resourceDefinition = nodeContext.resourceDefinition;
    if (!resourceDefinition) {
      return throwError(() => new Error('Resource definition is required'));
    }

    const isNamespacedResource = this.isNamespacedResource(nodeContext);
    const variables = {
      ...(isNamespacedResource && {
        namespace: { type: 'String', value: nodeContext.namespaceId },
      }),
    };

    fields.push({ metadata: ['uid'] });

    return this.initialListQuery(
      resourceDefinition,
      fields,
      nodeContext,
      readFromParentKcpPath,
      variables,
    ).pipe(
      switchMap((value: ResourceListResult) => {
        const { resourceVersion, items } = value;
        const subscriptionQuery = gqlBuilder.subscription({
          operation: operation,
          fields: ['type', { object: fields }],
          variables: {
            ...variables,
            resourceVersion: { type: 'String', value: resourceVersion },
          },
        });

        const result = new Map<string, Resource>(
          items.map((item) => [item.metadata.uid!, item]),
        );

        return this.apolloFactory
          .apollo(nodeContext, readFromParentKcpPath)
          .subscribe({
            query: gql`
              ${subscriptionQuery.query}
            `,
            variables: subscriptionQuery.variables,
          })
          .pipe(
            map((res: any): Resource[] => {
              const resourceResult: ResourceSubscriptionResult | undefined =
                getValueByPath(res.data, operation);

              if (!resourceResult) {
                return Array.from(result.values());
              }

              const { type, object } = resourceResult;
              if (type === ResourceOperationTypeMap.ADDED) {
                result.set(object.metadata.uid!, object);
              } else if (type === ResourceOperationTypeMap.MODIFIED) {
                result.set(object.metadata.uid!, object);
              } else if (type === ResourceOperationTypeMap.DELETED) {
                result.delete(object.metadata.uid!);
              }

              return Array.from(result.values());
            }),
            startWith(Array.from(result.values())),
            catchError((error) => {
              this.alertErrors(error);
              console.error('Error executing GraphQL query.', error);
              return error;
            }),
          );
      }),
    );
  }

  private initialListQuery(
    resourceDefinition: ResourceDefinition,
    fields: any[],
    nodeContext: ResourceNodeContext,
    readFromParentKcpPath: boolean,
    variables?: VariableOptions,
  ): Observable<ResourceListResult> {
    const operation = replaceDotsAndHyphensWithUnderscores(
      resourceDefinition.group,
    );
    const version = resourceDefinition.version;
    const kind = capitalize(resourceDefinition.plural);
    const listQuery = gqlBuilder.query({
      operation,
      fields: [
        {
          [version]: [
            {
              [kind]: ['resourceVersion', { items: fields }],
            },
          ],
        },
      ],
      variables: variables,
    });

    return this.apolloFactory
      .apollo(nodeContext, readFromParentKcpPath)
      .query({
        query: gql`
          ${listQuery.query}
        `,
        variables: listQuery.variables,
      })
      .pipe(
        map((res: any): ResourceListResult => {
          const resourceListResult = getValueByPath<any, any>(
            res.data,
            `${operation}.${version}.${kind}`,
          );
          if (!resourceListResult) {
            throw new Error('Resource list result not found');
          }

          return resourceListResult;
        }),
      );
  }

  private listWithRawQuery(
    operation: string,
    rawQuery: string,
    nodeContext: ResourceNodeContext,
    readFromParentKcpPath: boolean,
  ): Observable<any> {
    const isNamespacedResource = this.isNamespacedResource(nodeContext);
    const variables = {
      ...(isNamespacedResource && {
        namespace: { type: 'String', value: nodeContext.namespaceId },
      }),
    };

    return this.apolloFactory
      .apollo(nodeContext, readFromParentKcpPath)
      .query({
        query: gql`
          ${rawQuery}
        `,
        variables: this.normalizeGqlBuilderVariables(variables),
      })
      .pipe(
        map(
          (res: any): Resource[] =>
            getValueByPath<any, any>(res.data, operation) ?? [],
        ),
        catchError((error) => {
          this.alertErrors(error);
          console.error('Error executing GraphQL query.', error);
          return error;
        }),
      );
  }

  private alertErrors(res: ResourceResponseError) {
    this.luigiCoreService.showAlert({
      text: res.message,
      type: 'error',
    });
  }

  delete(
    resource: Resource,
    resourceDefinition: ResourceDefinition,
    nodeContext: ResourceNodeContext,
  ) {
    const group = replaceDotsAndHyphensWithUnderscores(
      resourceDefinition.group,
    );
    const isNamespacedResource = this.isNamespacedResource(nodeContext);
    const kind = resourceDefinition.kind;
    const version = resourceDefinition.version;

    const mutation = gqlBuilder.mutation({
      operation: group,
      fields: [
        {
          [version]: [
            {
              operation: `delete${kind}`,
              variables: {
                name: { type: 'String!', value: resource.metadata.name },
                ...(isNamespacedResource && {
                  namespace: { type: 'String', value: nodeContext.namespaceId },
                }),
              },
              fields: [],
            },
          ],
        },
      ],
    });

    return this.apolloFactory
      .apollo(nodeContext)
      .mutate<void>({
        mutation: gql`
          ${mutation.query}
        `,
        variables: mutation.variables,
      })
      .pipe(
        catchError((error) => {
          this.alertErrors(error);
          console.error('Error executing GraphQL query.', error);
          return error;
        }),
      );
  }

  create(
    resource: Resource,
    resourceDefinition: ResourceDefinition,
    nodeContext: ResourceNodeContext,
  ) {
    const isNamespacedResource = this.isNamespacedResource(nodeContext);
    const group = replaceDotsAndHyphensWithUnderscores(
      resourceDefinition.group,
    );
    const version = resourceDefinition.version;
    const kind = resourceDefinition.kind;
    const namespace = nodeContext.namespaceId;

    const mutation = gqlBuilder.mutation({
      operation: group,
      fields: [
        {
          [version]: [
            {
              operation: `create${kind}`,
              variables: {
                ...(isNamespacedResource && {
                  namespace: { type: 'String', value: namespace },
                }),
                object: { type: `${kind}Input!`, value: resource },
              },
              fields: ['__typename'],
            },
          ],
        },
      ],
    });

    return this.apolloFactory
      .apollo(nodeContext)
      .mutate({
        mutation: gql`
          ${mutation.query}
        `,
        fetchPolicy: 'no-cache',
        variables: mutation.variables,
      })
      .pipe(
        catchError((error) => {
          this.alertErrors(error);
          console.error('Error executing GraphQL query.', error);
          return error;
        }),
      );
  }

  update(
    resource: Resource,
    resourceDefinition: ResourceDefinition,
    nodeContext: ResourceNodeContext,
  ) {
    const isNamespacedResource = this.isNamespacedResource(nodeContext);
    const group = replaceDotsAndHyphensWithUnderscores(
      resourceDefinition.group,
    );
    const kind = resourceDefinition.kind;
    const version = resourceDefinition.version;
    const namespace = nodeContext.namespaceId;

    const cleanResource = stripTypename(resource);

    const mutation = gqlBuilder.mutation({
      operation: group,
      fields: [
        {
          [version]: [
            {
              operation: `update${kind}`,
              variables: {
                ...(isNamespacedResource && {
                  namespace: { type: 'String', value: namespace },
                }),
                name: { type: 'String!', value: resource.metadata.name },
                object: {
                  type: `${kind}Input!`,
                  value: cleanResource,
                },
              },
              fields: ['__typename'],
            },
          ],
        },
      ],
    });

    return this.apolloFactory
      .apollo(nodeContext)
      .mutate({
        mutation: gql`
          ${mutation.query}
        `,
        fetchPolicy: 'no-cache',
        variables: mutation.variables,
      })
      .pipe(
        catchError((error) => {
          this.alertErrors(error);
          console.error('Error executing GraphQL query.', error);
          return error;
        }),
      );
  }

  readAccountInfo(nodeContext: ResourceNodeContext): Observable<AccountInfo> {
    return this.apolloFactory
      .apollo(nodeContext)
      .query<string>({
        query: gql`
          {
            core_platform_mesh_io {
              v1alpha1 {
                AccountInfo(name: "account") {
                  metadata {
                    name
                    annotations
                  }
                  spec {
                    clusterInfo {
                      ca
                    }
                    organization {
                      originClusterId
                    }
                  }
                }
              }
            }
          }
        `,
      })
      .pipe(
        map((res: any) => {
          return res.data.core_platform_mesh_io.v1alpha1.AccountInfo;
        }),
        catchError((error) => {
          this.alertErrors(error);
          console.error('Error executing GraphQL query.', error);
          return error;
        }),
      );
  }

  private isNamespacedResource(nodeContext: ResourceNodeContext) {
    return nodeContext?.resourceDefinition?.scope === 'Namespaced';
  }

  private normalizeGqlBuilderVariables(
    variables: VariableOptions,
  ): Record<string, any> {
    return Object.fromEntries(
      Object.entries(variables).map(([key, value]) => [key, value.value]),
    );
  }
}
