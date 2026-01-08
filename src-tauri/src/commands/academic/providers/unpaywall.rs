//! Unpaywall API provider implementation
//! 
//! API Documentation: https://unpaywall.org/products/api
//! Note: Unpaywall is primarily used to find open access versions of papers by DOI

use super::AcademicProvider;
use crate::commands::academic::types::*;
use crate::http::HTTP_CLIENT;
use async_trait::async_trait;
use serde::Deserialize;

const UNPAYWALL_API_URL: &str = "https://api.unpaywall.org/v2";

pub struct UnpaywallProvider {
    enabled: bool,
    email: Option<String>, // Required for API access
}

impl UnpaywallProvider {
    pub fn new(email: Option<String>) -> Self {
        Self { enabled: true, email }
    }
}

#[derive(Debug, Deserialize)]
struct UnpaywallResponse {
    doi: Option<String>,
    title: Option<String>,
    year: Option<i32>,
    genre: Option<String>,
    is_oa: Option<bool>,
    journal_name: Option<String>,
    publisher: Option<String>,
    z_authors: Option<Vec<UnpaywallAuthor>>,
    best_oa_location: Option<UnpaywallLocation>,
    oa_locations: Option<Vec<UnpaywallLocation>>,
    first_oa_location: Option<UnpaywallLocation>,
    published_date: Option<String>,
}

#[derive(Debug, Deserialize)]
struct UnpaywallAuthor {
    given: Option<String>,
    family: Option<String>,
    #[serde(rename = "ORCID")]
    orcid: Option<String>,
}

#[derive(Debug, Deserialize)]
struct UnpaywallLocation {
    url: Option<String>,
    url_for_pdf: Option<String>,
    url_for_landing_page: Option<String>,
    evidence: Option<String>,
    license: Option<String>,
    version: Option<String>,
    host_type: Option<String>,
    is_best: Option<bool>,
    repository_institution: Option<String>,
}

impl From<UnpaywallResponse> for Paper {
    fn from(up: UnpaywallResponse) -> Self {
        let doi = up.doi.clone().unwrap_or_default();
        let mut paper = Paper::new("unpaywall", &doi, &up.title.unwrap_or_default());
        
        paper.year = up.year;
        paper.publication_date = up.published_date;
        paper.journal = up.journal_name;
        paper.venue = up.publisher;
        paper.is_open_access = up.is_oa;
        
        paper.metadata.doi = Some(doi);
        
        // Parse authors
        paper.authors = up.z_authors.unwrap_or_default().into_iter().map(|a| {
            let name = match (&a.given, &a.family) {
                (Some(given), Some(family)) => format!("{} {}", given, family),
                (Some(given), None) => given.clone(),
                (None, Some(family)) => family.clone(),
                (None, None) => String::new(),
            };
            PaperAuthor {
                name,
                author_id: None,
                affiliation: None,
                email: None,
                orcid: a.orcid,
            }
        }).collect();
        
        // Add OA locations
        let mut added_urls = std::collections::HashSet::new();
        
        // Best OA location first
        if let Some(loc) = up.best_oa_location {
            if let Some(pdf_url) = loc.url_for_pdf.or(loc.url) {
                if added_urls.insert(pdf_url.clone()) {
                    paper.pdf_url = Some(pdf_url.clone());
                    paper.open_access_url = Some(pdf_url.clone());
                    paper.urls.push(PaperUrl {
                        url: pdf_url,
                        url_type: "pdf".to_string(),
                        source: loc.host_type.unwrap_or_else(|| "unpaywall".to_string()),
                        is_open_access: Some(true),
                    });
                }
            }
            if let Some(landing_url) = loc.url_for_landing_page {
                if added_urls.insert(landing_url.clone()) {
                    paper.urls.push(PaperUrl {
                        url: landing_url,
                        url_type: "abstract".to_string(),
                        source: "unpaywall".to_string(),
                        is_open_access: Some(true),
                    });
                }
            }
        }
        
        // Add other OA locations
        if let Some(locations) = up.oa_locations {
            for loc in locations {
                if let Some(pdf_url) = loc.url_for_pdf.or(loc.url) {
                    if added_urls.insert(pdf_url.clone()) {
                        paper.urls.push(PaperUrl {
                            url: pdf_url,
                            url_type: "pdf".to_string(),
                            source: loc.host_type.unwrap_or_else(|| "unpaywall".to_string()),
                            is_open_access: Some(true),
                        });
                    }
                }
            }
        }
        
        paper
    }
}

#[async_trait]
impl AcademicProvider for UnpaywallProvider {
    fn provider_id(&self) -> &str {
        "unpaywall"
    }
    
    fn info(&self) -> ProviderInfo {
        ProviderInfo {
            id: "unpaywall".to_string(),
            name: "Unpaywall".to_string(),
            description: "Find free versions of research papers by DOI".to_string(),
            base_url: UNPAYWALL_API_URL.to_string(),
            enabled: self.enabled,
            requires_api_key: true, // Requires email
            has_api_key: self.email.is_some(),
            features: ProviderFeatures {
                search: false, // Unpaywall only works by DOI lookup
                full_text: false,
                citations: false,
                references: false,
                pdf_download: true,
                open_access: true,
            },
        }
    }
    
    fn is_enabled(&self) -> bool {
        self.enabled && self.email.is_some()
    }
    
    fn set_enabled(&mut self, enabled: bool) {
        self.enabled = enabled;
    }
    
    fn set_api_key(&mut self, email: Option<String>) {
        self.email = email;
    }
    
    async fn test_connection(&self) -> Result<bool, String> {
        let email = self.email.as_ref()
            .ok_or_else(|| "Email required for Unpaywall API".to_string())?;
        
        // Test with a known DOI
        let url = format!("{}/10.1038/nature12373?email={}", UNPAYWALL_API_URL, email);
        
        match HTTP_CLIENT.get(&url).send().await {
            Ok(response) => Ok(response.status().is_success()),
            Err(e) => Err(format!("Connection test failed: {}", e)),
        }
    }
    
    async fn search(&self, _query: &str, _options: &SearchOptions) -> Result<SearchResult, String> {
        // Unpaywall doesn't support search - it only works by DOI lookup
        Err("Unpaywall does not support search. Use get_paper with a DOI instead.".to_string())
    }
    
    async fn get_paper(&self, doi: &str) -> Result<Paper, String> {
        let email = self.email.as_ref()
            .ok_or_else(|| "Email required for Unpaywall API".to_string())?;
        
        // Clean DOI - remove URL prefix if present
        let clean_doi = doi
            .replace("https://doi.org/", "")
            .replace("http://doi.org/", "")
            .replace("doi:", "");
        
        let url = format!("{}/{}?email={}", UNPAYWALL_API_URL, clean_doi, email);
        
        log::debug!("Unpaywall lookup URL: {}", url);
        
        let response = HTTP_CLIENT
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;
        
        if response.status() == 404 {
            return Err(format!("DOI '{}' not found in Unpaywall", clean_doi));
        }
        
        if !response.status().is_success() {
            return Err(format!("API returned status: {}", response.status()));
        }
        
        let up_response: UnpaywallResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;
        
        Ok(Paper::from(up_response))
    }
}

/// Helper function to find open access PDF for a paper using Unpaywall
pub async fn find_open_access_pdf(doi: &str, email: &str) -> Result<Option<String>, String> {
    let provider = UnpaywallProvider::new(Some(email.to_string()));
    
    match provider.get_paper(doi).await {
        Ok(paper) => Ok(paper.pdf_url),
        Err(_) => Ok(None), // Paper not found or not open access
    }
}
