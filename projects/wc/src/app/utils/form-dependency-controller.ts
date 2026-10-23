import type { PlatformMeshFieldDefinition } from '@platform-mesh/portal-ui-lib/models';

export type DynamicValuesResult =
  | { kind: 'ready'; values: string[] }
  | { kind: 'blocked' }
  | { kind: 'error'; error: unknown };

export interface DependentFieldUpdate {
  name: string;
  values: string[];
  clear: boolean;
  pending: boolean;
}

type Resolver = (
  field: PlatformMeshFieldDefinition,
  formValues: Record<string, unknown>,
) => Promise<DynamicValuesResult>;

export class FormDependencyController {
  private generation = 0;
  private fields = new Map<string, PlatformMeshFieldDefinition>();
  private dependents = new Map<string, string[]>();
  private versions = new Map<string, number>();
  private pending = new Set<string>();
  private values: Record<string, unknown> = {};

  constructor(
    private readonly resolve: Resolver,
    private readonly apply: (update: DependentFieldUpdate) => void,
  ) {}

  begin(
    fields: readonly PlatformMeshFieldDefinition[],
    values: Record<string, unknown>,
  ): number {
    this.end();
    this.values = { ...values };

    for (const field of fields) {
      if (typeof field.property !== 'string') continue;
      if (this.fields.has(field.property)) {
        throw new Error(`Duplicate form field: ${field.property}`);
      }
      this.fields.set(field.property, field);
    }

    for (const [name, field] of this.fields) {
      for (const parent of field.dynamicValuesDefinition?.dependsOn ?? []) {
        if (parent === name || !this.fields.has(parent)) {
          throw new Error(`Invalid dependency: ${name} depends on ${parent}`);
        }
        if (
          this.fields.get(parent)?.dynamicValuesDefinition?.dependsOn?.length
        ) {
          throw new Error(
            `Transitive dependency is not supported: ${name} depends on ${parent}`,
          );
        }
        const children = this.dependents.get(parent) ?? [];
        if (!children.includes(name)) children.push(name);
        this.dependents.set(parent, children);
      }
    }

    return this.generation;
  }

  isCurrent(generation: number): boolean {
    return this.generation === generation;
  }

  end(): void {
    this.generation += 1;
    this.fields.clear();
    this.dependents.clear();
    this.versions.clear();
    this.pending.clear();
    this.values = {};
  }

  handleChange(event: {
    fieldProperty: string;
    value: unknown;
    source?: 'seed' | 'user';
    formValues?: Readonly<Record<string, unknown>>;
  }): void {
    if (event.source === 'seed') return;
    const children = this.dependents.get(event.fieldProperty);
    if (!children?.length) return;

    this.values = {
      ...this.values,
      ...event.formValues,
      [event.fieldProperty]: event.value,
    };
    const generation = this.generation;

    for (const name of children) {
      const field = this.fields.get(name)!;
      const version = (this.versions.get(name) ?? 0) + 1;
      this.versions.set(name, version);
      this.values[name] = '';
      const snapshot = { ...this.values };
      const missingParent = field.dynamicValuesDefinition!.dependsOn!.some(
        (parent) => snapshot[parent] == null || snapshot[parent] === '',
      );

      if (missingParent) this.pending.delete(name);
      else this.pending.add(name);

      this.apply({
        name,
        values: [],
        clear: true,
        pending: this.pending.size > 0,
      });
      if (missingParent) continue;

      void Promise.resolve()
        .then(() => this.resolve(field, snapshot))
        .catch((error): DynamicValuesResult => ({ kind: 'error', error }))
        .then((result) => {
          if (
            generation !== this.generation ||
            this.versions.get(name) !== version
          )
            return;
          this.pending.delete(name);
          this.apply({
            name,
            values: result.kind === 'ready' ? result.values : [],
            clear: false,
            pending: this.pending.size > 0,
          });
        });
    }
  }
}
