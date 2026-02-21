import { z } from 'zod';
import type { AcademicProviderType, Paper } from '@/types/academic';

const DOI_PATTERN = /\b10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+\b/g;

export const academicSearchInputSchema = z.object({
  query: z.string(),
  providers: z
    .array(
      z.enum([
        'arxiv',
        'semantic-scholar',
        'core',
        'openalex',
        'dblp',
        'unpaywall',
        'openreview',
        'huggingface-papers',
      ])
    )
    .default(['arxiv', 'semantic-scholar']),
  maxResults: z.number().min(1).max(100).default(10),
  yearFrom: z.number().optional(),
  yearTo: z.number().optional(),
  categories: z.array(z.string()).optional(),
  openAccessOnly: z.boolean().default(false),
  sortBy: z.enum(['relevance', 'date', 'citations']).default('relevance'),
});

export type AcademicSearchInput = z.infer<typeof academicSearchInputSchema>;

export interface AcademicSearchResult {
  success: boolean;
  query: string;
  papers: Paper[];
  totalResults: number;
  providerResults: Record<string, { count: number; success: boolean; error?: string }>;
  degradedProviders: Record<string, { reason: string; retriable: boolean }>;
  searchTime: number;
  error?: string;
}

export interface AcademicSearchConfig {
  providerCredentials?: Partial<Record<AcademicProviderType, { apiKey?: string; email?: string; mailto?: string }>>;
  openAlexApiKey?: string;
  openAlexMailto?: string;
  coreApiKey?: string;
  unpaywallEmail?: string;
  openReviewApiKey?: string;
  semanticScholarApiKey?: string;
}

const toPaper = (providerId: AcademicProviderType, externalId: string, title: string): Paper => {
  const now = new Date();
  return {
    id: `${providerId}-${externalId}`,
    providerId,
    externalId,
    title,
    authors: [],
    urls: [],
    metadata: {},
    createdAt: now,
    updatedAt: now,
    fetchedAt: now,
  };
};

const isRetriable = (message: string) =>
  /(429|rate limit|timeout|temporar|connection|network)/i.test(message);

const unique = (papers: Paper[]) => {
  const map = new Map<string, Paper>();
  for (const paper of papers) {
    const key = (paper.metadata.doi || paper.title).toLowerCase().replace(/[^a-z0-9]/g, '');
    const existing = map.get(key);
    if (!existing || (paper.citationCount || 0) > (existing.citationCount || 0)) {
      map.set(key, paper);
    }
  }
  return [...map.values()];
};

const sortPapers = (papers: Paper[], by: AcademicSearchInput['sortBy']) => {
  if (by === 'date') return [...papers].sort((a, b) => (b.year || 0) - (a.year || 0));
  if (by === 'citations') return [...papers].sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0));
  return papers;
};

const getCreds = (config: AcademicSearchConfig = {}) => ({
  openAlexApiKey: config.openAlexApiKey ?? config.providerCredentials?.openalex?.apiKey,
  openAlexMailto: config.openAlexMailto ?? config.providerCredentials?.openalex?.mailto,
  coreApiKey: config.coreApiKey ?? config.providerCredentials?.core?.apiKey,
  unpaywallEmail: config.unpaywallEmail ?? config.providerCredentials?.unpaywall?.email,
  openReviewApiKey: config.openReviewApiKey ?? config.providerCredentials?.openreview?.apiKey,
  semanticScholarApiKey:
    config.semanticScholarApiKey ?? config.providerCredentials?.['semantic-scholar']?.apiKey,
});

async function searchArxiv(input: AcademicSearchInput) {
  const q = input.categories?.length
    ? `(${input.query}) AND (${input.categories.map((c) => `cat:${c}`).join(' OR ')})`
    : input.query;
  const url = `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(`all:${q}`)}&start=0&max_results=${input.maxResults}`;
  const xml = await (await fetch(url)).text();
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1]);
  return entries
    .map((entry) => {
      const id = (entry.match(/<id>(.*?)<\/id>/)?.[1] || '').split('/abs/').pop() || '';
      const title = (entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '').replace(/\s+/g, ' ').trim();
      if (!id || !title) return null;
      const paper = toPaper('arxiv', id, title);
      paper.abstract = (entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1] || '').replace(/\s+/g, ' ').trim();
      paper.publicationDate = entry.match(/<published>(.*?)<\/published>/)?.[1];
      paper.year = paper.publicationDate ? new Date(paper.publicationDate).getFullYear() : undefined;
      paper.authors = [...entry.matchAll(/<author>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<\/author>/g)].map((a) => ({ name: a[1] }));
      paper.categories = [...entry.matchAll(/<category[^>]*term="([^"]+)"/g)].map((c) => c[1]);
      paper.pdfUrl = `https://arxiv.org/pdf/${id}.pdf`;
      paper.isOpenAccess = true;
      paper.metadata = { arxivId: id };
      paper.urls = [
        { url: `https://arxiv.org/abs/${id}`, type: 'abstract', source: 'arxiv', isOpenAccess: true },
        { url: paper.pdfUrl, type: 'pdf', source: 'arxiv', isOpenAccess: true },
      ];
      return paper;
    })
    .filter((paper): paper is Paper => Boolean(paper));
}

