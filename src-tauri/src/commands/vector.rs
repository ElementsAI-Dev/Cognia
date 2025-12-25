use anyhow::Result;
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

// #[cfg(test)]
// mod tests;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollectionMeta {
    pub name: String,
    pub dimension: usize,
    #[serde(default)]
    pub metadata: Option<Value>,
    #[serde(default)]
    pub document_count: usize,
    #[serde(default = "default_timestamp")]
    pub created_at: u64,
    #[serde(default = "default_timestamp")]
    pub updated_at: u64,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub embedding_model: Option<String>,
    #[serde(default)]
    pub embedding_provider: Option<String>,
}

fn default_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PointRecord {
    pub id: String,
    pub vector: Vec<f64>,
    #[serde(default)]
    pub payload: Option<Value>,
}

#[derive(Debug, Default, Serialize, Deserialize)]
struct VectorData {
    collections: HashMap<String, CollectionMeta>,
    points: HashMap<String, Vec<PointRecord>>, // collection -> points
}

pub struct VectorStoreState {
    path: PathBuf,
    data: Mutex<VectorData>,
}

impl VectorStoreState {
    pub fn new(path: PathBuf) -> Result<Self> {
        let data = if path.exists() {
            let content = fs::read_to_string(&path)?;
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            VectorData::default()
        };
        Ok(Self {
            path,
            data: Mutex::new(data),
        })
    }

    fn persist(&self, data: &VectorData) -> Result<()> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)?;
        }
        let serialized = serde_json::to_string_pretty(data)?;
        let mut file = fs::File::create(&self.path)?;
        file.write_all(serialized.as_bytes())?;
        Ok(())
    }
}

fn cosine_similarity(a: &[f64], b: &[f64]) -> f64 {
    let mut dot = 0.0;
    let mut norm_a = 0.0;
    let mut norm_b = 0.0;
    for (x, y) in a.iter().zip(b.iter()) {
        dot += x * y;
        norm_a += x * x;
        norm_b += y * y;
    }
    if norm_a == 0.0 || norm_b == 0.0 {
        return 0.0;
    }
    dot / (norm_a.sqrt() * norm_b.sqrt())
}

fn collection_count(name: &str, data: &VectorData) -> usize {
    data.points
        .get(name)
        .map(|v| v.len())
        .unwrap_or(0)
}

#[derive(Debug, Deserialize, Clone)]
pub struct CreateCollectionPayload {
    pub name: String,
    pub dimension: usize,
    #[serde(default)]
    pub metadata: Option<Value>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub embedding_model: Option<String>,
    #[serde(default)]
    pub embedding_provider: Option<String>,
}

