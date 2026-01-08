//! Paper storage module for local paper management
//! 
//! Handles persistence of papers, collections, and annotations

use crate::commands::academic::types::*;
use crate::http::HTTP_CLIENT_LONG;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::RwLock;
use tokio::fs;
use tokio::io::AsyncWriteExt;

#[derive(Debug, Serialize, Deserialize, Default)]
struct StorageData {
    papers: HashMap<String, LibraryPaper>,
    collections: HashMap<String, PaperCollection>,
    annotations: HashMap<String, Vec<PaperAnnotation>>,
}

pub struct PaperStorage {
    storage_path: PathBuf,
    pdf_path: PathBuf,
    data: RwLock<StorageData>,
}

impl PaperStorage {
    pub fn new(base_path: PathBuf) -> Result<Self, String> {
        let storage_path = base_path.join("academic_library.json");
        let pdf_path = base_path.join("papers");
        
        // Ensure directories exist
        std::fs::create_dir_all(&pdf_path)
            .map_err(|e| format!("Failed to create PDF directory: {}", e))?;
        
        // Load existing data or create empty
        let data = if storage_path.exists() {
            let content = std::fs::read_to_string(&storage_path)
                .map_err(|e| format!("Failed to read storage file: {}", e))?;
            serde_json::from_str(&content)
                .unwrap_or_default()
        } else {
            StorageData::default()
        };
        
        Ok(Self {
            storage_path,
            pdf_path,
            data: RwLock::new(data),
        })
    }
    
    fn save(&self) -> Result<(), String> {
        let data = self.data.read().map_err(|e| format!("Lock error: {}", e))?;
        let content = serde_json::to_string_pretty(&*data)
            .map_err(|e| format!("Serialization error: {}", e))?;
        std::fs::write(&self.storage_path, content)
            .map_err(|e| format!("Failed to write storage file: {}", e))?;
        Ok(())
    }
    
    // ========================================================================
    // Paper Management
    // ========================================================================
    
    pub async fn add_paper(&self, paper: Paper, collection_id: Option<String>) -> Result<LibraryPaper, String> {
        let mut library_paper = LibraryPaper::from_paper(paper);
        
        if let Some(ref coll_id) = collection_id {
            library_paper.collections = Some(vec![coll_id.clone()]);
        }
        
        {
            let mut data = self.data.write().map_err(|e| format!("Lock error: {}", e))?;
            
            // Check if paper already exists (by DOI or ID)
            let existing_id = data.papers.iter()
                .find(|(_, p)| {
                    p.paper.metadata.doi == library_paper.paper.metadata.doi && library_paper.paper.metadata.doi.is_some()
                        || p.paper.id == library_paper.paper.id
                })
                .map(|(id, _)| id.clone());
            
            if let Some(id) = existing_id {
                return Err(format!("Paper already exists with ID: {}", id));
            }
            
            let paper_id = library_paper.paper.id.clone();
            data.papers.insert(paper_id.clone(), library_paper.clone());
            
            // Add to collection if specified
            if let Some(coll_id) = collection_id {
                if let Some(collection) = data.collections.get_mut(&coll_id) {
                    if !collection.paper_ids.contains(&paper_id) {
                        collection.paper_ids.push(paper_id);
                    }
                }
            }
        }
        
        self.save()?;
        Ok(library_paper)
    }
    
    pub async fn remove_paper(&self, paper_id: &str) -> Result<(), String> {
        {
            let mut data = self.data.write().map_err(|e| format!("Lock error: {}", e))?;
            
            // Remove from all collections
            for collection in data.collections.values_mut() {
                collection.paper_ids.retain(|id| id != paper_id);
            }
            
            // Remove annotations
            data.annotations.remove(paper_id);
            
            // Remove paper
            data.papers.remove(paper_id)
                .ok_or_else(|| format!("Paper '{}' not found", paper_id))?;
        }
        
        // Delete PDF if exists
        let _ = self.delete_pdf(paper_id);
        
        self.save()?;
        Ok(())
    }
    
    pub async fn get_paper(&self, paper_id: &str) -> Result<Option<LibraryPaper>, String> {
        let data = self.data.read().map_err(|e| format!("Lock error: {}", e))?;
        Ok(data.papers.get(paper_id).cloned())
    }
    
