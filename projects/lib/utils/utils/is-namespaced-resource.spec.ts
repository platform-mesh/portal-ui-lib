import { isNamespacedResource } from './is-namespaced-resource';

describe('isNamespacedResource', () => {
  it('returns true for namespaced scope', () => {
    expect(
      isNamespacedResource({
        resourceDefinition: { scope: 'Namespaced' },
      } as any),
    ).toBe(true);
  });

  it('returns false for cluster scope', () => {
    expect(
      isNamespacedResource({
        resourceDefinition: { scope: 'Cluster' },
      } as any),
    ).toBe(false);
  });

  it('returns false for missing resourceDefinition', () => {
    expect(isNamespacedResource({} as any)).toBe(false);
  });
});
