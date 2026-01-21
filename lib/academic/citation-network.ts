/**
 * Citation Network - Fetch and manage citation relationships between papers
 * Provides APIs to get citations, references, and build citation graphs
 */

import type { Paper, AcademicProviderType } from '@/types/learning/academic';

export interface CitationNode {
  paperId: string;
  title: string;
  authors: string[];
  year?: number;
  citationCount?: number;
  isInfluential?: boolean;
  venue?: string;
  abstract?: string;
}

export interface CitationNetwork {
  paperId: string;
  paperTitle: string;
  citations: CitationNode[];      // Papers that cite this paper
  references: CitationNode[];     // Papers this paper cites
  citationCount: number;
  referenceCount: number;
  influentialCitationCount: number;
}

export interface CitationGraphNode {
  id: string;
  label: string;
  type: 'source' | 'citation' | 'reference';
  year?: number;
  citationCount?: number;
}

export interface CitationGraphEdge {
  source: string;
  target: string;
  type: 'cites' | 'cited_by';
}

export interface CitationGraph {
  nodes: CitationGraphNode[];
  edges: CitationGraphEdge[];
}

/**
 * Fetch citations for a paper from Semantic Scholar API
 */
export async function fetchCitationsFromSemanticScholar(
  paperId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ citations: CitationNode[]; total: number }> {
  try {
    const fields = 'paperId,title,authors,year,citationCount,isInfluential,venue,abstract';
    const url = `https://api.semanticscholar.org/graph/v1/paper/${paperId}/citations?fields=${fields}&limit=${limit}&offset=${offset}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch citations: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    const citations: CitationNode[] = (data.data || []).map((item: {
      citingPaper: {
        paperId: string;
        title: string;
        authors?: { name: string }[];
        year?: number;
        citationCount?: number;
        isInfluential?: boolean;
        venue?: string;
        abstract?: string;
      };
    }) => ({
      paperId: item.citingPaper?.paperId || '',
      title: item.citingPaper?.title || 'Unknown',
      authors: item.citingPaper?.authors?.map((a: { name: string }) => a.name) || [],
      year: item.citingPaper?.year,
      citationCount: item.citingPaper?.citationCount,
      isInfluential: item.citingPaper?.isInfluential,
      venue: item.citingPaper?.venue,
      abstract: item.citingPaper?.abstract,
    }));
    
    return {
      citations,
      total: data.total || citations.length,
    };
  } catch (error) {
    console.error('Error fetching citations:', error);
    return { citations: [], total: 0 };
  }
}

/**
 * Fetch references for a paper from Semantic Scholar API
 */
export async function fetchReferencesFromSemanticScholar(
  paperId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ references: CitationNode[]; total: number }> {
  try {
    const fields = 'paperId,title,authors,year,citationCount,isInfluential,venue,abstract';
    const url = `https://api.semanticscholar.org/graph/v1/paper/${paperId}/references?fields=${fields}&limit=${limit}&offset=${offset}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch references: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    const references: CitationNode[] = (data.data || []).map((item: {
      citedPaper: {
        paperId: string;
        title: string;
        authors?: { name: string }[];
        year?: number;
        citationCount?: number;
        isInfluential?: boolean;
        venue?: string;
        abstract?: string;
      };
    }) => ({
      paperId: item.citedPaper?.paperId || '',
      title: item.citedPaper?.title || 'Unknown',
      authors: item.citedPaper?.authors?.map((a: { name: string }) => a.name) || [],
      year: item.citedPaper?.year,
      citationCount: item.citedPaper?.citationCount,
      isInfluential: item.citedPaper?.isInfluential,
      venue: item.citedPaper?.venue,
      abstract: item.citedPaper?.abstract,
    }));
    
    return {
      references,
      total: data.total || references.length,
    };
  } catch (error) {
    console.error('Error fetching references:', error);
    return { references: [], total: 0 };
  }
}

/**
 * Build a complete citation network for a paper
 */
