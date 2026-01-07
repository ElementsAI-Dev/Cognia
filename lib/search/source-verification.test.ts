/**
 * Source Verification and Content Cross-Validation Tests
 */

import {
  extractDomain,
  getRootDomain,
  determineSourceType,
  calculateCredibilityScore,
  getCredibilityLevel,
  getTrustIndicators,
  getWarningIndicators,
  verifySource,
  verifySearchResults,
  calculateTextSimilarity,
  extractKeyClaims,
  crossValidateContent,
  generateVerificationReport,
  enhanceSearchResponse,
  filterByCredibility,
  sortByCredibility,
  calculateSourceDiversity,
} from './source-verification';

import type { SearchResult, SearchResponse } from '@/types/search';

describe('source-verification', () => {
  describe('extractDomain', () => {
    it('should extract domain from URL with www', () => {
      expect(extractDomain('https://www.example.com/page')).toBe('example.com');
    });

    it('should extract domain from URL without www', () => {
      expect(extractDomain('https://example.com/page')).toBe('example.com');
    });

    it('should handle subdomains', () => {
      expect(extractDomain('https://sub.example.com/page')).toBe('sub.example.com');
    });

    it('should handle URLs with ports', () => {
      expect(extractDomain('https://example.com:8080/page')).toBe('example.com');
    });

    it('should handle invalid URLs gracefully', () => {
      expect(extractDomain('not-a-url')).toBe('not-a-url');
    });

    it('should handle http URLs', () => {
      expect(extractDomain('http://example.com')).toBe('example.com');
    });
  });

  describe('getRootDomain', () => {
    it('should return domain for simple domains', () => {
      expect(getRootDomain('example.com')).toBe('example.com');
    });

    it('should handle subdomains', () => {
      expect(getRootDomain('sub.example.com')).toBe('example.com');
    });

    it('should handle special TLDs like .co.uk', () => {
      expect(getRootDomain('www.example.co.uk')).toBe('example.co.uk');
    });

    it('should handle .gov domains', () => {
      expect(getRootDomain('www.agency.gov.uk')).toBe('agency.gov.uk');
    });

    it('should handle deep subdomains', () => {
      expect(getRootDomain('a.b.c.example.com')).toBe('example.com');
    });
  });

  describe('determineSourceType', () => {
    it('should identify government domains', () => {
      expect(determineSourceType('cdc.gov')).toBe('government');
      expect(determineSourceType('www.gov.uk')).toBe('government');
      expect(determineSourceType('agency.gov.cn')).toBe('government');
    });

    it('should identify academic domains', () => {
      expect(determineSourceType('mit.edu')).toBe('academic');
      expect(determineSourceType('oxford.ac.uk')).toBe('academic');
      expect(determineSourceType('arxiv.org')).toBe('academic');
    });

    it('should identify news domains', () => {
      expect(determineSourceType('bbc.com')).toBe('news');
      expect(determineSourceType('reuters.com')).toBe('news');
      expect(determineSourceType('nytimes.com')).toBe('news');
    });

    it('should identify encyclopedia domains', () => {
      expect(determineSourceType('wikipedia.org')).toBe('encyclopedia');
      expect(determineSourceType('en.wikipedia.org')).toBe('encyclopedia');
    });

    it('should identify social media domains', () => {
      expect(determineSourceType('twitter.com')).toBe('social');
      expect(determineSourceType('facebook.com')).toBe('social');
    });

    it('should identify blog platforms', () => {
      expect(determineSourceType('medium.com')).toBe('blog');
      expect(determineSourceType('dev.to')).toBe('blog');
    });

    it('should identify forum domains', () => {
      expect(determineSourceType('stackoverflow.com')).toBe('forum');
      expect(determineSourceType('reddit.com')).toBe('forum');
    });

    it('should return unknown for unrecognized domains', () => {
      expect(determineSourceType('randomsite.xyz')).toBe('unknown');
    });
  });

  describe('calculateCredibilityScore', () => {
    it('should give high scores to government sources with HTTPS', () => {
      const score = calculateCredibilityScore('cdc.gov', 'government', true);
      expect(score).toBeGreaterThanOrEqual(80);
    });

    it('should give high scores to academic sources', () => {
      const score = calculateCredibilityScore('mit.edu', 'academic', true);
      expect(score).toBeGreaterThanOrEqual(75);
    });

    it('should penalize non-HTTPS sources', () => {
      const httpsScore = calculateCredibilityScore('example.com', 'unknown', true);
      const httpScore = calculateCredibilityScore('example.com', 'unknown', false);
      expect(httpsScore).toBeGreaterThan(httpScore);
    });

    it('should penalize social media sources', () => {
      const socialScore = calculateCredibilityScore('twitter.com', 'social', true);
      const newsScore = calculateCredibilityScore('reuters.com', 'news', true);
      expect(newsScore).toBeGreaterThan(socialScore);
    });

    it('should penalize very long domains', () => {
      const shortScore = calculateCredibilityScore('short.com', 'unknown', true);
      const longScore = calculateCredibilityScore('this-is-a-very-long-domain-name-that-looks-suspicious.com', 'unknown', true);
      expect(shortScore).toBeGreaterThan(longScore);
    });

    it('should keep scores within 0-100 range', () => {
      const highScore = calculateCredibilityScore('cdc.gov', 'government', true);
      const lowScore = calculateCredibilityScore('spam12345.tk', 'unknown', false);
      expect(highScore).toBeLessThanOrEqual(100);
      expect(lowScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getCredibilityLevel', () => {
    it('should return high for scores >= 75', () => {
      expect(getCredibilityLevel(75)).toBe('high');
      expect(getCredibilityLevel(100)).toBe('high');
    });

    it('should return medium for scores >= 50 and < 75', () => {
      expect(getCredibilityLevel(50)).toBe('medium');
      expect(getCredibilityLevel(74)).toBe('medium');
    });

    it('should return low for scores >= 25 and < 50', () => {
      expect(getCredibilityLevel(25)).toBe('low');
      expect(getCredibilityLevel(49)).toBe('low');
    });

    it('should return unknown for scores < 25', () => {
      expect(getCredibilityLevel(24)).toBe('unknown');
      expect(getCredibilityLevel(0)).toBe('unknown');
    });
  });

  describe('getTrustIndicators', () => {
    it('should include HTTPS indicator when secure', () => {
      const indicators = getTrustIndicators('example.com', 'unknown', true);
      expect(indicators).toContain('Secure HTTPS connection');
    });

    it('should not include HTTPS indicator when insecure', () => {
      const indicators = getTrustIndicators('example.com', 'unknown', false);
      expect(indicators).not.toContain('Secure HTTPS connection');
    });

    it('should identify government sources', () => {
      const indicators = getTrustIndicators('cdc.gov', 'government', true);
      expect(indicators).toContain('Official government source');
    });

    it('should identify academic sources', () => {
      const indicators = getTrustIndicators('mit.edu', 'academic', true);
      expect(indicators).toContain('Academic/research institution');
    });

    it('should identify well-known platforms', () => {
      const indicators = getTrustIndicators('github.com', 'official', true);
      expect(indicators.some(i => i.includes('Well-established'))).toBe(true);
    });
  });

  describe('getWarningIndicators', () => {
    it('should warn about non-HTTPS connections', () => {
      const warnings = getWarningIndicators('example.com', 'unknown', false);
      expect(warnings.some(w => w.includes('HTTPS'))).toBe(true);
    });

    it('should warn about unknown source types', () => {
      const warnings = getWarningIndicators('unknown-site.xyz', 'unknown', true);
      expect(warnings.some(w => w.includes('Unknown'))).toBe(true);
    });

    it('should warn about social media', () => {
      const warnings = getWarningIndicators('twitter.com', 'social', true);
      expect(warnings.some(w => w.includes('Social media'))).toBe(true);
    });

    it('should warn about blogs', () => {
      const warnings = getWarningIndicators('medium.com', 'blog', true);
      expect(warnings.some(w => w.includes('blog'))).toBe(true);
    });

    it('should warn about complex domain structures', () => {
      const warnings = getWarningIndicators('a.b.c.d.e.example.com', 'unknown', true);
      expect(warnings.some(w => w.includes('complex'))).toBe(true);
    });
  });

  describe('verifySource', () => {
    it('should return complete verification result', () => {
      const result = verifySource('https://www.bbc.com/news/article');
      
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('domain');
      expect(result).toHaveProperty('credibilityLevel');
      expect(result).toHaveProperty('credibilityScore');
      expect(result).toHaveProperty('sourceType');
      expect(result).toHaveProperty('isHttps');
      expect(result).toHaveProperty('trustIndicators');
      expect(result).toHaveProperty('warningIndicators');
    });

    it('should correctly identify HTTPS', () => {
      const httpsResult = verifySource('https://example.com');
      const httpResult = verifySource('http://example.com');
      
      expect(httpsResult.isHttps).toBe(true);
      expect(httpResult.isHttps).toBe(false);
    });

    it('should correctly identify source type', () => {
      const result = verifySource('https://arxiv.org/paper');
      expect(result.sourceType).toBe('academic');
    });
  });

  describe('verifySearchResults', () => {
    it('should verify all results', () => {
      const results: SearchResult[] = [
        { title: 'Test 1', url: 'https://bbc.com/news', content: 'Content 1', score: 0.9 },
        { title: 'Test 2', url: 'https://random.xyz', content: 'Content 2', score: 0.8 },
      ];
      
      const verifications = verifySearchResults(results);
      expect(verifications).toHaveLength(2);
      expect(verifications[0].sourceType).toBe('news');
    });

    it('should handle empty results', () => {
      const verifications = verifySearchResults([]);
      expect(verifications).toHaveLength(0);
    });
  });

  describe('calculateTextSimilarity', () => {
    it('should return 1 for identical texts', () => {
      const text = 'This is a test sentence';
      expect(calculateTextSimilarity(text, text)).toBe(1);
    });

    it('should return 0 for completely different texts', () => {
      const similarity = calculateTextSimilarity(
        'The quick brown fox',
        'Lorem ipsum dolor sit amet'
      );
      expect(similarity).toBeLessThan(0.1);
    });

    it('should return value between 0 and 1 for similar texts', () => {
      const similarity = calculateTextSimilarity(
        'The weather is sunny today',
        'Today the weather is very sunny and warm'
      );
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
    });

    it('should handle empty strings', () => {
      expect(calculateTextSimilarity('', 'test')).toBe(0);
      expect(calculateTextSimilarity('test', '')).toBe(0);
      expect(calculateTextSimilarity('', '')).toBe(0);
    });
  });

  describe('extractKeyClaims', () => {
    it('should extract sentences with numbers', () => {
      const text = 'Random intro. The population is 8 billion people. More text here.';
      const claims = extractKeyClaims(text);
      expect(claims.some(c => c.includes('8 billion'))).toBe(true);
    });

    it('should extract sentences with assertion verbs', () => {
      const text = 'Introduction. The study shows that climate change is real. Conclusion.';
      const claims = extractKeyClaims(text);
      expect(claims.some(c => c.includes('study shows') || c.includes('is real'))).toBe(true);
    });

    it('should filter out very short sentences', () => {
      const text = 'Hi. This is a longer sentence that should be included in the results. Bye.';
      const claims = extractKeyClaims(text);
      expect(claims.every(c => c.length > 20)).toBe(true);
    });

    it('should handle empty text', () => {
      expect(extractKeyClaims('')).toHaveLength(0);
    });
  });

  describe('crossValidateContent', () => {
    const mockResults: SearchResult[] = [
      { title: 'Source 1', url: 'https://example1.com', content: 'The study confirms that the findings are accurate.', score: 0.9 },
      { title: 'Source 2', url: 'https://example2.com', content: 'Research shows similar results in the findings.', score: 0.85 },
      { title: 'Source 3', url: 'https://example3.com', content: 'However, contrary evidence disputes the claim.', score: 0.8 },
      { title: 'Source 4', url: 'https://example4.com', content: 'Unrelated information about something else.', score: 0.7 },
    ];

    it('should categorize supporting results', () => {
      const validation = crossValidateContent(mockResults);
      expect(validation.supportingResults.length).toBeGreaterThan(0);
    });

    it('should categorize contradicting results', () => {
      const validation = crossValidateContent(mockResults);
      expect(validation.contradictingResults.length).toBeGreaterThan(0);
    });

    it('should calculate confidence score', () => {
      const validation = crossValidateContent(mockResults);
      expect(validation.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(validation.confidenceScore).toBeLessThanOrEqual(100);
    });

    it('should determine consensus level', () => {
      const validation = crossValidateContent(mockResults);
      expect(['strong', 'moderate', 'weak', 'conflicting']).toContain(validation.consensusLevel);
    });

    it('should generate validation summary', () => {
      const validation = crossValidateContent(mockResults);
      expect(validation.validationSummary).toBeTruthy();
      expect(typeof validation.validationSummary).toBe('string');
    });

    it('should handle empty results', () => {
      const validation = crossValidateContent([]);
      expect(validation.consensusLevel).toBe('weak');
      expect(validation.confidenceScore).toBe(0);
    });

    it('should use provided claim for validation', () => {
      const claim = 'The earth is round';
      const validation = crossValidateContent(mockResults, claim);
      expect(validation.claim).toBe(claim);
    });
  });

  describe('generateVerificationReport', () => {
    const mockResponse: SearchResponse = {
      provider: 'tavily',
      query: 'test query',
      results: [
        { title: 'BBC News', url: 'https://bbc.com/article', content: 'News content here', score: 0.9 },
        { title: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Test', content: 'Encyclopedia content', score: 0.85 },
        { title: 'Random Blog', url: 'https://random-blog.com', content: 'Blog content', score: 0.7 },
      ],
      responseTime: 500,
    };

    it('should include all required fields', () => {
      const report = generateVerificationReport(mockResponse);
      
      expect(report).toHaveProperty('query');
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('totalResults');
      expect(report).toHaveProperty('sourceVerifications');
      expect(report).toHaveProperty('crossValidation');
      expect(report).toHaveProperty('overallCredibilityScore');
      expect(report).toHaveProperty('recommendations');
    });

    it('should verify all sources', () => {
      const report = generateVerificationReport(mockResponse);
      expect(report.sourceVerifications).toHaveLength(mockResponse.results.length);
    });

    it('should calculate overall credibility score', () => {
      const report = generateVerificationReport(mockResponse);
      expect(report.overallCredibilityScore).toBeGreaterThanOrEqual(0);
      expect(report.overallCredibilityScore).toBeLessThanOrEqual(100);
    });

    it('should generate recommendations', () => {
      const report = generateVerificationReport(mockResponse);
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle claim parameter', () => {
      const report = generateVerificationReport(mockResponse, 'specific claim to verify');
      expect(report.crossValidation?.claim).toBe('specific claim to verify');
    });
  });

  describe('enhanceSearchResponse', () => {
    const mockResponse: SearchResponse = {
      provider: 'tavily',
      query: 'test query',
      results: [
        { title: 'Test', url: 'https://example.com', content: 'Content', score: 0.9 },
      ],
      responseTime: 500,
    };

    it('should add verification to each result', () => {
      const enhanced = enhanceSearchResponse(mockResponse);
      expect(enhanced.results[0]).toHaveProperty('verification');
      expect(enhanced.results[0].verification).toHaveProperty('credibilityScore');
    });

    it('should include report when requested', () => {
      const enhanced = enhanceSearchResponse(mockResponse, { includeReport: true });
      expect(enhanced.verificationReport).toBeDefined();
    });

    it('should not include report by default', () => {
      const enhanced = enhanceSearchResponse(mockResponse);
      expect(enhanced.verificationReport).toBeUndefined();
    });

    it('should preserve original response properties', () => {
      const enhanced = enhanceSearchResponse(mockResponse);
      expect(enhanced.provider).toBe('tavily');
      expect(enhanced.query).toBe('test query');
      expect(enhanced.responseTime).toBe(500);
    });
  });

  describe('filterByCredibility', () => {
    const mockResults: SearchResult[] = [
      { title: 'Gov', url: 'https://cdc.gov/info', content: 'High credibility', score: 0.9 },
      { title: 'Random', url: 'https://random-site.xyz', content: 'Low credibility', score: 0.8 },
      { title: 'News', url: 'https://reuters.com/article', content: 'Medium-high credibility', score: 0.85 },
    ];

    it('should filter by high credibility', () => {
      const filtered = filterByCredibility(mockResults, 'high');
      expect(filtered.length).toBeLessThanOrEqual(mockResults.length);
    });

    it('should include more results at lower credibility levels', () => {
      const highFiltered = filterByCredibility(mockResults, 'high');
      const lowFiltered = filterByCredibility(mockResults, 'low');
      expect(lowFiltered.length).toBeGreaterThanOrEqual(highFiltered.length);
    });

    it('should handle empty results', () => {
      const filtered = filterByCredibility([], 'medium');
      expect(filtered).toHaveLength(0);
    });
  });

  describe('sortByCredibility', () => {
    const mockResults: SearchResult[] = [
      { title: 'Random', url: 'https://random.xyz', content: 'Low', score: 0.9 },
      { title: 'Gov', url: 'https://cdc.gov/info', content: 'High', score: 0.7 },
      { title: 'News', url: 'https://bbc.com/news', content: 'Medium', score: 0.8 },
    ];

    it('should sort by descending credibility by default', () => {
      const sorted = sortByCredibility(mockResults);
      const firstVerification = verifySource(sorted[0].url);
      const lastVerification = verifySource(sorted[sorted.length - 1].url);
      expect(firstVerification.credibilityScore).toBeGreaterThanOrEqual(lastVerification.credibilityScore);
    });

    it('should sort by ascending credibility when specified', () => {
      const sorted = sortByCredibility(mockResults, 'asc');
      const firstVerification = verifySource(sorted[0].url);
      const lastVerification = verifySource(sorted[sorted.length - 1].url);
      expect(firstVerification.credibilityScore).toBeLessThanOrEqual(lastVerification.credibilityScore);
    });

    it('should handle empty results', () => {
      const sorted = sortByCredibility([]);
      expect(sorted).toHaveLength(0);
    });
  });

  describe('calculateSourceDiversity', () => {
    it('should return 0 for empty results', () => {
      expect(calculateSourceDiversity([])).toBe(0);
    });

    it('should return higher score for diverse sources', () => {
      const diverse: SearchResult[] = [
        { title: 'Gov', url: 'https://cdc.gov', content: '', score: 0.9 },
        { title: 'News', url: 'https://bbc.com', content: '', score: 0.85 },
        { title: 'Academic', url: 'https://arxiv.org', content: '', score: 0.8 },
        { title: 'Encyclopedia', url: 'https://wikipedia.org', content: '', score: 0.75 },
      ];
      
      const sameSource: SearchResult[] = [
        { title: 'Page 1', url: 'https://bbc.com/page1', content: '', score: 0.9 },
        { title: 'Page 2', url: 'https://bbc.com/page2', content: '', score: 0.85 },
        { title: 'Page 3', url: 'https://bbc.com/page3', content: '', score: 0.8 },
        { title: 'Page 4', url: 'https://bbc.com/page4', content: '', score: 0.75 },
      ];
      
      const diverseScore = calculateSourceDiversity(diverse);
      const sameScore = calculateSourceDiversity(sameSource);
      
      expect(diverseScore).toBeGreaterThan(sameScore);
    });

    it('should return score within 0-100 range', () => {
      const results: SearchResult[] = [
        { title: 'Test', url: 'https://example.com', content: '', score: 0.9 },
      ];
      
      const score = calculateSourceDiversity(results);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});
