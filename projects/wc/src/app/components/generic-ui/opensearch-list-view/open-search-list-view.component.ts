import { OpenSearchResourceTableCard } from './open-search-resource-table-card/open-search-resource-table-card.component';
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

// Register the open-search-backed resource table card so `<mfp-dashboard>` can
// resolve the `pm-open-search-resource-table-card` selector at runtime.
Dashboard.registerAngularComponents([OpenSearchResourceTableCard]);

@Component({
  selector: 'pm-list-view',
  standalone: true,
  templateUrl: './open-search-list-view.component.html',
  styleUrls: ['./open-search-list-view.component.scss'],
  encapsulation: ViewEncapsulation.Emulated,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Dashboard],
})
export class OpenSearchListView {
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

  isDemoEnabled = computed(() =>
    this.LuigiClient().getActiveFeatureToggles().includes('neoNephosDemo'),
  );

  sections: SectionConfig[] = [{ id: 'accounts', editable: false }];
  cards = computed<CardConfig[]>(() => [
    {
      id: 'pm-open-search-resource-table-card',
      component: 'pm-open-search-resource-table-card',
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
      ? ''
      : this.resourceDefinition()?.ui?.listView?.backgroundImageUrl;
    return {
      title: this.resourceTitleDefinition(),
      description: this.resourceDescriptionDefinition(),
      backgroundImageUrl,
      editable: false,
      customActions: [],
    };
  });
}