    pub async fn get_papers(&self, filter: Option<LibraryFilter>) -> Result<Vec<LibraryPaper>, String> {
        let data = self.data.read().map_err(|e| format!("Lock error: {}", e))?;
        
        let mut papers: Vec<LibraryPaper> = data.papers.values().cloned().collect();
        
        if let Some(f) = filter {
            // Apply filters
            if let Some(ref query) = f.query {
                let q = query.to_lowercase();
                papers.retain(|p| {
                    p.paper.title.to_lowercase().contains(&q)
                        || p.paper.abstract_text.as_ref().map(|a| a.to_lowercase().contains(&q)).unwrap_or(false)
                        || p.paper.authors.iter().any(|a| a.name.to_lowercase().contains(&q))
                });
            }
            
            if let Some(ref status) = f.reading_status {
                papers.retain(|p| &p.reading_status == status);
            }
            
            if let Some(ref priority) = f.priority {
                papers.retain(|p| &p.priority == priority);
            }
            
            if let Some(ref coll_id) = f.collection_id {
                papers.retain(|p| {
                    p.collections.as_ref().map(|c| c.contains(coll_id)).unwrap_or(false)
                });
            }
            
            if let Some(ref tags) = f.tags {
                papers.retain(|p| {
                    p.tags.as_ref().map(|t| tags.iter().any(|tag| t.contains(tag))).unwrap_or(false)
                });
            }
            
            if let Some(year_from) = f.year_from {
                papers.retain(|p| p.paper.year.map(|y| y >= year_from).unwrap_or(false));
            }
            
            if let Some(year_to) = f.year_to {
                papers.retain(|p| p.paper.year.map(|y| y <= year_to).unwrap_or(false));
            }
            
            if let Some(has_pdf) = f.has_pdf {
                papers.retain(|p| p.has_cached_pdf.unwrap_or(false) == has_pdf);
            }
            
            // Sort
            let sort_by = f.sort_by.as_deref().unwrap_or("added_at");
            let ascending = f.sort_order.as_deref() == Some("asc");
            
            papers.sort_by(|a, b| {
                let cmp = match sort_by {
                    "title" => a.paper.title.to_lowercase().cmp(&b.paper.title.to_lowercase()),
                    "year" => a.paper.year.cmp(&b.paper.year),
                    "citations" => a.paper.citation_count.cmp(&b.paper.citation_count),
                    "added_at" => a.added_at.cmp(&b.added_at),
                    "last_accessed" => a.last_accessed_at.cmp(&b.last_accessed_at),
                    _ => std::cmp::Ordering::Equal,
                };
                if ascending { cmp } else { cmp.reverse() }
            });
            
            // Pagination
            let offset = f.offset.unwrap_or(0) as usize;
            let limit = f.limit.unwrap_or(100) as usize;
            papers = papers.into_iter().skip(offset).take(limit).collect();
        }
        
        Ok(papers)
    }
    
    pub async fn update_paper(&self, paper_id: &str, updates: PaperUpdate) -> Result<LibraryPaper, String> {
        let mut data = self.data.write().map_err(|e| format!("Lock error: {}", e))?;
        
        let paper = data.papers.get_mut(paper_id)
            .ok_or_else(|| format!("Paper '{}' not found", paper_id))?;
        
        if let Some(status) = updates.reading_status {
            paper.reading_status = status;
        }
        if let Some(priority) = updates.priority {
            paper.priority = priority;
        }
        if let Some(progress) = updates.reading_progress {
            paper.reading_progress = Some(progress);
        }
        if let Some(rating) = updates.user_rating {
            paper.user_rating = Some(rating);
        }
        if let Some(notes) = updates.user_notes {
            paper.user_notes = Some(notes);
        }
        if let Some(tags) = updates.tags {
            paper.tags = Some(tags);
        }
        if let Some(summary) = updates.ai_summary {
            paper.ai_summary = Some(summary);
            paper.last_analyzed_at = Some(chrono::Utc::now().to_rfc3339());
        }
        if let Some(insights) = updates.ai_key_insights {
            paper.ai_key_insights = Some(insights);
        }
        if let Some(topics) = updates.ai_related_topics {
            paper.ai_related_topics = Some(topics);
        }
        
        paper.last_accessed_at = Some(chrono::Utc::now().to_rfc3339());
        
        let result = paper.clone();
        drop(data);
        
        self.save()?;
        Ok(result)
    }
    
