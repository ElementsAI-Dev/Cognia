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

#[cfg(test)]
mod tests;

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
        
        // Atomic write: write to temp file, then rename
        let temp_path = self.path.with_extension("tmp");
        let serialized = serde_json::to_string_pretty(data)?;
        
        {
            let mut file = fs::File::create(&temp_path)?;
            file.write_all(serialized.as_bytes())?;
            file.sync_all()?; // Ensure data is flushed to disk
        }
        
        // Atomic rename (on most filesystems)
        fs::rename(&temp_path, &self.path)?;
        
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

#[tauri::command]
pub fn vector_create_collection(
    state: tauri::State<Arc<VectorStoreState>>,
    payload: CreateCollectionPayload,
) -> Result<bool, String> {
    create_collection_impl(&state, payload)
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
    rename_collection_impl(&state, old_name, new_name)
}

pub fn rename_collection_impl(
    state: &VectorStoreState,
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
    truncate_collection_impl(&state, name)
}

pub fn truncate_collection_impl(
    state: &VectorStoreState,
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
    export_collection_impl(&state, name)
}

pub fn export_collection_impl(
    state: &VectorStoreState,
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
    import_collection_impl(&state, import_data, overwrite)
}

pub fn import_collection_impl(
    state: &VectorStoreState,
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
    list_collections_impl(&state)
}

pub fn list_collections_impl(
    state: &VectorStoreState,
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
    get_collection_impl(&state, name)
}

pub fn get_collection_impl(
    state: &VectorStoreState,
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
    upsert_points_impl(&state, collection, points)
}

fn validate_vector(vector: &[f64], id: &str) -> Result<(), String> {
    for (i, &val) in vector.iter().enumerate() {
        if val.is_nan() {
            return Err(format!("Vector for id '{}' contains NaN at index {}", id, i));
        }
        if val.is_infinite() {
            return Err(format!("Vector for id '{}' contains Infinity at index {}", id, i));
        }
    }
    Ok(())
}

pub fn upsert_points_impl(
    state: &VectorStoreState,
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
    
    // Validate dimensions and vector values
    for p in &points {
        if p.vector.len() != expected_dimension {
            return Err(format!(
                "Vector dimension mismatch for id '{}': expected {}, got {}",
                p.id,
                expected_dimension,
                p.vector.len()
            ));
        }
        validate_vector(&p.vector, &p.id)?;
    }
    
    let entry = data.points.entry(collection.clone()).or_default();
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
    delete_points_impl(&state, collection, ids)
}

