//! CORE API provider implementation
//!
//! API Documentation: https://api.core.ac.uk/docs/v3

use super::AcademicProvider;
use crate::commands::academic::types::*;
use crate::http::create_proxy_client;
use async_trait::async_trait;
use serde::Deserialize;

const CORE_API_URL: &str = "https://api.core.ac.uk/v3";

pub struct CoreProvider {
    enabled: bool,
    api_key: Option<String>,
}

impl CoreProvider {
    pub fn new(api_key: Option<String>) -> Self {
        Self {
            enabled: true,
            api_key,
        }
    }

    fn get_headers(&self) -> reqwest::header::HeaderMap {
        let mut headers = reqwest::header::HeaderMap::new();
        if let Some(ref key) = self.api_key {
            headers.insert("Authorization", format!("Bearer {}", key).parse().unwrap());
        }
        headers
    }
}

#[derive(Debug, Deserialize)]
struct CoreSearchResponse {
    #[serde(rename = "totalHits")]
    total_hits: Option<i32>,
    results: Option<Vec<CoreWork>>,
}

#[derive(Debug, Deserialize)]
struct CoreWork {
    id: Option<String>,
    title: Option<String>,
    #[serde(rename = "abstract")]
    abstract_text: Option<String>,
    #[serde(rename = "yearPublished")]
    year_published: Option<i32>,
    #[serde(rename = "publishedDate")]
    published_date: Option<String>,
    authors: Option<Vec<CoreAuthor>>,
    publisher: Option<String>,
    journals: Option<Vec<CoreJournal>>,
    #[serde(rename = "downloadUrl")]
    download_url: Option<String>,
    #[serde(rename = "fullText")]
    _full_text: Option<String>,
    doi: Option<String>,
    #[serde(rename = "arxivId")]
    arxiv_id: Option<String>,
    #[serde(rename = "magId")]
    mag_id: Option<String>,
    #[serde(rename = "oai")]
    _oai: Option<String>,
    #[serde(rename = "fieldOfStudy")]
    field_of_study: Option<String>,
    subjects: Option<Vec<String>>,
    #[serde(rename = "language")]
    _language: Option<CoreLanguage>,
    #[serde(rename = "citationCount")]
    citation_count: Option<i32>,
}

#[derive(Debug, Deserialize)]
struct CoreAuthor {
    name: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CoreJournal {
    title: Option<String>,
    #[serde(rename = "identifiers")]
    _identifiers: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
struct CoreLanguage {
    #[serde(rename = "code")]
    _code: Option<String>,
    #[serde(rename = "name")]
    _name: Option<String>,
}

impl From<CoreWork> for Paper {
    fn from(core: CoreWork) -> Self {
        let work_id = core.id.clone().unwrap_or_default();
        let mut paper = Paper::new("core", &work_id, &core.title.unwrap_or_default());

        paper.abstract_text = core.abstract_text;
        paper.year = core.year_published;
        paper.publication_date = core.published_date;
        paper.venue = core.publisher;

        if let Some(journals) = core.journals {
            if let Some(first_journal) = journals.first() {
                paper.journal = first_journal.title.clone();
            }
        }

        paper.authors = core
            .authors
            .unwrap_or_default()
            .into_iter()
            .map(|a| PaperAuthor {
                name: a.name.unwrap_or_default(),
                author_id: None,
                affiliation: None,
                email: None,
                orcid: None,
            })
            .collect();

        paper.metadata.doi = core.doi;
        paper.metadata.arxiv_id = core.arxiv_id;
        paper.metadata.mag_id = core.mag_id;
        paper.metadata.core_id = Some(work_id);

        paper.citation_count = core.citation_count;

        if let Some(field) = core.field_of_study {
            paper.fields_of_study = Some(vec![field]);
        }

        paper.categories = core.subjects;

        if let Some(url) = core.download_url {
            paper.pdf_url = Some(url.clone());
            paper.open_access_url = Some(url.clone());
            paper.is_open_access = Some(true);
            paper.urls.push(PaperUrl {
                url,
                url_type: "pdf".to_string(),
                source: "core".to_string(),
                is_open_access: Some(true),
            });
        }

        paper
    }
}

#[async_trait]
impl AcademicProvider for CoreProvider {
    fn provider_id(&self) -> &str {
        "core"
    }

    fn info(&self) -> ProviderInfo {
        ProviderInfo {
            id: "core".to_string(),
            name: "CORE".to_string(),
            description: "World's largest collection of open access research papers".to_string(),
            base_url: CORE_API_URL.to_string(),
            enabled: self.enabled,
            requires_api_key: true,
            has_api_key: self.api_key.is_some(),
            features: ProviderFeatures {
                search: true,
                full_text: true,
                citations: false,
                references: false,
                pdf_download: true,
                open_access: true,
            },
        }
    }

    fn is_enabled(&self) -> bool {
        self.enabled && self.api_key.is_some()
    }

    fn set_enabled(&mut self, enabled: bool) {
        self.enabled = enabled;
    }

    fn set_api_key(&mut self, api_key: Option<String>) {
        self.api_key = api_key;
    }

    async fn test_connection(&self) -> Result<bool, String> {
        if self.api_key.is_none() {
            return Err("API key required for CORE".to_string());
        }

        let url = format!("{}/search/works?q=test&limit=1", CORE_API_URL);

        match create_proxy_client()
            .map_err(|e| format!("HTTP client error: {}", e))?
            .get(&url)
            .headers(self.get_headers())
            .send()
            .await
        {
            Ok(response) => Ok(response.status().is_success()),
            Err(e) => Err(format!("Connection test failed: {}", e)),
        }
    }

    async fn search(&self, query: &str, options: &SearchOptions) -> Result<SearchResult, String> {
        if self.api_key.is_none() {
            return Err("API key required for CORE".to_string());
        }

        let start_time = std::time::Instant::now();

        let limit = options.limit.unwrap_or(20).min(100);
        let offset = options.offset.unwrap_or(0);

        let mut url = format!(
            "{}/search/works?q={}&limit={}&offset={}",
            CORE_API_URL,
            urlencoding::encode(query),
            limit,
            offset
        );

        // Add year filter
        if let Some(year_from) = options.year_from {
            url.push_str(&format!("&yearFrom={}", year_from));
        }
        if let Some(year_to) = options.year_to {
            url.push_str(&format!("&yearTo={}", year_to));
        }

        log::debug!("CORE search URL: {}", url);

        let response = create_proxy_client()
            .map_err(|e| format!("HTTP client error: {}", e))?
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

        let data: CoreSearchResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        let papers: Vec<Paper> = data
            .results
            .unwrap_or_default()
            .into_iter()
            .map(Paper::from)
            .collect();

        let total = data.total_hits.unwrap_or(papers.len() as i32);

        Ok(SearchResult {
            papers,
            total_results: total,
            has_more: (offset + limit) < total as u32,
            offset: offset as i32,
            provider: "core".to_string(),
            search_time_ms: start_time.elapsed().as_millis() as u64,
        })
    }

    async fn get_paper(&self, paper_id: &str) -> Result<Paper, String> {
        if self.api_key.is_none() {
            return Err("API key required for CORE".to_string());
        }

        let url = format!("{}/works/{}", CORE_API_URL, paper_id);

        let response = create_proxy_client()
            .map_err(|e| format!("HTTP client error: {}", e))?
            .get(&url)
            .headers(self.get_headers())
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("API returned status: {}", response.status()));
        }

        let core_work: CoreWork = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        Ok(Paper::from(core_work))
    }
}
