//! Skills Service Module
//!
//! Provides skill management functionality including:
//! - SSOT (Single Source of Truth) directory management
//! - Repository-based skill discovery and download
//! - Skill installation and uninstallation
//! - Skill metadata parsing from SKILL.md files
//! - Security scanning for skills

pub mod scanner;
pub mod service;
pub mod types;

pub use scanner::SkillSecurityScanner;
pub use service::SkillService;
pub use types::*;
