import { Resource, ResourceOperationTypeMap, ResourceSubscriptionResult } from '@platform-mesh/portal-ui-lib/models';

export interface MergeListWithSubscriptionResultOptions<T> {
  getItemKey: (item: T) => string | undefined;
  mapSubscriptionObjectToItem: (object: Resource) => T;
}

export function mergeListWithSubscriptionResult<T>(
  items: T[],
  subscriptionResult: ResourceSubscriptionResult | undefined,
  options: MergeListWithSubscriptionResultOptions<T>,
): T[] {
  if (!subscriptionResult) {
    return items;
  }

  const {
    getItemKey,
    mapSubscriptionObjectToItem,
  } = options;

  const result = new Map<string, T>();
  items.forEach((item) => {
    const key = getItemKey(item);
    if (!key) {
      return;
    }
    result.set(key, item);
  });

  const { type, object } = subscriptionResult;
  const objectKey = object.metadata?.name;
  if (!objectKey) {
    return items;
  }

  const mappedObject = mapSubscriptionObjectToItem(object);
  if (type === ResourceOperationTypeMap.ADDED) {
    result.set(objectKey, mappedObject);
  } else if (type === ResourceOperationTypeMap.MODIFIED) {
    if (result.has(objectKey)) {
      result.set(objectKey, mappedObject);
    }
  } else if (type === ResourceOperationTypeMap.DELETED) {
    result.delete(objectKey);
  }

  return [...result.values()];
}
