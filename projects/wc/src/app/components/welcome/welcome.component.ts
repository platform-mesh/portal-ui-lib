import { OrganizationManagementComponent } from '../organization-management/organization-management.component';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { LuigiClient } from '@luigi-project/client/luigi-element';
import { I18nService, LuigiCoreService } from '@openmfp/portal-ui-lib';
import { ResourceNodeContext } from '@platform-mesh/portal-ui-lib/services';

interface Header {
  title?: string;
  logo?: string;
  favicon?: string;
}

@Component({
  selector: 'app-welcome',
  template: `
    <div class="center-container">
      <img src="{{ header()?.logo }}" width="100" alt="" />
      <div class="message-box">Welcome to the {{ header()?.title }}!</div>
      @if (enhancedContext(); as enhancedContext) {
        <organization-management
          [context]="enhancedContext"
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
  private luigiCoreService = inject(LuigiCoreService);

  context = input.required<ResourceNodeContext>();
  LuigiClient = input.required<LuigiClient>();
  enhancedContext = signal<ResourceNodeContext | undefined>(undefined);

  header = signal<Header | undefined>(undefined);

  async ngOnInit() {
    await this.i18nService.fetchTranslationFile('en');
    const header = this.luigiCoreService.config.settings?.header;
    this.header.set(header);
    this.enhancedContext.set({
      ...this.context(),
      translationTable: this.i18nService.translationTable,
    });
  }
}