    // ========================================================================
    // PDF Management
    // ========================================================================
    
    pub async fn download_pdf(&self, paper_id: &str, pdf_url: &str) -> Result<String, String> {
        let response = HTTP_CLIENT_LONG
            .get(pdf_url)
            .send()
            .await
            .map_err(|e| format!("Download failed: {}", e))?;
        
        if !response.status().is_success() {
            return Err(format!("Download failed with status: {}", response.status()));
        }
        
        let bytes = response.bytes().await
            .map_err(|e| format!("Failed to read response: {}", e))?;
        
        let filename = format!("{}.pdf", paper_id.replace(['/', ':'], "_"));
        let path = self.pdf_path.join(&filename);
        
        let mut file = fs::File::create(&path).await
            .map_err(|e| format!("Failed to create file: {}", e))?;
        
        file.write_all(&bytes).await
            .map_err(|e| format!("Failed to write file: {}", e))?;
        
        // Update paper record
        {
            let mut data = self.data.write().map_err(|e| format!("Lock error: {}", e))?;
            if let Some(paper) = data.papers.get_mut(paper_id) {
                paper.local_pdf_path = Some(path.to_string_lossy().to_string());
                paper.has_cached_pdf = Some(true);
            }
        }
        
        self.save()?;
        Ok(path.to_string_lossy().to_string())
    }
    
    pub fn get_pdf_path(&self, paper_id: &str) -> Result<Option<String>, String> {
        let data = self.data.read().map_err(|e| format!("Lock error: {}", e))?;
        Ok(data.papers.get(paper_id).and_then(|p| p.local_pdf_path.clone()))
    }
    
    pub fn delete_pdf(&self, paper_id: &str) -> Result<(), String> {
        let mut data = self.data.write().map_err(|e| format!("Lock error: {}", e))?;
        
        if let Some(paper) = data.papers.get_mut(paper_id) {
            if let Some(ref path) = paper.local_pdf_path {
                let _ = std::fs::remove_file(path);
            }
            paper.local_pdf_path = None;
            paper.has_cached_pdf = Some(false);
        }
        
        drop(data);
        self.save()
    }
    
    // ========================================================================
    // Collection Management
    // ========================================================================
    
    pub async fn create_collection(
        &self,
        name: String,
        description: Option<String>,
        color: Option<String>,
        parent_id: Option<String>,
    ) -> Result<PaperCollection, String> {
        let collection = PaperCollection::new(name, description, color, parent_id);
        
        {
            let mut data = self.data.write().map_err(|e| format!("Lock error: {}", e))?;
            data.collections.insert(collection.id.clone(), collection.clone());
        }
        
        self.save()?;
        Ok(collection)
    }
    
    pub async fn update_collection(&self, collection_id: &str, updates: CollectionUpdate) -> Result<PaperCollection, String> {
        let mut data = self.data.write().map_err(|e| format!("Lock error: {}", e))?;
        
        let collection = data.collections.get_mut(collection_id)
            .ok_or_else(|| format!("Collection '{}' not found", collection_id))?;
        
        if let Some(name) = updates.name {
            collection.name = name;
        }
        if let Some(description) = updates.description {
            collection.description = Some(description);
        }
        if let Some(color) = updates.color {
            collection.color = Some(color);
        }
        if let Some(icon) = updates.icon {
            collection.icon = Some(icon);
        }
        if let Some(parent_id) = updates.parent_id {
            collection.parent_id = Some(parent_id);
        }
        if let Some(is_smart) = updates.is_smart_collection {
            collection.is_smart_collection = Some(is_smart);
        }
        if let Some(filter) = updates.smart_filter {
            collection.smart_filter = Some(filter);
        }
        
        collection.updated_at = chrono::Utc::now().to_rfc3339();
        
        let result = collection.clone();
        drop(data);
        
        self.save()?;
        Ok(result)
    }
    
