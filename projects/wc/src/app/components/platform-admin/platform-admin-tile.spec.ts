import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlatformAdminTileComponent } from './platform-admin-tile';

vi.mock('@luigi-project/client', () => ({
  addInitListener: vi.fn(),
  linkManager: vi.fn(() => ({
    fromClosestContext: vi.fn(() => ({ navigate: vi.fn() })),
  })),
}));

describe('PlatformAdminTileComponent', () => {
  let component: PlatformAdminTileComponent;
  let fixture: ComponentFixture<PlatformAdminTileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlatformAdminTileComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(PlatformAdminTileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('navigate() calls linkManager().fromClosestContext().navigate with /platform-admin', async () => {
    const { linkManager } = await import('@luigi-project/client');
    const mockNavigate = vi.fn();
    (linkManager as ReturnType<typeof vi.fn>).mockReturnValue({
      fromClosestContext: vi.fn(() => ({ navigate: mockNavigate })),
    });

    component.navigate();

    expect(mockNavigate).toHaveBeenCalledWith('/platform-admin');
  });
});
