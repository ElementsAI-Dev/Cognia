import {
  isConvexDeploymentHost,
  normalizeConvexDeploymentUrl,
  resolveConvexHttpBaseUrl,
  toConvexHttpActionsHost,
  validateConvexDeploymentUrl,
} from './convex-url';

describe('convex-url', () => {
  describe('host helpers', () => {
    it('detects convex deployment hosts', () => {
      expect(isConvexDeploymentHost('demo.convex.cloud')).toBe(true);
      expect(isConvexDeploymentHost('demo.convex.site')).toBe(true);
      expect(isConvexDeploymentHost('example.com')).toBe(false);
    });

    it('maps cloud host to site host for HTTP actions', () => {
      expect(toConvexHttpActionsHost('demo.convex.cloud')).toBe('demo.convex.site');
      expect(toConvexHttpActionsHost('demo.convex.site')).toBe('demo.convex.site');
    });
  });

  describe('URL normalization', () => {
    it('normalizes deployment URL into origin', () => {
      expect(normalizeConvexDeploymentUrl(' https://demo.convex.cloud/path?q=1#hash '))
        .toBe('https://demo.convex.cloud');
    });

    it('resolves canonical HTTP base URL from .convex.cloud input', () => {
      expect(resolveConvexHttpBaseUrl('https://demo.convex.cloud'))
        .toBe('https://demo.convex.site');
    });

    it('keeps .convex.site input unchanged', () => {
      expect(resolveConvexHttpBaseUrl('https://demo.convex.site/'))
        .toBe('https://demo.convex.site');
    });
  });

  describe('validation', () => {
    it('requires URL value', () => {
      expect(validateConvexDeploymentUrl('')).toBe('Convex deployment URL is required');
    });

    it('requires http(s) protocol', () => {
      expect(validateConvexDeploymentUrl('ftp://demo.convex.cloud'))
        .toBe('Convex deployment URL must use http(s)');
    });

    it('requires convex deployment host', () => {
      expect(validateConvexDeploymentUrl('https://example.com'))
        .toBe('Convex deployment URL must use a .convex.cloud or .convex.site host');
    });

    it('accepts convex deployment URLs', () => {
      expect(validateConvexDeploymentUrl('https://demo.convex.cloud')).toBeNull();
      expect(validateConvexDeploymentUrl('https://demo.convex.site')).toBeNull();
    });
  });
});

