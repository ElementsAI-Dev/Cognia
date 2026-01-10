//! Semantic Scholar API provider implementation
//! 
//! API Documentation: https://api.semanticscholar.org/api-docs

use super::AcademicProvider;
use crate::commands::academic::types::*;
use crate::http::HTTP_CLIENT;
use async_trait::async_trait;
use serde::Deserialize;

const S2_API_URL: &str = "https://api.semanticscholar.org/graph/v1";

pub struct SemanticScholarProvider {
    enabled: bool,
    api_key: Option<String>,
}

impl SemanticScholarProvider {
    pub fn new(api_key: Option<String>) -> Self {
        Self { enabled: true, api_key }
    }
    
    fn get_headers(&self) -> reqwest::header::HeaderMap {
        let mut headers = reqwest::header::HeaderMap::new();
        if let Some(ref key) = self.api_key {
            headers.insert("x-api-key", key.parse().unwrap());
        }
        headers
    }
}

#[derive(Debug, Deserialize)]
struct S2SearchResponse {
    total: Option<i32>,
    data: Option<Vec<S2Paper>>,
}

#[derive(Debug, Deserialize)]
struct S2Paper {
    #[serde(rename = "paperId")]
    paper_id: Option<String>,
    title: Option<String>,
    #[serde(rename = "abstract")]
    abstract_text: Option<String>,
    year: Option<i32>,
    #[serde(rename = "publicationDate")]
    publication_date: Option<String>,
    venue: Option<String>,
    journal: Option<S2Journal>,
    authors: Option<Vec<S2Author>>,
    #[serde(rename = "externalIds")]
    external_ids: Option<S2ExternalIds>,
    #[serde(rename = "citationCount")]
    citation_count: Option<i32>,
    #[serde(rename = "referenceCount")]
    reference_count: Option<i32>,
    #[serde(rename = "influentialCitationCount")]
    influential_citation_count: Option<i32>,
    #[serde(rename = "isOpenAccess")]
    is_open_access: Option<bool>,
    #[serde(rename = "openAccessPdf")]
    open_access_pdf: Option<S2OpenAccessPdf>,
    #[serde(rename = "fieldsOfStudy")]
    fields_of_study: Option<Vec<String>>,
    url: Option<String>,
}

#[derive(Debug, Deserialize)]
struct S2Journal {
    name: Option<String>,
    volume: Option<String>,
    pages: Option<String>,
}

#[derive(Debug, Deserialize)]
struct S2Author {
    #[serde(rename = "authorId")]
    author_id: Option<String>,
    name: Option<String>,
}

#[derive(Debug, Deserialize)]
struct S2ExternalIds {
    #[serde(rename = "DOI")]
    doi: Option<String>,
    #[serde(rename = "ArXiv")]
    arxiv: Option<String>,
    #[serde(rename = "PubMed")]
    pubmed: Option<String>,
    #[serde(rename = "PubMedCentral")]
    pmc: Option<String>,
    #[serde(rename = "MAG")]
    mag: Option<String>,
    #[serde(rename = "CorpusId")]
    corpus_id: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct S2OpenAccessPdf {
    url: Option<String>,
    #[serde(rename = "status")]
    _status: Option<String>,
}

#[derive(Debug, Deserialize)]
struct S2CitationsResponse {
    data: Option<Vec<S2CitingPaper>>,
}

#[derive(Debug, Deserialize)]
struct S2CitingPaper {
    #[serde(rename = "citingPaper")]
    citing_paper: Option<S2Paper>,
    #[serde(rename = "isInfluential")]
    is_influential: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct S2ReferencesResponse {
    data: Option<Vec<S2CitedPaper>>,
}

#[derive(Debug, Deserialize)]
struct S2CitedPaper {
    #[serde(rename = "citedPaper")]
    cited_paper: Option<S2Paper>,
    #[serde(rename = "isInfluential")]
    _is_influential: Option<bool>,
    contexts: Option<Vec<String>>,
}

impl From<S2Paper> for Paper {
    fn from(s2: S2Paper) -> Self {
        let paper_id = s2.paper_id.clone().unwrap_or_default();
        let mut paper = Paper::new("semantic-scholar", &paper_id, &s2.title.unwrap_or_default());
        
        paper.abstract_text = s2.abstract_text;
        paper.year = s2.year;
        paper.publication_date = s2.publication_date;
        paper.venue = s2.venue;
        
        if let Some(journal) = s2.journal {
            paper.journal = journal.name;
            paper.volume = journal.volume;
            paper.pages = journal.pages;
        }
        
        paper.authors = s2.authors.unwrap_or_default().into_iter().map(|a| PaperAuthor {
            name: a.name.unwrap_or_default(),
            author_id: a.author_id,
            affiliation: None,
            email: None,
            orcid: None,
        }).collect();
        
        if let Some(ids) = s2.external_ids {
            paper.metadata.doi = ids.doi;
            paper.metadata.arxiv_id = ids.arxiv;
            paper.metadata.pmid = ids.pubmed;
            paper.metadata.pmcid = ids.pmc;
            paper.metadata.mag_id = ids.mag;
            paper.metadata.corpus_id = ids.corpus_id.map(|c| c.to_string());
        }
        
        paper.citation_count = s2.citation_count;
        paper.reference_count = s2.reference_count;
        paper.influential_citation_count = s2.influential_citation_count;
        paper.is_open_access = s2.is_open_access;
        paper.fields_of_study = s2.fields_of_study;
        
        if let Some(oa_pdf) = s2.open_access_pdf {
            if let Some(url) = oa_pdf.url {
                paper.pdf_url = Some(url.clone());
                paper.open_access_url = Some(url.clone());
                paper.urls.push(PaperUrl {
                    url,
                    url_type: "pdf".to_string(),
                    source: "semantic-scholar".to_string(),
                    is_open_access: Some(true),
                });
            }
        }
        
        if let Some(url) = s2.url {
            paper.urls.push(PaperUrl {
                url,
                url_type: "abstract".to_string(),
                source: "semantic-scholar".to_string(),
                is_open_access: None,
            });
        }
        
        paper
    }
}

#[async_trait]
impl AcademicProvider for SemanticScholarProvider {
    fn provider_id(&self) -> &str {
        "semantic-scholar"
    }
    
