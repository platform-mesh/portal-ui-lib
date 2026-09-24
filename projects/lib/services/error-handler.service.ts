import { Injectable, inject } from '@angular/core';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import { Resource } from '@platform-mesh/portal-ui-lib/models';
import { luigiNavigateTo } from '@platform-mesh/portal-ui-lib/utils';

@Injectable({ providedIn: 'root' })
export class ErrorHandlerService {
  private luigiCoreService = inject(LuigiCoreService);

  handleError(error: any) {
    if (this.isUnauthorizedAccess(error)) {
      this.navigateToErorPage(403);
    } else {
      const message =
        error?.message || error?.errors?.map((e: any) => e.message).join('\n');
      this.luigiCoreService.showAlert({
        text: message || 'An unknown error occurred',
        type: 'error',
      });
      console.error(error);
    }
  }

  private navigateToErorPage(error: string | number) {
    luigiNavigateTo(`/error/${error}`, true);
  }

  handleResourcePendingDeletion(_resource: Resource) {
    this.navigateToErorPage(422);
  }

  isUnauthorizedAccess(error: any): boolean {
    return (
      !!error?.message?.toLowerCase().includes('forbidden') ||
      !!error?.message?.toLowerCase()?.includes('access denied')
    );
  }
}
