//! OpenReview API v2 provider implementation
//!
//! API docs: https://docs.openreview.net/reference/api-v2

use super::AcademicProvider;
use crate::commands::academic::types::*;
use crate::http::create_proxy_client;
use async_trait::async_trait;
use chrono::Datelike;
use serde::Deserialize;
use serde_json::Value;
use std::collections::HashMap;

const OPENREVIEW_API_URL: &str = "https://api2.openreview.net";

pub struct OpenReviewProvider {
    enabled: bool,
    api_key: Option<String>,
}

impl OpenReviewProvider {
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

    fn parse_content_field(content: Option<&HashMap<String, Value>>, key: &str) -> Option<String> {
        let value = content?.get(key)?;
        match value {
            Value::String(text) => Some(text.trim().to_string()).filter(|v| !v.is_empty()),
            Value::Object(map) => map
                .get("value")
                .and_then(|v| v.as_str())
                .map(|v| v.trim().to_string())
                .filter(|v| !v.is_empty()),
            Value::Array(values) => values
                .iter()
                .find_map(|v| v.as_str().map(|s| s.trim().to_string()))
                .filter(|v| !v.is_empty()),
            _ => None,
        }
    }

    fn parse_content_authors(content: Option<&HashMap<String, Value>>) -> Vec<PaperAuthor> {
        let Some(value) = content.and_then(|c| c.get("authors")) else {
            return Vec::new();
        };

        match value {
            Value::Array(items) => items
                .iter()
                .filter_map(|item| match item {
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
                        .or_else(|| map.get("fullname").and_then(|v| v.as_str()))
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
                .collect(),
            _ => Vec::new(),
        }
    }

    fn timestamp_to_date(ts: Option<i64>) -> (Option<i32>, Option<String>) {
        let Some(timestamp) = ts else {
            return (None, None);
        };

        let date = chrono::DateTime::from_timestamp_millis(timestamp);
        match date {
            Some(dt) => (Some(dt.year()), Some(dt.to_rfc3339())),
            None => (None, None),
        }
    }
}

#[derive(Debug, Deserialize, Default)]
struct ORNotesResponse {
    #[serde(default)]
    notes: Vec<ORNote>,
    count: Option<i32>,
}

#[derive(Debug, Deserialize)]
struct ORNote {
    id: Option<String>,
    forum: Option<String>,
    invitation: Option<String>,
    cdate: Option<i64>,
    tcdate: Option<i64>,
    pdate: Option<i64>,
    content: Option<HashMap<String, Value>>,
}

impl From<ORNote> for Paper {
    fn from(note: ORNote) -> Self {
        let external_id = note
            .id
            .clone()
            .or(note.forum.clone())
            .unwrap_or_else(|| nanoid::nanoid!());

        let title = OpenReviewProvider::parse_content_field(note.content.as_ref(), "title")
            .unwrap_or_else(|| "Untitled OpenReview Note".to_string());
        let mut paper = Paper::new("openreview", &external_id, &title);

        paper.abstract_text =
            OpenReviewProvider::parse_content_field(note.content.as_ref(), "abstract");
        paper.authors = OpenReviewProvider::parse_content_authors(note.content.as_ref());

        let timestamp = note.pdate.or(note.tcdate).or(note.cdate);
        let (year, publication_date) = OpenReviewProvider::timestamp_to_date(timestamp);
        paper.year = year;
        paper.publication_date = publication_date;

        if let Some(invitation) = note.invitation {
            paper.venue = invitation.split("/-/").next().map(|v| v.to_string());
        }

        paper.metadata.doi = OpenReviewProvider::parse_content_field(note.content.as_ref(), "doi");

        let forum_id = note.forum.unwrap_or(external_id.clone());
        let abstract_url = format!("https://openreview.net/forum?id={}", forum_id);
        let pdf_url = format!("https://openreview.net/pdf?id={}", forum_id);

        paper.pdf_url = Some(pdf_url.clone());
        paper.open_access_url = Some(pdf_url.clone());
        paper.is_open_access = Some(true);
        paper.urls = vec![
            PaperUrl {
                url: abstract_url,
                url_type: "abstract".to_string(),
                source: "openreview".to_string(),
                is_open_access: Some(true),
            },
            PaperUrl {
                url: pdf_url,
                url_type: "pdf".to_string(),
                source: "openreview".to_string(),
                is_open_access: Some(true),
            },
        ];

        paper
    }
}

#[async_trait]
impl AcademicProvider for OpenReviewProvider {
    fn provider_id(&self) -> &str {
        "openreview"
    }

    fn info(&self) -> ProviderInfo {
        ProviderInfo {
            id: "openreview".to_string(),
            name: "OpenReview".to_string(),
            description: "Open peer review platform for scientific papers".to_string(),
            base_url: OPENREVIEW_API_URL.to_string(),
            enabled: self.enabled,
            requires_api_key: false,
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
        self.enabled
    }

    fn set_enabled(&mut self, enabled: bool) {
        self.enabled = enabled;
    }

    fn set_api_key(&mut self, api_key: Option<String>) {
        self.api_key = api_key;
    }

    async fn test_connection(&self) -> Result<bool, String> {
        let url = format!("{}/notes?limit=1", OPENREVIEW_API_URL);
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
        let limit = options.limit.unwrap_or(20).min(200);
        let offset = options.offset.unwrap_or(0);
        let encoded_query = urlencoding::encode(query);

        let url = format!(
            "{}/notes?limit={}&offset={}&content.title={}",
            OPENREVIEW_API_URL, limit, offset, encoded_query
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

        let data: ORNotesResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        let mut papers: Vec<Paper> = data.notes.into_iter().map(Paper::from).collect();

        if let Some(year_from) = options.year_from {
            papers.retain(|paper| paper.year.map(|year| year >= year_from).unwrap_or(false));
        }
        if let Some(year_to) = options.year_to {
            papers.retain(|paper| paper.year.map(|year| year <= year_to).unwrap_or(false));
        }

        let total = data.count.unwrap_or(papers.len() as i32);

        Ok(SearchResult {
            papers,
            total_results: total,
            has_more: (offset + limit) < total as u32,
            offset: offset as i32,
            provider: "openreview".to_string(),
            search_time_ms: start_time.elapsed().as_millis() as u64,
        })
    }

    async fn get_paper(&self, paper_id: &str) -> Result<Paper, String> {
        let url = format!(
            "{}/notes?id={}&limit=1",
            OPENREVIEW_API_URL,
            urlencoding::encode(paper_id)
        );

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

        let data: ORNotesResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        data.notes
            .into_iter()
            .next()
            .map(Paper::from)
            .ok_or_else(|| format!("Paper '{}' not found", paper_id))
    }
}
