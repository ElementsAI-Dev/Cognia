//! Skill Seekers Integration Module
//!
//! Provides integration with the Skill Seekers CLI tool for generating
//! AI skills from documentation websites, GitHub repositories, and PDFs.
//!
//! ## Features
//!
//! - Website documentation scraping
//! - GitHub repository analysis
//! - PDF content extraction
//! - AI-powered skill enhancement
//! - Multi-platform packaging (Claude, Gemini, OpenAI)
//! - Job management with progress tracking
//! - Resume capability for interrupted jobs
//!
//! ## Architecture
//!
//! ```text
//! ┌─────────────────────────────────────────────────────────────┐
//! │                    Tauri Commands                           │
//! ├─────────────────────────────────────────────────────────────┤
//! │                  SkillSeekersState                          │
//! │  ┌─────────────────────────────────────────────────────┐    │
//! │  │              SkillSeekersService                     │    │
//! │  │  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │    │
//! │  │  │   Scraper   │  │  Enhancer   │  │  Packager  │  │    │
//! │  │  └─────────────┘  └─────────────┘  └────────────┘  │    │
//! │  └─────────────────────────────────────────────────────┘    │
//! │                           │                                 │
//! │                    Python venv                              │
//! │                  (skill-seekers CLI)                        │
//! └─────────────────────────────────────────────────────────────┘
//! ```

pub mod service;
pub mod types;

pub use service::SkillSeekersService;
pub use types::*;

use std::sync::Arc;
use tokio::sync::RwLock;

/// Skill Seekers state for Tauri
pub struct SkillSeekersState(pub Arc<RwLock<SkillSeekersService>>);

impl SkillSeekersState {
    /// Create a new state wrapper
    pub fn new(service: SkillSeekersService) -> Self {
        Self(Arc::new(RwLock::new(service)))
    }
}