export async function buildCitationNetwork(
  paper: Paper,
  options: {
    maxCitations?: number;
    maxReferences?: number;
    provider?: AcademicProviderType;
  } = {}
): Promise<CitationNetwork> {
  const { maxCitations = 50, maxReferences = 50 } = options;
  
  // Try to get Semantic Scholar ID
  let semanticScholarId = paper.metadata?.corpusId;
  
  // If no corpus ID, try using DOI or arXiv ID
  if (!semanticScholarId) {
    if (paper.metadata?.doi) {
      semanticScholarId = `DOI:${paper.metadata.doi}`;
    } else if (paper.metadata?.arxivId) {
      semanticScholarId = `arXiv:${paper.metadata.arxivId}`;
    } else if (paper.externalId) {
      semanticScholarId = paper.externalId;
    }
  }
  
  if (!semanticScholarId) {
    return {
      paperId: paper.id,
      paperTitle: paper.title,
      citations: [],
      references: [],
      citationCount: paper.citationCount || 0,
      referenceCount: paper.referenceCount || 0,
      influentialCitationCount: paper.influentialCitationCount || 0,
    };
  }
  
  const [citationsResult, referencesResult] = await Promise.all([
    fetchCitationsFromSemanticScholar(semanticScholarId, maxCitations),
    fetchReferencesFromSemanticScholar(semanticScholarId, maxReferences),
  ]);
  
  return {
    paperId: paper.id,
    paperTitle: paper.title,
    citations: citationsResult.citations,
    references: referencesResult.references,
    citationCount: citationsResult.total,
    referenceCount: referencesResult.total,
    influentialCitationCount: citationsResult.citations.filter(c => c.isInfluential).length,
  };
}

/**
 * Build a citation graph for visualization
 */
export function buildCitationGraph(
  network: CitationNetwork,
  options: {
    maxNodes?: number;
    includeReferences?: boolean;
    includeCitations?: boolean;
  } = {}
): CitationGraph {
  const { 
    maxNodes = 30, 
    includeReferences = true, 
    includeCitations = true 
  } = options;
  
  const nodes: CitationGraphNode[] = [];
  const edges: CitationGraphEdge[] = [];
  const nodeIds = new Set<string>();
  
  // Add source node
  nodes.push({
    id: network.paperId,
    label: network.paperTitle,
    type: 'source',
  });
  nodeIds.add(network.paperId);
  
  let nodeCount = 1;
  
  // Add citation nodes
  if (includeCitations) {
    for (const citation of network.citations) {
      if (nodeCount >= maxNodes) break;
      if (!citation.paperId || nodeIds.has(citation.paperId)) continue;
      
      nodes.push({
        id: citation.paperId,
        label: citation.title,
        type: 'citation',
        year: citation.year,
        citationCount: citation.citationCount,
      });
      nodeIds.add(citation.paperId);
      
      edges.push({
        source: citation.paperId,
        target: network.paperId,
        type: 'cites',
      });
      
      nodeCount++;
    }
  }
  
  // Add reference nodes
  if (includeReferences) {
    for (const reference of network.references) {
      if (nodeCount >= maxNodes) break;
      if (!reference.paperId || nodeIds.has(reference.paperId)) continue;
      
      nodes.push({
        id: reference.paperId,
        label: reference.title,
        type: 'reference',
        year: reference.year,
        citationCount: reference.citationCount,
      });
      nodeIds.add(reference.paperId);
      
      edges.push({
        source: network.paperId,
        target: reference.paperId,
        type: 'cited_by',
      });
      
      nodeCount++;
    }
  }
  
  return { nodes, edges };
}

/**
 * Find common citations between multiple papers
 */
export function findCommonCitations(
  networks: CitationNetwork[]
): CitationNode[] {
  if (networks.length < 2) return [];
  
  const citationCounts = new Map<string, { node: CitationNode; count: number }>();
  
  for (const network of networks) {
    for (const citation of network.citations) {
      const existing = citationCounts.get(citation.paperId);
      if (existing) {
        existing.count++;
      } else {
        citationCounts.set(citation.paperId, { node: citation, count: 1 });
      }
    }
  }
  
  return Array.from(citationCounts.values())
    .filter(item => item.count === networks.length)
    .map(item => item.node);
}

/**
 * Find common references between multiple papers
 */
export function findCommonReferences(
  networks: CitationNetwork[]
): CitationNode[] {
  if (networks.length < 2) return [];
  
  const referenceCounts = new Map<string, { node: CitationNode; count: number }>();
  
  for (const network of networks) {
    for (const reference of network.references) {
      const existing = referenceCounts.get(reference.paperId);
      if (existing) {
        existing.count++;
      } else {
        referenceCounts.set(reference.paperId, { node: reference, count: 1 });
      }
    }
  }
  
  return Array.from(referenceCounts.values())
    .filter(item => item.count === networks.length)
    .map(item => item.node);
}

const citationNetworkApi = {
  fetchCitationsFromSemanticScholar,
  fetchReferencesFromSemanticScholar,
  buildCitationNetwork,
  buildCitationGraph,
  findCommonCitations,
  findCommonReferences,
};

export default citationNetworkApi;
