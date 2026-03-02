import { processGroupFields } from '../../../utils/proccess-fields';
import { ValueCellComponent } from '../value-cell/value-cell.component';
import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
  output,
} from '@angular/core';
import { IllustratedMessage } from '@fundamental-ngx/ui5-webcomponents-fiori/illustrated-message';
import { Icon } from '@fundamental-ngx/ui5-webcomponents/icon';
import { Option } from '@fundamental-ngx/ui5-webcomponents/option';
import { Select } from '@fundamental-ngx/ui5-webcomponents/select';
import { Table } from '@fundamental-ngx/ui5-webcomponents/table';
import { TableCell } from '@fundamental-ngx/ui5-webcomponents/table-cell';
import { TableGrowing } from '@fundamental-ngx/ui5-webcomponents/table-growing';
import { TableHeaderCell } from '@fundamental-ngx/ui5-webcomponents/table-header-cell';
import { TableHeaderRow } from '@fundamental-ngx/ui5-webcomponents/table-header-row';
import { TableRow } from '@fundamental-ngx/ui5-webcomponents/table-row';
import { LuigiClient } from '@luigi-project/client/luigi-element';
import { FieldDefinition } from '@platform-mesh/portal-ui-lib/models';

@Component({
  selector: 'pm-generic-table',
  standalone: true,
  templateUrl: './generic-table.component.html',
  styleUrls: ['./generic-table.component.scss'],
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IllustratedMessage,
    Table,
    TableCell,
    TableHeaderCell,
    TableHeaderRow,
    TableRow,
    ValueCellComponent,
    Select,
    Option,
    TableGrowing,
  ],
})
export class GenericTable {
  LuigiClient = input.required<LuigiClient>();
  resources = input.required<any[]>();
  columns = input.required<FieldDefinition[]>();

  totalItemsCount = input<number>();
  paginationLimit = input<number>(5);
  hasMore = input<boolean>(false);

  tableRowClicked = output<any>();
  loadMoreResources = output<void>();
  paginationLimitChanged = output<number>();

  viewColumns = computed(() => processGroupFields(this.columns()));
}
