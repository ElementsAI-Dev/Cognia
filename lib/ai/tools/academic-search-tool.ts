/**
 * Academic Search Tool - Multi-provider academic paper search for AI agents
 * Supports arXiv, Semantic Scholar, OpenAlex, CORE, DBLP, and more
 */

import { z } from 'zod';
import type { 
  Paper, 
  AcademicProviderType,
} from '@/types/learning/academic';

export const academicSearchInputSchema = z.object({
  query: z.string().describe('Search query for academic papers (title, abstract, keywords, author names)'),
  providers: z
    .array(z.enum(['arxiv', 'semantic-scholar', 'core', 'openalex', 'dblp', 'huggingface-papers']))
    .default(['arxiv', 'semantic-scholar'])
    .describe('Academic databases to search'),
  maxResults: z
    .number()
    .min(1)
    .max(50)
    .default(10)
    .describe('Maximum number of results per provider'),
  yearFrom: z
    .number()
    .optional()
    .describe('Filter papers published from this year'),
  yearTo: z
    .number()
    .optional()
    .describe('Filter papers published until this year'),
  categories: z
    .array(z.string())
    .optional()
    .describe('Filter by subject categories (e.g., cs.AI, physics.hep-th)'),
  openAccessOnly: z
    .boolean()
    .default(false)
    .describe('Only return open access papers'),
  sortBy: z
    .enum(['relevance', 'date', 'citations'])
    .default('relevance')
    .describe('Sort results by relevance, date, or citation count'),
});

export type AcademicSearchInput = z.infer<typeof academicSearchInputSchema>;

export interface AcademicSearchResult {
  success: boolean;
  query: string;
  papers: Paper[];
  totalResults: number;
  providerResults: Record<string, {
    count: number;
    success: boolean;
    error?: string;
  }>;
  searchTime: number;
  error?: string;
}

export interface AcademicSearchConfig {
  useWebFallback?: boolean;
  webSearchApiKey?: string;
  webSearchProvider?: string;
}

/**
 * Search arXiv API
 */
async function searchArxiv(
  query: string,
  options: { maxResults: number; yearFrom?: number; yearTo?: number; categories?: string[] }
): Promise<{ papers: Paper[]; total: number }> {
  const { maxResults, yearFrom, yearTo, categories } = options;
  
  let searchQuery = query;
  if (categories && categories.length > 0) {
    const catQuery = categories.map(c => `cat:${c}`).join(' OR ');
    searchQuery = `(${searchQuery}) AND (${catQuery})`;
  }
  
  const params = new URLSearchParams({
    search_query: `all:${searchQuery}`,
    start: '0',
    max_results: maxResults.toString(),
    sortBy: 'relevance',
    sortOrder: 'descending',
  });

  const response = await fetch(`http://export.arxiv.org/api/query?${params}`);
  if (!response.ok) {
    throw new Error(`arXiv API error: ${response.status}`);
  }

  const xml = await response.text();
  const papers = parseArxivResponse(xml, yearFrom, yearTo);
  
  return { papers, total: papers.length };
}

/**
 * Parse arXiv XML response
 */
function parseArxivResponse(xml: string, yearFrom?: number, yearTo?: number): Paper[] {
  const papers: Paper[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];
    
    const id = extractXmlValue(entry, 'id')?.split('/abs/').pop() || '';
    const title = extractXmlValue(entry, 'title')?.replace(/\s+/g, ' ').trim() || '';
    const abstract = extractXmlValue(entry, 'summary')?.replace(/\s+/g, ' ').trim() || '';
    const published = extractXmlValue(entry, 'published') || '';
    const year = published ? new Date(published).getFullYear() : undefined;
    
    if (yearFrom && year && year < yearFrom) continue;
    if (yearTo && year && year > yearTo) continue;

    const authors: { name: string }[] = [];
    const authorRegex = /<author>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<\/author>/g;
    let authorMatch;
    while ((authorMatch = authorRegex.exec(entry)) !== null) {
      authors.push({ name: authorMatch[1] });
    }

    const categories: string[] = [];
    const categoryRegex = /<category[^>]*term="([^"]+)"/g;
    let catMatch;
    while ((catMatch = categoryRegex.exec(entry)) !== null) {
      categories.push(catMatch[1]);
    }

    const pdfUrl = `https://arxiv.org/pdf/${id}.pdf`;
    const abstractUrl = `https://arxiv.org/abs/${id}`;

    papers.push({
      id: `arxiv-${id}`,
      providerId: 'arxiv',
      externalId: id,
      title,
      abstract,
      authors,
      year,
      publicationDate: published,
      categories,
      urls: [
        { url: abstractUrl, type: 'abstract', source: 'arxiv' },
        { url: pdfUrl, type: 'pdf', source: 'arxiv', isOpenAccess: true },
      ],
      pdfUrl,
      isOpenAccess: true,
      metadata: { arxivId: id },
      createdAt: new Date(),
      updatedAt: new Date(),
      fetchedAt: new Date(),
    });
  }

  return papers;
}

/**
 * Search Semantic Scholar API
 */
