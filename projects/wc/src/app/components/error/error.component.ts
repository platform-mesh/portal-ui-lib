import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewEncapsulation,
  inject,
  input,
  signal,
} from '@angular/core';
import { I18nService, LuigiCoreService } from '@openmfp/portal-ui-lib';
import '@ui5/webcomponents-fiori/dist/illustrations/NoEntries.js';
import '@ui5/webcomponents-fiori/dist/illustrations/UnableToLoad.js';
import '@ui5/webcomponents-fiori/dist/illustrations/tnt/NoApplications.js';
import '@ui5/webcomponents-fiori/dist/illustrations/tnt/UnsuccessfulAuth.js';
import {
  Button,
  Title,
} from '@fundamental-ngx/ui5-webcomponents';
import { IllustratedMessage } from '@fundamental-ngx/ui5-webcomponents-fiori';
import { ButtonConfig, ErrorConfig } from './models/error.model';

@Component({
  selector: 'pm-error',
  standalone: true,
  templateUrl: './error.component.html',
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IllustratedMessage, Button, Title],
})
export class ErrorComponent implements OnInit {
  private i18nService = inject(I18nService);
  private luigiCoreService = inject(LuigiCoreService);

  public context = input.required<any>();

  config = signal<ErrorConfig>({
    scene: 'UnableToLoad',
    illustratedMessageTitle: '',
    illustratedMessageText: '',
    buttons: [],
  });

  async ngOnInit() {
    await this.setSceneConfig();
  }

  goTo(button: ButtonConfig): void {
    if (button.url) {
      window.open(button.url, '_blank');
    } else if (button.route) {
      this.luigiCoreService.navigation().navigate(`/${button.route.context}`);
    }
  }

  private async setSceneConfig() {
    const nodeContext = this.context();
    switch (+nodeContext.id) {
      case 403: {
        this.config.set(await this.getError403Config());
        break;
      }
      case 404: {
        this.config.set(await this.getError404Config());
        break;
      }
      case 422: {
        this.config.set(await this.getError422Config());
        break;
      }
      case 503: {
        this.config.set(await this.getError503Config());
        break;
      }
      default: {
        this.config.set(await this.getErrorDefaultConfig());
      }
    }
  }

  private async getError503Config(): Promise<ErrorConfig> {
    return {
      scene: 'UnableToLoad',
      illustratedMessageTitle: 'Organization is not ready yet',
      illustratedMessageText: 'Please try again later.',
      buttons: [],
    };
  }

  private async getError404Config(): Promise<ErrorConfig> {
    return {
      scene: 'NoEntries',
      illustratedMessageTitle: await this.i18nService.getTranslationAsync(
        'ERROR_CONTENT_NOT_FOUND_TITLE',
      ),
      illustratedMessageText: await this.i18nService.getTranslationAsync(
        'ERROR_CONTENT_NOT_FOUND_TEXT',
      ),
      buttons: [],
    };
  }

  private async getError403Config(): Promise<ErrorConfig> {
    return {
      scene: 'tnt/UnsuccessfulAuth',
      illustratedMessageTitle: 'You are not authorized to access this content.',
      illustratedMessageText: '',
      buttons: [],
    };
  }

  private async getErrorDefaultConfig(): Promise<ErrorConfig> {
    return {
      scene: 'UnableToLoad',
      illustratedMessageTitle: await this.i18nService.getTranslationAsync(
        'ERROR_UNIDENTIFIED_TITLE',
      ),
      illustratedMessageText: '',
      buttons: [],
    };
  }

  private async getError422Config() {
    return {
      scene: 'tnt/NoApplications',
      illustratedMessageTitle: `The resource is pending deletion.`,
      illustratedMessageText: '',
      buttons: [],
    };
  }
}
