//! OpenAlex API provider implementation
//!
//! API Documentation: https://docs.openalex.org

use super::AcademicProvider;
use crate::commands::academic::types::*;
use crate::http::create_proxy_client;
use async_trait::async_trait;
use serde::Deserialize;

const OPENALEX_API_URL: &str = "https://api.openalex.org";

pub struct OpenAlexProvider {
    enabled: bool,
    api_key: Option<String>,
}

impl OpenAlexProvider {
    pub fn new(api_key: Option<String>) -> Self {
        Self {
            enabled: true,
            api_key,
        }
    }

    fn build_url(&self, path: &str) -> String {
        let mut url = format!("{}{}", OPENALEX_API_URL, path);
        if let Some(ref api_key) = self.api_key {
            if url.contains('?') {
                url.push_str(&format!("&api_key={}", api_key));
            } else {
                url.push_str(&format!("?api_key={}", api_key));
            }
        }
        url
    }
}

#[derive(Debug, Deserialize)]
struct OASearchResponse {
    meta: Option<OAMeta>,
    results: Option<Vec<OAWork>>,
}

#[derive(Debug, Deserialize)]
struct OAMeta {
    count: Option<i32>,
    #[serde(rename = "per_page")]
    _per_page: Option<i32>,
    #[serde(rename = "page")]
    _page: Option<i32>,
}

#[derive(Debug, Deserialize)]
struct OAWork {
    id: Option<String>,
    title: Option<String>,
    #[serde(rename = "abstract_inverted_index")]
    abstract_inverted_index: Option<std::collections::HashMap<String, Vec<i32>>>,
    publication_year: Option<i32>,
    publication_date: Option<String>,
    #[serde(rename = "primary_location")]
    primary_location: Option<OALocation>,
    #[serde(rename = "best_oa_location")]
    best_oa_location: Option<OALocation>,
    authorships: Option<Vec<OAAuthorship>>,
    doi: Option<String>,
    ids: Option<OAIds>,
    #[serde(rename = "cited_by_count")]
    cited_by_count: Option<i32>,
    #[serde(rename = "referenced_works_count")]
    referenced_works_count: Option<i32>,
    #[serde(rename = "is_oa")]
    is_oa: Option<bool>,
    concepts: Option<Vec<OAConcept>>,
    keywords: Option<Vec<OAKeyword>>,
}