    fn info(&self) -> ProviderInfo {
        ProviderInfo {
            id: "semantic-scholar".to_string(),
            name: "Semantic Scholar".to_string(),
            description: "AI-powered research tool with citation analysis".to_string(),
            base_url: S2_API_URL.to_string(),
            enabled: self.enabled,
            requires_api_key: false,
            has_api_key: self.api_key.is_some(),
            features: ProviderFeatures {
                search: true,
                full_text: false,
                citations: true,
                references: true,
                pdf_download: true,
                open_access: true,
            },
        }
    }
    
    fn is_enabled(&self) -> bool {
        self.enabled
    }
    
    fn set_enabled(&mut self, enabled: bool) {
        self.enabled = enabled;
    }
    
    fn set_api_key(&mut self, api_key: Option<String>) {
        self.api_key = api_key;
    }
    
    async fn test_connection(&self) -> Result<bool, String> {
        let url = format!("{}/paper/search?query=test&limit=1", S2_API_URL);
        
        match HTTP_CLIENT.get(&url).headers(self.get_headers()).send().await {
            Ok(response) => Ok(response.status().is_success()),
            Err(e) => Err(format!("Connection test failed: {}", e)),
        }
    }
    
    async fn search(&self, query: &str, options: &SearchOptions) -> Result<SearchResult, String> {
        let start_time = std::time::Instant::now();
        
        let limit = options.limit.unwrap_or(20).min(100);
        let offset = options.offset.unwrap_or(0);
        
        let fields = "paperId,title,abstract,year,publicationDate,venue,journal,authors,externalIds,citationCount,referenceCount,influentialCitationCount,isOpenAccess,openAccessPdf,fieldsOfStudy,url";
        
        let mut url = format!(
            "{}/paper/search?query={}&limit={}&offset={}&fields={}",
            S2_API_URL,
            urlencoding::encode(query),
            limit,
            offset,
            fields
        );
        
        // Add year filter
        if let Some(year_from) = options.year_from {
            url.push_str(&format!("&year={}-", year_from));
            if let Some(year_to) = options.year_to {
                url.push_str(&format!("{}", year_to));
            }
        } else if let Some(year_to) = options.year_to {
            url.push_str(&format!("&year=-{}", year_to));
        }
        
        // Add fields of study filter
        if let Some(ref fields_of_study) = options.fields_of_study {
            if !fields_of_study.is_empty() {
                url.push_str(&format!("&fieldsOfStudy={}", fields_of_study.join(",")));
            }
        }
        
        // Add open access filter
        if options.open_access_only.unwrap_or(false) {
            url.push_str("&openAccessPdf");
        }
        
        // Add minimum citations filter
        if let Some(min_cites) = options.min_citations {
            url.push_str(&format!("&minCitationCount={}", min_cites));
        }
        
        log::debug!("Semantic Scholar search URL: {}", url);
        
        let response = HTTP_CLIENT
            .get(&url)
            .headers(self.get_headers())
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;
        
        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(format!("API returned status {}: {}", status, body));
        }
        
