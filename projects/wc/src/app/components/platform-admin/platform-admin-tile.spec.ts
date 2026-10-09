import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { addInitListener, linkManager } from '@luigi-project/client';
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
    vi.clearAllMocks();

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

  it('registers an addInitListener callback on construction', () => {
    expect(vi.mocked(addInitListener)).toHaveBeenCalledWith(expect.any(Function));
  });

  it('navigate() calls linkManager().fromClosestContext().navigate with /platform-admin', () => {
    const mockNavigate = vi.fn();
    vi.mocked(linkManager).mockReturnValueOnce({
      fromClosestContext: () => ({ navigate: mockNavigate }),
    } as unknown as ReturnType<typeof linkManager>);

    component.navigate();

    expect(mockNavigate).toHaveBeenCalledWith('/platform-admin');
  });
});
