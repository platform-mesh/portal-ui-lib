import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PermissionsDefinition } from '@platform-mesh/portal-ui-lib/models/models';
import { InstancePermissionResponse, InstancePermissionsService, ResourceNodeContext } from '@platform-mesh/portal-ui-lib/services';
import { permissionKey } from '@platform-mesh/portal-ui-lib/utils';

/**
 * Per-component instance-permissions store.
 *
 * Intentionally has no `providedIn` — it must be listed in each consuming
 * component's `providers` array so every component instance gets its own
 * isolated state (no global singleton, no Luigi global-context backing).
 *
 * Internal storage is a plain object `Record<permissionKey, string[]>`.
 * The public `permissions` signal exposes the same object directly.
 */
@Injectable()
export class InstancePermissionsStore {
  private instancePermissionsService = inject(InstancePermissionsService);
  private destroyRef = inject(DestroyRef);

  private map = signal<{ [key: string]: string[] }>({});

  public permissions = computed(() => this.map());

  /**
   * Deduplicates, fetches, and merges instance permissions in one call.
   * Components build the instance list and delegate all HTTP wiring here.
   */
  sync(
    nodeContext: ResourceNodeContext,
    permissionsDefinition: PermissionsDefinition,
    instances: { name: string; namespace?: string }[],
  ): void {
    const toRequest = this.missing(permissionsDefinition.resource, instances);
    if (!toRequest.length) return;
    this.instancePermissionsService
      .checkInstances(nodeContext, permissionsDefinition, toRequest)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => this.merge(res));
  }

  missing(
    resource: string,
    instances: { name: string; namespace?: string }[],
  ): { name: string; namespace?: string }[] {
    return instances.filter(
      (i) => !(permissionKey({ resource, ...i }) in this.map()),
    );
  }

  /** Accepts the raw InstancePermissionResponse array from InstancePermissionsService
   *  and stores each entry keyed by its full permissionKey string.
   */
  merge(permissions: InstancePermissionResponse[]): void {
    for (const p of permissions) {
      this.map.update((current) => ({
        ...current,
        [permissionKey({ resource: p.resource, namespace: p.namespace, name: p.name })]: p.actions,
      }));
    }
  }

  actionsFor(
    resource: string,
    namespace: string | undefined,
    name: string,
  ): string[] {
    return this.map()[permissionKey({ resource, namespace, name })] ?? [];
  }

  reset(): void {
    this.map.set({});
  }
}
