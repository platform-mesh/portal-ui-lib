import { isLocalSetup } from './is-local-setup';

describe('isLocalSetup', () => {
  let originalLocation: Location;

  beforeEach(() => {
    originalLocation = window.location;

    delete (window as any).location;
    (window as any).location = {
      ...originalLocation,
      hostname: '',
    };
  });

  afterEach(() => {
    (window as any).location = originalLocation;
  });

  it('should return true for localhost', () => {
    window.location.hostname = 'localhost';
    expect(isLocalSetup()).toBe(true);
  });

  it('should return true for localhost with port', () => {
    window.location.hostname = 'localhost:4200';
    expect(isLocalSetup()).toBe(true);
  });

  it('should return false for 127.0.0.1 (localhost IP)', () => {
    window.location.hostname = '127.0.0.1';
    expect(isLocalSetup()).toBe(false);
  });

  it('should return true for portal.dev.local', () => {
    window.location.hostname = 'portal.dev.local';
    expect(isLocalSetup()).toBe(true);
  });

  it('should return true for subdomain with portal.dev.local', () => {
    window.location.hostname = 'app.portal.dev.local';
    expect(isLocalSetup()).toBe(true);
  });

  it('should return true for portal.dev.local with port', () => {
    window.location.hostname = 'portal.dev.local:3000';
    expect(isLocalSetup()).toBe(true);
  });

  it('should return false for production domain', () => {
    window.location.hostname = 'portal.example.com';
    expect(isLocalSetup()).toBe(false);
  });

  it('should return false for staging domain', () => {
    window.location.hostname = 'staging.portal.example.com';
    expect(isLocalSetup()).toBe(false);
  });

  it('should return false for IP address that is not localhost', () => {
    window.location.hostname = '192.168.1.100';
    expect(isLocalSetup()).toBe(false);
  });

  it('should return false for empty hostname', () => {
    window.location.hostname = '';
    expect(isLocalSetup()).toBe(false);
  });

  it('should return true for domain containing localhost', () => {
    window.location.hostname = 'mylocalhost.com';
    expect(isLocalSetup()).toBe(true);
  });

  it('should return true for domain containing portal.dev.local', () => {
    window.location.hostname = 'myportal.dev.local.com';
    expect(isLocalSetup()).toBe(true);
  });

  it('should handle case sensitivity correctly', () => {
    window.location.hostname = 'LOCALHOST';
    expect(isLocalSetup()).toBe(false);

    window.location.hostname = 'PORTAL.DEV.LOCAL';
    expect(isLocalSetup()).toBe(false);
  });
});
