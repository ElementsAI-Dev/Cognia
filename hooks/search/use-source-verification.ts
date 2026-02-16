/**
 * Source Verification Hook
 * Manages source verification workflow and state
 */

import { useState, useCallback } from 'react';
import { useSettingsStore } from '@/stores/settings/settings-store';
import {
  generateVerificationReport,
  getRootDomain,
  extractDomain,
  verifySource,
  enhanceSearchResponse,
} from '@/lib/search/source-verification';
import type {
  SearchResponse,
  VerifiedSearchResult,
  VerifiedSearchResponse,
  SourceVerificationSettings,
} from '@/types/search';

export interface UseSourceVerificationOptions {
  onVerificationComplete?: (results: VerifiedSearchResult[]) => void;
  onSkip?: () => void;
}

export interface UseSourceVerificationReturn {
  verifyResults: (searchResponse: SearchResponse) => Promise<VerifiedSearchResponse>;
  shouldShowDialog: boolean;
  isVerifying: boolean;
  verifiedResponse: VerifiedSearchResponse | null;
  selectedResults: VerifiedSearchResult[];
  setSelectedResults: (results: VerifiedSearchResult[]) => void;
  confirmSelection: () => void;
  skipVerification: () => void;
  markSourceTrusted: (domain: string) => void;
  markSourceBlocked: (domain: string) => void;
  settings: SourceVerificationSettings;
  resetState: () => void;
}

