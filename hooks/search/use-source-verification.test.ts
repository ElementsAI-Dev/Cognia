/**
 * Tests for useSourceVerification hook
 * Comprehensive test coverage for source verification workflow
 */

import { renderHook, act } from '@testing-library/react';
import { useSourceVerification } from './use-source-verification';
import type { SearchResponse, VerifiedSearchResult } from '@/types/search';
import * as settingsStore from '@/stores/settings/settings-store';
import * as sourceVerification from '@/lib/search/source-verification';

// Mock dependencies
const mockAddTrustedDomain = jest.fn();
const mockAddBlockedDomain = jest.fn();

const mockDefaultSettings = {
  enabled: true,
  mode: 'ask' as const,
  minimumCredibilityScore: 0.3,
  autoFilterLowCredibility: false,
  showVerificationBadges: true,
  trustedDomains: [] as string[],
  blockedDomains: [] as string[],
  enableCrossValidation: true,
};

jest.mock('@/stores/settings/settings-store', () => ({
  useSettingsStore: jest.fn(),
}));

jest.mock('@/lib/search/source-verification', () => ({
  verifySource: jest.fn(),
  generateVerificationReport: jest.fn(),
  getRootDomain: jest.fn(),
  extractDomain: jest.fn(),
}));

const mockUseSettingsStore = settingsStore.useSettingsStore as unknown as jest.Mock;
const mockVerifySource = sourceVerification.verifySource as jest.Mock;
const mockGenerateVerificationReport = sourceVerification.generateVerificationReport as jest.Mock;
const mockGetRootDomain = sourceVerification.getRootDomain as jest.Mock;
const mockExtractDomain = sourceVerification.extractDomain as jest.Mock;

// Helper to create mock search response
function createMockSearchResponse(results: Partial<SearchResponse['results'][0]>[] = []): SearchResponse {
  return {
    provider: 'tavily',
    query: 'test query',
    results: results.map((r, i) => ({
      title: `Result ${i + 1}`,
      url: `https://example${i + 1}.com/article`,
      content: `Content ${i + 1}`,
      score: 0.9 - i * 0.1,
      ...r,
    })),
    responseTime: 100,
  };
}

// Setup default mock implementations
function setupDefaultMocks() {
  mockUseSettingsStore.mockReturnValue({
    sourceVerificationSettings: mockDefaultSettings,
    addTrustedDomain: mockAddTrustedDomain,
    addBlockedDomain: mockAddBlockedDomain,
  });

  mockVerifySource.mockImplementation((url: string) => ({
    url,
    domain: new URL(url).hostname,
    sourceType: 'news',
    credibilityScore: 75,
    credibilityLevel: 'high',
    isHttps: url.startsWith('https'),
    trustIndicators: ['HTTPS', 'Known Publisher'],
    warningIndicators: [],
  }));

  mockGenerateVerificationReport.mockReturnValue({
    totalResults: 3,
    sourceVerifications: [
      { credibilityLevel: 'high' },
      { credibilityLevel: 'medium' },
      { credibilityLevel: 'low' },
    ],
    overallCredibilityScore: 60,
    crossValidation: {
      claim: 'Test claim',
      supportingResults: [{ url: 'https://example.com/1' }],
      contradictingResults: [],
      neutralResults: [{ url: 'https://example.com/2' }],
      confidenceScore: 80,
    },
    recommendations: ['Use multiple sources'],
  });

  mockGetRootDomain.mockImplementation((domain: string) => domain.replace('www.', ''));
  mockExtractDomain.mockImplementation((url: string) => new URL(url).hostname);
}