    pub async fn delete_collection(&self, collection_id: &str) -> Result<(), String> {
        let mut data = self.data.write().map_err(|e| format!("Lock error: {}", e))?;
        
        // Remove collection reference from papers
        for paper in data.papers.values_mut() {
            if let Some(ref mut collections) = paper.collections {
                collections.retain(|c| c != collection_id);
            }
        }
        
        data.collections.remove(collection_id)
            .ok_or_else(|| format!("Collection '{}' not found", collection_id))?;
        
        drop(data);
        self.save()
    }
    
    pub async fn get_collections(&self) -> Result<Vec<PaperCollection>, String> {
        let data = self.data.read().map_err(|e| format!("Lock error: {}", e))?;
        Ok(data.collections.values().cloned().collect())
    }
    
    pub async fn add_paper_to_collection(&self, paper_id: &str, collection_id: &str) -> Result<(), String> {
        let mut data = self.data.write().map_err(|e| format!("Lock error: {}", e))?;
        
        // Verify paper exists
        let paper = data.papers.get_mut(paper_id)
            .ok_or_else(|| format!("Paper '{}' not found", paper_id))?;
        
        // Add collection to paper
        let collections = paper.collections.get_or_insert_with(Vec::new);
        if !collections.contains(&collection_id.to_string()) {
            collections.push(collection_id.to_string());
        }
        
        // Add paper to collection
        let collection = data.collections.get_mut(collection_id)
            .ok_or_else(|| format!("Collection '{}' not found", collection_id))?;
        
        if !collection.paper_ids.contains(&paper_id.to_string()) {
            collection.paper_ids.push(paper_id.to_string());
        }
        
        drop(data);
        self.save()
    }
    
    pub async fn remove_paper_from_collection(&self, paper_id: &str, collection_id: &str) -> Result<(), String> {
        let mut data = self.data.write().map_err(|e| format!("Lock error: {}", e))?;
        
        // Remove collection from paper
        if let Some(paper) = data.papers.get_mut(paper_id) {
            if let Some(ref mut collections) = paper.collections {
                collections.retain(|c| c != collection_id);
            }
        }
        
        // Remove paper from collection
        if let Some(collection) = data.collections.get_mut(collection_id) {
            collection.paper_ids.retain(|p| p != paper_id);
        }
        
        drop(data);
        self.save()
    }
    
    // ========================================================================
    // Annotation Management
    // ========================================================================
    
    pub async fn add_annotation(&self, paper_id: &str, annotation: CreateAnnotation) -> Result<PaperAnnotation, String> {
        let now = chrono::Utc::now().to_rfc3339();
        let annotation = PaperAnnotation {
            id: nanoid::nanoid!(),
            paper_id: paper_id.to_string(),
            annotation_type: annotation.annotation_type,
            content: annotation.content,
            page_number: annotation.page_number,
            position: annotation.position,
            color: annotation.color,
            created_at: now.clone(),
            updated_at: now,
        };
        
        {
            let mut data = self.data.write().map_err(|e| format!("Lock error: {}", e))?;
            
            // Verify paper exists
            if !data.papers.contains_key(paper_id) {
                return Err(format!("Paper '{}' not found", paper_id));
            }
            
            data.annotations
                .entry(paper_id.to_string())
                .or_default()
                .push(annotation.clone());
        }
        
        self.save()?;
        Ok(annotation)
    }
    
    pub async fn update_annotation(&self, annotation_id: &str, updates: AnnotationUpdate) -> Result<PaperAnnotation, String> {
        let mut data = self.data.write().map_err(|e| format!("Lock error: {}", e))?;
        
        for annotations in data.annotations.values_mut() {
            if let Some(annotation) = annotations.iter_mut().find(|a| a.id == annotation_id) {
                if let Some(content) = updates.content {
                    annotation.content = content;
                }
                if let Some(color) = updates.color {
                    annotation.color = Some(color);
                }
                annotation.updated_at = chrono::Utc::now().to_rfc3339();
                
                let result = annotation.clone();
                drop(data);
                self.save()?;
                return Ok(result);
            }
        }
        
        Err(format!("Annotation '{}' not found", annotation_id))
    }
    
