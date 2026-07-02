import { Component, input } from '@angular/core';
import { ResourceDefinition } from '@platform-mesh/portal-ui-lib/models';

@Component({
  selector: 'pm-resource-logo',
  template: `
    @if (resourceDefinition()?.ui?.logoUrl) {
      <img
        data-testid="generic-detail-view-logo"
        class="resource-logo"
        src="{{ resourceDefinition()?.ui?.logoUrl }}"
        alt="Logo"
      />
    }
  `,
  styles: `
    .resource-logo {
      width: 5rem;
      padding-bottom: 1rem;
    }
  `,
})
export class ResourceLogo {
  resourceDefinition = input.required<ResourceDefinition | undefined>();
}
