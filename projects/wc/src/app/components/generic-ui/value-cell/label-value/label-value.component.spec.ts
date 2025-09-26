import { LabelValue } from './label-value.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LabelDisplay } from '@platform-mesh/portal-ui-lib/models/models';

describe('LabelValue', () => {
  let component: LabelValue;
  let fixture: ComponentFixture<LabelValue>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LabelValue],
    }).compileComponents();

    fixture = TestBed.createComponent(LabelValue);
    component = fixture.componentInstance;

    // Set required inputs before detectChanges
    fixture.componentRef.setInput('value', 'Test Value');
    fixture.componentRef.setInput('labelDisplay', {
      backgroundColor: '#ffffff',
      color: '#000000',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      textTransform: 'none',
    } as LabelDisplay);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});