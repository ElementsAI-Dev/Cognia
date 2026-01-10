//! Academic Mode commands module
//! 
//! Provides paper search, download, and management functionality
//! through various academic paper providers.

pub mod providers;
pub mod types;
pub mod storage;

#[cfg(test)]
mod tests;

use providers::{
    arxiv::ArxivProvider,
    semantic_scholar::SemanticScholarProvider,
    core::CoreProvider,
    openalex::OpenAlexProvider,
    dblp::DblpProvider,
    unpaywall::UnpaywallProvider,
    AcademicProvider,
};
use types::*;
use storage::PaperStorage;
use std::sync::Arc;
use tauri::State;
use tokio::sync::RwLock;

/// State for academic mode functionality
pub struct AcademicState {
    pub providers: RwLock<Vec<Box<dyn AcademicProvider + Send + Sync>>>,
    pub storage: Arc<PaperStorage>,
}

impl AcademicState {
    pub fn new(storage_path: std::path::PathBuf) -> Result<Self, String> {
        let storage = PaperStorage::new(storage_path)
            .map_err(|e| format!("Failed to initialize paper storage: {}", e))?;
        
        let providers: Vec<Box<dyn AcademicProvider + Send + Sync>> = vec![
            Box::new(ArxivProvider::new()),
            Box::new(SemanticScholarProvider::new(None)),
            Box::new(CoreProvider::new(None)),
            Box::new(OpenAlexProvider::new(None)),
            Box::new(DblpProvider::new()),
            Box::new(UnpaywallProvider::new(None)),
        ];
        
        Ok(Self {
            providers: RwLock::new(providers),
            storage: Arc::new(storage),
        })
    }
    
}

// ============================================================================
// Search Commands
// ============================================================================

#[tauri::command]
pub async fn academic_search(
    state: State<'_, AcademicState>,
    query: String,
    options: SearchOptions,
) -> Result<AggregatedSearchResult, String> {
    let providers = state.providers.read().await;
    let target_providers: Vec<&Box<dyn AcademicProvider + Send + Sync>> = if options.providers.is_empty() {
        providers.iter().filter(|p| p.is_enabled()).collect()
    } else {
        providers.iter()
            .filter(|p| options.providers.contains(&p.provider_id().to_string()) && p.is_enabled())
            .collect()
    };
    
    if target_providers.is_empty() {
        return Err("No enabled providers available".to_string());
    }
    
    let start_time = std::time::Instant::now();
    let mut all_papers = Vec::new();
    let mut provider_results = std::collections::HashMap::new();
    
    for provider in target_providers {
        match provider.search(&query, &options).await {
            Ok(result) => {
                provider_results.insert(provider.provider_id().to_string(), ProviderSearchResult {
                    count: result.papers.len(),
                    success: true,
                    error: None,
                });
                all_papers.extend(result.papers);
            }
            Err(e) => {
                log::warn!("Provider {} search failed: {}", provider.provider_id(), e);
                provider_results.insert(provider.provider_id().to_string(), ProviderSearchResult {
                    count: 0,
                    success: false,
                    error: Some(e),
                });
            }
        }
    }
    
    // Deduplicate papers by DOI or title
    let papers = deduplicate_papers(all_papers);
    
    // Sort by relevance or specified field
    let papers = sort_papers(papers, &options.sort_by, &options.sort_order);
    
    Ok(AggregatedSearchResult {
        papers,
        total_results: provider_results.values().map(|r| r.count).sum(),
        provider_results,
        search_time_ms: start_time.elapsed().as_millis() as u64,
    })
}

#[tauri::command]
pub async fn academic_search_provider(
    state: State<'_, AcademicState>,
    provider_id: String,
    query: String,
    options: SearchOptions,
) -> Result<SearchResult, String> {
    let providers = state.providers.read().await;
    let provider = providers.iter()
        .find(|p| p.provider_id() == provider_id)
        .ok_or_else(|| format!("Provider '{}' not found", provider_id))?;
    
    if !provider.is_enabled() {
        return Err(format!("Provider '{}' is not enabled", provider_id));
    }
    
    provider.search(&query, &options).await
}