export function useSourceVerification(
  options: UseSourceVerificationOptions = {}
): UseSourceVerificationReturn {
  const { onVerificationComplete, onSkip } = options;

  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedResponse, setVerifiedResponse] = useState<VerifiedSearchResponse | null>(null);
  const [selectedResults, setSelectedResults] = useState<VerifiedSearchResult[]>([]);
  const [shouldShowDialog, setShouldShowDialog] = useState(false);

  const {
    sourceVerificationSettings: settings,
    addTrustedDomain,
    addBlockedDomain,
  } = useSettingsStore();

  const verifyResults = useCallback(
    async (searchResponse: SearchResponse): Promise<VerifiedSearchResponse> => {
      setIsVerifying(true);

      try {
        if (!settings.enabled || settings.mode === 'disabled') {
          const results: VerifiedSearchResult[] = searchResponse.results.map((result) => ({
            ...result,
            isEnabled: true,
          }));
          const response: VerifiedSearchResponse = {
            ...searchResponse,
            results,
          };
          setVerifiedResponse(response);
          setSelectedResults(results);
          return response;
        }

        // Use enhanceSearchResponse to get base verification data
        const enhanced =
          typeof enhanceSearchResponse === 'function'
            ? enhanceSearchResponse(searchResponse, { includeReport: false })
            : {
                ...searchResponse,
                results: searchResponse.results.map((result) => ({
                  ...result,
                  verification: verifySource(result.url),
                })),
              };

        // Apply user settings (trust/block lists, auto-filter) on top
        const enhancedResults: VerifiedSearchResult[] = enhanced.results.map((result) => {
          const rootDomain = getRootDomain(extractDomain(result.url));

          const isBlocked = settings.blockedDomains.some(
            (d) => rootDomain.includes(d) || d.includes(rootDomain)
          );
          const isTrusted = settings.trustedDomains.some(
            (d) => rootDomain.includes(d) || d.includes(rootDomain)
          );

          let isEnabled = true;
          if (isBlocked) {
            isEnabled = false;
          } else if (
            settings.autoFilterLowCredibility &&
            result.verification &&
            result.verification.credibilityScore < settings.minimumCredibilityScore * 100
          ) {
            isEnabled = false;
          }

          return {
            ...result,
            verification: result.verification
              ? {
                  url: result.verification.url,
                  domain: result.verification.domain,
                  rootDomain,
                  sourceType: result.verification.sourceType as
                    | 'government'
                    | 'academic'
                    | 'news'
                    | 'reference'
                    | 'organization'
                    | 'corporate'
                    | 'blog'
                    | 'social'
                    | 'forum'
                    | 'unknown',
                  credibilityScore: result.verification.credibilityScore / 100,
                  credibilityLevel: result.verification.credibilityLevel,
                  isHttps: result.verification.isHttps,
                  trustIndicators: result.verification.trustIndicators,
                  warningIndicators: result.verification.warningIndicators,
                  userMarked: isBlocked ? 'blocked' : isTrusted ? 'trusted' : null,
                }
              : undefined,
            isEnabled,
          };
        });

        const report = generateVerificationReport(searchResponse);

        // Only include cross-validation if enabled in settings
        const crossValidationData =
          settings.enableCrossValidation && report.crossValidation
            ? [
                {
                  claim: report.crossValidation.claim,
                  supportingSources: report.crossValidation.supportingResults.map((r) => r.url),
                  contradictingSources: report.crossValidation.contradictingResults.map(
                    (r) => r.url
                  ),
                  neutralSources: report.crossValidation.neutralResults.map((r) => r.url),
                  consensusScore: report.crossValidation.confidenceScore / 100,
                },
              ]
            : undefined;

        const response: VerifiedSearchResponse = {
          ...searchResponse,
          results: enhancedResults,
          verificationReport: {
            totalSources: report.totalResults,
            highCredibility: report.sourceVerifications.filter((v) => v.credibilityLevel === 'high')
              .length,
            mediumCredibility: report.sourceVerifications.filter(
              (v) => v.credibilityLevel === 'medium'
            ).length,
            lowCredibility: report.sourceVerifications.filter((v) => v.credibilityLevel === 'low')
              .length,
            averageCredibility: report.overallCredibilityScore / 100,
            crossValidation: crossValidationData,
            recommendations: report.recommendations,
          },
        };

        setVerifiedResponse(response);
        setSelectedResults(enhancedResults.filter((r) => r.isEnabled));

        if (settings.mode === 'ask') {
          setShouldShowDialog(true);
        }

        return response;
      } finally {
        setIsVerifying(false);
      }
    },
    [settings]
  );

  const confirmSelection = useCallback(() => {
    setShouldShowDialog(false);
    if (onVerificationComplete) {
      onVerificationComplete(selectedResults);
    }
  }, [selectedResults, onVerificationComplete]);

  const skipVerification = useCallback(() => {
    setShouldShowDialog(false);
    if (verifiedResponse) {
      setSelectedResults(verifiedResponse.results);
    }
    if (onSkip) {
      onSkip();
    }
  }, [verifiedResponse, onSkip]);

  const markSourceTrusted = useCallback(
    (domain: string) => {
      addTrustedDomain(domain);
      if (verifiedResponse) {
        const updatedResults = verifiedResponse.results.map((r) => {
          if (r.verification?.rootDomain === domain) {
            return {
              ...r,
              verification: { ...r.verification, userMarked: 'trusted' as const },
              isEnabled: true,
            };
          }
          return r;
        });
        setVerifiedResponse({ ...verifiedResponse, results: updatedResults });
        setSelectedResults(updatedResults.filter((r) => r.isEnabled));
      }
    },
    [addTrustedDomain, verifiedResponse]
  );

  const markSourceBlocked = useCallback(
    (domain: string) => {
      addBlockedDomain(domain);
      if (verifiedResponse) {
        const updatedResults = verifiedResponse.results.map((r) => {
          if (r.verification?.rootDomain === domain) {
            return {
              ...r,
              verification: { ...r.verification, userMarked: 'blocked' as const },
              isEnabled: false,
            };
          }
          return r;
        });
        setVerifiedResponse({ ...verifiedResponse, results: updatedResults });
        setSelectedResults(updatedResults.filter((r) => r.isEnabled));
      }
    },
    [addBlockedDomain, verifiedResponse]
  );

  const resetState = useCallback(() => {
    setIsVerifying(false);
    setVerifiedResponse(null);
    setSelectedResults([]);
    setShouldShowDialog(false);
  }, []);

  return {
    verifyResults,
    shouldShowDialog,
    isVerifying,
    verifiedResponse,
    selectedResults,
    setSelectedResults,
    confirmSelection,
    skipVerification,
    markSourceTrusted,
    markSourceBlocked,
    settings,
    resetState,
  };
}