async function searchSemanticScholar(
  query: string,
  options: { maxResults: number; yearFrom?: number; yearTo?: number }
): Promise<{ papers: Paper[]; total: number }> {
  const { maxResults, yearFrom, yearTo } = options;
  
  let yearFilter = '';
  if (yearFrom || yearTo) {
    const from = yearFrom || 1900;
    const to = yearTo || new Date().getFullYear();
    yearFilter = `&year=${from}-${to}`;
  }

  const fields = 'paperId,title,abstract,authors,year,venue,citationCount,referenceCount,isOpenAccess,openAccessPdf,fieldsOfStudy,publicationDate';
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${maxResults}&fields=${fields}${yearFilter}`;

  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Semantic Scholar API error: ${response.status}`);
  }

  const data = await response.json();
  const papers: Paper[] = (data.data || []).map((item: Record<string, unknown>) => ({
    id: `ss-${item.paperId}`,
    providerId: 'semantic-scholar' as AcademicProviderType,
    externalId: item.paperId as string,
    title: item.title as string,
    abstract: item.abstract as string,
    authors: ((item.authors as { name: string }[]) || []).map(a => ({ name: a.name })),
    year: item.year as number,
    venue: item.venue as string,
    citationCount: item.citationCount as number,
    referenceCount: item.referenceCount as number,
    isOpenAccess: item.isOpenAccess as boolean,
    pdfUrl: (item.openAccessPdf as { url: string })?.url,
    fieldsOfStudy: item.fieldsOfStudy as string[],
    publicationDate: item.publicationDate as string,
    urls: [],
    metadata: { corpusId: item.paperId as string },
    createdAt: new Date(),
    updatedAt: new Date(),
    fetchedAt: new Date(),
  }));

  return { papers, total: data.total || papers.length };
}

/**
 * Search OpenAlex API
 */
async function searchOpenAlex(
  query: string,
  options: { maxResults: number; yearFrom?: number; yearTo?: number }
): Promise<{ papers: Paper[]; total: number }> {
  const { maxResults, yearFrom, yearTo } = options;
  
  let filters = '';
  if (yearFrom) filters += `,from_publication_date:${yearFrom}-01-01`;
  if (yearTo) filters += `,to_publication_date:${yearTo}-12-31`;
  
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per_page=${maxResults}${filters ? `&filter=${filters.slice(1)}` : ''}`;

  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`OpenAlex API error: ${response.status}`);
  }

  const data = await response.json();
  const papers: Paper[] = (data.results || []).map((item: Record<string, unknown>) => {
    const authorships = item.authorships as Array<{ author: { display_name: string } }> || [];
    return {
      id: `oa-${(item.id as string).split('/').pop()}`,
      providerId: 'openalex' as AcademicProviderType,
      externalId: item.id as string,
      title: item.title as string || item.display_name as string,
      abstract: (item.abstract_inverted_index ? reconstructAbstract(item.abstract_inverted_index as Record<string, number[]>) : undefined),
      authors: authorships.map(a => ({ name: a.author.display_name })),
      year: item.publication_year as number,
      venue: (item.primary_location as { source?: { display_name: string } })?.source?.display_name,
      citationCount: item.cited_by_count as number,
      isOpenAccess: (item.open_access as { is_oa: boolean })?.is_oa,
      pdfUrl: (item.open_access as { oa_url: string })?.oa_url,
      urls: [],
      metadata: { openAlexId: item.id as string, doi: item.doi as string },
      createdAt: new Date(),
      updatedAt: new Date(),
      fetchedAt: new Date(),
    };
  });

  return { papers, total: data.meta?.count || papers.length };
}

/**
 * Reconstruct abstract from OpenAlex inverted index
 */
function reconstructAbstract(invertedIndex: Record<string, number[]>): string {
  const words: [string, number][] = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words.push([word, pos]);
    }
  }
  words.sort((a, b) => a[1] - b[1]);
  return words.map(w => w[0]).join(' ');
}

/**
 * Search HuggingFace Papers
 */
async function searchHuggingFacePapers(
  query: string,
  options: { maxResults: number }
): Promise<{ papers: Paper[]; total: number }> {
  const { maxResults } = options;
  
  const url = `https://huggingface.co/api/daily_papers?search=${encodeURIComponent(query)}&limit=${maxResults}`;
  
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`HuggingFace Papers API error: ${response.status}`);
  }

  const data = await response.json();
  
  interface HFPaperData {
    id?: string;
    title?: string;
    summary?: string;
    authors?: { name: string }[];
    paper?: {
      id?: string;
      title?: string;
      summary?: string;
      authors?: { name: string }[];
    };
  }
  
  const papers: Paper[] = (Array.isArray(data) ? data : []).map((item: HFPaperData) => {
    const paperId = item.paper?.id || item.id || '';
    return {
      id: `hf-${paperId}`,
      providerId: 'huggingface-papers' as AcademicProviderType,
      externalId: paperId,
      title: item.paper?.title || item.title || '',
      abstract: item.paper?.summary || item.summary || '',
      authors: (item.paper?.authors || item.authors || []).map(a => ({ name: a.name })),
      year: new Date().getFullYear(),
      urls: [],
      pdfUrl: paperId ? `https://arxiv.org/pdf/${paperId}.pdf` : undefined,
      isOpenAccess: true,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      fetchedAt: new Date(),
    };
  });

  return { papers, total: papers.length };
}

