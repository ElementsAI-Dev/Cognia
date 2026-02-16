//! Academic mode type definitions for Rust backend

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ============================================================================
// Paper Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaperAuthor {
    pub name: String,
    pub author_id: Option<String>,
    pub affiliation: Option<String>,
    pub email: Option<String>,
    pub orcid: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaperCitation {
    pub paper_id: String,
    pub title: String,
    pub authors: Option<Vec<PaperAuthor>>,
    pub year: Option<i32>,
    pub venue: Option<String>,
    pub citation_count: Option<i32>,
    pub is_influential: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaperReference {
    pub paper_id: String,
    pub title: String,
    pub authors: Option<Vec<PaperAuthor>>,
    pub year: Option<i32>,
    pub venue: Option<String>,
    pub citation_count: Option<i32>,
    pub contexts: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PaperMetadata {
    pub doi: Option<String>,
    pub arxiv_id: Option<String>,
    pub pmid: Option<String>,
    pub pmcid: Option<String>,
    pub corpus_id: Option<String>,
    pub mag_id: Option<String>,
    pub open_alex_id: Option<String>,
    pub core_id: Option<String>,
    pub dblp_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaperUrl {
    pub url: String,
    #[serde(rename = "type")]
    pub url_type: String, // pdf, html, abstract, repository, other
    pub source: String,
    pub is_open_access: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Paper {
    pub id: String,
    pub provider_id: String,
    pub external_id: String,

    // Basic metadata
    pub title: String,
    pub abstract_text: Option<String>,
    pub authors: Vec<PaperAuthor>,
    pub year: Option<i32>,
    pub publication_date: Option<String>,
    pub venue: Option<String>,
    pub journal: Option<String>,
    pub conference: Option<String>,
    pub volume: Option<String>,
    pub issue: Option<String>,
    pub pages: Option<String>,

    // Classification
    pub categories: Option<Vec<String>>,
    pub keywords: Option<Vec<String>>,
    pub fields_of_study: Option<Vec<String>>,

    // Metrics
    pub citation_count: Option<i32>,
    pub reference_count: Option<i32>,
    pub influential_citation_count: Option<i32>,

    // URLs and access
    pub urls: Vec<PaperUrl>,
    pub pdf_url: Option<String>,
    pub open_access_url: Option<String>,
    pub is_open_access: Option<bool>,

    // External IDs
    pub metadata: PaperMetadata,

    // Timestamps
    pub created_at: String,
    pub updated_at: String,
    pub fetched_at: String,
}

impl Paper {
    pub fn new(provider_id: &str, external_id: &str, title: &str) -> Self {
        let now = chrono::Utc::now().to_rfc3339();
        let id = format!("{}_{}", provider_id, external_id);

        Self {
            id,
            provider_id: provider_id.to_string(),
            external_id: external_id.to_string(),
            title: title.to_string(),
            abstract_text: None,
            authors: Vec::new(),
            year: None,
            publication_date: None,
            venue: None,
            journal: None,
            conference: None,
            volume: None,
            issue: None,
            pages: None,
            categories: None,
            keywords: None,
            fields_of_study: None,
            citation_count: None,
            reference_count: None,
            influential_citation_count: None,
            urls: Vec::new(),
            pdf_url: None,
            open_access_url: None,
            is_open_access: None,
            metadata: PaperMetadata::default(),
            created_at: now.clone(),
            updated_at: now.clone(),
            fetched_at: now,
        }
    }
}

// ============================================================================
// Library Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LibraryPaper {
    #[serde(flatten)]
    pub paper: Paper,

    // Library-specific fields
    pub library_id: String,
    pub added_at: String,
    pub last_accessed_at: Option<String>,

    // Organization
    pub collections: Option<Vec<String>>,
    pub tags: Option<Vec<String>>,

    // Reading progress
    pub reading_status: String, // unread, reading, completed, archived
    pub priority: String,       // low, medium, high, urgent
    pub reading_progress: Option<i32>, // 0-100

    // User data
    pub user_rating: Option<i32>, // 1-5
    pub user_notes: Option<String>,

    // Local storage
    pub local_pdf_path: Option<String>,
    pub local_full_text_path: Option<String>,
    pub has_cached_pdf: Option<bool>,
    pub has_cached_full_text: Option<bool>,

    // AI analysis
    pub ai_summary: Option<String>,
    pub ai_key_insights: Option<Vec<String>>,
    pub ai_related_topics: Option<Vec<String>>,
    pub last_analyzed_at: Option<String>,
}

impl LibraryPaper {
    pub fn from_paper(paper: Paper) -> Self {
        let now = chrono::Utc::now().to_rfc3339();
        let library_id = nanoid::nanoid!();

        Self {
            paper,
            library_id,
            added_at: now,
            last_accessed_at: None,
            collections: None,
            tags: None,
            reading_status: "unread".to_string(),
            priority: "medium".to_string(),
            reading_progress: None,
            user_rating: None,
            user_notes: None,
            local_pdf_path: None,
            local_full_text_path: None,
            has_cached_pdf: None,
            has_cached_full_text: None,
            ai_summary: None,
            ai_key_insights: None,
            ai_related_topics: None,
            last_analyzed_at: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PaperUpdate {
    pub reading_status: Option<String>,
    pub priority: Option<String>,
    pub reading_progress: Option<i32>,
    pub user_rating: Option<i32>,
    pub user_notes: Option<String>,
    pub tags: Option<Vec<String>>,
    pub ai_summary: Option<String>,
    pub ai_key_insights: Option<Vec<String>>,
    pub ai_related_topics: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct LibraryFilter {
    pub query: Option<String>,
    pub reading_status: Option<String>,
    pub priority: Option<String>,
    pub collection_id: Option<String>,
    pub tags: Option<Vec<String>>,
    pub year_from: Option<i32>,
    pub year_to: Option<i32>,
    pub has_pdf: Option<bool>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

// ============================================================================
// Collection Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaperCollection {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub parent_id: Option<String>,
    pub paper_ids: Vec<String>,
    pub is_smart_collection: Option<bool>,
    pub smart_filter: Option<LibraryFilter>,
    pub created_at: String,
    pub updated_at: String,
}

impl PaperCollection {
    pub fn new(
        name: String,
        description: Option<String>,
        color: Option<String>,
        parent_id: Option<String>,
    ) -> Self {
        let now = chrono::Utc::now().to_rfc3339();

        Self {
            id: nanoid::nanoid!(),
            name,
            description,
            color,
            icon: None,
            parent_id,
            paper_ids: Vec::new(),
            is_smart_collection: None,
            smart_filter: None,
            created_at: now.clone(),
            updated_at: now,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CollectionUpdate {
    pub name: Option<String>,
    pub description: Option<String>,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub parent_id: Option<String>,
    pub is_smart_collection: Option<bool>,
    pub smart_filter: Option<LibraryFilter>,
}

// ============================================================================
// Annotation Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaperAnnotation {
    pub id: String,
    pub paper_id: String,
    #[serde(rename = "type")]
    pub annotation_type: String, // highlight, note, bookmark, question
    pub content: String,
    pub page_number: Option<i32>,
    pub position: Option<AnnotationPosition>,
    pub color: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnnotationPosition {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAnnotation {
    #[serde(rename = "type")]
    pub annotation_type: String,
    pub content: String,
    pub page_number: Option<i32>,
    pub position: Option<AnnotationPosition>,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AnnotationUpdate {
    pub content: Option<String>,
    pub color: Option<String>,
}

// ============================================================================
// Search Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchOptions {
    pub query: Option<String>,
    pub authors: Option<Vec<String>>,
    pub year_from: Option<i32>,
    pub year_to: Option<i32>,
    pub venues: Option<Vec<String>>,
    pub categories: Option<Vec<String>>,
    pub fields_of_study: Option<Vec<String>>,
    pub open_access_only: Option<bool>,
    pub has_full_text: Option<bool>,
    pub has_pdf: Option<bool>,
    pub min_citations: Option<i32>,
    pub max_citations: Option<i32>,
    pub providers: Vec<String>,
    pub sort_by: String,
    pub sort_order: String,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

impl Default for SearchOptions {
    fn default() -> Self {
        Self {
            query: None,
            authors: None,
            year_from: None,
            year_to: None,
            venues: None,
            categories: None,
            fields_of_study: None,
            open_access_only: None,
            has_full_text: None,
            has_pdf: None,
            min_citations: None,
            max_citations: None,
            providers: Vec::new(),
            sort_by: "relevance".to_string(),
            sort_order: "desc".to_string(),
            limit: Some(20),
            offset: Some(0),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub papers: Vec<Paper>,
    pub total_results: i32,
    pub has_more: bool,
    pub offset: i32,
    pub provider: String,
    pub search_time_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderSearchResult {
    pub count: usize,
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AggregatedSearchResult {
    pub papers: Vec<Paper>,
    pub total_results: usize,
    pub provider_results: HashMap<String, ProviderSearchResult>,
    pub search_time_ms: u64,
}

// ============================================================================
// Provider Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub base_url: String,
    pub enabled: bool,
    pub requires_api_key: bool,
    pub has_api_key: bool,
    pub features: ProviderFeatures,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderFeatures {
    pub search: bool,
    pub full_text: bool,
    pub citations: bool,
    pub references: bool,
    pub pdf_download: bool,
    pub open_access: bool,
}

// ============================================================================
// Import/Export Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ImportOptions {
    pub merge_strategy: String, // skip, replace, merge
    pub import_annotations: Option<bool>,
    pub import_notes: Option<bool>,
    pub target_collection: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportResult {
    pub imported: i32,
    pub skipped: i32,
    pub failed: i32,
    pub errors: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ExportOptions {
    pub include_annotations: Option<bool>,
    pub include_notes: Option<bool>,
    pub include_ai_analysis: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportResult {
    pub success: bool,
    pub data: String,
    pub filename: String,
    pub paper_count: i32,
}

// ============================================================================
// Statistics Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AcademicStatistics {
    pub total_papers: i32,
    pub total_collections: i32,
    pub total_annotations: i32,
    pub total_notes: i32,

    pub papers_by_status: HashMap<String, i32>,
    pub papers_by_provider: HashMap<String, i32>,
    pub papers_by_year: HashMap<i32, i32>,
    pub papers_by_category: HashMap<String, i32>,

    pub reading_streak: i32,
    pub papers_read_this_week: i32,
    pub papers_read_this_month: i32,
    pub average_reading_time: Option<i32>,

    pub top_authors: Vec<AuthorCount>,
    pub top_venues: Vec<VenueCount>,
    pub top_keywords: Vec<KeywordCount>,

    pub last_updated: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthorCount {
    pub name: String,
    pub count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VenueCount {
    pub name: String,
    pub count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeywordCount {
    pub keyword: String,
    pub count: i32,
}

impl Default for AcademicStatistics {
    fn default() -> Self {
        Self {
            total_papers: 0,
            total_collections: 0,
            total_annotations: 0,
            total_notes: 0,
            papers_by_status: HashMap::new(),
            papers_by_provider: HashMap::new(),
            papers_by_year: HashMap::new(),
            papers_by_category: HashMap::new(),
            reading_streak: 0,
            papers_read_this_week: 0,
            papers_read_this_month: 0,
            average_reading_time: None,
            top_authors: Vec::new(),
            top_venues: Vec::new(),
            top_keywords: Vec::new(),
            last_updated: chrono::Utc::now().to_rfc3339(),
        }
    }
}

// ============================================================================
// Knowledge Map Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeMapLocation {
    pub file_path: String,
    pub start_line: i32,
    pub end_line: i32,
    pub text_snippet: String,
    pub page_number: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeMapTrace {
    pub id: String,
    pub title: String,
    pub description: String,
    pub locations: Vec<KnowledgeMapLocation>,
    pub trace_text_diagram: Option<String>,
    pub trace_guide: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeMap {
    pub id: String,
    pub title: String,
    pub description: String,
    pub source_type: String,
    pub source_path: Option<String>,
    pub traces: Vec<KnowledgeMapTrace>,
    pub mind_map_data: Option<MindMapData>,
    pub mermaid_diagram: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MindMapNode {
    pub id: String,
    pub label: String,
    pub node_type: String,
    pub description: Option<String>,
    pub parent_id: Option<String>,
    pub children: Vec<String>,
    pub location_ref: Option<String>,
    pub page_number: Option<i32>,
    pub metadata: Option<HashMap<String, serde_json::Value>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MindMapEdge {
    pub id: String,
    pub source: String,
    pub target: String,
    pub label: Option<String>,
    pub edge_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MindMapData {
    pub id: String,
    pub title: String,
    pub root_id: String,
    pub nodes: Vec<MindMapNode>,
    pub edges: Vec<MindMapEdge>,
    pub layout: String,
    pub theme: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeMapGenerationRequest {
    pub content: String,
    pub title: Option<String>,
    pub source_type: Option<String>,
    pub source_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MindMapGenerationRequest {
    pub knowledge_map_id: Option<String>,
    pub content: Option<String>,
    pub title: Option<String>,
    pub layout: Option<String>,
    pub max_depth: Option<i32>,
    pub theme: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PDFConversionOptions {
    pub extract_images: bool,
    pub extract_tables: bool,
    pub extract_equations: bool,
    pub ocr_enabled: bool,
    pub generate_knowledge_map: bool,
    pub generate_mind_map: bool,
}

impl Default for PDFConversionOptions {
    fn default() -> Self {
        Self {
            extract_images: true,
            extract_tables: true,
            extract_equations: true,
            ocr_enabled: false,
            generate_knowledge_map: true,
            generate_mind_map: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PDFConversionResult {
    pub success: bool,
    pub markdown: String,
    pub knowledge_map: Option<KnowledgeMap>,
    pub mind_map: Option<MindMapData>,
    pub images: Vec<ExtractedImage>,
    pub tables: Vec<ExtractedTable>,
    pub equations: Vec<ExtractedEquation>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractedImage {
    pub id: String,
    pub page_number: i32,
    pub image_type: String,
    pub caption: Option<String>,
    pub data_url: Option<String>,
    pub file_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractedTable {
    pub id: String,
    pub page_number: i32,
    pub caption: Option<String>,
    pub headers: Vec<String>,
    pub rows: Vec<Vec<String>>,
    pub markdown: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractedEquation {
    pub id: String,
    pub page_number: i32,
    pub latex: String,
    pub equation_type: String,
}
