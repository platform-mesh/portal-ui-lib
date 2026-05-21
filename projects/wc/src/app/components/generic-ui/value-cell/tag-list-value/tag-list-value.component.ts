import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';
import { Tag } from '@fundamental-ngx/ui5-webcomponents/tag';
import { TagSettings } from '@platform-mesh/portal-ui-lib/models/models';

@Component({
  selector: 'pm-tag-list-value',
  imports: [Tag],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './tag-list-value.component.html',
  styleUrl: './tag-list-value.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TagListValue {
  tags = input.required<string[]>();
  testId = input<string>('tag-list-value');
  tagSettings = input<TagSettings | undefined>(undefined);
}
