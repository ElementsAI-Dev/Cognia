//! Hugging Face Papers API provider implementation
//!
//! API docs: https://huggingface.co/.well-known/openapi.json

use super::AcademicProvider;
use crate::commands::academic::types::*;
use crate::http::create_proxy_client;
use async_trait::async_trait;
use chrono::Datelike;
use serde_json::Value;

const HF_PAPERS_API_URL: &str = "https://huggingface.co/api/papers";

pub struct HuggingFacePapersProvider {
    enabled: bool,
    api_key: Option<String>,
}

impl HuggingFacePapersProvider {
    pub fn new(api_key: Option<String>) -> Self {
        Self {
            enabled: true,
            api_key,
        }
    }

    fn get_headers(&self) -> reqwest::header::HeaderMap {
        let mut headers = reqwest::header::HeaderMap::new();
        headers.insert("Accept", "application/json".parse().unwrap());
        if let Some(ref key) = self.api_key {
            headers.insert("Authorization", format!("Bearer {}", key).parse().unwrap());
        }
        headers
    }

    fn parse_authors(value: Option<&Value>) -> Vec<PaperAuthor> {
        let Some(Value::Array(authors)) = value else {
            return Vec::new();
        };

        authors
            .iter()
            .filter_map(|author| match author {
                Value::String(name) => {
                    let trimmed = name.trim();
                    if trimmed.is_empty() {
                        None
                    } else {
                        Some(PaperAuthor {
                            name: trimmed.to_string(),
                            author_id: None,
                            affiliation: None,
                            email: None,
                            orcid: None,
                        })
                    }
                }
                Value::Object(map) => map
                    .get("name")
                    .and_then(|v| v.as_str())
                    .or_else(|| map.get("displayName").and_then(|v| v.as_str()))
                    .map(|name| name.trim().to_string())
                    .filter(|name| !name.is_empty())
                    .map(|name| PaperAuthor {
                        name,
                        author_id: None,
                        affiliation: None,
                        email: None,
                        orcid: None,
                    }),
                _ => None,
            })
            .collect()
    }

    fn parse_timestamp_millis(value: Option<&Value>) -> (Option<i32>, Option<String>) {
        let Some(value) = value else {
            return (None, None);
        };

        match value {
            Value::String(text) => {
                if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(text) {
                    let utc_dt = dt.with_timezone(&chrono::Utc);
                    return (Some(utc_dt.year()), Some(utc_dt.to_rfc3339()));
                }

                if let Some(prefix) = text.get(0..4).and_then(|v| v.parse::<i32>().ok()) {
                    return (Some(prefix), None);
                }

                (None, None)
            }
            Value::Number(number) => {
                if let Some(raw) = number.as_i64() {
                    let millis = if raw > 10_000_000_000 {
                        raw
                    } else {
                        raw * 1000
                    };
                    if let Some(dt) = chrono::DateTime::from_timestamp_millis(millis) {
                        return (Some(dt.year()), Some(dt.to_rfc3339()));
                    }
                }
                (None, None)
            }
            _ => (None, None),
        }
    }

    fn parse_paper(item: &Value) -> Option<Paper> {
        let object = item.as_object()?;
        let title = object
            .get("title")
            .and_then(|v| v.as_str())
            .map(|v| v.trim().to_string())
            .filter(|v| !v.is_empty())?;

        let external_id = object
            .get("id")
            .and_then(|v| v.as_str())
            .or_else(|| object.get("paperId").and_then(|v| v.as_str()))
            .or_else(|| object.get("arxivId").and_then(|v| v.as_str()))
            .map(|v| v.to_string())
            .unwrap_or_else(|| nanoid::nanoid!());

        let mut paper = Paper::new("huggingface-papers", &external_id, &title);
        paper.abstract_text = object
            .get("summary")
            .and_then(|v| v.as_str())
            .or_else(|| object.get("abstract").and_then(|v| v.as_str()))
            .map(|v| v.trim().to_string())
            .filter(|v| !v.is_empty());

        paper.authors = Self::parse_authors(object.get("authors"));
        let (year, publication_date) = Self::parse_timestamp_millis(
            object
                .get("publishedAt")
                .or_else(|| object.get("published_at"))
                .or_else(|| object.get("date")),
        );
        paper.year = year;
        paper.publication_date = publication_date;

        paper.citation_count = object
            .get("citationCount")
            .and_then(|v| v.as_i64())
            .map(|v| v as i32)
            .or_else(|| {
                object
                    .get("citations")
                    .and_then(|v| v.as_i64())
                    .map(|v| v as i32)
            });

        let arxiv_id = object
            .get("arxivId")
            .and_then(|v| v.as_str())
            .map(|v| v.trim().to_string())
            .filter(|v| !v.is_empty());
        if let Some(ref id) = arxiv_id {
            paper.metadata.arxiv_id = Some(id.clone());
        }

        paper.metadata.doi = object
            .get("doi")
            .and_then(|v| v.as_str())
            .map(|v| v.to_string());

        let abstract_url = object
            .get("url")
            .and_then(|v| v.as_str())
            .map(|v| v.to_string())
            .or_else(|| {
                arxiv_id
                    .as_ref()
                    .map(|id| format!("https://arxiv.org/abs/{}", id))
            });
        let pdf_url = object
            .get("pdfUrl")
            .and_then(|v| v.as_str())
            .or_else(|| object.get("pdf_url").and_then(|v| v.as_str()))
            .map(|v| v.to_string())
            .or_else(|| {
                arxiv_id
                    .as_ref()
                    .map(|id| format!("https://arxiv.org/pdf/{}.pdf", id))
            });

        let mut urls = Vec::new();
        if let Some(url) = abstract_url {
            urls.push(PaperUrl {
                url,
                url_type: "abstract".to_string(),
                source: "huggingface-papers".to_string(),
                is_open_access: Some(true),
            });
        }
        if let Some(ref url) = pdf_url {
            urls.push(PaperUrl {
                url: url.clone(),
                url_type: "pdf".to_string(),
                source: "huggingface-papers".to_string(),
                is_open_access: Some(true),
            });
        }
        paper.urls = urls;
        paper.pdf_url = pdf_url.clone();
        paper.open_access_url = pdf_url;
        paper.is_open_access = Some(true);

        Some(paper)
    }

