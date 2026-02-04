import { Injectable, inject } from '@angular/core';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import { Resource } from '@platform-mesh/portal-ui-lib/models';

interface Error {
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ErrorHandlerService {
  private luigiCoreService = inject(LuigiCoreService);

  handlePostErrorNavigation(error: Error) {
    if (
      error.message?.toLowerCase().includes('forbidden') ||
      error.message?.includes('access denied')
    ) {
      this.luigiCoreService.navigation().navigate('/error/403');
    } else {
      this.luigiCoreService.navigation().navigate('/error/404');
    }
  }

  handleResourcePendingDeletionError(resource: Resource) {
    const message = `The resource ${resource.metadata.name} is pending deletion.`;
    this.luigiCoreService.navigation().navigate('/error/422');
    throw new Error(message);
  }
}
