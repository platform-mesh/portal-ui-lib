import { Injectable, inject } from '@angular/core';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import { Resource } from '@platform-mesh/portal-ui-lib/models';

@Injectable({ providedIn: 'root' })
export class ErrorHandlerService {
  private luigiCoreService = inject(LuigiCoreService);

  handleUnauthorizedAccess(error: any) {
    if (this.isUnauthorizedAccess(error)) {
      this.luigiCoreService.navigation().navigate('/error/403');
    } else {
      this.luigiCoreService.navigation().navigate('/error/404');
    }
  }

  handleResourcePendingDeletion(_resource: Resource) {
    this.luigiCoreService.navigation().navigate('/error/422');
  }

  isUnauthorizedAccess(error: any): boolean {
    return (
      error.message?.toLowerCase().includes('forbidden') ||
      error.message?.toLowerCase()?.includes('access denied')
    );
  }
}
