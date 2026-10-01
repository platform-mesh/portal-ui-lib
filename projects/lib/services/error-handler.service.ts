import { Injectable, inject } from '@angular/core';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import { Resource } from '@platform-mesh/portal-ui-lib/models';
import { luigiNavigateTo } from '@platform-mesh/portal-ui-lib/utils';

@Injectable({ providedIn: 'root' })
export class ErrorHandlerService {
  private luigiCoreService = inject(LuigiCoreService);

  handleError(error: any, msg?: string) {
    if (this.redirectToErrorPage(error)) {
      return;
    }

    const message =
      error?.message || error?.errors?.map((e: any) => e.message).join('\n');
    this.luigiCoreService.showAlert({
      text:
        [msg, message].filter(Boolean).join('\n') ||
        'An unknown error occurred',
      type: 'error',
    });
    console.error(error);
  }

  redirectToErrorPage(error: any, replaceHistory = true): boolean {
    if (this.isUnauthorizedAccess(error)) {
      this.navigateToErrorPage(403, replaceHistory);
      return true;
    }

    if (this.isNotFound(error)) {
      this.navigateToErrorPage(404, replaceHistory);
      return true;
    }

    return false;
  }

  private navigateToErrorPage(error: string | number, replaceHistory = true) {
    luigiNavigateTo(`/error/${error}`, replaceHistory);
  }

  handleResourcePendingDeletion(_resource: Resource) {
    this.navigateToErrorPage(422);
  }

  private isNotFound(error: any): boolean {
    return error?.statusCode === 404;
  }

  private isUnauthorizedAccess(error: any): boolean {
    return (
      !!error?.message?.toLowerCase().includes('forbidden') ||
      !!error?.message?.toLowerCase()?.includes('access denied')
    );
  }
}
