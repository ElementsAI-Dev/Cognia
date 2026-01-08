//! arXiv API provider implementation
//! 
//! API Documentation: https://info.arxiv.org/help/api/user-manual.html

use super::AcademicProvider;
use crate::commands::academic::types::*;
use crate::http::HTTP_CLIENT;
use async_trait::async_trait;
use quick_xml::events::Event;
use quick_xml::Reader;

const ARXIV_API_URL: &str = "http://export.arxiv.org/api/query";

pub struct ArxivProvider {
    enabled: bool,
}

impl ArxivProvider {
    pub fn new() -> Self {
        Self { enabled: true }
    }
    
    fn parse_atom_feed(&self, xml: &str) -> Result<Vec<Paper>, String> {
        let mut reader = Reader::from_str(xml);
        reader.trim_text(true);
        
        let mut papers = Vec::new();
        let mut current_paper: Option<Paper> = None;
        let mut current_tag = String::new();
        let mut current_author = String::new();
        let mut in_entry = false;
        let mut authors: Vec<PaperAuthor> = Vec::new();
        let mut categories: Vec<String> = Vec::new();
        let mut links: Vec<PaperUrl> = Vec::new();
        
        let mut buf = Vec::new();
        
        loop {
            match reader.read_event_into(&mut buf) {
                Ok(Event::Start(ref e)) => {
                    let tag_name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                    current_tag = tag_name.clone();
                    
                    match tag_name.as_str() {
                        "entry" => {
                            in_entry = true;
                            current_paper = Some(Paper::new("arxiv", "", ""));
                            authors.clear();
                            categories.clear();
                            links.clear();
                        }
                        "link" if in_entry => {
                            let mut href = String::new();
                            let mut link_type = String::new();
                            let mut title = String::new();
                            
                            for attr in e.attributes().flatten() {
                                match attr.key.as_ref() {
                                    b"href" => href = String::from_utf8_lossy(&attr.value).to_string(),
                                    b"type" => link_type = String::from_utf8_lossy(&attr.value).to_string(),
                                    b"title" => title = String::from_utf8_lossy(&attr.value).to_string(),
                                    _ => {}
                                }
                            }
                            
                            if !href.is_empty() {
                                let url_type = if title == "pdf" || href.contains("/pdf/") {
                                    "pdf"
                                } else if link_type.contains("html") {
                                    "html"
                                } else {
                                    "abstract"
                                };
                                
                                links.push(PaperUrl {
                                    url: href.clone(),
                                    url_type: url_type.to_string(),
                                    source: "arxiv".to_string(),
                                    is_open_access: Some(true),
                                });
                                
                                if url_type == "pdf" {
                                    if let Some(ref mut paper) = current_paper {
                                        paper.pdf_url = Some(href);
                                    }
                                }
                            }
                        }
                        "category" if in_entry => {
                            for attr in e.attributes().flatten() {
                                if attr.key.as_ref() == b"term" {
                                    categories.push(String::from_utf8_lossy(&attr.value).to_string());
                                }
                            }
                        }
                        _ => {}
                    }
                }
                Ok(Event::End(ref e)) => {
                    let tag_name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                    
                    match tag_name.as_str() {
                        "entry" => {
                            if let Some(mut paper) = current_paper.take() {
                                paper.authors = authors.clone();
                                paper.categories = if categories.is_empty() { None } else { Some(categories.clone()) };
                                paper.urls = links.clone();
                                paper.is_open_access = Some(true);
                                papers.push(paper);
                            }
                            in_entry = false;
                        }
                        "author" if in_entry => {
                            if !current_author.is_empty() {
                                authors.push(PaperAuthor {
                                    name: current_author.clone(),
                                    author_id: None,
                                    affiliation: None,
                                    email: None,
                                    orcid: None,
                                });
                                current_author.clear();
                            }
                        }
                        _ => {}
                    }
                    current_tag.clear();
                }
                Ok(Event::Text(ref e)) => {
                    let text = e.unescape().unwrap_or_default().trim().to_string();
                    if text.is_empty() || !in_entry {
                        continue;
                    }
                    
                    if let Some(ref mut paper) = current_paper {
                        match current_tag.as_str() {
                            "id" => {
                                // Extract arxiv ID from URL
                                let arxiv_id = text
                                    .replace("http://arxiv.org/abs/", "")
                                    .replace("https://arxiv.org/abs/", "");
                                paper.external_id = arxiv_id.clone();
                                paper.id = format!("arxiv_{}", arxiv_id);
                                paper.metadata.arxiv_id = Some(arxiv_id);
                            }
                            "title" => paper.title = text.replace('\n', " ").trim().to_string(),
                            "summary" => paper.abstract_text = Some(text.replace('\n', " ").trim().to_string()),
                            "published" => {
                                paper.publication_date = Some(text.clone());
                                if let Some(year_str) = text.get(0..4) {
                                    paper.year = year_str.parse().ok();
                                }
                            }
                            "updated" => paper.updated_at = text,
                            "name" => current_author = text,
                            "arxiv:comment" => {
                                // Parse page count from comments like "10 pages, 5 figures"
                                if text.contains("pages") {
                                    if let Some(pages) = text.split_whitespace().next() {
                                        paper.pages = Some(pages.to_string());
                                    }
                                }
                            }
                            "arxiv:journal_ref" => paper.journal = Some(text),
                            "arxiv:doi" => paper.metadata.doi = Some(text),
                            _ => {}
                        }
                    }
                }
                Ok(Event::Eof) => break,
                Err(e) => return Err(format!("XML parsing error: {}", e)),
                _ => {}
            }
            buf.clear();
        }
        
        Ok(papers)
    }
}

