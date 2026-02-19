import { Injectable, inject } from '@angular/core';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import { Resource } from '@platform-mesh/portal-ui-lib/models';

@Injectable({ providedIn: 'root' })
export class ErrorHandlerService {
  private luigiCoreService = inject(LuigiCoreService);

  handleError(error: any) {
    if (this.isUnauthorizedAccess(error)) {
      this.luigiCoreService.navigation().navigate('/error/403');
    } else {
      const message =
        error?.message || error?.errors?.map((e) => e.message).join('\n');
      this.luigiCoreService.showAlert({
        text: message || 'An unknown error occurred',
        type: 'error',
      });
      console.error(error);
    }
  }

  handleResourcePendingDeletion(_resource: Resource) {
    this.luigiCoreService.navigation().navigate('/error/422');
  }

  isUnauthorizedAccess(error: any): boolean {
    return (
      !!error?.message?.toLowerCase().includes('forbidden') ||
      !!error?.message?.toLowerCase()?.includes('access denied')
    );
  }
}
