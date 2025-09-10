import { OrganizationManagementComponent } from '../organization-management/organization-management.component';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { LuigiClient } from '@luigi-project/client/luigi-element';
import { I18nService } from '@openmfp/portal-ui-lib';
import { ResourceNodeContext } from '@platform-mesh/portal-ui-lib/services';

@Component({
  selector: 'app-welcome',
  template: `
    <div class="center-container">
      <div class="message-box">Welcome to the Portal!</div>
      @if (enhancedContext()) {
        <organization-management
          [context]="enhancedContext()"
          [LuigiClient]="LuigiClient()"
        />
      }
    </div>
  `,
  imports: [OrganizationManagementComponent],
  styles: [
    `
      .center-container {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        height: 50vh;
        width: 100%;
      }

      .message-box {
        padding: 2rem;
        border-radius: 8px;
        font-size: 1.5rem;
        font-weight: 500;
        text-align: center;
      }
    `,
  ],
})
export class WelcomeComponent implements OnInit {
  private i18nService = inject(I18nService);

  context = input<ResourceNodeContext>();
  LuigiClient = input<LuigiClient>();
  enhancedContext = signal<ResourceNodeContext>(null);

  async ngOnInit() {
    await this.i18nService.fetchTranslationFile('en');
    this.enhancedContext.set({
      ...this.context(),
      translationTable: this.i18nService.translationTable,
    });
  }
}
