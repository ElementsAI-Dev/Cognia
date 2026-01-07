/**
 * Source Verification and Content Cross-Validation Module
 * Provides functionality to verify the credibility of search sources
 * and cross-validate content across multiple search results.
 */

import type { SearchResult, SearchResponse } from '@/types/search';

/**
 * Source credibility levels
 */
export type CredibilityLevel = 'high' | 'medium' | 'low' | 'unknown';

/**
 * Source type categories
 */
export type SourceType =
  | 'government'
  | 'academic'
  | 'news'
  | 'encyclopedia'
  | 'official'
  | 'social'
  | 'blog'
  | 'forum'
  | 'ecommerce'
  | 'unknown';

/**
 * Source verification result
 */
export interface SourceVerificationResult {
  url: string;
  domain: string;
  credibilityLevel: CredibilityLevel;
  credibilityScore: number;
  sourceType: SourceType;
  isHttps: boolean;
  domainAge?: string;
  trustIndicators: string[];
  warningIndicators: string[];
}

/**
 * Content cross-validation result
 */
export interface CrossValidationResult {
  claim: string;
  supportingResults: SearchResult[];
  contradictingResults: SearchResult[];
  neutralResults: SearchResult[];
  confidenceScore: number;
  consensusLevel: 'strong' | 'moderate' | 'weak' | 'conflicting';
  validationSummary: string;
}

/**
 * Aggregated verification report
 */
export interface VerificationReport {
  query: string;
  timestamp: number;
  totalResults: number;
  sourceVerifications: SourceVerificationResult[];
  crossValidation?: CrossValidationResult;
  overallCredibilityScore: number;
  recommendations: string[];
}

/**
 * Known trusted domains by category
 */
const TRUSTED_DOMAINS: Record<SourceType, string[]> = {
  government: [
    'gov', 'gov.uk', 'gov.cn', 'gov.au', 'gov.ca', 'gov.in',
    'europa.eu', 'un.org', 'who.int', 'cdc.gov', 'nih.gov',
    'fda.gov', 'nasa.gov', 'noaa.gov', 'state.gov',
  ],
  academic: [
    'edu', 'ac.uk', 'edu.cn', 'edu.au', 'edu.sg',
    'arxiv.org', 'pubmed.gov', 'scholar.google.com',
    'jstor.org', 'nature.com', 'science.org', 'ieee.org',
    'springer.com', 'wiley.com', 'elsevier.com',
    'researchgate.net', 'academia.edu',
  ],
  news: [
    'reuters.com', 'apnews.com', 'bbc.com', 'bbc.co.uk',
    'nytimes.com', 'washingtonpost.com', 'theguardian.com',
    'economist.com', 'wsj.com', 'ft.com', 'bloomberg.com',
    'cnn.com', 'npr.org', 'pbs.org', 'abc.net.au',
    'dw.com', 'france24.com', 'aljazeera.com',
  ],
  encyclopedia: [
    'wikipedia.org', 'britannica.com', 'encyclopedia.com',
    'scholarpedia.org', 'stanford.edu/entries',
  ],
  official: [
    'microsoft.com', 'apple.com', 'google.com', 'amazon.com',
    'github.com', 'gitlab.com', 'mozilla.org', 'linux.org',
    'python.org', 'nodejs.org', 'rust-lang.org', 'golang.org',
  ],
  social: [
    'twitter.com', 'x.com', 'facebook.com', 'instagram.com',
    'linkedin.com', 'tiktok.com', 'youtube.com',
  ],
  blog: [
    'medium.com', 'substack.com', 'wordpress.com', 'blogger.com',
    'dev.to', 'hashnode.dev',
  ],
  forum: [
    'reddit.com', 'stackoverflow.com', 'stackexchange.com',
    'quora.com', 'discourse.org',
  ],
  ecommerce: [
    'amazon.com', 'ebay.com', 'alibaba.com', 'aliexpress.com',
    'shopify.com', 'etsy.com',
  ],
  unknown: [],
};

/**
 * Suspicious domain patterns
 */
const SUSPICIOUS_PATTERNS: RegExp[] = [
  /\d{5,}/, // Many numbers in domain
  /free.*download/i,
  /download.*free/i,
  /click.*here/i,
  /best.*deals/i,
  /cheap.*online/i,
  /-{3,}/, // Multiple consecutive hyphens
  /\.(tk|ml|ga|cf|gq)$/i, // Free TLDs often used for spam
];

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Get the root domain (e.g., example.co.uk from sub.example.co.uk)
 */
