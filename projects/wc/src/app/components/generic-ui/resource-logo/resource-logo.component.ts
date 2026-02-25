import { Component, input } from '@angular/core';
import { ResourceDefinition } from '@platform-mesh/portal-ui-lib/models';

@Component({
  selector: 'pm-resource-logo',
  template: `
    @if (resourceDefinition()?.ui?.logoUrl) {
      <img
        test-id="generic-detail-view-logo"
        class="resource-logo"
        src="{{ resourceDefinition()?.ui?.logoUrl }}"
        alt="Logo"
      />
    }
  `,
})
export class ResourceLogo {
  resourceDefinition = input.required<ResourceDefinition | undefined>();
}
