//! DBLP API provider implementation
//! 
//! API Documentation: https://dblp.org/faq/13501473.html

use super::AcademicProvider;
use crate::commands::academic::types::*;
use crate::http::HTTP_CLIENT;
use async_trait::async_trait;
use serde::Deserialize;

const DBLP_API_URL: &str = "https://dblp.org/search";

pub struct DblpProvider {
    enabled: bool,
}

impl DblpProvider {
    pub fn new() -> Self {
        Self { enabled: true }
    }
}

impl Default for DblpProvider {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Deserialize)]
struct DblpSearchResponse {
    result: Option<DblpResult>,
}

#[derive(Debug, Deserialize)]
struct DblpResult {
    hits: Option<DblpHits>,
}

#[derive(Debug, Deserialize)]
struct DblpHits {
    #[serde(rename = "@total")]
    total: Option<String>,
    hit: Option<Vec<DblpHit>>,
}

#[derive(Debug, Deserialize)]
struct DblpHit {
    info: Option<DblpInfo>,
}

#[derive(Debug, Deserialize)]
struct DblpInfo {
    key: Option<String>,
    title: Option<DblpText>,
    authors: Option<DblpAuthors>,
    venue: Option<String>,
    year: Option<String>,
    #[serde(rename = "type")]
    pub_type: Option<String>,
    doi: Option<String>,
    ee: Option<DblpLinks>,
    url: Option<String>,
    pages: Option<String>,
    volume: Option<String>,
    number: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum DblpText {
    Simple(String),
    Complex { text: String },
}

impl DblpText {
    fn as_str(&self) -> &str {
        match self {
            DblpText::Simple(s) => s,
            DblpText::Complex { text } => text,
        }
    }
}

#[derive(Debug, Deserialize)]
struct DblpAuthors {
    author: Option<DblpAuthorList>,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum DblpAuthorList {
    Single(DblpAuthor),
    Multiple(Vec<DblpAuthor>),
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum DblpAuthor {
    Simple(String),
    Complex {
        text: Option<String>,
        #[serde(rename = "@pid")]
        pid: Option<String>,
    },
}

impl DblpAuthor {
    fn name(&self) -> String {
        match self {
            DblpAuthor::Simple(s) => s.clone(),
            DblpAuthor::Complex { text, .. } => text.clone().unwrap_or_default(),
        }
    }
    
    fn pid(&self) -> Option<String> {
        match self {
            DblpAuthor::Simple(_) => None,
            DblpAuthor::Complex { pid, .. } => pid.clone(),
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum DblpLinks {
    Single(String),
    Multiple(Vec<String>),
}

impl DblpLinks {
    fn all(&self) -> Vec<&str> {
        match self {
            DblpLinks::Single(s) => vec![s],
            DblpLinks::Multiple(v) => v.iter().map(|s| s.as_str()).collect(),
        }
    }
}

impl From<DblpInfo> for Paper {
    fn from(info: DblpInfo) -> Self {
        let key = info.key.clone().unwrap_or_default();
        let title = info.title.map(|t| t.as_str().to_string()).unwrap_or_default();
        
        let mut paper = Paper::new("dblp", &key, &title);
        
        paper.year = info.year.and_then(|y| y.parse().ok());
        paper.venue = info.venue;
        paper.pages = info.pages;
        paper.volume = info.volume;
        paper.issue = info.number;
        
        // Determine if conference or journal based on type
        if let Some(ref pub_type) = info.pub_type {
            if pub_type.contains("Conference") || pub_type.contains("Proceedings") {
                paper.conference = paper.venue.clone();
            } else if pub_type.contains("Journal") {
                paper.journal = paper.venue.clone();
            }
        }
        
        // Parse authors
        if let Some(authors) = info.authors {
            if let Some(author_list) = authors.author {
                paper.authors = match author_list {
                    DblpAuthorList::Single(a) => vec![PaperAuthor {
                        name: a.name(),
                        author_id: a.pid(),
                        affiliation: None,
                        email: None,
                        orcid: None,
                    }],
                    DblpAuthorList::Multiple(list) => list.into_iter().map(|a| PaperAuthor {
                        name: a.name(),
                        author_id: a.pid(),
                        affiliation: None,
                        email: None,
                        orcid: None,
                    }).collect(),
                };
            }
        }
        
        paper.metadata.doi = info.doi;
        paper.metadata.dblp_key = Some(key);
        
        // Add URLs
        if let Some(links) = info.ee {
            for link in links.all() {
                let url_type = if link.contains(".pdf") || link.ends_with("/pdf") {
                    "pdf"
                } else if link.contains("doi.org") {
                    "abstract"
                } else {
                    "other"
                };
                
                paper.urls.push(PaperUrl {
                    url: link.to_string(),
                    url_type: url_type.to_string(),
                    source: "dblp".to_string(),
                    is_open_access: None,
                });
                
                if url_type == "pdf" && paper.pdf_url.is_none() {
                    paper.pdf_url = Some(link.to_string());
                }
            }
        }
        
        if let Some(url) = info.url {
            paper.urls.push(PaperUrl {
                url,
                url_type: "abstract".to_string(),
                source: "dblp".to_string(),
                is_open_access: None,
            });
        }
        
        paper
    }
}

#[async_trait]
impl AcademicProvider for DblpProvider {
    fn provider_id(&self) -> &str {
        "dblp"
    }
    
    fn info(&self) -> ProviderInfo {
        ProviderInfo {
            id: "dblp".to_string(),
            name: "DBLP".to_string(),
            description: "Computer science bibliography database".to_string(),
            base_url: DBLP_API_URL.to_string(),
            enabled: self.enabled,
            requires_api_key: false,
            has_api_key: false,
            features: ProviderFeatures {
                search: true,
                full_text: false,
                citations: false,
                references: false,
                pdf_download: false,
                open_access: false,
            },
        }
    }
    
    fn is_enabled(&self) -> bool {
        self.enabled
    }
    
    fn set_enabled(&mut self, enabled: bool) {
        self.enabled = enabled;
    }
    
    fn set_api_key(&mut self, _api_key: Option<String>) {
        // DBLP doesn't require an API key
    }
    
    async fn test_connection(&self) -> Result<bool, String> {
        let url = format!("{}/publ/api?q=test&h=1&format=json", DBLP_API_URL);
        
        match HTTP_CLIENT.get(&url).send().await {
            Ok(response) => Ok(response.status().is_success()),
            Err(e) => Err(format!("Connection test failed: {}", e)),
        }
    }
    
    async fn search(&self, query: &str, options: &SearchOptions) -> Result<SearchResult, String> {
        let start_time = std::time::Instant::now();
        
        let limit = options.limit.unwrap_or(20).min(1000);
        let offset = options.offset.unwrap_or(0);
        
        let url = format!(
            "{}/publ/api?q={}&h={}&f={}&format=json",
            DBLP_API_URL,
            urlencoding::encode(query),
            limit,
            offset
        );
        
        log::debug!("DBLP search URL: {}", url);
        
        let response = HTTP_CLIENT
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;
        
        if !response.status().is_success() {
            return Err(format!("API returned status: {}", response.status()));
        }
        
        let data: DblpSearchResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;
        
        let hits = data.result.and_then(|r| r.hits);
        
        let total: i32 = hits.as_ref()
            .and_then(|h| h.total.as_ref())
            .and_then(|t| t.parse().ok())
            .unwrap_or(0);
        
        let mut papers: Vec<Paper> = hits
            .and_then(|h| h.hit)
            .unwrap_or_default()
            .into_iter()
            .filter_map(|h| h.info.map(Paper::from))
            .collect();
        
        // Apply year filter post-search
        if let Some(year_from) = options.year_from {
            papers.retain(|p| p.year.map(|y| y >= year_from).unwrap_or(false));
        }
        if let Some(year_to) = options.year_to {
            papers.retain(|p| p.year.map(|y| y <= year_to).unwrap_or(false));
        }
        
        Ok(SearchResult {
            papers,
            total_results: total,
            has_more: (offset + limit) < total as u32,
            offset: offset as i32,
            provider: "dblp".to_string(),
            search_time_ms: start_time.elapsed().as_millis() as u64,
        })
    }
    
    async fn get_paper(&self, paper_id: &str) -> Result<Paper, String> {
        // DBLP uses keys like "journals/cacm/Knuth74"
        // We need to construct the info URL
        let url = format!("https://dblp.org/rec/{}.json", paper_id);
        
        let response = HTTP_CLIENT
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;
        
        if !response.status().is_success() {
            return Err(format!("Paper '{}' not found", paper_id));
        }
        
        // DBLP returns a different format for single records
        // We'll do a search by key instead
        let search_url = format!(
            "{}/publ/api?q=key:{}&h=1&format=json",
            DBLP_API_URL,
            urlencoding::encode(paper_id)
        );
        
        let response = HTTP_CLIENT
            .get(&search_url)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;
        
        if !response.status().is_success() {
            return Err(format!("API returned status: {}", response.status()));
        }
        
        let data: DblpSearchResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;
        
        data.result
            .and_then(|r| r.hits)
            .and_then(|h| h.hit)
            .and_then(|mut hits| hits.pop())
            .and_then(|h| h.info)
            .map(Paper::from)
            .ok_or_else(|| format!("Paper '{}' not found", paper_id))
    }
}