pub fn create_collection_impl(
    state: &VectorStoreState,
    payload: CreateCollectionPayload,
) -> Result<bool, String> {
    let mut data = state.data.lock();
    if let Some(existing) = data.collections.get(&payload.name) {
        if existing.dimension != payload.dimension {
            return Err("Collection exists with different dimension".to_string());
        }
        return Ok(true);
    }
    let now = default_timestamp();
    data.collections.insert(
        payload.name.clone(),
        CollectionMeta {
            name: payload.name.clone(),
            dimension: payload.dimension,
            metadata: payload.metadata,
            document_count: 0,
            created_at: now,
            updated_at: now,
            description: payload.description,
            embedding_model: payload.embedding_model,
            embedding_provider: payload.embedding_provider,
        },
    );
    data.points.insert(payload.name, Vec::new());
    state.persist(&data).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn vector_create_collection(
    state: tauri::State<Arc<VectorStoreState>>,
    payload: CreateCollectionPayload,
) -> Result<bool, String> {
    create_collection_impl(&state, payload)
}

pub fn delete_collection_impl(
    state: &VectorStoreState,
    name: String,
) -> Result<bool, String> {
    let mut data = state.data.lock();
    data.collections.remove(&name);
    data.points.remove(&name);
    state.persist(&data).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn vector_delete_collection(
    state: tauri::State<Arc<VectorStoreState>>,
    name: String,
) -> Result<bool, String> {
    delete_collection_impl(&state, name)
}

#[tauri::command]
pub fn vector_rename_collection(
    state: tauri::State<Arc<VectorStoreState>>,
    old_name: String,
    new_name: String,
) -> Result<bool, String> {
    let mut data = state.data.lock();
    
    // Check if old collection exists
    let mut meta = data
        .collections
        .get(&old_name)
        .cloned()
        .ok_or_else(|| "Collection not found".to_string())?;
    
    // Check if new name already exists
    if data.collections.contains_key(&new_name) {
        return Err("Collection with new name already exists".to_string());
    }
    
    // Update metadata
    meta.name = new_name.clone();
    meta.updated_at = default_timestamp();
    
    // Move collection and points
    data.collections.remove(&old_name);
    data.collections.insert(new_name.clone(), meta);
    
    if let Some(points) = data.points.remove(&old_name) {
        data.points.insert(new_name, points);
    }
    
    state.persist(&data).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn vector_truncate_collection(
    state: tauri::State<Arc<VectorStoreState>>,
    name: String,
) -> Result<bool, String> {
    let mut data = state.data.lock();
    
    // Check if collection exists
    let mut meta = data
        .collections
        .get(&name)
        .cloned()
        .ok_or_else(|| "Collection not found".to_string())?;
    
    // Update metadata
    meta.document_count = 0;
    meta.updated_at = default_timestamp();
    data.collections.insert(name.clone(), meta);
    
    // Clear all points
    data.points.insert(name, Vec::new());
    
    state.persist(&data).map_err(|e| e.to_string())?;
    Ok(true)
}

#[derive(Debug, Serialize)]
pub struct CollectionExport {
    pub meta: CollectionMeta,
    pub points: Vec<PointRecord>,
}

#[tauri::command]
pub fn vector_export_collection(
    state: tauri::State<Arc<VectorStoreState>>,
    name: String,
) -> Result<CollectionExport, String> {
    let data = state.data.lock();
    let meta = data
        .collections
        .get(&name)
        .cloned()
        .ok_or_else(|| "Collection not found".to_string())?;
    let points = data
        .points
        .get(&name)
        .cloned()
        .unwrap_or_default();
    
    Ok(CollectionExport { meta, points })
}

#[derive(Debug, Deserialize, Clone)]
pub struct CollectionImport {
    pub meta: CollectionMeta,
    pub points: Vec<PointRecord>,
}

#[tauri::command]
pub fn vector_import_collection(
    state: tauri::State<Arc<VectorStoreState>>,
    import_data: CollectionImport,
    overwrite: Option<bool>,
) -> Result<bool, String> {
    let mut data = state.data.lock();
    let overwrite = overwrite.unwrap_or(false);
    
    // Check if collection already exists
    if data.collections.contains_key(&import_data.meta.name) && !overwrite {
        return Err("Collection already exists. Use overwrite=true to replace".to_string());
    }
    
    // Update timestamps
    let mut meta = import_data.meta;
    let now = default_timestamp();
    let collection_name = meta.name.clone();
    if !data.collections.contains_key(&collection_name) {
        meta.created_at = now;
    }
    meta.updated_at = now;
    meta.document_count = import_data.points.len();
    
    // Import collection and points
    data.collections.insert(collection_name.clone(), meta);
    data.points.insert(collection_name, import_data.points);
    
    state.persist(&data).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn vector_list_collections(
    state: tauri::State<Arc<VectorStoreState>>,
) -> Result<Vec<CollectionMeta>, String> {
    let data = state.data.lock();
    let mut list: Vec<CollectionMeta> = Vec::new();
    for (name, meta) in data.collections.iter() {
        let mut m = meta.clone();
        m.document_count = collection_count(name, &data);
        list.push(m);
    }
    Ok(list)
}

#[tauri::command]
pub fn vector_get_collection(
    state: tauri::State<Arc<VectorStoreState>>,
    name: String,
) -> Result<CollectionMeta, String> {
    let data = state.data.lock();
    let mut meta = data
        .collections
        .get(&name)
        .cloned()
        .ok_or_else(|| "Collection not found".to_string())?;
    meta.document_count = collection_count(&name, &data);
    Ok(meta)
}

#[derive(Debug, Deserialize)]
pub struct UpsertPoint {
    pub id: String,
    pub vector: Vec<f64>,
    pub payload: Option<Value>,
}

#[tauri::command]
pub fn vector_upsert_points(
    state: tauri::State<Arc<VectorStoreState>>,
    collection: String,
    points: Vec<UpsertPoint>,
) -> Result<bool, String> {
    let mut data = state.data.lock();
    
    // Check collection exists and get dimension
    let collection_meta = data
        .collections
        .get(&collection)
        .ok_or_else(|| "Collection not found".to_string())?;
    let expected_dimension = collection_meta.dimension;
    
    // Validate dimensions
    for p in &points {
        if p.vector.len() != expected_dimension {
            return Err(format!(
                "Vector dimension mismatch: expected {}, got {}",
                expected_dimension,
                p.vector.len()
            ));
        }
    }
    
    let entry = data.points.entry(collection.clone()).or_insert_with(Vec::new);
    let mut added_count = 0;
    
    for p in points {
        if let Some(existing) = entry.iter_mut().find(|x| x.id == p.id) {
            existing.vector = p.vector;
            existing.payload = p.payload;
        } else {
            entry.push(PointRecord {
                id: p.id,
                vector: p.vector,
                payload: p.payload,
            });
            added_count += 1;
        }
    }
    
    // Update document count and timestamp in collection metadata
    if added_count > 0 {
        let entry_len = entry.len();
        if let Some(meta) = data.collections.get_mut(&collection) {
            meta.document_count = entry_len;
            meta.updated_at = default_timestamp();
        }
    }
    
    state.persist(&data).map_err(|e| e.to_string())?;
    Ok(true)
}


#[tauri::command]
pub fn vector_delete_points(
    state: tauri::State<Arc<VectorStoreState>>,
    collection: String,
    ids: Vec<String>,
) -> Result<bool, String> {
    let mut data = state.data.lock();
    let mut deleted_count = 0;
    
    if let Some(points) = data.points.get_mut(&collection) {
        let original_len = points.len();
        points.retain(|p| !ids.contains(&p.id));
        deleted_count = original_len - points.len();
        
        // Update document count and timestamp in collection metadata
        if deleted_count > 0 {
            let points_len = points.len();
            if let Some(meta) = data.collections.get_mut(&collection) {
                meta.document_count = points_len;
                meta.updated_at = default_timestamp();
            }
        }
    }
    
    state.persist(&data).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn vector_get_points(
    state: tauri::State<Arc<VectorStoreState>>,
    collection: String,
    ids: Vec<String>,
) -> Result<Vec<PointRecord>, String> {
    let data = state.data.lock();
    let points = data
        .points
        .get(&collection)
        .ok_or_else(|| "Collection not found".to_string())?;
    let filtered = points
        .iter()
        .filter(|p| ids.contains(&p.id))
        .cloned()
        .collect();
    Ok(filtered)
}

#[derive(Debug, Deserialize)]
pub struct PayloadFilter {
    pub key: String,
    pub value: Value,
    pub operation: String, // "equals", "contains", "greater_than", "less_than"
}

#[derive(Debug, Deserialize)]
pub struct SearchPayload {
    pub collection: String,
    pub vector: Vec<f64>,
    pub top_k: Option<usize>,
    pub score_threshold: Option<f64>,
    pub offset: Option<usize>,
    pub limit: Option<usize>,
    pub filters: Option<Vec<PayloadFilter>>,
}

#[derive(Debug, Serialize, Clone)]
pub struct SearchResult {
    pub id: String,
    pub score: f64,
    pub payload: Option<Value>,
}

fn matches_filter(payload_value: &Value, filter: &PayloadFilter) -> bool {
    let target_value = &filter.value;
    
    match filter.operation.as_str() {
        "equals" => payload_value == target_value,
        "contains" => {
            if let (Value::String(payload_str), Value::String(filter_str)) = (payload_value, target_value) {
                payload_str.contains(filter_str)
            } else {
                false
            }
        },
        "greater_than" => {
            match (payload_value, target_value) {
                (Value::Number(p), Value::Number(f)) => p.as_f64().unwrap_or(0.0) > f.as_f64().unwrap_or(0.0),
                _ => false,
            }
        },
        "less_than" => {
            match (payload_value, target_value) {
                (Value::Number(p), Value::Number(f)) => p.as_f64().unwrap_or(0.0) < f.as_f64().unwrap_or(0.0),
                _ => false,
            }
        },
        _ => false,
    }
}

fn apply_payload_filters(point: &PointRecord, filters: &[PayloadFilter]) -> bool {
    if let Some(payload) = &point.payload {
        for filter in filters {
            if let Some(payload_value) = payload.get(&filter.key) {
                if !matches_filter(payload_value, filter) {
                    return false;
                }
            } else {
                return false; // Key not found
            }
        }
    } else if !filters.is_empty() {
        return false; // No payload but filters specified
    }
    true
}

#[tauri::command]
pub fn vector_search_points(
    state: tauri::State<Arc<VectorStoreState>>,
    payload: SearchPayload,
) -> Result<Vec<SearchResult>, String> {
    let data = state.data.lock();
    let points = data
        .points
        .get(&payload.collection)
        .ok_or_else(|| "Collection not found".to_string())?;

    let top_k = payload.top_k.unwrap_or(5);
    let offset = payload.offset.unwrap_or(0);
    let limit = payload.limit.unwrap_or(top_k);
    
    // Apply filters first
    let filtered_points: Vec<&PointRecord> = if let Some(filters) = &payload.filters {
        points
            .iter()
            .filter(|p| apply_payload_filters(p, filters))
            .collect()
    } else {
        points.iter().collect()
    };
    
    // Calculate similarity scores
    let mut scored: Vec<SearchResult> = filtered_points
        .iter()
        .map(|p| SearchResult {
            id: p.id.clone(),
            score: cosine_similarity(&payload.vector, &p.vector),
            payload: p.payload.clone(),
        })
        .filter(|r| payload.score_threshold.map(|t| r.score >= t).unwrap_or(true))
        .collect();
        
    // Sort by score
    scored.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
    
    // Apply pagination
    let total_results = scored.len();
    if offset >= total_results {
        return Ok(vec![]);
    }
    
    let end_index = std::cmp::min(offset + limit, total_results);
    scored = scored[offset..end_index].to_vec();
    
    Ok(scored)
}