    fn extract_papers_and_total(value: Value) -> (Vec<Paper>, i32) {
        match value {
            Value::Array(items) => {
                let papers: Vec<Paper> = items.iter().filter_map(Self::parse_paper).collect();
                (papers.clone(), papers.len() as i32)
            }
            Value::Object(map) => {
                let papers_value = map
                    .get("papers")
                    .or_else(|| map.get("results"))
                    .or_else(|| map.get("items"));
                let papers = papers_value
                    .and_then(|v| v.as_array())
                    .map(|items| {
                        items
                            .iter()
                            .filter_map(Self::parse_paper)
                            .collect::<Vec<_>>()
                    })
                    .unwrap_or_default();

                let total = map
                    .get("total")
                    .or_else(|| map.get("count"))
                    .or_else(|| map.get("numTotalResults"))
                    .and_then(|v| v.as_i64())
                    .map(|v| v as i32)
                    .unwrap_or(papers.len() as i32);
                (papers, total)
            }
            _ => (Vec::new(), 0),
        }
    }
}

#[async_trait]
impl AcademicProvider for HuggingFacePapersProvider {
    fn provider_id(&self) -> &str {
        "huggingface-papers"
    }

    fn info(&self) -> ProviderInfo {
        ProviderInfo {
            id: "huggingface-papers".to_string(),
            name: "Hugging Face Papers".to_string(),
            description: "AI/ML papers curated by Hugging Face community".to_string(),
            base_url: HF_PAPERS_API_URL.to_string(),
            enabled: self.enabled,
            requires_api_key: false,
            has_api_key: self.api_key.is_some(),
            features: ProviderFeatures {
                search: true,
                full_text: false,
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

    fn set_api_key(&mut self, api_key: Option<String>) {
        self.api_key = api_key;
    }

    async fn test_connection(&self) -> Result<bool, String> {
        let url = format!("{}/search?q=transformer&limit=1", HF_PAPERS_API_URL);
        let response = create_proxy_client()
            .map_err(|e| format!("HTTP client error: {}", e))?
            .get(&url)
            .headers(self.get_headers())
            .send()
            .await
            .map_err(|e| format!("Connection test failed: {}", e))?;
        Ok(response.status().is_success())
    }

    async fn search(&self, query: &str, options: &SearchOptions) -> Result<SearchResult, String> {
        let start_time = std::time::Instant::now();
        let limit = options.limit.unwrap_or(20).clamp(1, 120);
        let offset = options.offset.unwrap_or(0);
        let url = format!(
            "{}/search?q={}&limit={}",
            HF_PAPERS_API_URL,
            urlencoding::encode(query),
            limit
        );

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

        let value: Value = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;
        let (mut papers, mut total) = Self::extract_papers_and_total(value);

        if offset > 0 {
            papers = papers.into_iter().skip(offset as usize).collect();
        }

        if let Some(year_from) = options.year_from {
            papers.retain(|paper| paper.year.map(|year| year >= year_from).unwrap_or(false));
        }
        if let Some(year_to) = options.year_to {
            papers.retain(|paper| paper.year.map(|year| year <= year_to).unwrap_or(false));
        }
        if options.open_access_only.unwrap_or(false) {
            papers.retain(|paper| paper.is_open_access.unwrap_or(false));
        }

        total = total.max(papers.len() as i32);

        Ok(SearchResult {
            papers,
            total_results: total,
            has_more: (offset + limit) < total as u32,
            offset: offset as i32,
            provider: "huggingface-papers".to_string(),
            search_time_ms: start_time.elapsed().as_millis() as u64,
        })
    }

    async fn get_paper(&self, paper_id: &str) -> Result<Paper, String> {
        let search_options = SearchOptions {
            limit: Some(30),
            offset: Some(0),
            ..SearchOptions::default()
        };
        let search_result = self.search(paper_id, &search_options).await?;

        search_result
            .papers
            .into_iter()
            .find(|paper| {
                paper.external_id == paper_id
                    || paper.metadata.arxiv_id.as_deref() == Some(paper_id)
                    || paper.id == paper_id
            })
            .ok_or_else(|| format!("Paper '{}' not found", paper_id))
    }
}
