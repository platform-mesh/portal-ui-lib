import {
  MergeListWithSubscriptionResultOptions,
  mergeListWithSubscriptionResult,
} from './merge-list-with-subscription-result';
import {
  ResourceOperationTypeMap,
  ResourceSubscriptionResult,
} from '@platform-mesh/portal-ui-lib/models';

interface TestItem {
  name?: string;
  value?: string;
}

describe('mergeListWithSubscriptionResult', () => {
  const options: MergeListWithSubscriptionResultOptions<TestItem> = {
    getItemKey: (item) => item.name,
    mapSubscriptionObjectToItem: (object) => ({
      name: object.metadata?.name,
      value: object.spec?.value,
    }),
  };

  it('should return original items when subscription result is undefined', () => {
    const items: TestItem[] = [{ name: 'one' }];

    const result = mergeListWithSubscriptionResult(items, undefined, options);

    expect(result).toEqual(items);
  });

  it('should add item on ADDED event', () => {
    const items: TestItem[] = [{ name: 'one' }];
    const subscriptionResult = {
      type: ResourceOperationTypeMap.ADDED,
      object: { metadata: { name: 'two' }, spec: { value: 'v2' } },
    } as unknown as ResourceSubscriptionResult;

    const result = mergeListWithSubscriptionResult(
      items,
      subscriptionResult,
      options,
    );

    expect(result).toEqual([{ name: 'one' }, { name: 'two', value: 'v2' }]);
  });

  it('should update item on MODIFIED event when item exists', () => {
    const items: TestItem[] = [{ name: 'one', value: 'v1' }];
    const subscriptionResult = {
      type: ResourceOperationTypeMap.MODIFIED,
      object: { metadata: { name: 'one' }, spec: { value: 'v2' } },
    } as unknown as ResourceSubscriptionResult;

    const result = mergeListWithSubscriptionResult(
      items,
      subscriptionResult,
      options,
    );

    expect(result).toEqual([{ name: 'one', value: 'v2' }]);
  });

  it('should ignore MODIFIED event when item does not exist', () => {
    const items: TestItem[] = [{ name: 'one', value: 'v1' }];
    const subscriptionResult = {
      type: ResourceOperationTypeMap.MODIFIED,
      object: { metadata: { name: 'two' }, spec: { value: 'v2' } },
    } as unknown as ResourceSubscriptionResult;

    const result = mergeListWithSubscriptionResult(
      items,
      subscriptionResult,
      options,
    );

    expect(result).toEqual([{ name: 'one', value: 'v1' }]);
  });

  it('should delete item on DELETED event', () => {
    const items: TestItem[] = [{ name: 'one' }, { name: 'two' }];
    const subscriptionResult = {
      type: ResourceOperationTypeMap.DELETED,
      object: { metadata: { name: 'one' } },
    } as unknown as ResourceSubscriptionResult;

    const result = mergeListWithSubscriptionResult(
      items,
      subscriptionResult,
      options,
    );

    expect(result).toEqual([{ name: 'two' }]);
  });

  it('should return original items when subscription object has no name', () => {
    const items: TestItem[] = [{ name: 'one' }];
    const subscriptionResult = {
      type: ResourceOperationTypeMap.ADDED,
      object: { metadata: {} },
    } as unknown as ResourceSubscriptionResult;

    const result = mergeListWithSubscriptionResult(
      items,
      subscriptionResult,
      options,
    );

    expect(result).toEqual(items);
  });

  it('should ignore source items with undefined keys', () => {
    const items: TestItem[] = [{ value: 'missing-key' }, { name: 'one' }];
    const subscriptionResult = {
      type: ResourceOperationTypeMap.ADDED,
      object: { metadata: { name: 'two' } },
    } as unknown as ResourceSubscriptionResult;

    const result = mergeListWithSubscriptionResult(
      items,
      subscriptionResult,
      options,
    );

    expect(result).toEqual([
      { name: 'one' },
      { name: 'two', value: undefined },
    ]);
  });
});
