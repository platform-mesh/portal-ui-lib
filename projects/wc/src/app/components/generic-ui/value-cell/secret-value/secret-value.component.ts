import { Component, computed, input } from '@angular/core';


@Component({
  selector: 'wc-secret-value',
  imports: [],
  templateUrl: './secret-value.component.html',
  styleUrl: './secret-value.component.scss',
})
export class SecretValueComponent {
  value = input.required<string>();

  maskedValue = computed(() => '*'.repeat(this.value().length || 8));
}