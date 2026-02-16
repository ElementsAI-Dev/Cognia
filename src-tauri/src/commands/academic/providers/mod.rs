//! Academic paper provider implementations
//!
//! This module contains implementations for various academic paper APIs.

pub mod arxiv;
pub mod core;
pub mod dblp;
pub mod openalex;
pub mod semantic_scholar;
pub mod unpaywall;

use crate::commands::academic::types::*;
use async_trait::async_trait;

/// Trait for academic paper providers
#[async_trait]
pub trait AcademicProvider {
    /// Get the provider's unique identifier
    fn provider_id(&self) -> &str;

    /// Get provider information
    fn info(&self) -> ProviderInfo;

    /// Check if the provider is enabled
    fn is_enabled(&self) -> bool;

    /// Set the provider's enabled state
    fn set_enabled(&mut self, enabled: bool);

    /// Set the API key for providers that require authentication
    fn set_api_key(&mut self, api_key: Option<String>);

    /// Test the connection to the provider
    async fn test_connection(&self) -> Result<bool, String>;

    /// Search for papers
    async fn search(&self, query: &str, options: &SearchOptions) -> Result<SearchResult, String>;

    /// Get a specific paper by ID
    async fn get_paper(&self, paper_id: &str) -> Result<Paper, String>;

    /// Get citations for a paper (papers that cite this paper)
    async fn get_citations(
        &self,
        paper_id: &str,
        limit: u32,
        offset: u32,
    ) -> Result<Vec<PaperCitation>, String> {
        let _ = (paper_id, limit, offset);
        Err("Citations not supported by this provider".to_string())
    }

    /// Get references for a paper (papers this paper cites)
    async fn get_references(
        &self,
        paper_id: &str,
        limit: u32,
        offset: u32,
    ) -> Result<Vec<PaperReference>, String> {
        let _ = (paper_id, limit, offset);
        Err("References not supported by this provider".to_string())
    }
}
