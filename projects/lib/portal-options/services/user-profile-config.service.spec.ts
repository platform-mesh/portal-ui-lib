import { UserProfileConfigServiceImpl } from './user-profile-config.service';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '@openmfp/portal-ui-lib';
import { MockedObject } from 'vitest';

describe('UserProfileConfigServiceImpl', () => {
  let service: UserProfileConfigServiceImpl;
  let mockAuthService: MockedObject<AuthService>;

  beforeEach(() => {
    const authServiceMock = {
      getUserInfo: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        UserProfileConfigServiceImpl,
        { provide: AuthService, useValue: authServiceMock },
      ],
    });

    service = TestBed.inject(UserProfileConfigServiceImpl);
    mockAuthService = TestBed.inject(AuthService) as MockedObject<AuthService>;
  });

  describe('getProfile', () => {
    it('should use email in the profile link', async () => {
      const testEmail = 'user@example.com';
      mockAuthService.getUserInfo.mockReturnValue({
        email: testEmail,
        userId: '123-123-123-123',
      } as any);

      const profile = await service.getProfile();

      const profileItem = profile.items.find(
        (item) => item.label === 'PROFILE_PROFILE',
      );
      expect(profileItem).toBeDefined();
      expect(profileItem!.link).toBe(`/users/${testEmail}/overview`);
    });

    it('should return profile items with correct structure', async () => {
      mockAuthService.getUserInfo.mockReturnValue({
        email: 'test@example.com',
        userId: '123-123-123-123',
      } as any);

      const profile = await service.getProfile();

      expect(profile.items).toHaveLength(1);
      expect(profile.items[0]).toEqual({
        label: 'PROFILE_PROFILE',
        icon: 'customer',
        link: '/users/test@example.com/overview',
      });
    });
  });
});
