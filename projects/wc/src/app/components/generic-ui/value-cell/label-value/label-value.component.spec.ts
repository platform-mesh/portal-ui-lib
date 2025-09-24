import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LabelValue } from './label-value.component';

describe('LabelValue', () => {
  let component: LabelValue;
  let fixture: ComponentFixture<LabelValue>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LabelValue]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LabelValue);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