#[tauri::command]
pub async fn academic_get_paper(
    state: State<'_, AcademicState>,
    provider_id: String,
    paper_id: String,
) -> Result<Paper, String> {
    let providers = state.providers.read().await;
    let provider = providers.iter()
        .find(|p| p.provider_id() == provider_id)
        .ok_or_else(|| format!("Provider '{}' not found", provider_id))?;
    
    provider.get_paper(&paper_id).await
}

#[tauri::command]
pub async fn academic_get_citations(
    state: State<'_, AcademicState>,
    provider_id: String,
    paper_id: String,
    limit: Option<u32>,
    offset: Option<u32>,
) -> Result<Vec<PaperCitation>, String> {
    let providers = state.providers.read().await;
    let provider = providers.iter()
        .find(|p| p.provider_id() == provider_id)
        .ok_or_else(|| format!("Provider '{}' not found", provider_id))?;
    
    provider.get_citations(&paper_id, limit.unwrap_or(50), offset.unwrap_or(0)).await
}

#[tauri::command]
pub async fn academic_get_references(
    state: State<'_, AcademicState>,
    provider_id: String,
    paper_id: String,
    limit: Option<u32>,
    offset: Option<u32>,
) -> Result<Vec<PaperReference>, String> {
    let providers = state.providers.read().await;
    let provider = providers.iter()
        .find(|p| p.provider_id() == provider_id)
        .ok_or_else(|| format!("Provider '{}' not found", provider_id))?;
    
    provider.get_references(&paper_id, limit.unwrap_or(50), offset.unwrap_or(0)).await
}

// ============================================================================
// Download Commands
// ============================================================================

#[tauri::command]
pub async fn academic_download_pdf(
    state: State<'_, AcademicState>,
    paper_id: String,
    pdf_url: String,
) -> Result<String, String> {
    state.storage.download_pdf(&paper_id, &pdf_url).await
}

#[tauri::command]
pub async fn academic_get_pdf_path(
    state: State<'_, AcademicState>,
    paper_id: String,
) -> Result<Option<String>, String> {
    state.storage.get_pdf_path(&paper_id)
}

#[tauri::command]
pub async fn academic_delete_pdf(
    state: State<'_, AcademicState>,
    paper_id: String,
) -> Result<(), String> {
    state.storage.delete_pdf(&paper_id)
}

// ============================================================================
// Library Commands
// ============================================================================

#[tauri::command]
pub async fn academic_add_to_library(
    state: State<'_, AcademicState>,
    paper: Paper,
    collection_id: Option<String>,
) -> Result<LibraryPaper, String> {
    state.storage.add_paper(paper, collection_id).await
}

#[tauri::command]
pub async fn academic_remove_from_library(
    state: State<'_, AcademicState>,
    paper_id: String,
) -> Result<(), String> {
    state.storage.remove_paper(&paper_id).await
}

#[tauri::command]
pub async fn academic_get_library_papers(
    state: State<'_, AcademicState>,
    filter: Option<LibraryFilter>,
) -> Result<Vec<LibraryPaper>, String> {
    state.storage.get_papers(filter).await
}

#[tauri::command]
pub async fn academic_update_paper(
    state: State<'_, AcademicState>,
    paper_id: String,
    updates: PaperUpdate,
) -> Result<LibraryPaper, String> {
    state.storage.update_paper(&paper_id, updates).await
}

#[tauri::command]
pub async fn academic_get_paper_by_id(
    state: State<'_, AcademicState>,
    paper_id: String,
) -> Result<Option<LibraryPaper>, String> {
    state.storage.get_paper(&paper_id).await
}

// ============================================================================
// Collection Commands
// ============================================================================

#[tauri::command]
pub async fn academic_create_collection(
    state: State<'_, AcademicState>,
    name: String,
    description: Option<String>,
    color: Option<String>,
    parent_id: Option<String>,
) -> Result<PaperCollection, String> {
    state.storage.create_collection(name, description, color, parent_id).await
}

#[tauri::command]
pub async fn academic_update_collection(
    state: State<'_, AcademicState>,
    collection_id: String,
    updates: CollectionUpdate,
) -> Result<PaperCollection, String> {
    state.storage.update_collection(&collection_id, updates).await
}

#[tauri::command]
pub async fn academic_delete_collection(
    state: State<'_, AcademicState>,
    collection_id: String,
) -> Result<(), String> {
    state.storage.delete_collection(&collection_id).await
}

