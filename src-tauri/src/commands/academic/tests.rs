//! Tests for academic module
//!
//! Unit tests for paper types and basic functionality

use crate::commands::academic::types::*;
use std::collections::HashMap;

// ============================================================================
// Paper Type Tests
// ============================================================================

#[test]
fn test_paper_new() {
    let paper = Paper::new("arxiv", "2301.00001", "Test Paper Title");

    assert_eq!(paper.provider_id, "arxiv");
    assert_eq!(paper.external_id, "2301.00001");
    assert_eq!(paper.title, "Test Paper Title");
    assert_eq!(paper.id, "arxiv_2301.00001");
    assert!(paper.authors.is_empty());
    assert!(paper.abstract_text.is_none());
}

#[test]
fn test_paper_author_serialization() {
    let author = PaperAuthor {
        name: "John Doe".to_string(),
        author_id: Some("12345".to_string()),
        affiliation: Some("MIT".to_string()),
        email: None,
        orcid: Some("0000-0001-2345-6789".to_string()),
    };

    let json = serde_json::to_string(&author).unwrap();
    let deserialized: PaperAuthor = serde_json::from_str(&json).unwrap();

    assert_eq!(deserialized.name, "John Doe");
    assert_eq!(deserialized.author_id, Some("12345".to_string()));
    assert_eq!(deserialized.affiliation, Some("MIT".to_string()));
}

#[test]
fn test_paper_metadata_default() {
    let metadata = PaperMetadata::default();

    assert!(metadata.doi.is_none());
    assert!(metadata.arxiv_id.is_none());
    assert!(metadata.pmid.is_none());
}

#[test]
fn test_paper_url_serialization() {
    let url = PaperUrl {
        url: "https://arxiv.org/pdf/2301.00001.pdf".to_string(),
        url_type: "pdf".to_string(),
        source: "arxiv".to_string(),
        is_open_access: Some(true),
    };

    let json = serde_json::to_string(&url).unwrap();
    assert!(json.contains("pdf"));
    assert!(json.contains("arxiv"));
}

// ============================================================================
// Library Paper Tests
// ============================================================================

#[test]
fn test_library_paper_creation() {
    let paper = Paper::new("semantic_scholar", "abc123", "ML Paper");
    let library_paper = LibraryPaper::from_paper(paper);

    assert_eq!(library_paper.paper.title, "ML Paper");
    assert_eq!(library_paper.reading_status, "unread");
    assert!(library_paper.user_notes.is_none());
}

// ============================================================================
// Collection Tests
// ============================================================================

#[test]
fn test_collection_creation() {
    let collection = PaperCollection::new(
        "My Research".to_string(),
        Some("AI papers collection".to_string()),
        None,
        None,
    );

    assert_eq!(collection.name, "My Research");
    assert_eq!(
        collection.description,
        Some("AI papers collection".to_string())
    );
    assert!(collection.paper_ids.is_empty());
    assert!(!collection.id.is_empty());
}

#[test]
fn test_collection_add_paper() {
    let mut collection = PaperCollection::new("Test Collection".to_string(), None, None, None);

    collection.paper_ids.push("paper1".to_string());
    collection.paper_ids.push("paper2".to_string());

    assert_eq!(collection.paper_ids.len(), 2);
    assert!(collection.paper_ids.contains(&"paper1".to_string()));
}

// ============================================================================
// Citation Tests
// ============================================================================

#[test]
fn test_paper_citation() {
    let citation = PaperCitation {
        paper_id: "cite123".to_string(),
        title: "Cited Paper Title".to_string(),
        authors: Some(vec![PaperAuthor {
            name: "Jane Smith".to_string(),
            author_id: None,
            affiliation: None,
            email: None,
            orcid: None,
        }]),
        year: Some(2022),
        venue: Some("ICML".to_string()),
        citation_count: Some(50),
        is_influential: Some(true),
    };

    assert_eq!(citation.paper_id, "cite123");
    assert_eq!(citation.year, Some(2022));
    assert_eq!(citation.is_influential, Some(true));
}

#[test]
fn test_paper_reference() {
    let reference = PaperReference {
        paper_id: "ref456".to_string(),
        title: "Referenced Paper".to_string(),
        authors: None,
        year: Some(2020),
        venue: None,
        citation_count: Some(100),
        contexts: Some(vec!["As shown in [1]...".to_string()]),
    };

    assert_eq!(reference.contexts.as_ref().unwrap().len(), 1);
}

// ============================================================================
// Provider Result Tests
// ============================================================================

#[test]
fn test_provider_search_result_success() {
    let result = ProviderSearchResult {
        count: 10,
        success: true,
        error: None,
    };

    assert!(result.success);
    assert_eq!(result.count, 10);
    assert!(result.error.is_none());
}

#[test]
fn test_provider_search_result_failure() {
    let result = ProviderSearchResult {
        count: 0,
        success: false,
        error: Some("Rate limited".to_string()),
    };

    assert!(!result.success);
    assert_eq!(result.error, Some("Rate limited".to_string()));
}

// ============================================================================
// Aggregated Search Result Tests
// ============================================================================

#[test]
fn test_aggregated_search_result() {
    let mut provider_results = HashMap::new();
    provider_results.insert(
        "arxiv".to_string(),
        ProviderSearchResult {
            count: 5,
            success: true,
            error: None,
        },
    );
    provider_results.insert(
        "semantic_scholar".to_string(),
        ProviderSearchResult {
            count: 0,
            success: false,
            error: Some("API error".to_string()),
        },
    );

    let result = AggregatedSearchResult {
        papers: vec![],
        total_results: 5,
        provider_results,
        search_time_ms: 150,
    };

    assert_eq!(result.provider_results.len(), 2);
    assert!(result.provider_results.get("arxiv").unwrap().success);
    assert!(
        !result
            .provider_results
            .get("semantic_scholar")
            .unwrap()
            .success
    );
}
