import { PersistentPanelComponent } from './persistent-panel';
import {
  PersistentPanelConfig,
  PersistentPanelTarget,
} from './persistent-panel.types';
import {
  ApplicationRef,
  ComponentRef,
  EnvironmentInjector,
  Injectable,
  OnDestroy,
  createComponent,
  inject,
} from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PersistentPanelService implements OnDestroy {
  private readonly appRef = inject(ApplicationRef);
  private readonly environmentInjector = inject(EnvironmentInjector);
  private panelRef: ComponentRef<PersistentPanelComponent> | null = null;
  private target: PersistentPanelTarget = {};

  open(config: PersistentPanelConfig, target: PersistentPanelTarget): void {
    this.target = target;
    if (!this.panelRef) {
      this.panelRef = createComponent(PersistentPanelComponent, {
        environmentInjector: this.environmentInjector,
      });
      this.appRef.attachView(this.panelRef.hostView);
      document.body.appendChild(
        this.panelRef.location.nativeElement as HTMLElement,
      );
    }
    this.panelRef.instance.open(config, target);
    // createComponent() is outside a template tree, so it has no initial
    // render until change detection is run explicitly. Subsequent signal
    // updates are scheduled normally once the view has been initialized.
    this.panelRef.changeDetectorRef.detectChanges();
  }

  updateTarget(target: PersistentPanelTarget): void {
    this.target = target;
    this.panelRef?.instance.updateTarget(target);
  }

  currentTarget(): PersistentPanelTarget {
    return structuredClone(this.target);
  }

  destroy(): void {
    if (this.panelRef) {
      const host = this.panelRef.location.nativeElement as HTMLElement;
      this.appRef.detachView(this.panelRef.hostView);
      this.panelRef.destroy();
      host.remove();
      this.panelRef = null;
    }
    this.target = {};
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
