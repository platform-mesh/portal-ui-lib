import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  ViewEncapsulation,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Button } from '@fundamental-ngx/ui5-webcomponents/button';
import { Label } from '@fundamental-ngx/ui5-webcomponents/label';
import { LuigiClient } from '@luigi-project/client/luigi-element';
import { ResourceNodeContext } from '@platform-mesh/portal-ui-lib/services';
import {
  ApiExport,
  ApiExportAdminService,
} from '@platform-mesh/portal-ui-lib/services';

@Component({
  selector: 'pm-api-export-admin',
  standalone: true,
  imports: [Button, Label],
  templateUrl: './api-export-admin.component.html',
  styleUrl: './api-export-admin.component.scss',
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApiExportAdminView implements OnInit {
  private readonly apiExportAdminService = inject(ApiExportAdminService);
  private readonly destroyRef = inject(DestroyRef);

  context = input.required<ResourceNodeContext>();
  LuigiClient = input.required<LuigiClient>();

  apiExports = signal<ApiExport[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  togglingName = signal<string | null>(null);

  ngOnInit(): void {
    this.loadApiExports();
  }

  private get organization(): string {
    return this.context().organization ?? '';
  }

  loadApiExports(): void {
    this.loading.set(true);
    this.error.set(null);

    this.apiExportAdminService
      .listApiExports(this.organization)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.apiExports.set(response.items);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Failed to load APIExports', err);
          this.error.set('Failed to load APIExports.');
          this.loading.set(false);
        },
      });
  }

  toggle(apiExport: ApiExport): void {
    const name = apiExport.metadata.name;
    this.togglingName.set(name);

    const action$ = apiExport.enabled
      ? this.apiExportAdminService.disableApiExport(this.organization, name)
      : this.apiExportAdminService.enableApiExport(this.organization, name);

    action$.subscribe({
      next: () => {
        this.togglingName.set(null);
        this.loadApiExports();
      },
      error: (err) => {
        console.error(`Failed to toggle APIExport "${name}"`, err);
        this.togglingName.set(null);
        this.LuigiClient()
          .uxManager()
          .showAlert({
            text: `Failed to ${apiExport.enabled ? 'disable' : 'enable'} APIExport "${name}".`,
            type: 'error',
          });
      },
    });
  }

  isToggling(name: string): boolean {
    return this.togglingName() === name;
  }
}
