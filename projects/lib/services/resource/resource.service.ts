import { ApolloFactory } from './apollo-factory';
import { ResourceNodeContext } from './resource-node-context';
import { Injectable, inject } from '@angular/core';
import { TypedDocumentNode } from '@apollo/client/core';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import {
  ALL_NAMESPACE,
  Resource,
  ResourceDefinition,
  ResourceListResult,
  ResourcePagination,
  ResourceSubscriptionResult,
} from '@platform-mesh/portal-ui-lib/models';
import {
  buildResourcePath,
  getResourceValueByJsonPath,
  getValueByPath,
  isNamespacedResource,
  stripTypename,
} from '@platform-mesh/portal-ui-lib/utils';
import { gql } from 'apollo-angular';
import * as gqlBuilder from 'gql-query-builder';
import Fields from 'gql-query-builder/build/Fields';
import IQueryBuilderOptions from 'gql-query-builder/build/IQueryBuilderOptions';
import NestedField from 'gql-query-builder/build/NestedField';
import VariableOptions from 'gql-query-builder/build/VariableOptions';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

interface ResourceResponseError extends Record<string, any> {
  message: string;
}

export interface ResourceRequestParams {
  entity: string;
  version: string;
  apiGroup?: string;
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
    const isNamespaced = isNamespacedResource(nodeContext);
    const namespace = this.getNamespace(nodeContext);

    let query: string | TypedDocumentNode<any, any> = this.resolveReadQuery(
      params,
      fieldsOrRawQuery,
      resourceId,
      isNamespaced ? namespace : undefined,
    );

    query = this.parseGQLQuery(query);

