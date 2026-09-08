import { deletePropertyByPath } from './delete-property-by-path';

describe('deletePropertyByPath', () => {
  it('removes a top-level property', () => {
    const obj = { a: 1, b: 2 };
    deletePropertyByPath(obj, 'a');
    expect(obj).toEqual({ b: 2 });
  });

  it('removes a nested property', () => {
    const obj = { spec: { oidc: { clientSecret: 'x', clientId: 'id' } } };
    deletePropertyByPath(obj, 'spec.oidc.clientSecret');
    expect(obj).toEqual({ spec: { oidc: { clientId: 'id' } } });
  });

  it('no-ops when the path does not exist', () => {
    const obj = { spec: { alias: 'a' } };
    deletePropertyByPath(obj, 'spec.oidc.clientSecret');
    expect(obj).toEqual({ spec: { alias: 'a' } });
  });
});