async function searchSemanticScholar(input: AcademicSearchInput, apiKey?: string) {
  const params = new URLSearchParams({
    query: input.query,
    limit: String(input.maxResults),
    fields: 'paperId,title,abstract,authors,year,venue,citationCount,referenceCount,openAccessPdf,externalIds',
  });
  const headers: HeadersInit = apiKey ? { 'x-api-key': apiKey } : {};
  const res = await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?${params}`, { headers });
  if (!res.ok) throw new Error(`Semantic Scholar API returned ${res.status}`);
  const json = (await res.json()) as { data?: Array<Record<string, unknown>> };
  return (json.data || [])
    .map((item) => {
      const paperId = String(item.paperId || '');
      const title = String(item.title || '');
      if (!paperId || !title) return null;
      const paper = toPaper('semantic-scholar', paperId, title);
      paper.abstract = item.abstract as string | undefined;
      paper.year = item.year as number | undefined;
      paper.venue = item.venue as string | undefined;
      paper.citationCount = item.citationCount as number | undefined;
      paper.referenceCount = item.referenceCount as number | undefined;
      paper.authors = ((item.authors as Array<{ name?: string; authorId?: string }>) || []).map((a) => ({
        name: a.name || '',
        authorId: a.authorId,
      }));
      const ids = (item.externalIds as Record<string, string>) || {};
      paper.metadata = { doi: ids.DOI || ids.doi, corpusId: ids.CorpusId };
      const openPdf = (item.openAccessPdf as { url?: string } | undefined)?.url;
      if (openPdf) {
        paper.pdfUrl = openPdf;
        paper.isOpenAccess = true;
        paper.urls.push({ url: openPdf, type: 'pdf', source: 'semantic-scholar', isOpenAccess: true });
      }
      return paper;
    })
    .filter((paper): paper is Paper => Boolean(paper));
}

async function searchCore(input: AcademicSearchInput, apiKey?: string) {
  if (!apiKey) throw new Error('CORE API key is required');
  const params = new URLSearchParams({ q: input.query, limit: String(Math.min(input.maxResults, 100)), offset: '0' });
  const res = await fetch(`https://api.core.ac.uk/v3/search/works?${params}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`CORE API returned ${res.status}`);
  const json = (await res.json()) as { results?: Array<Record<string, unknown>> };
  return (json.results || [])
    .map((item) => {
      const id = String(item.id || '');
      const title = String(item.title || '');
      if (!id || !title) return null;
      const paper = toPaper('core', id, title);
      paper.abstract = item.abstract as string | undefined;
      paper.year = item.yearPublished as number | undefined;
      paper.publicationDate = item.publishedDate as string | undefined;
      paper.venue = (item.journal as string) || (item.publisher as string);
      paper.authors = ((item.authors as Array<{ name?: string }>) || []).map((a) => ({ name: a.name || '' }));
      paper.metadata = { coreId: id, doi: item.doi as string | undefined };
      const pdfUrl = (item.downloadUrl as string) || ((item.sourceFulltextUrls as string[]) || [])[0];
      if (pdfUrl) {
        paper.pdfUrl = pdfUrl;
        paper.isOpenAccess = true;
        paper.urls.push({ url: pdfUrl, type: 'pdf', source: 'core', isOpenAccess: true });
      }
      return paper;
    })
    .filter((paper): paper is Paper => Boolean(paper));
}