    return this.apolloFactory
      .apollo(nodeContext, readFromParentKcpPath)
      .query({
        query,
        variables: {
          name: resourceId,
          ...(isNamespaced && {
            namespace: namespace,
          }),
        },
      })
      .pipe(
        map((res) =>
          getValueByPath<any, any>(res.data, buildResourcePath(params, '.')),
        ),
      );
  }

  private resolveReadQuery(
    params: ResourceRequestParams,
    fieldsOrRawQuery: any[] | string,
    resourceId: string,
    namespace: string | undefined,
  ) {
    if (fieldsOrRawQuery instanceof Array) {
      const { entity, version, apiGroup } = params;
      const queryFields = [
        {
          operation: entity,
          variables: {
            name: { value: resourceId, type: 'String!' },
            ...(namespace && {
              namespace: { value: namespace, type: 'String' },
            }),
          },
          fields: fieldsOrRawQuery,
        },
      ];

      const queryOptions = this.calcQueryOptions(queryFields, [
        { operation: apiGroup },
        { operation: version },
      ]);
      return gqlBuilder.query(queryOptions).query;
    } else {
      return fieldsOrRawQuery;
    }
  }

  list(
    operation: string,
    fieldsOrRawQuery: any[] | string,
    nodeContext: ResourceNodeContext,
    readFromParentKcpPath: boolean = false,
    pagination?: ResourcePagination,
  ): Observable<ResourceListResult | any> {
    const isNamespaced = isNamespacedResource(nodeContext);
    const variables = {
      ...(isNamespaced && {
        namespace: { type: 'String', value: this.getNamespace(nodeContext) },
      }),
      ...(pagination?.limit && {
        limit: { type: 'Int', value: pagination?.limit },
      }),
      ...(pagination?.continue && {
        continue: { type: 'String', value: pagination?.continue },
      }),
    };

    const resourceDefinition = nodeContext.resourceDefinition;
    if (!resourceDefinition) {
      return throwError(() => new Error('Resource definition is required'));
    }
    return fieldsOrRawQuery instanceof Array
      ? this.listWithFields(
          resourceDefinition,
          fieldsOrRawQuery,
          nodeContext,
          readFromParentKcpPath,
          variables,
        )
      : this.listWithRawQuery(
          operation,
          fieldsOrRawQuery,
          nodeContext,
          readFromParentKcpPath,
          variables,
        );
  }

  private getResourceReadyStatus(
    resource: Resource,
    nodeContext: ResourceNodeContext,
  ) {
    const readyCondition = nodeContext.resourceDefinition?.readyCondition;
    if (readyCondition) {
      return getResourceValueByJsonPath(resource, readyCondition);
    }

    return true;
  }

  private listWithFields(
    resourceDefinition: ResourceDefinition,
    fields: any[],
    nodeContext: ResourceNodeContext,
    readFromParentKcpPath: boolean,
    variables: VariableOptions,
  ): Observable<ResourceListResult> {
    const { apiGroup, entityCollection, version } = resourceDefinition;
    const queryFields = [
      {
        operation: entityCollection,
        variables,
        fields: [
          'resourceVersion',
          'remainingItemCount',
          'continue',
          { items: fields },
        ],
      },
    ];
    const queryOptions = this.calcQueryOptions(queryFields, [
      { operation: apiGroup },
      { operation: version },
    ]);
    const listQuery = gqlBuilder.query(queryOptions);
    const query = this.parseGQLQuery(listQuery.query);

    return this.apolloFactory
      .apollo(nodeContext, readFromParentKcpPath)
      .query({
        query,
        variables: listQuery.variables,
      })
      .pipe(
        map((res: any): ResourceListResult => {
          const resourceListResult = getValueByPath<any, any>(
            res.data,
            buildResourcePath(
              { apiGroup, version, entity: entityCollection },
              '.',
            ),
          );
          if (!resourceListResult) {
            throw new Error('Resource list result not found');
          }

          return resourceListResult;
        }),
        map((resourceListResult) => {
          const processedResult: Resource[] = resourceListResult.items
            .map((resource) => ({
              ...resource,
              ready: this.getResourceReadyStatus(resource, nodeContext),
            }))
            .map((r) => ({
              ...r,
              isAvailable: this.isAvailable(r),
              accessibleName: this.getAccessibleName(r),
            }));
          return { ...resourceListResult, items: processedResult };
        }),
      );
  }

  isAvailable(item: Resource) {
    return !!item.ready && !item.metadata?.deletionTimestamp;
  }

  getAccessibleName(item: Resource): string | undefined {
    if (item.metadata?.deletionTimestamp) {
      return 'Resource is pending deletion';
    } else if (!item.ready) {
      return 'Resource is not ready';
    }

    return undefined;
  }

  private listWithRawQuery(
    operation: string,
    rawQuery: string,
    nodeContext: ResourceNodeContext,
    readFromParentKcpPath: boolean,
    variables: VariableOptions,
  ): Observable<any> {
    const query = this.parseGQLQuery(rawQuery);
    return this.apolloFactory
      .apollo(nodeContext, readFromParentKcpPath)
      .query({
        query,
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
          return throwError(() => error);
        }),
      );
  }

  resourceChangeSubscription(
    operation: string,
    fields: any[],
    nodeContext: ResourceNodeContext,
    resourceVersion: string,
    readFromParentKcpPath: boolean,
  ): Observable<ResourceSubscriptionResult | undefined> {
    const isNamespaced = isNamespacedResource(nodeContext);
    const variables = {
      ...(isNamespaced && {
        namespace: { type: 'String', value: this.getNamespace(nodeContext) },
      }),
    };
    const lowerCaseOperation = operation.toLowerCase();

    const subscriptionQuery = gqlBuilder.subscription({
      operation: lowerCaseOperation,
      fields: ['type', { object: fields }],
      variables: {
        ...variables,
        resourceVersion: {
          type: 'String',
          value: resourceVersion,
        },
      },
    });

    const query = this.parseGQLQuery(subscriptionQuery.query);

    return this.apolloFactory
      .apollo(nodeContext, readFromParentKcpPath)
      .subscribe({
        query,
        variables: subscriptionQuery.variables,
      })
      .pipe(
        map((res: any): ResourceSubscriptionResult | undefined => {
          const resource: ResourceSubscriptionResult | undefined =
            getValueByPath(res.data, lowerCaseOperation);
          if (resource) {
            resource.object.ready = this.getResourceReadyStatus(
              resource.object,
              nodeContext,
            );
            resource.object.isAvailable = this.isAvailable(resource.object);
            resource.object.accessibleName = this.getAccessibleName(
              resource.object,
            );
          }
          return resource;
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
    readFromParentKcpPath: boolean = false,
  ) {
    const isNamespaced = isNamespacedResource(nodeContext);
    const { apiGroup, entity, version } = resourceDefinition;
    const fields = [
      {
        operation: `delete${entity}`,
        variables: {
          name: { type: 'String!', value: resource.metadata.name },
          ...(isNamespaced && {
            namespace: {
              type: 'String',
              value: this.getNamespace(nodeContext),
            },
          }),
        },
        fields: [],
      },
    ];
    const queryOptions = this.calcQueryOptions(fields, [
      { operation: apiGroup },
      { operation: version },
    ]);
    const mutation = gqlBuilder.mutation(queryOptions);
    const query = this.parseGQLQuery(mutation.query);

    return this.apolloFactory
      .apollo(nodeContext, readFromParentKcpPath)
      .mutate<void>({
        mutation: query,
        variables: mutation.variables,
      })
      .pipe(
        catchError((error) => {
          this.alertErrors(error);
          console.error('Error executing GraphQL query.', error);
          return throwError(() => error);
        }),
      );
  }

  create(
    resource: Resource,
    resourceDefinition: ResourceDefinition,
    nodeContext: ResourceNodeContext,
  ) {
    const isNamespaced = isNamespacedResource(nodeContext);
    const { apiGroup, entity, version } = resourceDefinition;
    const namespace = this.getNamespace(nodeContext, resource);

    const mutationFields: any[] = [
      {
        operation: `create${entity}`,
        variables: {
          ...(isNamespaced && {
            namespace: { type: 'String', value: namespace },
          }),
          object: { type: `${entity}Input!`, value: resource },
        },
        fields: ['__typename'],
      },
    ];
    const queryOptions = this.calcQueryOptions(mutationFields, [
      { operation: apiGroup },
      { operation: version },
    ]);
    const mutation = gqlBuilder.mutation(queryOptions);
    const query = this.parseGQLQuery(mutation.query);

    return this.apolloFactory
      .apollo(nodeContext)
      .mutate({
        mutation: query,
        fetchPolicy: 'no-cache',
        variables: mutation.variables,
      })
      .pipe(
        catchError((error) => {
          this.alertErrors(error);
          console.error('Error executing GraphQL query.', error);
          return throwError(() => error);
        }),
      );
  }

  update(
    resource: Resource,
    resourceDefinition: ResourceDefinition,
    nodeContext: ResourceNodeContext,
    readFromParentKcpPath: boolean = false,
    fields: any[] = ['__typename'],
  ) {
    const isNamespaced = isNamespacedResource(nodeContext);
    const { apiGroup, entity, version } = resourceDefinition;
    const namespace = this.getNamespace(nodeContext);

    const cleanResource = stripTypename(resource);

    const mutationFields: any[] = [
      {
        operation: `update${entity}`,
        variables: {
          ...(isNamespaced && {
            namespace: { type: 'String', value: namespace },
          }),
          name: { type: 'String!', value: resource.metadata.name },
          object: {
            type: `${entity}Input!`,
            value: cleanResource,
          },
        },
        fields: fields,
      },
    ];
    const queryOptions = this.calcQueryOptions(mutationFields, [
      { operation: apiGroup },
      { operation: version },
    ]);
    const mutation = gqlBuilder.mutation(queryOptions);
    const query = this.parseGQLQuery(mutation.query);

    return this.apolloFactory
      .apollo(nodeContext, readFromParentKcpPath)
      .mutate({
        mutation: query,
        fetchPolicy: 'no-cache',
        variables: mutation.variables,
      })
      .pipe(
        map((res: any) =>
          getValueByPath(
            res.data,
            buildResourcePath(
              { apiGroup, entity: `update${entity}`, version },
              '.',
            ),
          ),
        ),
        catchError((error) => {
          this.alertErrors(error);
          console.error('Error executing GraphQL query.', error);
          return throwError(() => error);
        }),
      );
  }

  private getNamespace(
    nodeContext: ResourceNodeContext,
    resource?: Resource,
  ): string | undefined {
    if (nodeContext.namespaceId) {
      return nodeContext.namespaceId;
    }

    if (resource?.metadata?.namespace) {
      return resource.metadata.namespace;
    }

    const namespace = this.luigiCoreService
      .routing()
      .getSearchParams().namespace;

    if (namespace) {
      return namespace === ALL_NAMESPACE ? undefined : namespace;
    }

    return undefined;
  }

  private normalizeGqlBuilderVariables(
    variables: VariableOptions,
  ): Record<string, any> {
    return Object.fromEntries(
      Object.entries(variables).map(([key, value]) => [key, value.value]),
    );
  }

  private calcQueryOptions(
    innerFields: Fields,
    wrappers: Partial<Omit<IQueryBuilderOptions, 'fields'>>[],
  ): IQueryBuilderOptions {
    const filteredWrappers = wrappers.filter(
      (wrapper): wrapper is Omit<IQueryBuilderOptions, 'fields'> =>
        !!wrapper?.operation,
    );

    if (filteredWrappers.length === 0) {
      const completeQuery = innerFields.pop() as NestedField;
      if (completeQuery && completeQuery.operation && completeQuery.fields) {
        return completeQuery;
      }

      throw new Error('At least one wrapper or inner fields is required');
    }

    let fields = innerFields;
    let nextWrapper = filteredWrappers.pop() as Omit<
      IQueryBuilderOptions,
      'fields'
    >;

    filteredWrappers.forEach((wrapper) => {
      fields = [
        {
          operation: nextWrapper.operation,
          fields: innerFields,
          variables: nextWrapper.variables,
        },
      ];
      nextWrapper = wrapper;
    });

    return {
      operation: nextWrapper.operation,
      fields,
      variables: nextWrapper.variables,
    };
  }

  private parseGQLQuery(query: string) {
    try {
      return gql`
        ${query}
      `;
    } catch (error) {
      this.luigiCoreService.showAlert({
        text: `Could not parse gql query: <br/><br/> ${query} <br/><br/> ${error.message}`,
        type: 'error',
      });
      throw error;
    }
  }
}