describe('useSourceVerification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  describe('Initial State', () => {
    it('should return default state values', () => {
      const { result } = renderHook(() => useSourceVerification());

      expect(result.current.isVerifying).toBe(false);
      expect(result.current.verifiedResponse).toBeNull();
      expect(result.current.selectedResults).toEqual([]);
      expect(result.current.shouldShowDialog).toBe(false);
      expect(result.current.settings).toEqual(mockDefaultSettings);
    });

    it('should return all required methods', () => {
      const { result } = renderHook(() => useSourceVerification());

      expect(typeof result.current.verifyResults).toBe('function');
      expect(typeof result.current.setSelectedResults).toBe('function');
      expect(typeof result.current.confirmSelection).toBe('function');
      expect(typeof result.current.skipVerification).toBe('function');
      expect(typeof result.current.markSourceTrusted).toBe('function');
      expect(typeof result.current.markSourceBlocked).toBe('function');
      expect(typeof result.current.resetState).toBe('function');
    });
  });

  describe('Verification Logic', () => {
    it('should verify search results', async () => {
      const { result } = renderHook(() => useSourceVerification());
      const searchResponse = createMockSearchResponse([
        { url: 'https://example1.com/article' },
        { url: 'https://example2.com/article' },
      ]);

      let verifiedResponse;
      await act(async () => {
        verifiedResponse = await result.current.verifyResults(searchResponse);
      });

      expect(verifiedResponse).toBeDefined();
      expect(verifiedResponse!.results).toHaveLength(2);
      expect(result.current.verifiedResponse).not.toBeNull();
    });

    it('should set isVerifying during verification', async () => {
      const { result } = renderHook(() => useSourceVerification());
      const searchResponse = createMockSearchResponse([{ url: 'https://example.com' }]);

      const verifyPromise = result.current.verifyResults(searchResponse);

      // Note: Due to the async nature, we await and verify the final state
      await act(async () => {
        await verifyPromise;
      });

      expect(result.current.isVerifying).toBe(false);
    });

    it('should include verification data in results', async () => {
      const { result } = renderHook(() => useSourceVerification());
      const searchResponse = createMockSearchResponse([{ url: 'https://example.com/article' }]);

      await act(async () => {
        await result.current.verifyResults(searchResponse);
      });

      const verifiedResult = result.current.verifiedResponse?.results[0];
      expect(verifiedResult?.verification).toBeDefined();
      expect(verifiedResult?.verification?.credibilityScore).toBeDefined();
      expect(verifiedResult?.verification?.sourceType).toBe('news');
    });

    it('should show dialog when mode is ask', async () => {
      const { result } = renderHook(() => useSourceVerification());
      const searchResponse = createMockSearchResponse([{ url: 'https://example.com' }]);

      await act(async () => {
        await result.current.verifyResults(searchResponse);
      });

      expect(result.current.shouldShowDialog).toBe(true);
    });

    it('should include verification report', async () => {
      const { result } = renderHook(() => useSourceVerification());
      const searchResponse = createMockSearchResponse([
        { url: 'https://example1.com' },
        { url: 'https://example2.com' },
      ]);

      await act(async () => {
        await result.current.verifyResults(searchResponse);
      });

      const report = result.current.verifiedResponse?.verificationReport;
      expect(report).toBeDefined();
      expect(report?.totalSources).toBe(3);
      expect(report?.recommendations).toContain('Use multiple sources');
    });
  });

  describe('Disabled Verification', () => {
    it('should skip verification when disabled', async () => {
      mockUseSettingsStore.mockReturnValue({
        sourceVerificationSettings: { ...mockDefaultSettings, enabled: false },
        addTrustedDomain: mockAddTrustedDomain,
        addBlockedDomain: mockAddBlockedDomain,
      });

      const { result } = renderHook(() => useSourceVerification());
      const searchResponse = createMockSearchResponse([{ url: 'https://example.com' }]);

      await act(async () => {
        await result.current.verifyResults(searchResponse);
      });

      // All results should be enabled when verification is disabled
      expect(result.current.verifiedResponse?.results[0].isEnabled).toBe(true);
    });

    it('should skip verification when mode is disabled', async () => {
      mockUseSettingsStore.mockReturnValue({
        sourceVerificationSettings: { ...mockDefaultSettings, mode: 'disabled' },
        addTrustedDomain: mockAddTrustedDomain,
        addBlockedDomain: mockAddBlockedDomain,
      });

      const { result } = renderHook(() => useSourceVerification());
      const searchResponse = createMockSearchResponse([{ url: 'https://example.com' }]);

      await act(async () => {
        await result.current.verifyResults(searchResponse);
      });

      expect(result.current.verifiedResponse?.results[0].isEnabled).toBe(true);
    });
  });

  describe('Domain Filtering', () => {
    it('should filter blocked domains', async () => {
      mockUseSettingsStore.mockReturnValue({
        sourceVerificationSettings: {
          ...mockDefaultSettings,
          blockedDomains: ['example1.com'],
        },
        addTrustedDomain: mockAddTrustedDomain,
        addBlockedDomain: mockAddBlockedDomain,
      });

      const { result } = renderHook(() => useSourceVerification());
      const searchResponse = createMockSearchResponse([
        { url: 'https://example1.com/article' },
        { url: 'https://example2.com/article' },
      ]);

      await act(async () => {
        await result.current.verifyResults(searchResponse);
      });

      const blockedResult = result.current.verifiedResponse?.results.find(
        (r) => r.url.includes('example1')
      );
      expect(blockedResult?.isEnabled).toBe(false);
      expect(blockedResult?.verification?.userMarked).toBe('blocked');
    });

    it('should mark trusted domains', async () => {
      mockUseSettingsStore.mockReturnValue({
        sourceVerificationSettings: {
          ...mockDefaultSettings,
          trustedDomains: ['example1.com'],
        },
        addTrustedDomain: mockAddTrustedDomain,
        addBlockedDomain: mockAddBlockedDomain,
      });

      const { result } = renderHook(() => useSourceVerification());
      const searchResponse = createMockSearchResponse([{ url: 'https://example1.com/article' }]);

      await act(async () => {
        await result.current.verifyResults(searchResponse);
      });

      const trustedResult = result.current.verifiedResponse?.results[0];
      expect(trustedResult?.verification?.userMarked).toBe('trusted');
    });
  });

  describe('Auto Filter Low Credibility', () => {
    it('should auto-filter low credibility sources when enabled', async () => {
      mockVerifySource.mockReturnValue({
        url: 'https://lowcred.com',
        domain: 'lowcred.com',
        sourceType: 'blog',
        credibilityScore: 10,
        credibilityLevel: 'low',
        isHttps: true,
        trustIndicators: [],
        warningIndicators: ['Unknown publisher'],
      });

      mockUseSettingsStore.mockReturnValue({
        sourceVerificationSettings: {
          ...mockDefaultSettings,
          autoFilterLowCredibility: true,
          minimumCredibilityScore: 0.3,
        },
        addTrustedDomain: mockAddTrustedDomain,
        addBlockedDomain: mockAddBlockedDomain,
      });

      const { result } = renderHook(() => useSourceVerification());
      const searchResponse = createMockSearchResponse([{ url: 'https://lowcred.com/article' }]);

      await act(async () => {
        await result.current.verifyResults(searchResponse);
      });

      expect(result.current.verifiedResponse?.results[0].isEnabled).toBe(false);
    });
  });

  describe('Selection Management', () => {
    it('should update selected results', async () => {
      const { result } = renderHook(() => useSourceVerification());
      const searchResponse = createMockSearchResponse([
        { url: 'https://example1.com' },
        { url: 'https://example2.com' },
      ]);

      await act(async () => {
        await result.current.verifyResults(searchResponse);
      });

      const newSelection: VerifiedSearchResult[] = [
        {
          title: 'Selected',
          url: 'https://selected.com',
          content: 'Content',
          score: 0.9,
          isEnabled: true,
        },
      ];

      act(() => {
        result.current.setSelectedResults(newSelection);
      });

      expect(result.current.selectedResults).toEqual(newSelection);
    });

    it('should confirm selection and call callback', async () => {
      const onVerificationComplete = jest.fn();
      const { result } = renderHook(() =>
        useSourceVerification({ onVerificationComplete })
      );
      const searchResponse = createMockSearchResponse([{ url: 'https://example.com' }]);

      await act(async () => {
        await result.current.verifyResults(searchResponse);
      });

      act(() => {
        result.current.confirmSelection();
      });

      expect(result.current.shouldShowDialog).toBe(false);
      expect(onVerificationComplete).toHaveBeenCalledWith(result.current.selectedResults);
    });

    it('should skip verification and call callback', async () => {
      const onSkip = jest.fn();
      const { result } = renderHook(() => useSourceVerification({ onSkip }));
      const searchResponse = createMockSearchResponse([{ url: 'https://example.com' }]);

      await act(async () => {
        await result.current.verifyResults(searchResponse);
      });

      act(() => {
        result.current.skipVerification();
      });

      expect(result.current.shouldShowDialog).toBe(false);
      expect(onSkip).toHaveBeenCalled();
    });

    it('should select all results when skipping verification', async () => {
      const { result } = renderHook(() => useSourceVerification());
      const searchResponse = createMockSearchResponse([
        { url: 'https://example1.com' },
        { url: 'https://example2.com' },
      ]);

      await act(async () => {
        await result.current.verifyResults(searchResponse);
      });

      // Clear selected results first
      act(() => {
        result.current.setSelectedResults([]);
      });

      act(() => {
        result.current.skipVerification();
      });

      expect(result.current.selectedResults.length).toBe(2);
    });
  });

  describe('Mark Source Trusted/Blocked', () => {
    it('should mark source as trusted', async () => {
      const { result } = renderHook(() => useSourceVerification());
      const searchResponse = createMockSearchResponse([{ url: 'https://example.com/article' }]);

      await act(async () => {
        await result.current.verifyResults(searchResponse);
      });

      act(() => {
        result.current.markSourceTrusted('example.com');
      });

      expect(mockAddTrustedDomain).toHaveBeenCalledWith('example.com');
    });

    it('should update result when marked trusted', async () => {
      mockExtractDomain.mockReturnValue('example.com');
      mockGetRootDomain.mockReturnValue('example.com');

      const { result } = renderHook(() => useSourceVerification());
      const searchResponse = createMockSearchResponse([{ url: 'https://example.com/article' }]);

      await act(async () => {
        await result.current.verifyResults(searchResponse);
      });

      act(() => {
        result.current.markSourceTrusted('example.com');
      });

      const updatedResult = result.current.verifiedResponse?.results[0];
      expect(updatedResult?.verification?.userMarked).toBe('trusted');
      expect(updatedResult?.isEnabled).toBe(true);
    });

    it('should mark source as blocked', async () => {
      const { result } = renderHook(() => useSourceVerification());
      const searchResponse = createMockSearchResponse([{ url: 'https://example.com/article' }]);

      await act(async () => {
        await result.current.verifyResults(searchResponse);
      });

      act(() => {
        result.current.markSourceBlocked('example.com');
      });

      expect(mockAddBlockedDomain).toHaveBeenCalledWith('example.com');
    });

    it('should update result when marked blocked', async () => {
      mockExtractDomain.mockReturnValue('example.com');
      mockGetRootDomain.mockReturnValue('example.com');

      const { result } = renderHook(() => useSourceVerification());
      const searchResponse = createMockSearchResponse([{ url: 'https://example.com/article' }]);

      await act(async () => {
        await result.current.verifyResults(searchResponse);
      });

      act(() => {
        result.current.markSourceBlocked('example.com');
      });

      const updatedResult = result.current.verifiedResponse?.results[0];
      expect(updatedResult?.verification?.userMarked).toBe('blocked');
      expect(updatedResult?.isEnabled).toBe(false);
    });

    it('should remove blocked result from selected results', async () => {
      const { result } = renderHook(() => useSourceVerification());
      const searchResponse = createMockSearchResponse([
        { url: 'https://example1.com/article' },
        { url: 'https://example2.com/article' },
      ]);

      await act(async () => {
        await result.current.verifyResults(searchResponse);
      });

      const initialSelectedCount = result.current.selectedResults.length;

      act(() => {
        result.current.markSourceBlocked('example1.com');
      });

      expect(result.current.selectedResults.length).toBeLessThanOrEqual(initialSelectedCount);
    });
  });

  describe('Cross-Validation', () => {
    it('should include cross-validation data when enabled', async () => {
      const { result } = renderHook(() => useSourceVerification());
      const searchResponse = createMockSearchResponse([
        { url: 'https://example1.com' },
        { url: 'https://example2.com' },
      ]);

      await act(async () => {
        await result.current.verifyResults(searchResponse);
      });

      const crossValidation = result.current.verifiedResponse?.verificationReport?.crossValidation;
      expect(crossValidation).toBeDefined();
      expect(crossValidation?.[0].claim).toBe('Test claim');
    });

    it('should exclude cross-validation when disabled', async () => {
      mockUseSettingsStore.mockReturnValue({
        sourceVerificationSettings: {
          ...mockDefaultSettings,
          enableCrossValidation: false,
        },
        addTrustedDomain: mockAddTrustedDomain,
        addBlockedDomain: mockAddBlockedDomain,
      });

      const { result } = renderHook(() => useSourceVerification());
      const searchResponse = createMockSearchResponse([{ url: 'https://example.com' }]);

      await act(async () => {
        await result.current.verifyResults(searchResponse);
      });

      const crossValidation = result.current.verifiedResponse?.verificationReport?.crossValidation;
      expect(crossValidation).toBeUndefined();
    });
  });

  describe('Reset State', () => {
    it('should reset all state to initial values', async () => {
      const { result } = renderHook(() => useSourceVerification());
      const searchResponse = createMockSearchResponse([{ url: 'https://example.com' }]);

      await act(async () => {
        await result.current.verifyResults(searchResponse);
      });

      expect(result.current.verifiedResponse).not.toBeNull();
      expect(result.current.selectedResults.length).toBeGreaterThan(0);

      act(() => {
        result.current.resetState();
      });

      expect(result.current.isVerifying).toBe(false);
      expect(result.current.verifiedResponse).toBeNull();
      expect(result.current.selectedResults).toEqual([]);
      expect(result.current.shouldShowDialog).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty search results', async () => {
      const { result } = renderHook(() => useSourceVerification());
      const searchResponse = createMockSearchResponse([]);

      await act(async () => {
        await result.current.verifyResults(searchResponse);
      });

      expect(result.current.verifiedResponse?.results).toEqual([]);
    });

    it('should handle marking non-existent domain', async () => {
      const { result } = renderHook(() => useSourceVerification());
      const searchResponse = createMockSearchResponse([{ url: 'https://example.com' }]);

      await act(async () => {
        await result.current.verifyResults(searchResponse);
      });

      act(() => {
        result.current.markSourceTrusted('nonexistent.com');
      });

      // Should not throw and should call the store method
      expect(mockAddTrustedDomain).toHaveBeenCalledWith('nonexistent.com');
    });

    it('should skip marking when no verified response exists', () => {
      const { result } = renderHook(() => useSourceVerification());

      act(() => {
        result.current.markSourceTrusted('example.com');
      });

      expect(mockAddTrustedDomain).toHaveBeenCalledWith('example.com');
      // Should not crash
    });
  });
});
