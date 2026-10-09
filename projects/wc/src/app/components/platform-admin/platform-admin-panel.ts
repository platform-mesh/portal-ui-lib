import '@ui5/webcomponents-fiori/dist/DynamicPage.js';
import '@ui5/webcomponents-fiori/dist/DynamicPageHeader.js';
import '@ui5/webcomponents-fiori/dist/DynamicPageTitle.js';
import '@ui5/webcomponents/dist/Toolbar.js';
import '@ui5/webcomponents/dist/ToolbarButton.js';
import '@ui5/webcomponents/dist/ToolbarSpacer.js';
import '@ui5/webcomponents/dist/Table.js';
import '@ui5/webcomponents/dist/TableHeaderRow.js';
import '@ui5/webcomponents/dist/TableHeaderCell.js';
import '@ui5/webcomponents/dist/TableRow.js';
import '@ui5/webcomponents/dist/TableCell.js';
import '@ui5/webcomponents/dist/BusyIndicator.js';
import '@ui5/webcomponents/dist/MessageStrip.js';
import '@ui5/webcomponents/dist/Tag.js';
import '@ui5/webcomponents/dist/Title.js';
import '@ui5/webcomponents/dist/CheckBox.js';
import '@ui5/webcomponents/dist/Button.js';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewEncapsulation,
  computed,
  inject,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  PlatformAdminPanelService,
  PolicyEntry,
} from '../../services/platform-admin-panel.service';

const ORG_PATH_PREFIX = ':root:orgs:';

interface ApiExportRow {
  key: string;
  name: string;
  clusterPath: string;
  policy: PolicyEntry | null;
  allowedOrgs: string[];
  enabled: boolean;
}

@Component({
  selector: 'pm-platform-admin-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.ShadowDom,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './platform-admin-panel.html',
  styleUrl: './platform-admin-panel.scss',
})
export class PlatformAdminComponent implements OnInit {
  private readonly service = inject(PlatformAdminPanelService);

  readonly loading = this.service.loading;
  readonly error = this.service.error;
  readonly orgs = this.service.orgs;
  readonly actionError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly editingKey = signal<string | null>(null);
  private readonly draftOrgs = signal<ReadonlySet<string>>(new Set());

  readonly rows = computed<ApiExportRow[]>(() => {
    const policies = this.service.policies();
    return this.service.apiExports().map((apiExport) => {
      const policy =
        policies.find(
          (c) =>
            c.apiExportRef.name === apiExport.name &&
            c.apiExportRef.clusterPath === apiExport.clusterPath,
        ) ?? null;
      const allowedOrgs = policy
        ? policy.allowPathExpressions.map((expr) =>
            this.pathExprToOrg(expr),
          )
        : [];
      return {
        key: this.rowKey(apiExport.name, apiExport.clusterPath),
        name: apiExport.name,
        clusterPath: apiExport.clusterPath,
        policy,
        allowedOrgs,
        enabled: allowedOrgs.length > 0,
      };
    });
  });

  ngOnInit(): void {
    void this.service.load();
  }

  reload(): void {
    this.actionError.set(null);
    void this.service.load();
  }

  isEditing(row: ApiExportRow): boolean {
    return this.editingKey() === row.key;
  }

  startEdit(row: ApiExportRow): void {
    this.actionError.set(null);
    this.draftOrgs.set(new Set(row.allowedOrgs));
    this.editingKey.set(row.key);
  }

  cancelEdit(): void {
    this.editingKey.set(null);
    this.draftOrgs.set(new Set());
  }

  isOrgSelected(org: string): boolean {
    return this.draftOrgs().has(org);
  }

  toggleOrg(org: string, selected: boolean): void {
    const next = new Set(this.draftOrgs());
    if (selected) next.add(org);
    else next.delete(org);
    this.draftOrgs.set(next);
  }

  onOrgChange(org: string, event: Event): void {
    const el = event.target as HTMLElement & { checked: boolean };
    this.toggleOrg(org, el.checked);
  }

  async save(row: ApiExportRow): Promise<void> {
    const newOrgs = Array.from(this.draftOrgs());
    const allowPathExpressions = newOrgs.map((org) =>
      this.orgToPathExpr(org),
    );
    this.saving.set(true);
    this.actionError.set(null);
    try {
      if (!row.policy) {
        if (newOrgs.length > 0) {
          await firstValueFrom(
            this.service.createPolicy({
              name: row.name,
              apiExportName: row.name,
              clusterPath: row.clusterPath,
              allowPathExpressions,
            }),
          );
        }
      } else if (newOrgs.length === 0) {
        await firstValueFrom(this.service.deletePolicy(row.policy.name));
      } else if (this.orgsChanged(row.allowedOrgs, newOrgs)) {
        await firstValueFrom(
          this.service.updatePolicy(row.policy.name, { allowPathExpressions }),
        );
      }
      this.editingKey.set(null);
      this.draftOrgs.set(new Set());
      await this.service.load();
    } catch (err) {
      this.actionError.set(
        err instanceof Error && err.message
          ? err.message
          : 'Failed to update enablement',
      );
    } finally {
      this.saving.set(false);
    }
  }

  private orgsChanged(current: string[], next: string[]): boolean {
    if (current.length !== next.length) return true;
    const s = new Set(current);
    return next.some((o) => !s.has(o));
  }

  private rowKey(name: string, clusterPath: string): string {
    return `${name}|${clusterPath}`;
  }

  private pathExprToOrg(expr: string): string {
    return expr.startsWith(ORG_PATH_PREFIX)
      ? expr.slice(ORG_PATH_PREFIX.length)
      : expr;
  }

  private orgToPathExpr(org: string): string {
    return `${ORG_PATH_PREFIX}${org}`;
  }
}