        let data: S2SearchResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;
        
        let papers: Vec<Paper> = data.data
            .unwrap_or_default()
            .into_iter()
            .map(Paper::from)
            .collect();
        
        let total = data.total.unwrap_or(papers.len() as i32);
        
        Ok(SearchResult {
            papers,
            total_results: total,
            has_more: (offset + limit) < total as u32,
            offset: offset as i32,
            provider: "semantic-scholar".to_string(),
            search_time_ms: start_time.elapsed().as_millis() as u64,
        })
    }
    
    async fn get_paper(&self, paper_id: &str) -> Result<Paper, String> {
        let fields = "paperId,title,abstract,year,publicationDate,venue,journal,authors,externalIds,citationCount,referenceCount,influentialCitationCount,isOpenAccess,openAccessPdf,fieldsOfStudy,url";
        
        let url = format!("{}/paper/{}?fields={}", S2_API_URL, paper_id, fields);
        
        let response = HTTP_CLIENT
            .get(&url)
            .headers(self.get_headers())
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;
        
        if !response.status().is_success() {
            return Err(format!("API returned status: {}", response.status()));
        }
        
        let s2_paper: S2Paper = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;
        
        Ok(Paper::from(s2_paper))
    }
    
    async fn get_citations(&self, paper_id: &str, limit: u32, offset: u32) -> Result<Vec<PaperCitation>, String> {
        let fields = "citingPaper.paperId,citingPaper.title,citingPaper.authors,citingPaper.year,citingPaper.venue,citingPaper.citationCount,isInfluential";
        
        let url = format!(
            "{}/paper/{}/citations?fields={}&limit={}&offset={}",
            S2_API_URL, paper_id, fields, limit.min(1000), offset
        );
        
        let response = HTTP_CLIENT
            .get(&url)
            .headers(self.get_headers())
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;
        
        if !response.status().is_success() {
            return Err(format!("API returned status: {}", response.status()));
        }
        
        let data: S2CitationsResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;
        
        let citations = data.data
            .unwrap_or_default()
            .into_iter()
            .filter_map(|c| {
                c.citing_paper.map(|p| PaperCitation {
                    paper_id: p.paper_id.unwrap_or_default(),
                    title: p.title.unwrap_or_default(),
                    authors: p.authors.map(|authors| {
                        authors.into_iter().map(|a| PaperAuthor {
                            name: a.name.unwrap_or_default(),
                            author_id: a.author_id,
                            affiliation: None,
                            email: None,
                            orcid: None,
                        }).collect()
                    }),
                    year: p.year,
                    venue: p.venue,
                    citation_count: p.citation_count,
                    is_influential: c.is_influential,
                })
            })
            .collect();
        
        Ok(citations)
    }
    
    async fn get_references(&self, paper_id: &str, limit: u32, offset: u32) -> Result<Vec<PaperReference>, String> {
        let fields = "citedPaper.paperId,citedPaper.title,citedPaper.authors,citedPaper.year,citedPaper.venue,citedPaper.citationCount,isInfluential,contexts";
        
        let url = format!(
            "{}/paper/{}/references?fields={}&limit={}&offset={}",
            S2_API_URL, paper_id, fields, limit.min(1000), offset
        );
        
        let response = HTTP_CLIENT
            .get(&url)
            .headers(self.get_headers())
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;
        
        if !response.status().is_success() {
            return Err(format!("API returned status: {}", response.status()));
        }
        
        let data: S2ReferencesResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;
        
        let references = data.data
            .unwrap_or_default()
            .into_iter()
            .filter_map(|r| {
                r.cited_paper.map(|p| PaperReference {
                    paper_id: p.paper_id.unwrap_or_default(),
                    title: p.title.unwrap_or_default(),
                    authors: p.authors.map(|authors| {
                        authors.into_iter().map(|a| PaperAuthor {
                            name: a.name.unwrap_or_default(),
                            author_id: a.author_id,
                            affiliation: None,
                            email: None,
                            orcid: None,
                        }).collect()
                    }),
                    year: p.year,
                    venue: p.venue,
                    citation_count: p.citation_count,
                    contexts: r.contexts,
                })
            })
            .collect();
        
        Ok(references)
    }
}