    pub async fn delete_annotation(&self, annotation_id: &str) -> Result<(), String> {
        let mut data = self.data.write().map_err(|e| format!("Lock error: {}", e))?;
        
        for annotations in data.annotations.values_mut() {
            let initial_len = annotations.len();
            annotations.retain(|a| a.id != annotation_id);
            if annotations.len() != initial_len {
                drop(data);
                return self.save();
            }
        }
        
        Err(format!("Annotation '{}' not found", annotation_id))
    }
    
    pub async fn get_annotations(&self, paper_id: &str) -> Result<Vec<PaperAnnotation>, String> {
        let data = self.data.read().map_err(|e| format!("Lock error: {}", e))?;
        Ok(data.annotations.get(paper_id).cloned().unwrap_or_default())
    }
    
    // ========================================================================
    // Import/Export
    // ========================================================================
    
    pub async fn import_papers(&self, data: &str, format: &str, options: ImportOptions) -> Result<ImportResult, String> {
        let papers_to_import: Vec<Paper> = match format {
            "bibtex" => parse_bibtex(data)?,
            "json" => serde_json::from_str(data)
                .map_err(|e| format!("Invalid JSON: {}", e))?,
            _ => return Err(format!("Unsupported import format: {}", format)),
        };
        
        let mut imported = 0;
        let mut skipped = 0;
        let mut failed = 0;
        let mut errors = Vec::new();
        
        for paper in papers_to_import {
            match self.add_paper(paper.clone(), options.target_collection.clone()).await {
                Ok(_) => imported += 1,
                Err(e) => {
                    if e.contains("already exists") {
                        match options.merge_strategy.as_str() {
                            "skip" => skipped += 1,
                            "replace" => {
                                // Find and update existing
                                let _ = self.remove_paper(&paper.id).await;
                                match self.add_paper(paper, options.target_collection.clone()).await {
                                    Ok(_) => imported += 1,
                                    Err(e) => {
                                        failed += 1;
                                        errors.push(e);
                                    }
                                }
                            }
                            _ => skipped += 1,
                        }
                    } else {
                        failed += 1;
                        errors.push(e);
                    }
                }
            }
        }
        
        Ok(ImportResult {
            imported,
            skipped,
            failed,
            errors: if errors.is_empty() { None } else { Some(errors) },
        })
    }
    
    pub async fn export_papers(
        &self,
        paper_ids: Option<Vec<String>>,
        collection_id: Option<String>,
        format: &str,
        _options: ExportOptions,
    ) -> Result<ExportResult, String> {
        let data = self.data.read().map_err(|e| format!("Lock error: {}", e))?;
        
        let papers: Vec<&LibraryPaper> = if let Some(ids) = paper_ids {
            ids.iter()
                .filter_map(|id| data.papers.get(id))
                .collect()
        } else if let Some(coll_id) = collection_id {
            data.collections.get(&coll_id)
                .map(|c| c.paper_ids.iter()
                    .filter_map(|id| data.papers.get(id))
                    .collect())
                .unwrap_or_default()
        } else {
            data.papers.values().collect()
        };
        
        let paper_count = papers.len() as i32;
        
        let (export_data, extension) = match format {
            "bibtex" => (generate_bibtex(&papers), "bib"),
            "json" => (serde_json::to_string_pretty(&papers)
                .map_err(|e| format!("Serialization error: {}", e))?, "json"),
            "csv" => (generate_csv(&papers), "csv"),
            "markdown" => (generate_markdown(&papers), "md"),
            _ => return Err(format!("Unsupported export format: {}", format)),
        };
        
        let filename = format!("papers_export_{}.{}", 
            chrono::Utc::now().format("%Y%m%d_%H%M%S"),
            extension
        );
        
        Ok(ExportResult {
            success: true,
            data: export_data,
            filename,
            paper_count,
        })
    }
    
    // ========================================================================
    // Statistics
    // ========================================================================
    
