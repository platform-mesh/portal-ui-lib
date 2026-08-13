import { resourceActionAllowed } from './resource-action-allowed';

describe('resourceActionAllowed', () => {
  describe('fail-open: returns true when no entry for the resource exists', () => {
    it('returns true when portalPermissions is undefined', () => {
      expect(resourceActionAllowed(undefined, 'clusters', 'list')).toBe(true);
    });

    it('returns true when portalPermissions is an empty object', () => {
      expect(resourceActionAllowed({}, 'clusters', 'list')).toBe(true);
    });

    it('returns true when resource has no entry in portalPermissions', () => {
      expect(resourceActionAllowed({ other: ['list'] }, 'clusters', 'list')).toBe(true);
    });

    it('returns true when resource is undefined and there is no empty-string key', () => {
      // resource ?? '' → looks up '' key; no entry → fail-open
      expect(resourceActionAllowed({ clusters: ['list'] }, undefined, 'list')).toBe(true);
    });

    it('returns true when resource is undefined and portalPermissions is undefined', () => {
      expect(resourceActionAllowed(undefined, undefined, 'list')).toBe(true);
    });
  });

  describe('gated: returns based on the entry when it exists for the resource', () => {
    it('returns true when the entry contains the requested verb', () => {
      expect(resourceActionAllowed({ clusters: ['list', 'create'] }, 'clusters', 'list')).toBe(true);
    });

    it('returns true when the entry contains only the requested verb', () => {
      expect(resourceActionAllowed({ clusters: ['create'] }, 'clusters', 'create')).toBe(true);
    });

    it('returns false when the entry exists but does not contain the requested verb', () => {
      expect(resourceActionAllowed({ clusters: ['get'] }, 'clusters', 'list')).toBe(false);
    });

    it('returns false when the entry exists but is an empty array', () => {
      expect(resourceActionAllowed({ clusters: [] }, 'clusters', 'list')).toBe(false);
    });

    it('returns false when a different verb is present but not the requested one', () => {
      expect(resourceActionAllowed({ clusters: ['create', 'delete'] }, 'clusters', 'watch')).toBe(false);
    });
  });

  describe('empty-string resource key', () => {
    it('returns false when entry for "" exists without the verb (resource undefined)', () => {
      // resource ?? '' → '' key exists; verb absent → gated false
      expect(resourceActionAllowed({ '': ['create'] }, undefined, 'list')).toBe(false);
    });

    it('returns true when entry for "" exists and includes the verb (resource undefined)', () => {
      expect(resourceActionAllowed({ '': ['list'] }, undefined, 'list')).toBe(true);
    });
  });
});