#[tauri::command]
pub async fn academic_get_collections(
    state: State<'_, AcademicState>,
) -> Result<Vec<PaperCollection>, String> {
    state.storage.get_collections().await
}

#[tauri::command]
pub async fn academic_add_paper_to_collection(
    state: State<'_, AcademicState>,
    paper_id: String,
    collection_id: String,
) -> Result<(), String> {
    state.storage.add_paper_to_collection(&paper_id, &collection_id).await
}

#[tauri::command]
pub async fn academic_remove_paper_from_collection(
    state: State<'_, AcademicState>,
    paper_id: String,
    collection_id: String,
) -> Result<(), String> {
    state.storage.remove_paper_from_collection(&paper_id, &collection_id).await
}

// ============================================================================
// Annotation Commands
// ============================================================================

#[tauri::command]
pub async fn academic_add_annotation(
    state: State<'_, AcademicState>,
    paper_id: String,
    annotation: CreateAnnotation,
) -> Result<PaperAnnotation, String> {
    state.storage.add_annotation(&paper_id, annotation).await
}

#[tauri::command]
pub async fn academic_update_annotation(
    state: State<'_, AcademicState>,
    annotation_id: String,
    updates: AnnotationUpdate,
) -> Result<PaperAnnotation, String> {
    state.storage.update_annotation(&annotation_id, updates).await
}

#[tauri::command]
pub async fn academic_delete_annotation(
    state: State<'_, AcademicState>,
    annotation_id: String,
) -> Result<(), String> {
    state.storage.delete_annotation(&annotation_id).await
}

#[tauri::command]
pub async fn academic_get_annotations(
    state: State<'_, AcademicState>,
    paper_id: String,
) -> Result<Vec<PaperAnnotation>, String> {
    state.storage.get_annotations(&paper_id).await
}

// ============================================================================
// Import/Export Commands
// ============================================================================

#[tauri::command]
pub async fn academic_import_papers(
    state: State<'_, AcademicState>,
    data: String,
    format: String,
    options: ImportOptions,
) -> Result<ImportResult, String> {
    state.storage.import_papers(&data, &format, options).await
}

#[tauri::command]
pub async fn academic_export_papers(
    state: State<'_, AcademicState>,
    paper_ids: Option<Vec<String>>,
    collection_id: Option<String>,
    format: String,
    options: ExportOptions,
) -> Result<ExportResult, String> {
    state.storage.export_papers(paper_ids, collection_id, &format, options).await
}

// ============================================================================
// Provider Configuration Commands
// ============================================================================

#[tauri::command]
pub async fn academic_get_providers(
    state: State<'_, AcademicState>,
) -> Result<Vec<ProviderInfo>, String> {
    let providers = state.providers.read().await;
    Ok(providers.iter().map(|p| p.info()).collect())
}

#[tauri::command]
pub async fn academic_set_provider_api_key(
    state: State<'_, AcademicState>,
    provider_id: String,
    api_key: Option<String>,
) -> Result<(), String> {
    let mut providers = state.providers.write().await;
    if let Some(provider) = providers.iter_mut().find(|p| p.provider_id() == provider_id) {
        provider.set_api_key(api_key);
        Ok(())
    } else {
        Err(format!("Provider '{}' not found", provider_id))
    }
}

#[tauri::command]
pub async fn academic_set_provider_enabled(
    state: State<'_, AcademicState>,
    provider_id: String,
    enabled: bool,
) -> Result<(), String> {
    let mut providers = state.providers.write().await;
    if let Some(provider) = providers.iter_mut().find(|p| p.provider_id() == provider_id) {
        provider.set_enabled(enabled);
        Ok(())
    } else {
        Err(format!("Provider '{}' not found", provider_id))
    }
}

#[tauri::command]
pub async fn academic_test_provider(
    state: State<'_, AcademicState>,
    provider_id: String,
) -> Result<bool, String> {
    let providers = state.providers.read().await;
    let provider = providers.iter()
        .find(|p| p.provider_id() == provider_id)
        .ok_or_else(|| format!("Provider '{}' not found", provider_id))?;
    
    provider.test_connection().await
}

// ============================================================================
// Statistics Commands
// ============================================================================

#[tauri::command]
pub async fn academic_get_statistics(
    state: State<'_, AcademicState>,
) -> Result<AcademicStatistics, String> {
    state.storage.get_statistics().await
}