    pub async fn get_statistics(&self) -> Result<AcademicStatistics, String> {
        let data = self.data.read().map_err(|e| format!("Lock error: {}", e))?;
        
        let mut stats = AcademicStatistics::default();
        stats.total_papers = data.papers.len() as i32;
        stats.total_collections = data.collections.len() as i32;
        stats.total_annotations = data.annotations.values().map(|v| v.len()).sum::<usize>() as i32;
        
        // Count by status
        for paper in data.papers.values() {
            *stats.papers_by_status.entry(paper.reading_status.clone()).or_insert(0) += 1;
            *stats.papers_by_provider.entry(paper.paper.provider_id.clone()).or_insert(0) += 1;
            
            if let Some(year) = paper.paper.year {
                *stats.papers_by_year.entry(year).or_insert(0) += 1;
            }
            
            if let Some(ref categories) = paper.paper.categories {
                for cat in categories {
                    *stats.papers_by_category.entry(cat.clone()).or_insert(0) += 1;
                }
            }
        }
        
        // Count authors and venues
        let mut author_counts: HashMap<String, i32> = HashMap::new();
        let mut venue_counts: HashMap<String, i32> = HashMap::new();
        let mut keyword_counts: HashMap<String, i32> = HashMap::new();
        
        for paper in data.papers.values() {
            for author in &paper.paper.authors {
                *author_counts.entry(author.name.clone()).or_insert(0) += 1;
            }
            if let Some(ref venue) = paper.paper.venue {
                *venue_counts.entry(venue.clone()).or_insert(0) += 1;
            }
            if let Some(ref keywords) = paper.paper.keywords {
                for kw in keywords {
                    *keyword_counts.entry(kw.clone()).or_insert(0) += 1;
                }
            }
        }
        
        // Get top 10
        let mut authors: Vec<_> = author_counts.into_iter().collect();
        authors.sort_by(|a, b| b.1.cmp(&a.1));
        stats.top_authors = authors.into_iter().take(10)
            .map(|(name, count)| AuthorCount { name, count })
            .collect();
        
        let mut venues: Vec<_> = venue_counts.into_iter().collect();
        venues.sort_by(|a, b| b.1.cmp(&a.1));
        stats.top_venues = venues.into_iter().take(10)
            .map(|(name, count)| VenueCount { name, count })
            .collect();
        
        let mut keywords: Vec<_> = keyword_counts.into_iter().collect();
        keywords.sort_by(|a, b| b.1.cmp(&a.1));
        stats.top_keywords = keywords.into_iter().take(10)
            .map(|(keyword, count)| KeywordCount { keyword, count })
            .collect();
        
        Ok(stats)
    }
}

// ============================================================================
// Import/Export Helpers
// ============================================================================

fn parse_bibtex(data: &str) -> Result<Vec<Paper>, String> {
    let mut papers = Vec::new();
    let mut current_entry: Option<(String, String)> = None;
    let mut fields: HashMap<String, String> = HashMap::new();
    
    for line in data.lines() {
        let line = line.trim();
        
        if line.starts_with('@') {
            // Save previous entry
            if let Some((entry_type, key)) = current_entry.take() {
                if let Some(paper) = create_paper_from_bibtex(&entry_type, &key, &fields) {
                    papers.push(paper);
                }
            }
            
            // Parse new entry
            if let Some(start) = line.find('{') {
                let entry_type = line[1..start].to_lowercase();
                let rest = &line[start+1..];
                let key = rest.trim_end_matches([',', '}']).to_string();
                current_entry = Some((entry_type, key));
                fields.clear();
            }
        } else if line.starts_with('}') {
            if let Some((entry_type, key)) = current_entry.take() {
                if let Some(paper) = create_paper_from_bibtex(&entry_type, &key, &fields) {
                    papers.push(paper);
                }
            }
        } else if let Some(eq_pos) = line.find('=') {
            let field_name = line[..eq_pos].trim().to_lowercase();
            let field_value = line[eq_pos+1..].trim()
                .trim_matches(['{', '}', '"', ','])
                .to_string();
            fields.insert(field_name, field_value);
        }
    }
    
    Ok(papers)
}