#[derive(Debug, Deserialize)]
struct OALocation {
    source: Option<OASource>,
    pdf_url: Option<String>,
    landing_page_url: Option<String>,
    is_oa: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct OASource {
    display_name: Option<String>,
    #[serde(rename = "type")]
    source_type: Option<String>,
    #[serde(rename = "issn_l")]
    _issn_l: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OAAuthorship {
    author: Option<OAAuthor>,
    institutions: Option<Vec<OAInstitution>>,
}

#[derive(Debug, Deserialize, Default)]
struct OAAuthor {
    id: Option<String>,
    display_name: Option<String>,
    orcid: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OAInstitution {
    display_name: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OAIds {
    openalex: Option<String>,
    doi: Option<String>,
    mag: Option<String>,
    pmid: Option<String>,
    pmcid: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OAConcept {
    display_name: Option<String>,
    level: Option<i32>,
}

#[derive(Debug, Deserialize)]
struct OAKeyword {
    keyword: Option<String>,
}

impl OAWork {
    fn reconstruct_abstract(&self) -> Option<String> {
        let inverted = self.abstract_inverted_index.as_ref()?;
        if inverted.is_empty() {
            return None;
        }

        // Find max position
        let max_pos = inverted
            .values()
            .flat_map(|positions| positions.iter())
            .max()
            .copied()
            .unwrap_or(0);

        let mut words: Vec<Option<&str>> = vec![None; (max_pos + 1) as usize];

        for (word, positions) in inverted {
            for &pos in positions {
                if (pos as usize) < words.len() {
                    words[pos as usize] = Some(word.as_str());
                }
            }
        }

        let abstract_text: String = words
            .iter()
            .filter_map(|w| *w)
            .collect::<Vec<_>>()
            .join(" ");

        if abstract_text.is_empty() {
            None
        } else {
            Some(abstract_text)
        }
    }
}

impl From<OAWork> for Paper {
    fn from(oa: OAWork) -> Self {
        let work_id = oa
            .id
            .clone()
            .map(|id| id.replace("https://openalex.org/", ""))
            .unwrap_or_default();

        let mut paper = Paper::new("openalex", &work_id, &oa.title.clone().unwrap_or_default());

        paper.abstract_text = oa.reconstruct_abstract();
        paper.year = oa.publication_year;
        paper.publication_date = oa.publication_date;

        // Get venue from primary location
        if let Some(ref loc) = oa.primary_location {
            if let Some(ref source) = loc.source {
                paper.venue = source.display_name.clone();
                if source.source_type.as_deref() == Some("journal") {
                    paper.journal = source.display_name.clone();
                } else if source.source_type.as_deref() == Some("conference") {
                    paper.conference = source.display_name.clone();
                }
            }
        }

        paper.authors = oa
            .authorships
            .unwrap_or_default()
            .into_iter()
            .map(|a| {
                let author = a.author.unwrap_or_default();
                let affiliation = a
                    .institutions
                    .and_then(|insts| insts.first().and_then(|i| i.display_name.clone()));

                PaperAuthor {
                    name: author.display_name.unwrap_or_default(),
                    author_id: author.id.map(|id| id.replace("https://openalex.org/", "")),
                    affiliation,
                    email: None,
                    orcid: author.orcid,
                }
            })
            .collect();

        // Set IDs
        if let Some(ids) = oa.ids {
            paper.metadata.doi = ids.doi.or(oa.doi);
            paper.metadata.open_alex_id = ids
                .openalex
                .map(|id| id.replace("https://openalex.org/", ""));
            paper.metadata.mag_id = ids.mag;
            paper.metadata.pmid = ids.pmid;
            paper.metadata.pmcid = ids.pmcid;
        } else if let Some(doi) = oa.doi {
            paper.metadata.doi = Some(doi);
        }

        paper.citation_count = oa.cited_by_count;
        paper.reference_count = oa.referenced_works_count;
        paper.is_open_access = oa.is_oa;

        // Extract fields of study from concepts
        if let Some(concepts) = oa.concepts {
            let fields: Vec<String> = concepts
                .into_iter()
                .filter(|c| c.level.unwrap_or(0) <= 1) // Top-level concepts
                .filter_map(|c| c.display_name)
                .collect();
            if !fields.is_empty() {
                paper.fields_of_study = Some(fields);
            }
        }

        // Extract keywords
        if let Some(keywords) = oa.keywords {
            let kws: Vec<String> = keywords.into_iter().filter_map(|k| k.keyword).collect();
            if !kws.is_empty() {
                paper.keywords = Some(kws);
            }
        }

        // Get PDF URL from best OA location
        if let Some(loc) = oa.best_oa_location {
            if let Some(pdf_url) = loc.pdf_url {
                paper.pdf_url = Some(pdf_url.clone());
                paper.open_access_url = Some(pdf_url.clone());
                paper.urls.push(PaperUrl {
                    url: pdf_url,
                    url_type: "pdf".to_string(),
                    source: "openalex".to_string(),
                    is_open_access: Some(true),
                });
            }
            if let Some(landing_url) = loc.landing_page_url {
                paper.urls.push(PaperUrl {
                    url: landing_url,
                    url_type: "abstract".to_string(),
                    source: "openalex".to_string(),
                    is_open_access: loc.is_oa,
                });
            }
        }

        paper
    }
}

#[async_trait]
impl AcademicProvider for OpenAlexProvider {
    fn provider_id(&self) -> &str {
        "openalex"
    }

    fn info(&self) -> ProviderInfo {
        ProviderInfo {
            id: "openalex".to_string(),
            name: "OpenAlex".to_string(),
            description: "Open catalog of scholarly papers, authors, and institutions".to_string(),
            base_url: OPENALEX_API_URL.to_string(),
            enabled: self.enabled,
            requires_api_key: true,
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
        if self.api_key.is_none() {
            return Err("OpenAlex API key is required".to_string());
        }

        let url = self.build_url("/works?search=test&per_page=1");

        match create_proxy_client()
            .map_err(|e| format!("HTTP client error: {}", e))?
            .get(&url)
            .send()
            .await
        {
            Ok(response) => Ok(response.status().is_success()),
            Err(e) => Err(format!("Connection test failed: {}", e)),
        }
    }

    async fn search(&self, query: &str, options: &SearchOptions) -> Result<SearchResult, String> {
        if self.api_key.is_none() {
            return Err("OpenAlex API key is required".to_string());
        }

        let start_time = std::time::Instant::now();

        let limit = options.limit.unwrap_or(20).min(200);
        let page = (options.offset.unwrap_or(0) / limit) + 1;

        let mut filters = Vec::new();

        // Year filter
        if let Some(year_from) = options.year_from {
            filters.push(format!("publication_year:>={}", year_from));
        }
        if let Some(year_to) = options.year_to {
            filters.push(format!("publication_year:<={}", year_to));
        }

        // Open access filter
        if options.open_access_only.unwrap_or(false) {
            filters.push("is_oa:true".to_string());
        }

        // Citation count filter
        if let Some(min_cites) = options.min_citations {
            filters.push(format!("cited_by_count:>={}", min_cites));
        }

        let filter_str = if filters.is_empty() {
            String::new()
        } else {
            format!("&filter={}", filters.join(","))
        };

        // Sort
        let sort = match options.sort_by.as_str() {
            "date" => "publication_date",
            "citations" => "cited_by_count",
            _ => "relevance_score",
        };
        let sort_order = if options.sort_order == "asc" {
            ":asc"
        } else {
            ":desc"
        };

        let url = self.build_url(&format!(
            "/works?search={}&per_page={}&page={}{}&sort={}{}",
            urlencoding::encode(query),
            limit,
            page,
            filter_str,
            sort,
            sort_order
        ));

        log::debug!("OpenAlex search URL: {}", url);

        let response = create_proxy_client()
            .map_err(|e| format!("HTTP client error: {}", e))?
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(format!("API returned status {}: {}", status, body));
        }

        let data: OASearchResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        let papers: Vec<Paper> = data
            .results
            .unwrap_or_default()
            .into_iter()
            .map(Paper::from)
            .collect();

        let total = data
            .meta
            .and_then(|m| m.count)
            .unwrap_or(papers.len() as i32);
        let offset = options.offset.unwrap_or(0);

        Ok(SearchResult {
            papers,
            total_results: total,
            has_more: (offset + limit) < total as u32,
            offset: offset as i32,
            provider: "openalex".to_string(),
            search_time_ms: start_time.elapsed().as_millis() as u64,
        })
    }

    async fn get_paper(&self, paper_id: &str) -> Result<Paper, String> {
        if self.api_key.is_none() {
            return Err("OpenAlex API key is required".to_string());
        }

        let id = if paper_id.starts_with("W") {
            paper_id.to_string()
        } else {
            format!("W{}", paper_id)
        };

        let url = self.build_url(&format!("/works/{}", id));

        let response = create_proxy_client()
            .map_err(|e| format!("HTTP client error: {}", e))?
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("API returned status: {}", response.status()));
        }

        let oa_work: OAWork = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        Ok(Paper::from(oa_work))
    }

    async fn get_citations(
        &self,
        paper_id: &str,
        limit: u32,
        offset: u32,
    ) -> Result<Vec<PaperCitation>, String> {
        if self.api_key.is_none() {
            return Err("OpenAlex API key is required".to_string());
        }

        let id = if paper_id.starts_with("W") {
            paper_id.to_string()
        } else {
            format!("W{}", paper_id)
        };

        let page = (offset / limit) + 1;
        let url = self.build_url(&format!(
            "/works?filter=cites:{}&per_page={}&page={}",
            id,
            limit.min(200),
            page
        ));

        let response = create_proxy_client()
            .map_err(|e| format!("HTTP client error: {}", e))?
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("API returned status: {}", response.status()));
        }

        let data: OASearchResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        let citations = data
            .results
            .unwrap_or_default()
            .into_iter()
            .map(|w| PaperCitation {
                paper_id: w
                    .id
                    .unwrap_or_default()
                    .replace("https://openalex.org/", ""),
                title: w.title.unwrap_or_default(),
                authors: w.authorships.map(|a| {
                    a.into_iter()
                        .map(|auth| PaperAuthor {
                            name: auth.author.and_then(|a| a.display_name).unwrap_or_default(),
                            author_id: None,
                            affiliation: None,
                            email: None,
                            orcid: None,
                        })
                        .collect()
                }),
                year: w.publication_year,
                venue: w
                    .primary_location
                    .and_then(|l| l.source.and_then(|s| s.display_name)),
                citation_count: w.cited_by_count,
                is_influential: None,
            })
            .collect();

        Ok(citations)
    }

    async fn get_references(
        &self,
        paper_id: &str,
        limit: u32,
        offset: u32,
    ) -> Result<Vec<PaperReference>, String> {
        if self.api_key.is_none() {
            return Err("OpenAlex API key is required".to_string());
        }

        let id = if paper_id.starts_with("W") {
            paper_id.to_string()
        } else {
            format!("W{}", paper_id)
        };

        let page = (offset / limit) + 1;
        let url = self.build_url(&format!(
            "/works?filter=cited_by:{}&per_page={}&page={}",
            id,
            limit.min(200),
            page
        ));

        let response = create_proxy_client()
            .map_err(|e| format!("HTTP client error: {}", e))?
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("API returned status: {}", response.status()));
        }

        let data: OASearchResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        let references = data
            .results
            .unwrap_or_default()
            .into_iter()
            .map(|w| PaperReference {
                paper_id: w
                    .id
                    .unwrap_or_default()
                    .replace("https://openalex.org/", ""),
                title: w.title.unwrap_or_default(),
                authors: w.authorships.map(|a| {
                    a.into_iter()
                        .map(|auth| PaperAuthor {
                            name: auth.author.and_then(|a| a.display_name).unwrap_or_default(),
                            author_id: None,
                            affiliation: None,
                            email: None,
                            orcid: None,
                        })
                        .collect()
                }),
                year: w.publication_year,
                venue: w
                    .primary_location
                    .and_then(|l| l.source.and_then(|s| s.display_name)),
                citation_count: w.cited_by_count,
                contexts: None,
            })
            .collect();

        Ok(references)
    }
}
