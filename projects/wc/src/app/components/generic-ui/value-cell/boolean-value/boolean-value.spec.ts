import { BooleanValueComponent } from './boolean-value.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';

describe('BooleanValue', () => {
  let component: BooleanValueComponent;
  let fixture: ComponentFixture<BooleanValueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BooleanValueComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BooleanValueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
