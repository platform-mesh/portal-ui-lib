import { ResourceTableCard } from './resource-table-card/resource-table-card.component';
import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
} from '@angular/core';
import { LuigiClient } from '@luigi-project/client/luigi-element';
import { CARD_TYPES, CardConfig, Dashboard, SectionConfig } from '@openmfp/ngx';
import { ResourceNodeContext } from '@platform-mesh/portal-ui-lib/services';

Dashboard.registerAngularComponents([ResourceTableCard]);

@Component({
  selector: 'pm-list-view',
  standalone: true,
  templateUrl: './list-view.component.html',
  styleUrls: ['./list-view.component.scss'],
  encapsulation: ViewEncapsulation.Emulated,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Dashboard],
})
export class ListView {
  LuigiClient = input.required<LuigiClient>();
  context = input.required<ResourceNodeContext>();

  resourceDefinition = computed(() => this.context().resourceDefinition);

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

  private isDemoEnabled = computed(() =>
    this.LuigiClient().getActiveFeatureToggles().includes('neoNephosDemo'),
  );

  sections: SectionConfig[] = [{ id: 'accounts', editable: false }];
  cards = computed<CardConfig[]>(() => [
    {
      id: 'pm-resource-table-card',
      component: 'pm-resource-table-card',
      type: CARD_TYPES.ANGULAR,
      w: 12,
      h: 50,
      sectionId: 'accounts',
      componentInputs: {
        LuigiClient: this.LuigiClient(),
        context: this.context(),
      },
    },
  ]);

  availableCards: CardConfig[] = [];

  dashboardConfig = computed(() => {
    const backgroundImageUrl = this.isDemoEnabled()
      ? '/assets/nn-demo.png'
      : (this.resourceDefinition()?.ui?.listView?.backgroundImageUrl ??
        '/assets/pm_background.png');
    return {
      title: this.resourceTitleDefinition(),
      description: this.resourceDescriptionDefinition(),
      backgroundImageUrl,
      editable: false,
      customActions: [],
    };
  });
}