// ============================================================================
// Helper Functions
// ============================================================================

fn deduplicate_papers(papers: Vec<Paper>) -> Vec<Paper> {
    use std::collections::HashSet;
    let mut seen_dois: HashSet<String> = HashSet::new();
    let mut seen_titles: HashSet<String> = HashSet::new();
    let mut result = Vec::new();
    
    for paper in papers {
        // Check DOI first
        if let Some(ref doi) = paper.metadata.doi {
            if seen_dois.contains(doi) {
                continue;
            }
            seen_dois.insert(doi.clone());
        }
        
        // Fallback to normalized title
        let normalized_title = paper.title.to_lowercase()
            .chars()
            .filter(|c| c.is_alphanumeric() || c.is_whitespace())
            .collect::<String>();
        
        if seen_titles.contains(&normalized_title) {
            continue;
        }
        seen_titles.insert(normalized_title);
        
        result.push(paper);
    }
    
    result
}

fn sort_papers(mut papers: Vec<Paper>, sort_by: &str, sort_order: &str) -> Vec<Paper> {
    let ascending = sort_order == "asc";
    
    let empty_string = String::new();
    papers.sort_by(|a, b| {
        let cmp = match sort_by {
            "date" => {
                let a_date = a.publication_date.as_ref().unwrap_or(&empty_string);
                let b_date = b.publication_date.as_ref().unwrap_or(&empty_string);
                a_date.cmp(b_date)
            }
            "citations" => {
                let a_cites = a.citation_count.unwrap_or(0);
                let b_cites = b.citation_count.unwrap_or(0);
                a_cites.cmp(&b_cites)
            }
            "title" => a.title.to_lowercase().cmp(&b.title.to_lowercase()),
            _ => std::cmp::Ordering::Equal, // relevance - keep original order
        };
        
        if ascending { cmp } else { cmp.reverse() }
    });
    
    papers
}

// ============================================================================
// Knowledge Map Commands
// ============================================================================

