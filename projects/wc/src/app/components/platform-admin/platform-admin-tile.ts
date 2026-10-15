import '@ui5/webcomponents/dist/Card.js';
import '@ui5/webcomponents/dist/CardHeader.js';
import '@ui5/webcomponents/dist/Icon.js';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { addInitListener, linkManager } from '@luigi-project/client';

const PLATFORM_ADMIN_PATH = '/platform-admin';

@Component({
  selector: 'pm-platform-admin-tile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.ShadowDom,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ui5-card
      class="pm-admin-tile"
      (click)="navigate()"
      (keydown.enter)="navigate()"
      tabindex="0"
      role="button"
      aria-label="Navigate to Platform Admin"
    >
      <ui5-card-header
        slot="header"
        titleText="Platform Admin"
        subtitleText="Manage APIExport binding rights"
        interactive="true"
      >
        <ui5-icon slot="avatar" name="official-service"></ui5-icon>
      </ui5-card-header>
    </ui5-card>
  `,
  styles: [
    `
      :host {
        display: block;
        cursor: pointer;
      }

      .pm-admin-tile {
        cursor: pointer;
        height: 100%;
      }

      .pm-admin-tile:hover {
        box-shadow: var(--sapContent_Shadow2);
      }
    `,
  ],
})
export class PlatformAdminTileComponent {
  constructor() {
    addInitListener(() => {});
  }

  navigate(): void {
    linkManager().fromClosestContext().navigate(PLATFORM_ADMIN_PATH);
  }
}
