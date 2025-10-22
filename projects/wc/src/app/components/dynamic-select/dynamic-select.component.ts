import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FieldDefinition } from '@openmfp/portal-ui-lib';
import { ResourceNodeContext, ResourceService } from '@platform-mesh/portal-ui-lib/services';
import { getValueByPath } from '@platform-mesh/portal-ui-lib/utils';
import { RequireSome } from '@platform-mesh/portal-ui-lib/utils/utils/type-helpers';
import { OptionComponent, SelectComponent } from '@ui5/webcomponents-ngx';
import { Observable, map } from 'rxjs';


@Component({
  selector: 'dynamic-select',
  imports: [SelectComponent, OptionComponent],
  templateUrl: './dynamic-select.component.html',
  styleUrl: './dynamic-select.component.scss',
})
export class DynamicSelectComponent {
  dynamicValuesDefinition = input.required<NonNullable<FieldDefinition['dynamicValuesDefinition']>>();
  context = input.required<ResourceNodeContext>();

  value = input<string>('');
  required = input<boolean>(false);
  valueState = input<
    'None' | 'Positive' | 'Critical' | 'Negative' | 'Information'
  >('None');

  change = output<Event>();
  input = output<Event>();
  blur = output<void>();

  dynamicValues$ = signal<{ value: string; key: string }[]>([]);

  private resourceService = inject(ResourceService);
  private destroyRef = inject(DestroyRef);

  constructor() {
    effect(() => {
      this.getDynamicValues(this.dynamicValuesDefinition(), this.context())
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((result) => {
          this.dynamicValues$.set(result);
        });
    });
  }

  private getDynamicValues(
    dynamicValuesDefinition: NonNullable<
      FieldDefinition['dynamicValuesDefinition']
    >,
    context: ResourceNodeContext,
  ): Observable<{ value: string; key: string }[]> {
    return this.resourceService
      .list(
        dynamicValuesDefinition.operation,
        dynamicValuesDefinition.gqlQuery,
        context,
      )
      .pipe(
        map((result) =>
          result.map((resource) => ({
            value: getValueByPath(resource, dynamicValuesDefinition.value),
            key: getValueByPath(resource, dynamicValuesDefinition.key),
          })),
        ),
      );
  }
}