async function searchOpenAlex(input: AcademicSearchInput, apiKey?: string, mailto?: string) {
  if (!apiKey) throw new Error('OpenAlex API key is required');
  const params = new URLSearchParams({
    search: input.query,
    'per-page': String(Math.min(input.maxResults, 200)),
    api_key: apiKey,
  });
  if (mailto) params.set('mailto', mailto);
  if (input.yearFrom || input.yearTo) {
    const filters: string[] = [];
    if (input.yearFrom) filters.push(`from_publication_date:${input.yearFrom}-01-01`);
    if (input.yearTo) filters.push(`to_publication_date:${input.yearTo}-12-31`);
    params.set('filter', filters.join(','));
  }
  const res = await fetch(`https://api.openalex.org/works?${params}`);
  if (!res.ok) throw new Error(`OpenAlex API returned ${res.status}`);
  const json = (await res.json()) as { results?: Array<Record<string, unknown>> };
  return (json.results || [])
    .map((item) => {
      const id = String(item.id || '').replace('https://openalex.org/', '');
      const title = String(item.title || '');
      if (!id || !title) return null;
      const paper = toPaper('openalex', id, title);
      paper.year = item.publication_year as number | undefined;
      paper.publicationDate = item.publication_date as string | undefined;
      paper.citationCount = item.cited_by_count as number | undefined;
      paper.referenceCount = item.referenced_works_count as number | undefined;
      paper.venue = ((item.primary_location as { source?: { display_name?: string } })?.source?.display_name) || undefined;
      paper.authors =
        ((item.authorships as Array<{ author?: { display_name?: string; id?: string } }>) || []).map((a) => ({
          name: a.author?.display_name || '',
          authorId: a.author?.id?.replace('https://openalex.org/', ''),
        }));
      const ids = (item.ids as Record<string, string>) || {};
      paper.metadata = { doi: ids.doi || (item.doi as string | undefined), openAlexId: ids.openalex || (item.id as string) };
      const best = item.best_oa_location as { pdf_url?: string; landing_page_url?: string } | undefined;
      const primary = item.primary_location as { pdf_url?: string; landing_page_url?: string } | undefined;
      const pdfUrl = best?.pdf_url || primary?.pdf_url;
      const landing = best?.landing_page_url || primary?.landing_page_url;
      paper.isOpenAccess = Boolean(item.is_oa);
      if (pdfUrl) {
        paper.pdfUrl = pdfUrl;
        paper.urls.push({ url: pdfUrl, type: 'pdf', source: 'openalex', isOpenAccess: true });
      }
      if (landing) {
        paper.urls.push({ url: landing, type: 'abstract', source: 'openalex', isOpenAccess: paper.isOpenAccess });
      }
      return paper;
    })
    .filter((paper): paper is Paper => Boolean(paper));
}

async function searchDblp(input: AcademicSearchInput) {
  const params = new URLSearchParams({
    q: input.query,
    format: 'json',
    h: String(Math.min(input.maxResults, 1000)),
    f: '0',
  });
  const res = await fetch(`https://dblp.org/search/publ/api?${params}`);
  if (!res.ok) throw new Error(`DBLP API returned ${res.status}`);
  const json = (await res.json()) as { result?: { hits?: { hit?: Array<Record<string, unknown>> } } };
  const hits = json.result?.hits?.hit || [];
  return hits
    .map((hit) => {
      const info = (hit.info as Record<string, unknown>) || {};
      const key = String(info.key || '');
      const title = String(info.title || '');
      if (!key || !title) return null;
      const paper = toPaper('dblp', key, title);
      paper.year = Number.parseInt(String(info.year || ''), 10) || undefined;
      paper.venue = info.venue as string | undefined;
      paper.metadata = { dblpKey: key, doi: info.doi as string | undefined };
      const authors = ((info.authors as { author?: Array<{ text?: string }> | { text?: string } })?.author || []) as
        | Array<{ text?: string }>
        | { text?: string };
      paper.authors = Array.isArray(authors)
        ? authors.map((a) => ({ name: a.text || '' }))
        : authors
          ? [{ name: authors.text || '' }]
          : [];
      const url = info.url as string | undefined;
      if (url) paper.urls.push({ url, type: 'abstract', source: 'dblp' });
      return paper;
    })
    .filter((paper): paper is Paper => Boolean(paper));
}

