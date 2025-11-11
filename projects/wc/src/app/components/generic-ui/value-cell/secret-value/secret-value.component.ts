import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'wc-secret-value',
  imports: [],
  schemas: [],
  templateUrl: './secret-value.component.html',
  styleUrl: './secret-value.component.scss',
})
export class SecretValueComponent {
  value = input.required<string>();
  isVisible = input<boolean>(false);
  maskedValue = computed(() => '*'.repeat(this.value().length || 8));
}
