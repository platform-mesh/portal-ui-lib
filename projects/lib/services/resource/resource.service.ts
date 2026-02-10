import { ApolloFactory } from './apollo-factory';
import { ResourceNodeContext } from './resource-node-context';
import { Injectable, inject } from '@angular/core';
import { TypedDocumentNode } from '@apollo/client/core';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import {
  Resource,
  ResourceDefinition,
  ResourceListResult,
  ResourcePagination,
  ResourceSubscriptionResult,
} from '@platform-mesh/portal-ui-lib/models';
import {
  buildResourcePath,
  capitalize,
  getResourceValueByJsonPath,
  getValueByPath,
  replaceDotsAndHyphensWithUnderscores,
  stripTypename,
} from '@platform-mesh/portal-ui-lib/utils';
import { gql } from 'apollo-angular';
import * as gqlBuilder from 'gql-query-builder';
import Fields from 'gql-query-builder/build/Fields';
import IQueryBuilderOptions from 'gql-query-builder/build/IQueryBuilderOptions';
import NestedField from 'gql-query-builder/build/NestedField';
import VariableOptions from 'gql-query-builder/build/VariableOptions';
import { EMPTY, Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

interface ResourceResponseError extends Record<string, any> {
  message: string;
}

export interface ResourceRequestParams {
  kind: string;
  version: string;
  group?: string;
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
      const { kind, version, group } = params;
      const queryFields = [
        {
          operation: kind,
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
        { operation: group },
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
    const isNamespacedResource = this.isNamespacedResource(nodeContext);
    const variables = {
      ...(isNamespacedResource && {
        namespace: { type: 'String', value: nodeContext.namespaceId },
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

    return (
      resource.status?.conditions?.find((c) => c.type === 'Ready')?.status ===
      'True'
    );
  }

  private listWithFields(
    resourceDefinition: ResourceDefinition,
    fields: any[],
    nodeContext: ResourceNodeContext,
    readFromParentKcpPath: boolean,
    variables: VariableOptions,
  ): Observable<ResourceListResult> {
    const group = replaceDotsAndHyphensWithUnderscores(
      resourceDefinition.group,
    );
    const version = resourceDefinition.version;
    const kind = capitalize(resourceDefinition.plural);
    const queryFields = [
      {
        operation: kind,
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
      { operation: group },
      { operation: version },
    ]);
    const listQuery = gqlBuilder.query(queryOptions);

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
            buildResourcePath({ group, version, kind }, '.'),
          );
          if (!resourceListResult) {
            throw new Error('Resource list result not found');
          }

          return resourceListResult;
        }),
        map((resourceListResult) => {
          const processedResult: Resource[] = resourceListResult.items.map(
            (resource) => ({
              ...resource,
              ready: this.getResourceReadyStatus(resource, nodeContext),
            }),
          );
          return { ...resourceListResult, items: processedResult };
        }),
      );
  }

  private listWithRawQuery(
    operation: string,
    rawQuery: string,
    nodeContext: ResourceNodeContext,
    readFromParentKcpPath: boolean,
    variables: VariableOptions,
  ): Observable<any> {
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
    const isNamespacedResource = this.isNamespacedResource(nodeContext);
    const variables = {
      ...(isNamespacedResource && {
        namespace: { type: 'String', value: nodeContext.namespaceId },
      }),
    };

    const subscriptionQuery = gqlBuilder.subscription({
      operation: operation,
      fields: ['type', { object: fields }],
      variables: {
        ...variables,
        resourceVersion: {
          type: 'String',
          value: resourceVersion,
        },
      },
    });

    return this.apolloFactory
      .apollo(nodeContext, readFromParentKcpPath)
      .subscribe({
        query: gql`
          ${subscriptionQuery.query}
        `,
        variables: subscriptionQuery.variables,
      })
      .pipe(
        map((res: any): ResourceSubscriptionResult | undefined => {
          const resource: ResourceSubscriptionResult | undefined =
            getValueByPath(res.data, operation);
          if (resource) {
            resource.object = {
              ...resource.object,
              ready: this.getResourceReadyStatus(resource.object, nodeContext),
            };
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
  ) {
    const group = replaceDotsAndHyphensWithUnderscores(
      resourceDefinition.group,
    );
    const isNamespacedResource = this.isNamespacedResource(nodeContext);
    const kind = resourceDefinition.kind;
    const version = resourceDefinition.version;
    const fields = [
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
    ];
    const queryOptions = this.calcQueryOptions(fields, [
      { operation: group },
      { operation: version },
    ]);
    const mutation = gqlBuilder.mutation(queryOptions);

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
          return throwError(() => error);
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

    const mutationFields: any[] = [
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
    ];
    const queryOptions = this.calcQueryOptions(mutationFields, [
      { operation: group },
      { operation: version },
    ]);
    const mutation = gqlBuilder.mutation(queryOptions);

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
          return throwError(() => error);
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

    const mutationFields: any[] = [
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
    ];
    const queryOptions = this.calcQueryOptions(mutationFields, [
      { operation: group },
      { operation: version },
    ]);
    const mutation = gqlBuilder.mutation(queryOptions);

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
          return throwError(() => error);
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
}