async function searchUnpaywall(input: AcademicSearchInput, email?: string) {
  if (!email) throw new Error('Unpaywall email is required');
  const dois = [...new Set((input.query.match(DOI_PATTERN) || []).map((doi) => doi.trim()))];
  if (!dois.length) throw new Error('Unpaywall search requires DOI in query');
  const papers: Paper[] = [];
  for (const doi of dois.slice(0, input.maxResults)) {
    const res = await fetch(`https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${encodeURIComponent(email)}`);
    if (!res.ok) continue;
    const data = (await res.json()) as Record<string, unknown>;
    const title = String(data.title || '');
    if (!title) continue;
    const paper = toPaper('unpaywall', String(data.doi || doi), title);
    paper.year = data.year as number | undefined;
    paper.publicationDate = data.published_date as string | undefined;
    paper.venue = data.journal_name as string | undefined;
    paper.isOpenAccess = Boolean(data.is_oa);
    paper.metadata = { doi: String(data.doi || doi) };
    const zAuthors = (data.z_authors as Array<{ given?: string; family?: string }>) || [];
    paper.authors = zAuthors.map((author) => ({ name: `${author.given || ''} ${author.family || ''}`.trim() }));
    const best = (data.best_oa_location as { url?: string; url_for_pdf?: string }) || {};
    if (best.url_for_pdf) {
      paper.pdfUrl = best.url_for_pdf;
      paper.urls.push({ url: best.url_for_pdf, type: 'pdf', source: 'unpaywall', isOpenAccess: true });
    }
    if (best.url) {
      paper.urls.push({ url: best.url, type: 'abstract', source: 'unpaywall', isOpenAccess: true });
    }
    papers.push(paper);
  }
  return papers;
}

async function searchOpenReview(input: AcademicSearchInput, apiKey?: string) {
  const params = new URLSearchParams({
    limit: String(Math.min(input.maxResults, 100)),
    offset: '0',
    'content.title': input.query,
  });
  const headers: HeadersInit = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
  const res = await fetch(`https://api2.openreview.net/notes?${params}`, { headers });
  if (!res.ok) throw new Error(`OpenReview API returned ${res.status}`);
  const json = (await res.json()) as { notes?: Array<Record<string, unknown>> };
  return (json.notes || [])
    .map((note) => {
      const id = String(note.id || '');
      const content = (note.content as Record<string, unknown>) || {};
      const title = String(content.title || '');
      if (!id || !title) return null;
      const paper = toPaper('openreview', id, title);
      paper.abstract = (content.abstract as string) || undefined;
      const cdate = note.cdate as number | undefined;
      paper.publicationDate = cdate ? new Date(cdate).toISOString() : undefined;
      paper.year = cdate ? new Date(cdate).getUTCFullYear() : undefined;
      paper.metadata = { doi: content.doi as string | undefined };
      const authors = (content.authors as string[]) || [];
      paper.authors = authors.map((name) => ({ name }));
      paper.urls = [
        {
          url: `https://openreview.net/forum?id=${encodeURIComponent(String(note.forum || id))}`,
          type: 'abstract',
          source: 'openreview',
          isOpenAccess: true,
        },
      ];
      return paper;
    })
    .filter((paper): paper is Paper => Boolean(paper));
}

async function searchHuggingFacePapers(input: AcademicSearchInput) {
  const params = new URLSearchParams({ q: input.query, limit: String(Math.min(input.maxResults, 100)) });
  const res = await fetch(`https://huggingface.co/api/papers/search?${params}`);
  if (!res.ok) throw new Error(`Hugging Face papers API returned ${res.status}`);
  const json = (await res.json()) as Array<Record<string, unknown>> | { papers?: Array<Record<string, unknown>> };
  const list = Array.isArray(json) ? json : json.papers || [];
  return list
    .map((item) => {
      const id = String(item.id || '');
      const title = String(item.title || '');
      if (!id || !title) return null;
      const paper = toPaper('huggingface-papers', id, title);
      paper.abstract = (item.abstract as string) || (item.summary as string) || undefined;
      paper.publicationDate = item.publishedAt as string | undefined;
      paper.year = paper.publicationDate ? new Date(paper.publicationDate).getUTCFullYear() : undefined;
      paper.citationCount = item.upvotes as number | undefined;
      paper.isOpenAccess = true;
      paper.metadata = { arxivId: item.arxivId as string | undefined, doi: item.doi as string | undefined };
      const authors = (item.authors as Array<string | { name?: string }>) || [];
      paper.authors = authors.map((author) => ({ name: typeof author === 'string' ? author : author.name || '' }));
      if (paper.metadata.arxivId) {
        paper.pdfUrl = `https://arxiv.org/pdf/${paper.metadata.arxivId}.pdf`;
        paper.urls.push({ url: paper.pdfUrl, type: 'pdf', source: 'arxiv', isOpenAccess: true });
      }
      if (item.url) {
        paper.urls.push({ url: String(item.url), type: 'abstract', source: 'huggingface-papers', isOpenAccess: true });
      }
      return paper;
    })
    .filter((paper): paper is Paper => Boolean(paper));
}