export function getRootDomain(domain: string): string {
  const parts = domain.split('.');
  if (parts.length <= 2) return domain;
  
  // Handle special TLDs like .co.uk, .gov.uk, etc.
  const specialTLDs = ['co', 'gov', 'ac', 'org', 'edu', 'net', 'com'];
  if (parts.length >= 3 && specialTLDs.includes(parts[parts.length - 2])) {
    return parts.slice(-3).join('.');
  }
  
  return parts.slice(-2).join('.');
}

/**
 * Determine source type from domain
 */
export function determineSourceType(domain: string): SourceType {
  const rootDomain = getRootDomain(domain);
  
  for (const [type, domains] of Object.entries(TRUSTED_DOMAINS) as [SourceType, string[]][]) {
    for (const trustedDomain of domains) {
      if (
        domain === trustedDomain ||
        domain.endsWith(`.${trustedDomain}`) ||
        rootDomain === trustedDomain ||
        rootDomain.endsWith(`.${trustedDomain}`)
      ) {
        return type;
      }
    }
  }
  
  // Check TLD patterns
  if (domain.endsWith('.gov') || domain.includes('.gov.')) {
    return 'government';
  }
  if (domain.endsWith('.edu') || domain.includes('.edu.') || domain.includes('.ac.')) {
    return 'academic';
  }
  
  return 'unknown';
}

/**
 * Calculate credibility score for a domain
 */
export function calculateCredibilityScore(
  domain: string,
  sourceType: SourceType,
  isHttps: boolean
): number {
  let score = 50; // Base score
  
  // Source type bonuses
  const typeScores: Record<SourceType, number> = {
    government: 30,
    academic: 28,
    news: 20,
    encyclopedia: 25,
    official: 22,
    social: -5,
    blog: 5,
    forum: 10,
    ecommerce: 0,
    unknown: 0,
  };
  
  score += typeScores[sourceType];
  
  // HTTPS bonus
  if (isHttps) {
    score += 10;
  } else {
    score -= 20;
  }
  
  // Check for suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(domain)) {
      score -= 15;
    }
  }
  
  // Domain length penalty (very long domains are suspicious)
  if (domain.length > 30) {
    score -= 5;
  }
  if (domain.length > 50) {
    score -= 10;
  }
  
  // Subdomain penalty (many subdomains can be suspicious)
  const subdomainCount = domain.split('.').length - 2;
  if (subdomainCount > 2) {
    score -= subdomainCount * 3;
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Get credibility level from score
 */
export function getCredibilityLevel(score: number): CredibilityLevel {
  if (score >= 75) return 'high';
  if (score >= 50) return 'medium';
  if (score >= 25) return 'low';
  return 'unknown';
}

/**
 * Generate trust indicators for a source
 */
export function getTrustIndicators(
  domain: string,
  sourceType: SourceType,
  isHttps: boolean
): string[] {
  const indicators: string[] = [];
  
  if (isHttps) {
    indicators.push('Secure HTTPS connection');
  }
  
  if (sourceType === 'government') {
    indicators.push('Official government source');
  } else if (sourceType === 'academic') {
    indicators.push('Academic/research institution');
  } else if (sourceType === 'news') {
    indicators.push('Established news organization');
  } else if (sourceType === 'encyclopedia') {
    indicators.push('Reference/encyclopedia source');
  } else if (sourceType === 'official') {
    indicators.push('Official organization website');
  }
  
  // Check for well-known domains
  const wellKnownDomains = [
    'github.com', 'stackoverflow.com', 'wikipedia.org',
    'mozilla.org', 'w3.org', 'ietf.org',
  ];
  
  if (wellKnownDomains.some(d => domain.includes(d))) {
    indicators.push('Well-established platform');
  }
  
  return indicators;
}

/**
 * Generate warning indicators for a source
 */
export function getWarningIndicators(
  domain: string,
  sourceType: SourceType,
  isHttps: boolean
): string[] {
  const warnings: string[] = [];
  
  if (!isHttps) {
    warnings.push('Not using secure HTTPS connection');
  }
  
  if (sourceType === 'unknown') {
    warnings.push('Unknown or unverified source type');
  }
  
  if (sourceType === 'social') {
    warnings.push('Social media content - verify independently');
  }
  
  if (sourceType === 'blog') {
    warnings.push('Personal blog - may contain opinions');
  }
  
  if (sourceType === 'forum') {
    warnings.push('Forum content - verify with official sources');
  }
  
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(domain)) {
      warnings.push('Domain contains suspicious patterns');
      break;
    }
  }
  
  if (domain.split('.').length > 4) {
    warnings.push('Unusually complex domain structure');
  }
  
  return warnings;
}

/**
 * Verify a single source
 */