/**
 * Helper to extract XML values
 */
function extractXmlValue(xml: string, tag: string): string | undefined {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : undefined;
}

/**
 * Execute academic paper search across multiple providers
 */
export async function executeAcademicSearch(
  input: AcademicSearchInput,
  _config: AcademicSearchConfig = {}
): Promise<AcademicSearchResult> {
  const startTime = Date.now();
  const { query, providers, maxResults, yearFrom, yearTo, categories, openAccessOnly, sortBy } = input;
  
  const providerResults: Record<string, { count: number; success: boolean; error?: string }> = {};
  let allPapers: Paper[] = [];

  const searchPromises = providers.map(async (provider) => {
    try {
      let result: { papers: Paper[]; total: number };
      
      switch (provider) {
        case 'arxiv':
          result = await searchArxiv(query, { maxResults, yearFrom, yearTo, categories });
          break;
        case 'semantic-scholar':
          result = await searchSemanticScholar(query, { maxResults, yearFrom, yearTo });
          break;
        case 'openalex':
          result = await searchOpenAlex(query, { maxResults, yearFrom, yearTo });
          break;
        case 'huggingface-papers':
          result = await searchHuggingFacePapers(query, { maxResults });
          break;
        default:
          result = { papers: [], total: 0 };
      }
      
      providerResults[provider] = { count: result.papers.length, success: true };
      return result.papers;
    } catch (error) {
      providerResults[provider] = { 
        count: 0, 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
      return [];
    }
  });

  const results = await Promise.all(searchPromises);
  allPapers = results.flat();

  if (openAccessOnly) {
    allPapers = allPapers.filter(p => p.isOpenAccess);
  }

  if (sortBy === 'date') {
    allPapers.sort((a, b) => (b.year || 0) - (a.year || 0));
  } else if (sortBy === 'citations') {
    allPapers.sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0));
  }

  const deduplicatedPapers = deduplicatePapers(allPapers);

  return {
    success: Object.values(providerResults).some(r => r.success),
    query,
    papers: deduplicatedPapers,
    totalResults: deduplicatedPapers.length,
    providerResults,
    searchTime: Date.now() - startTime,
  };
}

/**
 * Deduplicate papers by title similarity
 */
function deduplicatePapers(papers: Paper[]): Paper[] {
  const seen = new Map<string, Paper>();
  
  for (const paper of papers) {
    const normalizedTitle = paper.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!seen.has(normalizedTitle)) {
      seen.set(normalizedTitle, paper);
    } else {
      const existing = seen.get(normalizedTitle)!;
      if ((paper.citationCount || 0) > (existing.citationCount || 0) ||
          (paper.abstract && !existing.abstract)) {
        seen.set(normalizedTitle, paper);
      }
    }
  }
  
  return Array.from(seen.values());
}

/**
 * Format search results for AI consumption
 */
export function formatAcademicResultsForAI(result: AcademicSearchResult): string {
  if (!result.success || result.papers.length === 0) {
    return `No academic papers found for query: "${result.query}"`;
  }

  let output = `## Academic Search Results\n\n`;
  output += `**Query:** ${result.query}\n`;
  output += `**Total Results:** ${result.totalResults} papers found in ${result.searchTime}ms\n\n`;

  for (const paper of result.papers.slice(0, 10)) {
    output += `### ${paper.title}\n`;
    output += `**Authors:** ${paper.authors.map(a => a.name).join(', ')}\n`;
    if (paper.year) output += `**Year:** ${paper.year}\n`;
    if (paper.venue) output += `**Venue:** ${paper.venue}\n`;
    if (paper.citationCount) output += `**Citations:** ${paper.citationCount}\n`;
    if (paper.isOpenAccess) output += `**Open Access:** Yes\n`;
    if (paper.pdfUrl) output += `**PDF:** ${paper.pdfUrl}\n`;
    if (paper.abstract) {
      output += `**Abstract:** ${paper.abstract.slice(0, 500)}${paper.abstract.length > 500 ? '...' : ''}\n`;
    }
    output += '\n---\n\n';
  }

  return output;
}

/**
 * Academic search tool definition for AI agents
 */
export const academicSearchTool = {
  name: 'academic_search',
  description: `Search academic databases (arXiv, Semantic Scholar, OpenAlex, HuggingFace Papers) for scholarly papers. Use this tool to:
- Find research papers on specific topics
- Discover recent publications in a field
- Search for papers by specific authors
- Find foundational or highly-cited papers
- Explore AI/ML papers from HuggingFace community

The tool returns paper metadata including title, authors, abstract, year, citations, and PDF links.`,
  parameters: academicSearchInputSchema,
  execute: executeAcademicSearch,
};

export default academicSearchTool;