#[tauri::command]
pub async fn academic_generate_knowledge_map(
    content: String,
    title: Option<String>,
    mode: Option<String>,
    _options: Option<serde_json::Value>,
) -> Result<KnowledgeMap, String> {
    let now = chrono::Utc::now().to_rfc3339();
    let id = uuid::Uuid::new_v4().to_string();
    let title = title.unwrap_or_else(|| "Knowledge Map".to_string());
    let _mode = mode.unwrap_or_else(|| "DETAILED".to_string());
    
    // Parse content into traces
    let traces = parse_content_to_traces(&content, &id);
    
    // Generate mermaid diagram
    let mermaid_diagram = generate_mermaid_from_traces(&traces);
    
    // Generate mind map data
    let mind_map_data = generate_mind_map_from_traces(&traces, &title);
    
    Ok(KnowledgeMap {
        id,
        title,
        description: format!("Generated from content with {} traces", traces.len()),
        source_type: "content".to_string(),
        source_path: None,
        traces,
        mind_map_data: Some(mind_map_data),
        mermaid_diagram: Some(mermaid_diagram),
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub async fn academic_generate_knowledge_map_from_content(
    content: String,
    title: String,
) -> Result<KnowledgeMap, String> {
    let now = chrono::Utc::now().to_rfc3339();
    let id = uuid::Uuid::new_v4().to_string();
    
    // Parse content into traces
    let traces = parse_content_to_traces(&content, &id);
    
    // Generate mermaid diagram
    let mermaid_diagram = generate_mermaid_from_traces(&traces);
    
    // Generate mind map data
    let mind_map_data = generate_mind_map_from_traces(&traces, &title);
    
    Ok(KnowledgeMap {
        id,
        title,
        description: format!("Generated from content with {} traces", traces.len()),
        source_type: "content".to_string(),
        source_path: None,
        traces,
        mind_map_data: Some(mind_map_data),
        mermaid_diagram: Some(mermaid_diagram),
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub async fn academic_generate_mind_map(
    knowledge_map: KnowledgeMap,
    layout: Option<String>,
    _max_depth: Option<i32>,
    theme: Option<String>,
) -> Result<MindMapData, String> {
    let mind_map = generate_mind_map_from_traces(
        &knowledge_map.traces,
        &knowledge_map.title,
    );
    
    Ok(MindMapData {
        layout: layout.unwrap_or_else(|| "radial".to_string()),
        theme,
        ..mind_map
    })
}

#[tauri::command]
pub async fn academic_generate_mind_map_from_content(
    content: String,
    title: Option<String>,
    layout: Option<String>,
    _max_depth: Option<i32>,
    theme: Option<String>,
) -> Result<MindMapData, String> {
    let title = title.unwrap_or_else(|| "Mind Map".to_string());
    let id = uuid::Uuid::new_v4().to_string();
    
    // Parse content into traces first
    let traces = parse_content_to_traces(&content, &id);
    
    // Generate mind map from traces
    let mind_map = generate_mind_map_from_traces(&traces, &title);
    
    Ok(MindMapData {
        layout: layout.unwrap_or_else(|| "radial".to_string()),
        theme,
        ..mind_map
    })
}

#[tauri::command]
pub async fn academic_extract_pdf_content(
    pdf_path: String,
    options: Option<PDFConversionOptions>,
) -> Result<PDFConversionResult, String> {
    let options = options.unwrap_or_default();
    
    // Read PDF file
    let pdf_bytes = std::fs::read(&pdf_path)
        .map_err(|e| format!("Failed to read PDF file: {}", e))?;
    
    // Extract text content using pdf-extract or similar
    let text_content = extract_pdf_text(&pdf_bytes)?;
    
    // Convert to markdown
    let markdown = convert_text_to_markdown(&text_content);
    
    // Extract images, tables, equations if enabled
    let images = if options.extract_images {
        extract_pdf_images(&pdf_bytes)?
    } else {
        Vec::new()
    };
    
    let tables = if options.extract_tables {
        extract_pdf_tables(&text_content)?
    } else {
        Vec::new()
    };
    
    let equations = if options.extract_equations {
        extract_pdf_equations(&text_content)?
    } else {
        Vec::new()
    };
    
    // Generate knowledge map if enabled
    let knowledge_map = if options.generate_knowledge_map {
        let id = uuid::Uuid::new_v4().to_string();
        let traces = parse_content_to_traces(&text_content, &id);
        let mermaid_diagram = generate_mermaid_from_traces(&traces);
        let mind_map_data = if options.generate_mind_map {
            Some(generate_mind_map_from_traces(&traces, &pdf_path))
        } else {
            None
        };
        let now = chrono::Utc::now().to_rfc3339();
        
        Some(KnowledgeMap {
            id,
            title: std::path::Path::new(&pdf_path)
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("PDF Document")
                .to_string(),
            description: format!("Generated from {}", pdf_path),
            source_type: "pdf".to_string(),
            source_path: Some(pdf_path.clone()),
            traces,
            mind_map_data,
            mermaid_diagram: Some(mermaid_diagram),
            created_at: now.clone(),
            updated_at: now,
        })
    } else {
        None
    };
    
    // Generate mind map if enabled (separate from knowledge map)
    let mind_map = if options.generate_mind_map && knowledge_map.is_none() {
        let id = uuid::Uuid::new_v4().to_string();
        let traces = parse_content_to_traces(&text_content, &id);
        Some(generate_mind_map_from_traces(&traces, &pdf_path))
    } else {
        None
    };
    
    Ok(PDFConversionResult {
        success: true,
        markdown,
        knowledge_map,
        mind_map,
        images,
        tables,
        equations,
        error: None,
    })
}

// ============================================================================
// Knowledge Map Helper Functions
// ============================================================================

fn parse_content_to_traces(content: &str, knowledge_map_id: &str) -> Vec<KnowledgeMapTrace> {
    let mut traces = Vec::new();
    let lines: Vec<&str> = content.lines().collect();
    
    // Simple parsing: treat headers as trace boundaries
    let mut current_trace: Option<KnowledgeMapTrace> = None;
    let mut current_locations = Vec::new();
    let mut line_num = 1;
    
    for line in &lines {
        let trimmed = line.trim();
        
        // Check if this is a header (markdown style)
        if trimmed.starts_with('#') {
            // Save previous trace
            if let Some(mut trace) = current_trace.take() {
                trace.locations = current_locations.clone();
                traces.push(trace);
                current_locations.clear();
            }
            
            // Start new trace
            let title = trimmed.trim_start_matches('#').trim().to_string();
            current_trace = Some(KnowledgeMapTrace {
                id: uuid::Uuid::new_v4().to_string(),
                title: title.clone(),
                description: format!("Section: {}", title),
                locations: Vec::new(),
                trace_text_diagram: None,
                trace_guide: None,
            });
        } else if !trimmed.is_empty() && current_trace.is_some() {
            // Add location to current trace
            current_locations.push(KnowledgeMapLocation {
                file_path: knowledge_map_id.to_string(),
                start_line: line_num,
                end_line: line_num,
                text_snippet: trimmed.chars().take(200).collect(),
                page_number: Some((line_num / 50) + 1),
            });
        }
        
        line_num += 1;
    }
    
    // Save last trace
    if let Some(mut trace) = current_trace.take() {
        trace.locations = current_locations;
        traces.push(trace);
    }
    
    // If no traces found, create a default one
    if traces.is_empty() {
        traces.push(KnowledgeMapTrace {
            id: uuid::Uuid::new_v4().to_string(),
            title: "Content Overview".to_string(),
            description: "Main content".to_string(),
            locations: vec![KnowledgeMapLocation {
                file_path: knowledge_map_id.to_string(),
                start_line: 1,
                end_line: lines.len() as i32,
                text_snippet: content.chars().take(500).collect(),
                page_number: Some(1),
            }],
            trace_text_diagram: None,
            trace_guide: None,
        });
    }
    
    traces
}

fn generate_mermaid_from_traces(traces: &[KnowledgeMapTrace]) -> String {
    let mut mermaid = String::from("graph TD\n");
    
    let mut prev_id: Option<String> = None;
    
    for trace in traces {
        let safe_id = trace.id.replace('-', "_");
        let safe_title = trace.title.replace('"', "'").chars().take(30).collect::<String>();
        
        mermaid.push_str(&format!("    {}[\"{}\"]\n", safe_id, safe_title));
        
        if let Some(prev) = &prev_id {
            mermaid.push_str(&format!("    {} --> {}\n", prev, safe_id));
        }
        
        prev_id = Some(safe_id);
    }
    
    mermaid
}

fn generate_mind_map_from_traces(traces: &[KnowledgeMapTrace], title: &str) -> MindMapData {
    let now = chrono::Utc::now().to_rfc3339();
    let root_id = uuid::Uuid::new_v4().to_string();
    let mut nodes = Vec::new();
    let mut edges = Vec::new();
    
    // Create root node
    nodes.push(MindMapNode {
        id: root_id.clone(),
        label: title.to_string(),
        node_type: "root".to_string(),
        description: Some(format!("Knowledge map with {} sections", traces.len())),
        parent_id: None,
        children: traces.iter().map(|t| t.id.clone()).collect(),
        location_ref: None,
        page_number: None,
        metadata: None,
    });
    
    // Create nodes for each trace
    for trace in traces {
        nodes.push(MindMapNode {
            id: trace.id.clone(),
            label: trace.title.clone(),
            node_type: "section".to_string(),
            description: Some(trace.description.clone()),
            parent_id: Some(root_id.clone()),
            children: trace.locations.iter().enumerate().map(|(i, _)| format!("{}_{}", trace.id, i)).collect(),
            location_ref: trace.locations.first().map(|l| l.file_path.clone()),
            page_number: trace.locations.first().and_then(|l| l.page_number),
            metadata: None,
        });
        
        // Create edge from root to trace
        edges.push(MindMapEdge {
            id: uuid::Uuid::new_v4().to_string(),
            source: root_id.clone(),
            target: trace.id.clone(),
            label: None,
            edge_type: "contains".to_string(),
        });
        
        // Create nodes for locations (limited to first 5)
        for (i, location) in trace.locations.iter().take(5).enumerate() {
            let loc_id = format!("{}_{}", trace.id, i);
            nodes.push(MindMapNode {
                id: loc_id.clone(),
                label: location.text_snippet.chars().take(50).collect(),
                node_type: "location".to_string(),
                description: Some(location.text_snippet.clone()),
                parent_id: Some(trace.id.clone()),
                children: Vec::new(),
                location_ref: Some(location.file_path.clone()),
                page_number: location.page_number,
                metadata: None,
            });
            
            edges.push(MindMapEdge {
                id: uuid::Uuid::new_v4().to_string(),
                source: trace.id.clone(),
                target: loc_id,
                label: None,
                edge_type: "references".to_string(),
            });
        }
    }
    
    MindMapData {
        id: uuid::Uuid::new_v4().to_string(),
        title: title.to_string(),
        root_id,
        nodes,
        edges,
        layout: "radial".to_string(),
        theme: None,
        created_at: now.clone(),
        updated_at: now,
    }
}

fn extract_pdf_text(_pdf_bytes: &[u8]) -> Result<String, String> {
    // PDF text extraction placeholder
    // TODO: Implement with lopdf or pdf-extract when available
    Ok(String::from("[PDF content extraction not yet implemented]"))
}

fn convert_text_to_markdown(text: &str) -> String {
    let mut markdown = String::new();
    let lines: Vec<&str> = text.lines().collect();
    
    for line in lines {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            markdown.push_str("\n\n");
        } else {
            // Simple heuristics for headers (all caps, short lines)
            if trimmed.len() < 100 && trimmed.chars().filter(|c| c.is_uppercase()).count() > trimmed.len() / 2 {
                markdown.push_str(&format!("## {}\n\n", trimmed));
            } else {
                markdown.push_str(trimmed);
                markdown.push_str(" ");
            }
        }
    }
    
    markdown
}

fn extract_pdf_images(_pdf_bytes: &[u8]) -> Result<Vec<ExtractedImage>, String> {
    // Placeholder - actual implementation would extract images from PDF
    Ok(Vec::new())
}

fn extract_pdf_tables(text: &str) -> Result<Vec<ExtractedTable>, String> {
    // Simple table detection based on pipe characters or tab-separated values
    let mut tables = Vec::new();
    let lines: Vec<&str> = text.lines().collect();
    
    let mut i = 0;
    while i < lines.len() {
        let line = lines[i];
        if line.contains('|') && line.matches('|').count() >= 2 {
            // Potential table
            let mut table_lines = vec![line];
            let mut j = i + 1;
            while j < lines.len() && lines[j].contains('|') {
                table_lines.push(lines[j]);
                j += 1;
            }
            
            if table_lines.len() >= 2 {
                let headers: Vec<String> = table_lines[0]
                    .split('|')
                    .filter(|s| !s.trim().is_empty())
                    .map(|s| s.trim().to_string())
                    .collect();
                
                let rows: Vec<Vec<String>> = table_lines[1..]
                    .iter()
                    .filter(|l| !l.contains("---"))
                    .map(|l| {
                        l.split('|')
                            .filter(|s| !s.trim().is_empty())
                            .map(|s| s.trim().to_string())
                            .collect()
                    })
                    .collect();
                
                let markdown = table_lines.join("\n");
                
                tables.push(ExtractedTable {
                    id: uuid::Uuid::new_v4().to_string(),
                    page_number: (i / 50) as i32 + 1,
                    caption: None,
                    headers,
                    rows,
                    markdown,
                });
            }
            
            i = j;
        } else {
            i += 1;
        }
    }
    
    Ok(tables)
}

fn extract_pdf_equations(text: &str) -> Result<Vec<ExtractedEquation>, String> {
    // Simple equation detection based on LaTeX patterns
    let mut equations = Vec::new();
    let lines: Vec<&str> = text.lines().collect();
    
    for (i, line) in lines.iter().enumerate() {
        // Look for inline math: $...$
        if line.contains('$') {
            let parts: Vec<&str> = line.split('$').collect();
            for (j, part) in parts.iter().enumerate() {
                if j % 2 == 1 && !part.is_empty() {
                    equations.push(ExtractedEquation {
                        id: uuid::Uuid::new_v4().to_string(),
                        page_number: (i / 50) as i32 + 1,
                        latex: format!("${}", part),
                        equation_type: "inline".to_string(),
                    });
                }
            }
        }
        
        // Look for display math: \[...\] or $$...$$
        if line.contains("\\[") || line.contains("$$") {
            equations.push(ExtractedEquation {
                id: uuid::Uuid::new_v4().to_string(),
                page_number: (i / 50) as i32 + 1,
                latex: line.to_string(),
                equation_type: "display".to_string(),
            });
        }
    }
    
    Ok(equations)
}