export function verifySource(url: string): SourceVerificationResult {
  const domain = extractDomain(url);
  const isHttps = url.toLowerCase().startsWith('https://');
  const sourceType = determineSourceType(domain);
  const credibilityScore = calculateCredibilityScore(domain, sourceType, isHttps);
  
  return {
    url,
    domain,
    credibilityLevel: getCredibilityLevel(credibilityScore),
    credibilityScore,
    sourceType,
    isHttps,
    trustIndicators: getTrustIndicators(domain, sourceType, isHttps),
    warningIndicators: getWarningIndicators(domain, sourceType, isHttps),
  };
}

/**
 * Verify multiple sources from search results
 */
export function verifySearchResults(results: SearchResult[]): SourceVerificationResult[] {
  return results.map(result => verifySource(result.url));
}

/**
 * Calculate text similarity using Jaccard index
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
  const normalize = (text: string): Set<string> => {
    return new Set(
      text
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 2)
    );
  };
  
  const set1 = normalize(text1);
  const set2 = normalize(text2);
  
  if (set1.size === 0 || set2.size === 0) return 0;
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

/**
 * Extract key claims/facts from text
 */
export function extractKeyClaims(text: string): string[] {
  // Split into sentences and filter meaningful ones
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 500);
  
  // Filter sentences that appear to contain factual claims
  const factualPatterns = [
    /\d+/, // Contains numbers (statistics, dates)
    /is|are|was|were|has|have|had/, // Assertion verbs
    /according to|research shows|studies indicate/i,
    /percent|percentage|%/i,
    /million|billion|thousand/i,
  ];
  
  return sentences.filter(sentence =>
    factualPatterns.some(pattern => pattern.test(sentence))
  ).slice(0, 10);
}

/**
 * Cross-validate content across multiple search results
 */
export function crossValidateContent(
  results: SearchResult[],
  claim?: string
): CrossValidationResult {
  const supporting: SearchResult[] = [];
  const contradicting: SearchResult[] = [];
  const neutral: SearchResult[] = [];
  
  if (results.length === 0) {
    return {
      claim: claim || '',
      supportingResults: [],
      contradictingResults: [],
      neutralResults: [],
      confidenceScore: 0,
      consensusLevel: 'weak',
      validationSummary: 'No results to validate',
    };
  }
  
  // If no specific claim, use the first result's content as reference
  const referenceContent = claim || results[0]?.content || '';
  const referenceClaims = extractKeyClaims(referenceContent);
  
  // Compare each result against the reference
  for (const result of results) {
    const similarity = calculateTextSimilarity(referenceContent, result.content);
    
    // Check for supporting keywords
    const supportingKeywords = ['confirms', 'shows', 'indicates', 'proves', 'supports'];
    const contradictingKeywords = ['however', 'but', 'contrary', 'dispute', 'false', 'incorrect'];
    
    const contentLower = result.content.toLowerCase();
    const hasSupport = supportingKeywords.some(kw => contentLower.includes(kw));
    const hasContradiction = contradictingKeywords.some(kw => contentLower.includes(kw));
    
    if (similarity > 0.3 || hasSupport) {
      supporting.push(result);
    } else if (hasContradiction && similarity < 0.1) {
      contradicting.push(result);
    } else {
      neutral.push(result);
    }
  }
  
  // Calculate confidence score
  const totalCategorized = supporting.length + contradicting.length;
  let confidenceScore = 0;
  
  if (totalCategorized > 0) {
    const supportRatio = supporting.length / totalCategorized;
    confidenceScore = Math.round(
      (supportRatio * 100) * (Math.min(totalCategorized, 5) / 5)
    );
  }
  
  // Determine consensus level
  let consensusLevel: CrossValidationResult['consensusLevel'];
  if (contradicting.length > supporting.length) {
    consensusLevel = 'conflicting';
  } else if (supporting.length >= 3 && contradicting.length === 0) {
    consensusLevel = 'strong';
  } else if (supporting.length >= 2) {
    consensusLevel = 'moderate';
  } else {
    consensusLevel = 'weak';
  }
  
  // Generate summary
  let validationSummary: string;
  if (consensusLevel === 'strong') {
    validationSummary = `Strong consensus: ${supporting.length} sources support this information.`;
  } else if (consensusLevel === 'moderate') {
    validationSummary = `Moderate consensus: ${supporting.length} sources support, ${neutral.length} neutral.`;
  } else if (consensusLevel === 'conflicting') {
    validationSummary = `Conflicting information: ${contradicting.length} sources disagree with ${supporting.length} supporting.`;
  } else {
    validationSummary = `Weak consensus: Limited supporting evidence found.`;
  }
  
  return {
    claim: claim || referenceClaims[0] || '',
    supportingResults: supporting,
    contradictingResults: contradicting,
    neutralResults: neutral,
    confidenceScore,
    consensusLevel,
    validationSummary,
  };
}

/**
 * Generate comprehensive verification report
 */
