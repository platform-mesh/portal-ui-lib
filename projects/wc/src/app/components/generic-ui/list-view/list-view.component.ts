import { processFields } from '../../../utils/proccess-fields';
import { ValueCellComponent } from '../value-cell/value-cell.component';
import { CreateResourceModalComponent } from './create-resource-modal/create-resource-modal.component';
import { DeleteResourceModalComponent } from './delete-resource-confirmation-modal/delete-resource-modal.component';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LuigiClient } from '@luigi-project/client/luigi-element';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import { Resource } from '@platform-mesh/portal-ui-lib/models';
import {
  ResourceNodeContext,
  ResourceService,
} from '@platform-mesh/portal-ui-lib/services';
import {
  generateGraphQLFields,
  getResourceValueByJsonPath,
  replaceDotsAndHyphensWithUnderscores,
} from '@platform-mesh/portal-ui-lib/utils';
import {
  DynamicPageComponent,
  DynamicPageTitleComponent,
  IconComponent,
  IllustratedMessageComponent,
  TableCellComponent,
  TableComponent,
  TableHeaderCellComponent,
  TableHeaderRowComponent,
  TableRowComponent,
  TextComponent,
  TitleComponent,
  ToolbarButtonComponent,
  ToolbarComponent,
} from '@ui5/webcomponents-ngx';

@Component({
  selector: 'list-view',
  standalone: true,
  templateUrl: './list-view.component.html',
  styleUrls: ['./list-view.component.scss'],
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CreateResourceModalComponent,
    DeleteResourceModalComponent,
    DynamicPageComponent,
    DynamicPageTitleComponent,
    IconComponent,
    IllustratedMessageComponent,
    TableComponent,
    TableCellComponent,
    TableHeaderCellComponent,
    TableHeaderRowComponent,
    TableRowComponent,
    TextComponent,
    TitleComponent,
    ToolbarButtonComponent,
    ToolbarComponent,
    ValueCellComponent,
  ],
})
export class ListViewComponent implements OnInit {
  private resourceService = inject(ResourceService);
  private luigiCoreService = inject(LuigiCoreService);
  private destroyRef = inject(DestroyRef);
  LuigiClient = input.required<LuigiClient>();
  context = input.required<ResourceNodeContext>();
  private createModal = viewChild<CreateResourceModalComponent>('createModal');
  private deleteModal = viewChild<DeleteResourceModalComponent>('deleteModal');

  resources = signal<Resource[]>([]);
  heading = computed(
    () =>
      `${this.resourceDefinition()?.plural.charAt(0).toUpperCase()}${this.resourceDefinition()?.plural.slice(1)}`,
  );
  resourceDefinition = computed(() => this.context().resourceDefinition);
  columns = computed(
    () => this.resourceDefinition()?.ui?.listView?.fields ?? [],
  );
  viewColomns = computed(() => processFields(this.columns()));
  readyCondition = computed(() => this.resourceDefinition()?.readyCondition);
  hasUiCreateViewFields = computed(
    () => !!this.resourceDefinition()?.ui?.createView?.fields?.length,
  );

  protected readonly getResourceValueByJsonPath = getResourceValueByJsonPath;

  constructor() {
    effect(() => {
      this.list();
    });
  }

  ngOnInit(): void {}

  list() {
    const fields = this.generateGqlFieldsWithReadyConditions();
    const resourceDefinition = this.getResourceDefinition();
    const queryOperation = `${replaceDotsAndHyphensWithUnderscores(resourceDefinition.group)}_${resourceDefinition.plural}`;

    this.resourceService
      .list(queryOperation, fields, this.context())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result: any[]) => {
          this.resources.set(
            result.map((resource) => {
              return {
                ...resource,
                ready: this.getResourceReadyStatus(resource),
              };
            }),
          );
        },
      });
  }

  delete(resource: Resource) {
    const resourceDefinition = this.getResourceDefinition();

    this.resourceService
      .delete(resource, resourceDefinition, this.context())
      .subscribe({
        next: (result) => {
          console.debug('Resource deleted.');
        },
        error: (error) => {
          this.luigiCoreService.showAlert({
            text: `Failure! Could not delete resource: ${resource.metadata.name}.`,
            type: 'error',
          });
        },
      });
  }

  create(resource: Resource) {
    const resourceDefinition = this.getResourceDefinition();

    this.resourceService
      .create(resource, resourceDefinition, this.context())
      .subscribe({
        next: (result) => {
          console.debug('Resource created', result);
        },
      });
  }

  update(resource: Resource) {
    const resourceDefinition = this.getResourceDefinition();

    this.resourceService
      .update(resource, resourceDefinition, this.context())
      .subscribe({
        next: (result) => {
          console.debug('Resource updated', result);
        },
      });
  }

  navigateToResource(resource: Resource) {
    if (!resource.metadata.name) {
      this.LuigiClient().uxManager().showAlert({
        text: 'Resource name is not defined',
        type: 'error',
      });

      throw new Error('Resource name is not defined');
    }

    this.LuigiClient().linkManager().navigate(resource.metadata.name);
  }

  openCreateResourceModal() {
    this.createModal()?.open();
  }

  openEditResourceModal(event: MouseEvent, resource: Resource) {
    event.stopPropagation?.();
    const resourceDefinition = this.getResourceDefinition();

    const groupOperation = replaceDotsAndHyphensWithUnderscores(
      resourceDefinition.group,
    );
    const kind = resourceDefinition.kind;
    const fields = generateGraphQLFields(
      resourceDefinition.ui?.createView?.fields ?? [],
    );

    this.resourceService
      .read(
        resource.metadata.name ?? '',
        groupOperation,
        kind,
        fields,
        this.context(),
        false,
      )
      .subscribe({
        next: (result) => this.createModal()?.open(result),
      });
  }

  openDeleteResourceModal(event: MouseEvent, resource: Resource) {
    event.stopPropagation?.();
    this.deleteModal()?.open(resource);
  }

  private generateGqlFieldsWithReadyConditions() {
    const readyCondition = this.readyCondition();
    if (!readyCondition) {
      return generateGraphQLFields(this.columns());
    }

    return generateGraphQLFields(this.columns().concat(readyCondition));
  }

  private getResourceReadyStatus(resource: Resource) {
    const readyCondition = this.readyCondition();
    if (!readyCondition) {
      return true;
    }

    const readyStatus = getResourceValueByJsonPath(resource, readyCondition);
    console.log('readyStatus', readyStatus);
    return !!readyStatus;
  }

  private getResourceDefinition() {
    const resourceDefinition = this.resourceDefinition();
    if (!resourceDefinition) {
      this.LuigiClient().uxManager().showAlert({
        text: 'Resource definition is not defined',
        type: 'error',
      });

      throw new Error('Resource definition is not defined');
    }

    return resourceDefinition;
  }
}
