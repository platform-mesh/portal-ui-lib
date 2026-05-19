import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  output,
  input,
} from '@angular/core';
import {
  DeclarativeTableCard,
  TableCardConfig,
  ValueCellButtonClickEvent,
} from '@openmfp/ngx';
import { Resource } from '@platform-mesh/portal-ui-lib/models';

@Component({
  selector: 'pm-resource-table-card',
  standalone: true,
  imports: [DeclarativeTableCard],
  templateUrl: './resource-table-card.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourceTableCard {
  resources = input.required<Resource[]>();
  config = input.required<TableCardConfig>();

  readonly tableRowClicked = output<Resource>();
  readonly loadMoreResources = output<void>();
  readonly paginationLimitChanged = output<number>();
  readonly buttonClick = output<ValueCellButtonClickEvent<Resource>>();
}