fn create_paper_from_bibtex(entry_type: &str, key: &str, fields: &HashMap<String, String>) -> Option<Paper> {
    let title = fields.get("title")?;
    let mut paper = Paper::new("bibtex", key, title);
    
    paper.abstract_text = fields.get("abstract").cloned();
    paper.year = fields.get("year").and_then(|y| y.parse().ok());
    paper.journal = fields.get("journal").cloned();
    paper.volume = fields.get("volume").cloned();
    paper.issue = fields.get("number").cloned();
    paper.pages = fields.get("pages").cloned();
    paper.metadata.doi = fields.get("doi").cloned();
    
    if entry_type == "inproceedings" || entry_type == "conference" {
        paper.conference = fields.get("booktitle").cloned();
        paper.venue = paper.conference.clone();
    } else {
        paper.venue = paper.journal.clone();
    }
    
    // Parse authors
    if let Some(authors_str) = fields.get("author") {
        paper.authors = authors_str.split(" and ")
            .map(|name| PaperAuthor {
                name: name.trim().to_string(),
                author_id: None,
                affiliation: None,
                email: None,
                orcid: None,
            })
            .collect();
    }
    
    Some(paper)
}

fn generate_bibtex(papers: &[&LibraryPaper]) -> String {
    let mut output = String::new();
    
    for paper in papers {
        let p = &paper.paper;
        let entry_type = if p.conference.is_some() { "inproceedings" } else { "article" };
        let key = p.external_id.replace(['/', ':'], "_");
        
        output.push_str(&format!("@{}{{{},\n", entry_type, key));
        output.push_str(&format!("  title = {{{}}},\n", p.title));
        
        if !p.authors.is_empty() {
            let authors: Vec<_> = p.authors.iter().map(|a| a.name.as_str()).collect();
            output.push_str(&format!("  author = {{{}}},\n", authors.join(" and ")));
        }
        
        if let Some(year) = p.year {
            output.push_str(&format!("  year = {{{}}},\n", year));
        }
        if let Some(ref journal) = p.journal {
            output.push_str(&format!("  journal = {{{}}},\n", journal));
        }
        if let Some(ref conference) = p.conference {
            output.push_str(&format!("  booktitle = {{{}}},\n", conference));
        }
        if let Some(ref doi) = p.metadata.doi {
            output.push_str(&format!("  doi = {{{}}},\n", doi));
        }
        if let Some(ref abstract_text) = p.abstract_text {
            output.push_str(&format!("  abstract = {{{}}},\n", abstract_text));
        }
        
        output.push_str("}\n\n");
    }
    
    output
}

fn generate_csv(papers: &[&LibraryPaper]) -> String {
    let mut output = String::from("Title,Authors,Year,Venue,DOI,Citations,Status\n");
    
    for paper in papers {
        let p = &paper.paper;
        let authors: Vec<_> = p.authors.iter().map(|a| a.name.as_str()).collect();
        
        output.push_str(&format!(
            "\"{}\",\"{}\",{},{},{},{},{}\n",
            p.title.replace('"', "\"\""),
            authors.join("; "),
            p.year.map(|y| y.to_string()).unwrap_or_default(),
            p.venue.as_deref().unwrap_or("").replace('"', "\"\""),
            p.metadata.doi.as_deref().unwrap_or(""),
            p.citation_count.map(|c| c.to_string()).unwrap_or_default(),
            paper.reading_status
        ));
    }
    
    output
}

fn generate_markdown(papers: &[&LibraryPaper]) -> String {
    let mut output = String::from("# Paper Library Export\n\n");
    
    for paper in papers {
        let p = &paper.paper;
        output.push_str(&format!("## {}\n\n", p.title));
        
        let authors: Vec<_> = p.authors.iter().map(|a| a.name.as_str()).collect();
        output.push_str(&format!("**Authors:** {}\n\n", authors.join(", ")));
        
        if let Some(year) = p.year {
            output.push_str(&format!("**Year:** {}\n\n", year));
        }
        if let Some(ref venue) = p.venue {
            output.push_str(&format!("**Venue:** {}\n\n", venue));
        }
        if let Some(ref doi) = p.metadata.doi {
            output.push_str(&format!("**DOI:** https://doi.org/{}\n\n", doi));
        }
        if let Some(ref abstract_text) = p.abstract_text {
            output.push_str(&format!("**Abstract:**\n{}\n\n", abstract_text));
        }
        
        output.push_str("---\n\n");
    }
    
    output
}