pub fn delete_points_impl(
    state: &VectorStoreState,
    collection: String,
    ids: Vec<String>,
) -> Result<bool, String> {
    let mut data = state.data.lock();
    if let Some(points) = data.points.get_mut(&collection) {
        let original_len = points.len();
        points.retain(|p| !ids.contains(&p.id));
        let deleted_count = original_len - points.len();
        
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
    get_points_impl(&state, collection, ids)
}

pub fn get_points_impl(
    state: &VectorStoreState,
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
    pub filter_mode: Option<String>, // "and" or "or", defaults to "and"
}

#[derive(Debug, Serialize, Clone)]
pub struct SearchResult {
    pub id: String,
    pub score: f64,
    pub payload: Option<Value>,
}

#[derive(Debug, Serialize)]
pub struct SearchResponse {
    pub results: Vec<SearchResult>,
    pub total: usize,
    pub offset: usize,
    pub limit: usize,
}

fn matches_filter(payload_value: &Value, filter: &PayloadFilter) -> bool {
    let target_value = &filter.value;
    
    match filter.operation.as_str() {
        "equals" => payload_value == target_value,
        "not_equals" => payload_value != target_value,
        "contains" => {
            // String contains substring OR array contains element
            match payload_value {
                Value::String(payload_str) => {
                    if let Value::String(filter_str) = target_value {
                        payload_str.contains(filter_str)
                    } else {
                        false
                    }
                },
                Value::Array(arr) => arr.contains(target_value),
                _ => false,
            }
        },
        "not_contains" => {
            match payload_value {
                Value::String(payload_str) => {
                    if let Value::String(filter_str) = target_value {
                        !payload_str.contains(filter_str)
                    } else {
                        true
                    }
                },
                Value::Array(arr) => !arr.contains(target_value),
                _ => true,
            }
        },
        "greater_than" => {
            match (payload_value, target_value) {
                (Value::Number(p), Value::Number(f)) => p.as_f64().unwrap_or(0.0) > f.as_f64().unwrap_or(0.0),
                _ => false,
            }
        },
        "greater_than_or_equals" => {
            match (payload_value, target_value) {
                (Value::Number(p), Value::Number(f)) => p.as_f64().unwrap_or(0.0) >= f.as_f64().unwrap_or(0.0),
                _ => false,
            }
        },
        "less_than" => {
            match (payload_value, target_value) {
                (Value::Number(p), Value::Number(f)) => p.as_f64().unwrap_or(0.0) < f.as_f64().unwrap_or(0.0),
                _ => false,
            }
        },
        "less_than_or_equals" => {
            match (payload_value, target_value) {
                (Value::Number(p), Value::Number(f)) => p.as_f64().unwrap_or(0.0) <= f.as_f64().unwrap_or(0.0),
                _ => false,
            }
        },
        "is_null" => payload_value.is_null(),
        "is_not_null" => !payload_value.is_null(),
        "starts_with" => {
            if let (Value::String(payload_str), Value::String(filter_str)) = (payload_value, target_value) {
                payload_str.starts_with(filter_str)
            } else {
                false
            }
        },
        "ends_with" => {
            if let (Value::String(payload_str), Value::String(filter_str)) = (payload_value, target_value) {
                payload_str.ends_with(filter_str)
            } else {
                false
            }
        },
        "in" => {
            // Check if payload_value is in target array
            if let Value::Array(arr) = target_value {
                arr.contains(payload_value)
            } else {
                false
            }
        },
        "not_in" => {
            if let Value::Array(arr) = target_value {
                !arr.contains(payload_value)
            } else {
                true
            }
        },
        _ => false,
    }
}

fn apply_payload_filters(point: &PointRecord, filters: &[PayloadFilter], mode: &str) -> bool {
    if filters.is_empty() {
        return true;
    }
    
    let Some(payload) = &point.payload else {
        return false; // No payload but filters specified
    };
    
    let use_or = mode == "or";
    
    for filter in filters {
        let matches = if let Some(payload_value) = payload.get(&filter.key) {
            matches_filter(payload_value, filter)
        } else {
            false // Key not found
        };
        
        if use_or {
            // OR mode: return true if any filter matches
            if matches {
                return true;
            }
        } else {
            // AND mode: return false if any filter doesn't match
            if !matches {
                return false;
            }
        }
    }
    
    // For OR mode, if we get here no filter matched
    // For AND mode, if we get here all filters matched
    !use_or
}

#[tauri::command]
pub fn vector_search_points(
    state: tauri::State<Arc<VectorStoreState>>,
    payload: SearchPayload,
) -> Result<SearchResponse, String> {
    search_points_impl(&state, payload)
}

pub fn search_points_impl(
    state: &VectorStoreState,
    payload: SearchPayload,
) -> Result<SearchResponse, String> {
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
            .filter(|p| apply_payload_filters(p, filters, payload.filter_mode.as_deref().unwrap_or("and")))
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
    
    // Total before pagination
    let total = scored.len();
    
    // Apply pagination
    if offset >= total {
        return Ok(SearchResponse { results: vec![], total, offset, limit });
    }
    
    let end_index = std::cmp::min(offset + limit, total);
    let results = scored[offset..end_index].to_vec();
    
    Ok(SearchResponse { results, total, offset, limit })
}

// ============ Delete All Points ============

#[tauri::command]
pub fn vector_delete_all_points(
    state: tauri::State<Arc<VectorStoreState>>,
    collection: String,
) -> Result<usize, String> {
    delete_all_points_impl(&state, collection)
}

pub fn delete_all_points_impl(
    state: &VectorStoreState,
    collection: String,
) -> Result<usize, String> {
    let mut data = state.data.lock();
    
    // Check collection exists
    if !data.collections.contains_key(&collection) {
        return Err("Collection not found".to_string());
    }
    
    let deleted_count = data.points.get(&collection).map(|v| v.len()).unwrap_or(0);
    
    // Clear all points
    data.points.insert(collection.clone(), Vec::new());
    
    // Update metadata
    if let Some(meta) = data.collections.get_mut(&collection) {
        meta.document_count = 0;
        meta.updated_at = default_timestamp();
    }
    
    state.persist(&data).map_err(|e| e.to_string())?;
    Ok(deleted_count)
}

// ============ Vector Stats ============

#[derive(Debug, Serialize)]
pub struct VectorStats {
    pub collection_count: usize,
    pub total_points: usize,
    pub storage_path: String,
    pub storage_size_bytes: u64,
}

#[tauri::command]
pub fn vector_stats(
    state: tauri::State<Arc<VectorStoreState>>,
) -> Result<VectorStats, String> {
    stats_impl(&state)
}

pub fn stats_impl(state: &VectorStoreState) -> Result<VectorStats, String> {
    let data = state.data.lock();
    
    let collection_count = data.collections.len();
    let total_points: usize = data.points.values().map(|v| v.len()).sum();
    let storage_path = state.path.to_string_lossy().to_string();
    let storage_size_bytes = fs::metadata(&state.path)
        .map(|m| m.len())
        .unwrap_or(0);
    
    Ok(VectorStats {
        collection_count,
        total_points,
        storage_path,
        storage_size_bytes,
    })
}

// ============ Scroll Points (paginated list) ============

#[derive(Debug, Deserialize)]
pub struct ScrollPayload {
    pub collection: String,
    pub offset: Option<usize>,
    pub limit: Option<usize>,
    pub filters: Option<Vec<PayloadFilter>>,
    pub filter_mode: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ScrollResponse {
    pub points: Vec<PointRecord>,
    pub total: usize,
    pub offset: usize,
    pub limit: usize,
    pub has_more: bool,
}

#[tauri::command]
pub fn vector_scroll_points(
    state: tauri::State<Arc<VectorStoreState>>,
    payload: ScrollPayload,
) -> Result<ScrollResponse, String> {
    scroll_points_impl(&state, payload)
}

pub fn scroll_points_impl(
    state: &VectorStoreState,
    payload: ScrollPayload,
) -> Result<ScrollResponse, String> {
    let data = state.data.lock();
    let points = data
        .points
        .get(&payload.collection)
        .ok_or_else(|| "Collection not found".to_string())?;
    
    let offset = payload.offset.unwrap_or(0);
    let limit = payload.limit.unwrap_or(100);
    
    // Apply filters
    let filtered: Vec<&PointRecord> = if let Some(filters) = &payload.filters {
        points
            .iter()
            .filter(|p| apply_payload_filters(p, filters, payload.filter_mode.as_deref().unwrap_or("and")))
            .collect()
    } else {
        points.iter().collect()
    };
    
    let total = filtered.len();
    
    if offset >= total {
        return Ok(ScrollResponse {
            points: vec![],
            total,
            offset,
            limit,
            has_more: false,
        });
    }
    
    let end_index = std::cmp::min(offset + limit, total);
    let result_points: Vec<PointRecord> = filtered[offset..end_index].iter().map(|p| (*p).clone()).collect();
    let has_more = end_index < total;
    
    Ok(ScrollResponse {
        points: result_points,
        total,
        offset,
        limit,
        has_more,
    })
}