export function generateVerificationReport(
  response: SearchResponse,
  claim?: string
): VerificationReport {
  const sourceVerifications = verifySearchResults(response.results);
  const crossValidation = crossValidateContent(response.results, claim);
  
  // Calculate overall credibility
  const avgCredibility = sourceVerifications.length > 0
    ? sourceVerifications.reduce((sum, v) => sum + v.credibilityScore, 0) / sourceVerifications.length
    : 0;
  
  // Adjust based on cross-validation
  let overallScore = avgCredibility;
  if (crossValidation.consensusLevel === 'strong') {
    overallScore = Math.min(100, overallScore + 10);
  } else if (crossValidation.consensusLevel === 'conflicting') {
    overallScore = Math.max(0, overallScore - 15);
  }
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  const highCredSources = sourceVerifications.filter(v => v.credibilityLevel === 'high');
  const lowCredSources = sourceVerifications.filter(v => v.credibilityLevel === 'low');
  
  if (highCredSources.length === 0) {
    recommendations.push('Consider searching for official or academic sources to verify this information.');
  }
  
  if (lowCredSources.length > sourceVerifications.length / 2) {
    recommendations.push('Many results come from less credible sources. Cross-reference with trusted sources.');
  }
  
  if (crossValidation.consensusLevel === 'conflicting') {
    recommendations.push('Sources provide conflicting information. Review multiple perspectives carefully.');
  }
  
  if (crossValidation.consensusLevel === 'weak') {
    recommendations.push('Limited supporting evidence found. Consider broadening your search.');
  }
  
  const unsecureSources = sourceVerifications.filter(v => !v.isHttps);
  if (unsecureSources.length > 0) {
    recommendations.push(`${unsecureSources.length} source(s) do not use secure HTTPS connections.`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Search results appear credible with good source diversity.');
  }
  
  return {
    query: response.query,
    timestamp: Date.now(),
    totalResults: response.results.length,
    sourceVerifications,
    crossValidation,
    overallCredibilityScore: Math.round(overallScore),
    recommendations,
  };
}

/**
 * Verify and enhance search response with credibility information
 */
export interface EnhancedSearchResult extends SearchResult {
  verification: SourceVerificationResult;
}

export interface EnhancedSearchResponse extends SearchResponse {
  results: EnhancedSearchResult[];
  verificationReport?: VerificationReport;
}

/**
 * Enhance search response with verification data
 */
export function enhanceSearchResponse(
  response: SearchResponse,
  options: { includeReport?: boolean; claim?: string } = {}
): EnhancedSearchResponse {
  const enhancedResults: EnhancedSearchResult[] = response.results.map(result => ({
    ...result,
    verification: verifySource(result.url),
  }));
  
  const enhanced: EnhancedSearchResponse = {
    ...response,
    results: enhancedResults,
  };
  
  if (options.includeReport) {
    enhanced.verificationReport = generateVerificationReport(response, options.claim);
  }
  
  return enhanced;
}

/**
 * Filter search results by credibility level
 */
export function filterByCredibility(
  results: SearchResult[],
  minLevel: CredibilityLevel
): SearchResult[] {
  const levelOrder: Record<CredibilityLevel, number> = {
    high: 3,
    medium: 2,
    low: 1,
    unknown: 0,
  };
  
  const minOrder = levelOrder[minLevel];
  
  return results.filter(result => {
    const verification = verifySource(result.url);
    return levelOrder[verification.credibilityLevel] >= minOrder;
  });
}

/**
 * Sort search results by credibility
 */
export function sortByCredibility(
  results: SearchResult[],
  order: 'asc' | 'desc' = 'desc'
): SearchResult[] {
  const resultsWithScores = results.map(result => ({
    result,
    score: verifySource(result.url).credibilityScore,
  }));
  
  resultsWithScores.sort((a, b) => 
    order === 'desc' ? b.score - a.score : a.score - b.score
  );
  
  return resultsWithScores.map(item => item.result);
}

/**
 * Get diversity score for search results
 * Higher score means more diverse sources
 */
export function calculateSourceDiversity(results: SearchResult[]): number {
  if (results.length === 0) return 0;
  
  const domains = new Set(results.map(r => getRootDomain(extractDomain(r.url))));
  const sourceTypes = new Set(
    results.map(r => determineSourceType(extractDomain(r.url)))
  );
  
  // Domain diversity (0-50)
  const domainDiversity = Math.min(50, (domains.size / results.length) * 50);
  
  // Source type diversity (0-50)
  const maxTypes = 5; // Consider 5 different types as max diversity
  const typeDiversity = Math.min(50, (sourceTypes.size / maxTypes) * 50);
  
  return Math.round(domainDiversity + typeDiversity);
}