export async function executeAcademicSearch(
  input: AcademicSearchInput,
  config: AcademicSearchConfig = {}
): Promise<AcademicSearchResult> {
  const startedAt = Date.now();
  const creds = getCreds(config);
  const providerResults: AcademicSearchResult['providerResults'] = {};
  const degradedProviders: AcademicSearchResult['degradedProviders'] = {};

  const providerPapers = await Promise.all(
    input.providers.map(async (provider) => {
      try {
        let papers: Paper[] = [];
        if (provider === 'arxiv') papers = await searchArxiv(input);
        if (provider === 'semantic-scholar') papers = await searchSemanticScholar(input, creds.semanticScholarApiKey);
        if (provider === 'core') papers = await searchCore(input, creds.coreApiKey);
        if (provider === 'openalex') papers = await searchOpenAlex(input, creds.openAlexApiKey, creds.openAlexMailto);
        if (provider === 'dblp') papers = await searchDblp(input);
        if (provider === 'unpaywall') papers = await searchUnpaywall(input, creds.unpaywallEmail);
        if (provider === 'openreview') papers = await searchOpenReview(input, creds.openReviewApiKey);
        if (provider === 'huggingface-papers') papers = await searchHuggingFacePapers(input);
        providerResults[provider] = { count: papers.length, success: true };
        return papers;
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        providerResults[provider] = { count: 0, success: false, error: reason };
        degradedProviders[provider] = { reason, retriable: isRetriable(reason) };
        return [];
      }
    })
  );

  let papers = unique(providerPapers.flat());
  if (input.yearFrom) papers = papers.filter((paper) => !paper.year || paper.year >= input.yearFrom!);
  if (input.yearTo) papers = papers.filter((paper) => !paper.year || paper.year <= input.yearTo!);
  if (input.openAccessOnly) papers = papers.filter((paper) => paper.isOpenAccess);
  papers = sortPapers(papers, input.sortBy);

  return {
    success: Object.values(providerResults).some((result) => result.success),
    query: input.query,
    papers,
    totalResults: papers.length,
    providerResults,
    degradedProviders,
    searchTime: Date.now() - startedAt,
  };
}

export function formatAcademicResultsForAI(result: AcademicSearchResult): string {
  if (!result.success || result.papers.length === 0) {
    return `No academic papers found for query: "${result.query}"`;
  }
  let text = `## Academic Search Results\n\n**Query:** ${result.query}\n**Total Results:** ${result.totalResults} in ${result.searchTime}ms\n\n`;
  const degraded = Object.entries(result.degradedProviders);
  if (degraded.length) {
    text += `**Degraded Providers:**\n${degraded.map(([provider, info]) => `- ${provider}: ${info.reason}`).join('\n')}\n\n`;
  }
  for (const paper of result.papers.slice(0, 10)) {
    text += `### ${paper.title}\n`;
    text += `**Authors:** ${paper.authors.map((author) => author.name).join(', ') || 'Unknown'}\n`;
    if (paper.year) text += `**Year:** ${paper.year}\n`;
    if (paper.venue) text += `**Venue:** ${paper.venue}\n`;
    if (paper.citationCount) text += `**Citations:** ${paper.citationCount}\n`;
    if (paper.pdfUrl) text += `**PDF:** ${paper.pdfUrl}\n`;
    if (paper.abstract) text += `**Abstract:** ${paper.abstract.slice(0, 500)}${paper.abstract.length > 500 ? '...' : ''}\n`;
    text += '\n---\n\n';
  }
  return text;
}

export const academicSearchTool = {
  name: 'academic_search',
  description:
    'Search academic databases (arXiv, Semantic Scholar, CORE, OpenAlex, DBLP, Unpaywall, OpenReview, Hugging Face papers).',
  parameters: academicSearchInputSchema,
  execute: executeAcademicSearch,
};

export default academicSearchTool;