impl Default for ArxivProvider {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl AcademicProvider for ArxivProvider {
    fn provider_id(&self) -> &str {
        "arxiv"
    }
    
    fn info(&self) -> ProviderInfo {
        ProviderInfo {
            id: "arxiv".to_string(),
            name: "arXiv".to_string(),
            description: "Open-access archive for scholarly articles in physics, mathematics, CS, and more".to_string(),
            base_url: ARXIV_API_URL.to_string(),
            enabled: self.enabled,
            requires_api_key: false,
            has_api_key: false,
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
        self.enabled
    }
    
    fn set_enabled(&mut self, enabled: bool) {
        self.enabled = enabled;
    }
    
    fn set_api_key(&mut self, _api_key: Option<String>) {
        // arXiv doesn't require an API key
    }
    
    async fn test_connection(&self) -> Result<bool, String> {
        let url = format!("{}?search_query=all:test&max_results=1", ARXIV_API_URL);
        
        match HTTP_CLIENT.get(&url).send().await {
            Ok(response) => Ok(response.status().is_success()),
            Err(e) => Err(format!("Connection test failed: {}", e)),
        }
    }
    
    async fn search(&self, query: &str, options: &SearchOptions) -> Result<SearchResult, String> {
        let start_time = std::time::Instant::now();
        
        // Build search query
        let mut search_query = String::new();
        
        // Main query
        if !query.is_empty() {
            search_query.push_str(&format!("all:{}", urlencoding::encode(query)));
        }
        
        // Author filter
        if let Some(ref authors) = options.authors {
            for author in authors {
                if !search_query.is_empty() {
                    search_query.push_str("+AND+");
                }
                search_query.push_str(&format!("au:{}", urlencoding::encode(author)));
            }
        }
        
        // Category filter
        if let Some(ref categories) = options.categories {
            for cat in categories {
                if !search_query.is_empty() {
                    search_query.push_str("+AND+");
                }
                search_query.push_str(&format!("cat:{}", urlencoding::encode(cat)));
            }
        }
        
        let limit = options.limit.unwrap_or(20).min(100);
        let offset = options.offset.unwrap_or(0);
        
        // Build sort parameters
        let sort_by = match options.sort_by.as_str() {
            "date" => "submittedDate",
            "relevance" => "relevance",
            _ => "relevance",
        };
        let sort_order = match options.sort_order.as_str() {
            "asc" => "ascending",
            _ => "descending",
        };
        
        let url = format!(
            "{}?search_query={}&start={}&max_results={}&sortBy={}&sortOrder={}",
            ARXIV_API_URL, search_query, offset, limit, sort_by, sort_order
        );
        
        log::debug!("arXiv search URL: {}", url);
        
        let response = HTTP_CLIENT
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;
        
        if !response.status().is_success() {
            return Err(format!("API returned status: {}", response.status()));
        }
        
        let xml = response
            .text()
            .await
            .map_err(|e| format!("Failed to read response: {}", e))?;
        
        let mut papers = self.parse_atom_feed(&xml)?;
        
        // Apply year filter post-search (arXiv API doesn't support year range)
        if let Some(year_from) = options.year_from {
            papers.retain(|p| p.year.map(|y| y >= year_from).unwrap_or(false));
        }
        if let Some(year_to) = options.year_to {
            papers.retain(|p| p.year.map(|y| y <= year_to).unwrap_or(false));
        }
        
        let total = papers.len() as i32;
        
        Ok(SearchResult {
            papers,
            total_results: total,
            has_more: total >= limit as i32,
            offset: offset as i32,
            provider: "arxiv".to_string(),
            search_time_ms: start_time.elapsed().as_millis() as u64,
        })
    }
    
    async fn get_paper(&self, paper_id: &str) -> Result<Paper, String> {
        let url = format!("{}?id_list={}", ARXIV_API_URL, paper_id);
        
        let response = HTTP_CLIENT
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;
        
        if !response.status().is_success() {
            return Err(format!("API returned status: {}", response.status()));
        }
        
        let xml = response
            .text()
            .await
            .map_err(|e| format!("Failed to read response: {}", e))?;
        
        let papers = self.parse_atom_feed(&xml)?;
        
        papers.into_iter()
            .next()
            .ok_or_else(|| format!("Paper '{}' not found", paper_id))
    }
}
