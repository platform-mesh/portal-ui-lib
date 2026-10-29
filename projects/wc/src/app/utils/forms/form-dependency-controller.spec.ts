import {
  type DynamicValuesResult,
  FormDependencyController,
} from './form-dependency-controller';
import type { PlatformMeshFieldDefinition } from '@platform-mesh/portal-ui-lib/models';

function field(
  name: string,
  dependencies?: string[],
): PlatformMeshFieldDefinition {
  return {
    property: name,
    ...(dependencies && {
      dynamicValuesDefinition: {
        operation: 'items',
        gqlQuery: 'query { items { name } }',
        key: 'name',
        value: 'name',
        gqlQueryVariables: Object.fromEntries(
          dependencies.map((parent) => [parent, `{form.${parent}}`]),
        ),
      },
    }),
  };
}

function deferred() {
  let resolve!: (result: DynamicValuesResult) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<DynamicValuesResult>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('FormDependencyController', () => {
  it('uses the complete form snapshot and clears the child before resolving', async () => {
    const request = deferred();
    const resolve = vi.fn().mockReturnValue(request.promise);
    const apply = vi.fn();
    const controller = new FormDependencyController(resolve, apply);
    controller.begin(
      [
        field('namespace'),
        field('region'),
        field('secret', ['namespace', 'region']),
      ],
      { namespace: 'prod', region: 'eu', secret: 'old' },
    );

    controller.handleChange({
      fieldProperty: 'namespace',
      value: 'prod',
      source: 'seed',
    });
    expect(apply).not.toHaveBeenCalled();
    controller.handleChange({
      fieldProperty: 'namespace',
      value: 'staging',
      formValues: { namespace: 'staging', region: 'us', secret: 'old' },
    });

    expect(apply).toHaveBeenCalledWith({
      name: 'secret',
      values: [],
      clear: true,
      pending: true,
    });
    await vi.waitFor(() => expect(resolve).toHaveBeenCalled());
    expect(resolve.mock.calls[0][1]).toEqual({
      namespace: 'staging',
      region: 'us',
      secret: '',
    });

    request.resolve({ kind: 'ready', values: ['new'] });
    await vi.waitFor(() =>
      expect(apply).toHaveBeenLastCalledWith({
        name: 'secret',
        values: ['new'],
        clear: false,
        pending: false,
      }),
    );
  });

  it('keeps only the latest answer across an A→B→A change', async () => {
    const requests = [deferred(), deferred(), deferred()];
    const apply = vi.fn();
    const resolve = vi
      .fn()
      .mockReturnValueOnce(requests[0].promise)
      .mockReturnValueOnce(requests[1].promise)
      .mockReturnValueOnce(requests[2].promise);
    const controller = new FormDependencyController(resolve, apply);
    controller.begin([field('namespace'), field('secret', ['namespace'])], {
      namespace: 'initial',
    });

    for (const value of ['A', 'B', 'A']) {
      controller.handleChange({ fieldProperty: 'namespace', value });
    }
    await vi.waitFor(() => expect(resolve).toHaveBeenCalledTimes(3));
    requests[2].resolve({ kind: 'ready', values: ['latest'] });
    await vi.waitFor(() =>
      expect(apply).toHaveBeenLastCalledWith(
        expect.objectContaining({
          values: ['latest'],
          clear: false,
        }),
      ),
    );
    requests[0].resolve({ kind: 'ready', values: ['stale-a'] });
    requests[1].resolve({ kind: 'ready', values: ['stale-b'] });
    await Promise.resolve();
    expect(apply.mock.calls.filter(([update]) => !update.clear)).toHaveLength(
      1,
    );
  });

  it('tracks independent children and blocks a child when a parent is cleared', async () => {
    const first = deferred();
    const second = deferred();
    const apply = vi.fn();
    const resolve = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const controller = new FormDependencyController(resolve, apply);
    controller.begin(
      [
        field('namespace'),
        field('region'),
        field('secret', ['namespace']),
        field('zone', ['region']),
      ],
      { namespace: 'prod', region: 'eu' },
    );
    controller.handleChange({
      fieldProperty: 'namespace',
      value: 'staging',
      formValues: { namespace: 'staging', region: 'us' },
    });
    controller.handleChange({ fieldProperty: 'region', value: 'us' });
    await vi.waitFor(() => expect(resolve).toHaveBeenCalledTimes(2));
    first.resolve({ kind: 'ready', values: ['secret-us'] });
    await vi.waitFor(() =>
      expect(apply).toHaveBeenLastCalledWith(
        expect.objectContaining({
          name: 'secret',
          pending: true,
        }),
      ),
    );
    controller.handleChange({ fieldProperty: 'namespace', value: '' });
    expect(apply).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: 'secret',
        values: [],
        clear: true,
        pending: true,
      }),
    );
    second.resolve({ kind: 'ready', values: ['zone-us'] });
    await vi.waitFor(() =>
      expect(apply).toHaveBeenLastCalledWith(
        expect.objectContaining({
          name: 'zone',
          values: ['zone-us'],
          pending: false,
        }),
      ),
    );
  });

  it('drops previous-session results and reports a current request failure', async () => {
    const old = deferred();
    const current = deferred();
    const apply = vi.fn();
    const resolve = vi
      .fn()
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(current.promise);
    const controller = new FormDependencyController(resolve, apply);
    const fields = [field('namespace'), field('secret', ['namespace'])];
    const firstGeneration = controller.begin(fields, { namespace: 'prod' });
    controller.handleChange({ fieldProperty: 'namespace', value: 'staging' });
    await vi.waitFor(() => expect(resolve).toHaveBeenCalledTimes(1));
    controller.end();
    const nextGeneration = controller.begin(fields, { namespace: 'prod' });
    expect(controller.isCurrent(firstGeneration)).toBe(false);
    expect(controller.isCurrent(nextGeneration)).toBe(true);
    controller.handleChange({ fieldProperty: 'namespace', value: 'staging' });
    await vi.waitFor(() => expect(resolve).toHaveBeenCalledTimes(2));
    old.resolve({ kind: 'ready', values: ['old'] });
    await Promise.resolve();
    expect(apply.mock.calls.filter(([update]) => !update.clear)).toHaveLength(
      0,
    );
    current.reject(new Error('query failed'));
    await vi.waitFor(() =>
      expect(apply).toHaveBeenLastCalledWith(
        expect.objectContaining({
          name: 'secret',
          values: [],
          pending: false,
          clear: false,
        }),
      ),
    );
  });

  it('rejects duplicate, self and transitive dependencies', () => {
    const controller = new FormDependencyController(vi.fn(), vi.fn());
    expect(() => controller.begin([field('a'), field('a')], {})).toThrow(
      'Duplicate form field',
    );
    expect(() => controller.begin([field('a', ['a'])], {})).toThrow(
      'Invalid dependency',
    );
    expect(() =>
      controller.begin([field('a'), field('b', ['a']), field('c', ['b'])], {}),
    ).toThrow('Transitive dependency is not supported');
  });

  it('silently ignores dependencies parents that are not in the form', () => {
    const controller = new FormDependencyController(vi.fn(), vi.fn());
    // Parent 'missing' is not registered as a form field (e.g. namespace fixed
    // by context). Begin must not throw — the dependent field just has no
    // in-form trigger wired up.
    expect(() => controller.begin([field('a', ['missing'])], {})).not.toThrow();
  });

  it('resolves on an in-form change when another parent comes from context', async () => {
    const resolve = vi
      .fn()
      .mockResolvedValue({ kind: 'ready', values: ['new'] });
    const apply = vi.fn();
    const controller = new FormDependencyController(resolve, apply);
    controller.begin(
      [field('region'), field('secret', ['metadata.namespace', 'region'])],
      {},
    );
    controller.handleChange({ fieldProperty: 'region', value: 'eu' });
    await vi.waitFor(() => expect(resolve).toHaveBeenCalled());
    expect(resolve.mock.calls[0][1]).toEqual({ region: 'eu', secret: '' });
    await vi.waitFor(() =>
      expect(apply).toHaveBeenLastCalledWith({
        name: 'secret',
        values: ['new'],
        clear: false,
        pending: false,
      }),
    );
  });
});
