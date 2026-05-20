import { CreateResourceModal } from './create-resource-modal/create-resource-modal.component';
import { ResourceTableCard } from './resource-table-card/resource-table-card.component';
import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { LuigiClient } from '@luigi-project/client/luigi-element';
import {
  ButtonSettings,
  CARD_TYPES,
  CardConfig,
  Dashboard,
} from '@openmfp/ngx';
import { Resource } from '@platform-mesh/portal-ui-lib/models';
import {
  ResourceNodeContext,
  ResourceService,
} from '@platform-mesh/portal-ui-lib/services';

Dashboard.registerAngularComponents([ResourceTableCard]);

@Component({
  selector: 'pm-list-view',
  standalone: true,
  templateUrl: './list-view.component.html',
  styleUrls: ['./list-view.component.scss'],
  encapsulation: ViewEncapsulation.Emulated,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CreateResourceModal, Dashboard],
})
export class ListView {
  private resourceService = inject(ResourceService);
  private createModal = viewChild<CreateResourceModal>('createModal');

  LuigiClient = input.required<LuigiClient>();
  context = input.required<ResourceNodeContext>();

  resourceDefinition = computed(() => this.context().resourceDefinition);
  hasUiCreateViewFields = computed(
    () => !!this.resourceDefinition()?.ui?.createView?.fields?.length,
  );

  resourceTitleDefinition = computed(
    () =>
      this.resourceDefinition()?.ui?.listView?.resourceTitle?.label ??
      this.resourceDefinition()?.entityCollection ??
      '',
  );
  resourceDescriptionDefinition = computed(
    () =>
      this.resourceDefinition()?.ui?.listView?.resourceDescription?.label ??
      `This page displays the created ${this.resourceDefinition()?.entityCollection} in your environment`,
  );

  dashboardConfig = computed(() => {
    const customActions: ButtonSettings[] = [];
    if (this.hasUiCreateViewFields()) {
      customActions.push({
        action: 'create',
        text: 'Create',
        design: 'Emphasized',
        tooltip: 'Create',
      });
    }
    return {
      title: this.resourceTitleDefinition(),
      description: this.resourceDescriptionDefinition(),
      backgroundImageUrl:
        this.resourceDefinition()?.ui?.listView?.backgroundImageUrl ??
        '/assets/pm_background.png',
      editable: false,
      customActions,
    };
  });

  cards = computed<CardConfig[]>(() => [
    {
      id: 'pm-resource-table-card',
      component: 'pm-resource-table-card',
      type: CARD_TYPES.ANGULAR,
      w: 12,
      h: 50,
      componentInputs: {
        LuigiClient: this.LuigiClient(),
        context: this.context(),
      },
    },
  ]);

  availableCards: CardConfig[] = [];
  sections: never[] = [];

  create(resource: Resource) {
    const resourceDefinition = this.getResourceDefinition();
    this.resourceService
      .create(resource, resourceDefinition, this.context())
      .subscribe({
        next: (result) => {
          this.createModal()?.close();
          console.debug('Resource created', result);
        },
      });
  }

  openCreateResourceModal() {
    this.createModal()?.open();
  }

  onDashboardAction({ action }: { event: MouseEvent; action: ButtonSettings }) {
    if (action.action === 'create') {
      this.openCreateResourceModal();
    }
  }

  private getResourceDefinition() {
    const resourceDefinition = this.resourceDefinition();
    if (!resourceDefinition) {
      this.LuigiClient().uxManager().showAlert({
        text: 'Resource definition is not defined',
        type: 'error',
      });
      throw new Error('Resource definition is not defined');
    }
    return resourceDefinition;
  }
}
