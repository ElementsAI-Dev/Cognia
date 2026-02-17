//! SpeedPass runtime bridge.
//!
//! Provides Rust-side persistent storage, textbook extraction, and teacher-keypoint matching
//! for learning mode SpeedPass workflows.

mod storage;

use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::Arc;

use base64::Engine;
use once_cell::sync::Lazy;
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;

pub use storage::{
    SpeedPassRuntimeStorage, SpeedPassRuntimeStoredSnapshot,
};

const DEFAULT_SPEEDPASS_USER_ID: &str = "local-user";
static TOKEN_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"[\p{Han}A-Za-z0-9_]+").expect("speedpass token regex should compile")
});

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpeedPassRuntimeSnapshot {
    pub user_id: String,
    pub revision: i64,
    pub snapshot: JsonValue,
    pub updated_at: String,
}

fn map_snapshot(snapshot: SpeedPassRuntimeStoredSnapshot) -> SpeedPassRuntimeSnapshot {
    SpeedPassRuntimeSnapshot {
        user_id: snapshot.user_id,
        revision: snapshot.revision,
        snapshot: snapshot.snapshot,
        updated_at: snapshot.updated_at,
    }
}

fn normalize_user_id(user_id: Option<&str>) -> String {
    let normalized = user_id
        .unwrap_or(DEFAULT_SPEEDPASS_USER_ID)
        .trim()
        .to_string();
    if normalized.is_empty() {
        DEFAULT_SPEEDPASS_USER_ID.to_string()
    } else {
        normalized
    }
}

fn file_extension_from_name(file_name: &str) -> Option<&str> {
    Path::new(file_name).extension().and_then(|value| value.to_str())
}

fn looks_like_pdf(extension: Option<&str>, mime_type: Option<&str>) -> bool {
    extension
        .map(|value| value.eq_ignore_ascii_case("pdf"))
        .unwrap_or(false)
        || mime_type
            .map(|mime| mime.to_ascii_lowercase().contains("pdf"))
            .unwrap_or(false)
}

async fn extract_pdf_content(pdf_path: &str) -> Result<String, String> {
    let conversion =
        crate::commands::academic::academic_extract_pdf_content(pdf_path.to_string(), None).await?;
    if !conversion.success {
        return Err(
            conversion
                .error
                .unwrap_or_else(|| "Failed to extract textbook pdf content".to_string()),
        );
    }
    Ok(conversion.markdown)
}

fn parse_knowledge_point(raw: &JsonValue) -> Option<KnowledgePointView> {
    let object = raw.as_object()?;
    let id = json_string(object, &["id"])?;
    let chapter_id = json_string(object, &["chapterId", "chapter_id"])?;
    let title = json_string(object, &["title"]).unwrap_or_default();
    let content = json_string(object, &["content", "summary"]).unwrap_or_default();
    let page_number = json_i64(object, &["pageNumber", "page_number"]).unwrap_or(0);
    let point_type = json_string(object, &["type"]);
    let formulas_count = object
        .get("formulas")
        .and_then(|value| value.as_array())
        .map(|array| array.len())
        .unwrap_or(0);

    Some(KnowledgePointView {
        id,
        chapter_id,
        title,
        content,
        page_number,
        point_type,
        formulas_count,
        raw: raw.clone(),
    })
}

fn json_string(object: &serde_json::Map<String, JsonValue>, keys: &[&str]) -> Option<String> {
    for key in keys {
        if let Some(value) = object.get(*key).and_then(|inner| inner.as_str()) {
            let trimmed = value.trim();
            if !trimmed.is_empty() {
                return Some(trimmed.to_string());
            }
        }
    }
    None
}

fn json_i64(object: &serde_json::Map<String, JsonValue>, keys: &[&str]) -> Option<i64> {
    for key in keys {
        if let Some(value) = object.get(*key) {
            if let Some(number) = value.as_i64() {
                return Some(number);
            }
            if let Some(number) = value.as_u64() {
                if let Ok(casted) = i64::try_from(number) {
                    return Some(casted);
                }
            }
            if let Some(string_value) = value.as_str() {
                if let Ok(parsed) = string_value.parse::<i64>() {
                    return Some(parsed);
                }
            }
        }
    }
    None
}

fn tokenize(input: &str) -> HashSet<String> {
    TOKEN_REGEX
        .find_iter(input)
        .map(|capture| capture.as_str().to_lowercase())
        .filter(|token| token.len() > 1)
        .collect()
}

fn calculate_match_score(
    note: &str,
    note_tokens: &HashSet<String>,
    knowledge_point: &KnowledgePointView,
    chapter: Option<&SnapshotChapter>,
    chapter_order: usize,
) -> f64 {
    let mut score = 0.0;
    let note_lower = note.to_lowercase();
    let title_lower = knowledge_point.title.to_lowercase();

    if !title_lower.is_empty()
        && (note_lower.contains(&title_lower) || title_lower.contains(&note_lower))
    {
        score += 0.52;
    }

    let kp_tokens = tokenize(format!("{} {}", knowledge_point.title, knowledge_point.content).as_str());
    if !note_tokens.is_empty() && !kp_tokens.is_empty() {
        let overlap = note_tokens
            .iter()
            .filter(|token| kp_tokens.contains(*token))
            .count();
        score += (overlap as f64 / note_tokens.len() as f64) * 0.34;
    }

    if let Some(chapter_value) = chapter {
        if let Some(chapter_title) = chapter_value.title.as_deref() {
            let chapter_title_lower = chapter_title.to_lowercase();
            if !chapter_title_lower.is_empty() && note_lower.contains(&chapter_title_lower) {
                score += 0.09;
            }
        }
        if let Some(chapter_number) = chapter_value.chapter_number.as_deref() {
            if !chapter_number.trim().is_empty() && note_lower.contains(chapter_number.trim()) {
                score += 0.05;
            }
        }
    }

    let chapter_weight = if chapter_order <= 2 {
        0.06
    } else if chapter_order <= 6 {
        0.04
    } else if chapter_order <= 12 {
        0.02
    } else {
        0.0
    };
    score += chapter_weight;

    score.clamp(0.0, 1.0)
}

fn parse_chapter_number(chapter: Option<&SnapshotChapter>) -> i64 {
    chapter
        .and_then(|chapter_value| chapter_value.chapter_number.as_deref())
        .and_then(|raw| raw.split('.').next())
        .and_then(|value| {
            value
                .chars()
                .filter(|character| character.is_ascii_digit())
                .collect::<String>()
                .parse::<i64>()
                .ok()
        })
        .or_else(|| chapter.and_then(|chapter_value| chapter_value.order_index))
        .unwrap_or(1)
}

fn is_example_source(source_type: Option<&str>) -> bool {
    source_type
        .map(|source| source.eq_ignore_ascii_case("example"))
        .unwrap_or(false)
}

fn truncate_text(input: &str, max_chars: usize) -> String {
    let mut output = String::new();
    let mut count = 0usize;
    for character in input.chars() {
        if count >= max_chars {
            break;
        }
        output.push(character);
        count += 1;
    }
    output
}

fn round_to(value: f64, digits: i32) -> f64 {
    let factor = 10f64.powi(digits);
    (value * factor).round() / factor
}

#[cfg(test)]
mod tests {
    use base64::Engine;

    use super::*;

    #[tokio::test]
    async fn extracts_textbook_content_for_path_and_bytes() {
        let state = SpeedPassRuntimeState::default();
        let temp_dir = tempfile::TempDir::new().expect("temp directory should be created");
        let text_path = temp_dir.path().join("chapter1.txt");
        std::fs::write(&text_path, "高等数学第一章")
            .expect("textbook test file should be written");

        let by_path = state
            .extract_textbook_content(ExtractTextbookRequest {
                file_path: Some(text_path.to_string_lossy().to_string()),
                file_bytes_base64: None,
                file_name: None,
                mime_type: Some("text/plain".to_string()),
            })
            .await
            .expect("path extraction should succeed");
        assert_eq!(by_path.source, "path");
        assert!(by_path.content.contains("高等数学第一章"));

        let encoded = base64::engine::general_purpose::STANDARD.encode("重点一\n重点二");
        let by_bytes = state
            .extract_textbook_content(ExtractTextbookRequest {
                file_path: None,
                file_bytes_base64: Some(encoded),
                file_name: Some("notes.txt".to_string()),
                mime_type: Some("text/plain".to_string()),
            })
            .await
            .expect("bytes extraction should succeed");
        assert_eq!(by_bytes.source, "bytes");
        assert!(by_bytes.content.contains("重点一"));
    }

    #[test]
    fn matches_teacher_keypoints_with_stable_rule_engine() {
        let storage = SpeedPassRuntimeStorage::in_memory().expect("storage should init");
        let snapshot = serde_json::json!({
            "textbookChapters": {
                "tb-1": [
                    {
                        "id": "ch-1",
                        "chapterNumber": "1",
                        "title": "极限与连续",
                        "pageStart": 1,
                        "pageEnd": 20,
                        "orderIndex": 1
                    }
                ]
            },
            "textbookKnowledgePoints": {
                "tb-1": [
                    {
                        "id": "kp-1",
                        "chapterId": "ch-1",
                        "title": "函数极限",
                        "content": "掌握函数极限与无穷小替换",
                        "type": "definition",
                        "pageNumber": 5,
                        "formulas": ["\\\\lim_{x\\\\to a}f(x)"]
                    },
                    {
                        "id": "kp-2",
                        "chapterId": "ch-1",
                        "title": "连续函数",
                        "content": "理解连续函数定义与性质",
                        "type": "concept",
                        "pageNumber": 9,
                        "formulas": []
                    }
                ]
            },
            "textbookQuestions": {
                "tb-1": [
                    {
                        "id": "q-1",
                        "chapterId": "ch-1",
                        "sourceType": "example",
                        "questionNumber": "例1",
                        "content": "求函数极限",
                        "pageNumber": 6,
                        "difficulty": 0.4,
                        "knowledgePointIds": ["kp-1"]
                    },
                    {
                        "id": "q-2",
                        "chapterId": "ch-1",
                        "sourceType": "exercise",
                        "questionNumber": "习题1.1",
                        "content": "连续函数判定",
                        "pageNumber": 11,
                        "difficulty": 0.5,
                        "knowledgePointIds": ["kp-2"]
                    }
                ]
            }
        });

        storage
            .save_snapshot(DEFAULT_SPEEDPASS_USER_ID, &snapshot, None)
            .expect("snapshot should save");
        let state = SpeedPassRuntimeState::from_test_storage(storage);
        let result = state
            .match_teacher_keypoints(
                Some(DEFAULT_SPEEDPASS_USER_ID.to_string()),
                TeacherKeyPointMatchRequest {
                    textbook_id: "tb-1".to_string(),
                    teacher_notes: vec![
                        "重点看函数极限定义与例题".to_string(),
                        "连续函数判定多刷题".to_string(),
                        "这个暂时不在教材里".to_string(),
                    ],
                    ai_enhance: Some(false),
                    provider: None,
                    model: None,
                    confidence_override: Some(0.4),
                },
            )
            .expect("matching should succeed");

        assert_eq!(result.status, "partial");
        assert!(result.matched_points.len() >= 2);
        assert!(!result.unmatched_notes.is_empty());
        assert!(result.match_rate > 0.0 && result.match_rate < 1.0);
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpeedPassSaveSnapshotRequest {
    pub user_id: Option<String>,
    pub revision: Option<i64>,
    pub snapshot: JsonValue,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpeedPassLegacySnapshotV1 {
    pub version: i64,
    pub migrated_at: Option<String>,
    pub snapshot: JsonValue,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpeedPassImportLegacySnapshotRequest {
    pub user_id: Option<String>,
    pub legacy: SpeedPassLegacySnapshotV1,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtractTextbookRequest {
    pub file_path: Option<String>,
    pub file_bytes_base64: Option<String>,
    pub file_name: Option<String>,
    pub mime_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtractTextbookResult {
    pub content: String,
    pub source: String,
    pub file_name: Option<String>,
    pub page_count: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TeacherKeyPointMatchRequest {
    pub textbook_id: String,
    pub teacher_notes: Vec<String>,
    pub ai_enhance: Option<bool>,
    pub provider: Option<String>,
    pub model: Option<String>,
    pub confidence_override: Option<f64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TeacherKeyPointMatchCommandRequest {
    pub user_id: Option<String>,
    pub request: TeacherKeyPointMatchRequest,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchedKnowledgeChapter {
    pub number: String,
    pub title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchedKnowledgeExample {
    pub id: String,
    pub title: String,
    pub page: i64,
    pub difficulty: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchedKnowledgePointResult {
    pub teacher_note: String,
    pub matched_knowledge_point: JsonValue,
    pub match_confidence: f64,
    pub chapter: MatchedKnowledgeChapter,
    pub page_range: String,
    pub related_definitions: Option<Vec<String>>,
    pub related_formulas: Option<usize>,
    pub related_examples: Vec<MatchedKnowledgeExample>,
    pub related_exercises: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TeacherKeyPointCoverage {
    pub chapters_involved: Vec<i64>,
    pub total_examples: usize,
    pub total_exercises: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TeacherKeyPointStudyPlanSuggestion {
    pub total_knowledge_points: usize,
    pub total_examples: usize,
    pub total_exercises: usize,
    pub estimated_time: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TeacherKeyPointMatchResult {
    pub status: String,
    pub matched_points: Vec<MatchedKnowledgePointResult>,
    pub unmatched_notes: Vec<String>,
    pub textbook_coverage: TeacherKeyPointCoverage,
    pub study_plan_suggestion: TeacherKeyPointStudyPlanSuggestion,
    pub match_rate: f64,
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct SnapshotPayload {
    #[serde(default)]
    textbook_chapters: HashMap<String, Vec<SnapshotChapter>>,
    #[serde(default)]
    textbook_knowledge_points: HashMap<String, Vec<JsonValue>>,
    #[serde(default)]
    textbook_questions: HashMap<String, Vec<SnapshotQuestion>>,
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct SnapshotChapter {
    id: String,
    chapter_number: Option<String>,
    title: Option<String>,
    page_start: Option<i64>,
    page_end: Option<i64>,
    order_index: Option<i64>,
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct SnapshotQuestion {
    id: String,
    chapter_id: Option<String>,
    source_type: Option<String>,
    question_number: Option<String>,
    content: Option<String>,
    page_number: Option<i64>,
    difficulty: Option<f64>,
    #[serde(default)]
    knowledge_point_ids: Vec<String>,
}

#[derive(Debug, Clone)]
struct KnowledgePointView {
    id: String,
    chapter_id: String,
    title: String,
    content: String,
    page_number: i64,
    point_type: Option<String>,
    formulas_count: usize,
    raw: JsonValue,
}

pub struct SpeedPassRuntimeState {
    storage: Arc<SpeedPassRuntimeStorage>,
}

impl Default for SpeedPassRuntimeState {
    fn default() -> Self {
        let storage = SpeedPassRuntimeStorage::in_memory()
            .expect("in-memory speedpass runtime storage should initialize");
        Self {
            storage: Arc::new(storage),
        }
    }
}

impl SpeedPassRuntimeState {
    pub fn from_db_path(db_path: PathBuf) -> Result<Self, String> {
        let storage = SpeedPassRuntimeStorage::new(db_path).map_err(|error| error.to_string())?;
        Ok(Self {
            storage: Arc::new(storage),
        })
    }

    #[cfg(test)]
    fn from_test_storage(storage: SpeedPassRuntimeStorage) -> Self {
        Self {
            storage: Arc::new(storage),
        }
    }

    pub fn load_snapshot(&self, user_id: Option<String>) -> Result<Option<SpeedPassRuntimeSnapshot>, String> {
        let normalized_user_id = normalize_user_id(user_id.as_deref());
        self.storage
            .load_snapshot(&normalized_user_id)
            .map_err(|error| error.to_string())
            .map(|snapshot| snapshot.map(map_snapshot))
    }

    pub fn save_snapshot(
        &self,
        request: SpeedPassSaveSnapshotRequest,
    ) -> Result<SpeedPassRuntimeSnapshot, String> {
        let normalized_user_id = normalize_user_id(request.user_id.as_deref());
        self.storage
            .save_snapshot(
                &normalized_user_id,
                &request.snapshot,
                request.revision.filter(|value| *value >= 0),
            )
            .map(map_snapshot)
            .map_err(|error| error.to_string())
    }

    pub fn import_legacy_snapshot(
        &self,
        request: SpeedPassImportLegacySnapshotRequest,
    ) -> Result<SpeedPassRuntimeSnapshot, String> {
        let normalized_user_id = normalize_user_id(request.user_id.as_deref());
        let legacy = request.legacy;
        let migration_key = format!("legacy-localstorage-v{}:{normalized_user_id}", legacy.version);

        if self
            .storage
            .is_migration_applied(&migration_key)
            .map_err(|error| error.to_string())?
        {
            if let Some(snapshot) = self
                .storage
                .load_snapshot(&normalized_user_id)
                .map_err(|error| error.to_string())?
            {
                return Ok(map_snapshot(snapshot));
            }
        }

        if let Some(existing_snapshot) = self
            .storage
            .load_snapshot(&normalized_user_id)
            .map_err(|error| error.to_string())?
        {
            self.storage
                .save_backup("existing-before-legacy-import", &existing_snapshot.snapshot)
                .map_err(|error| error.to_string())?;
        }

        self.storage
            .save_backup(
                &format!("legacy-localstorage-v{}", legacy.version),
                &legacy.snapshot,
            )
            .map_err(|error| error.to_string())?;

        let saved_snapshot = self
            .storage
            .save_snapshot(&normalized_user_id, &legacy.snapshot, None)
            .map_err(|error| error.to_string())?;

        let migration_meta = serde_json::json!({
            "userId": normalized_user_id,
            "version": legacy.version,
            "migratedAt": legacy.migrated_at.unwrap_or_else(|| chrono::Utc::now().to_rfc3339()),
            "revision": saved_snapshot.revision
        });
        self.storage
            .mark_migration(&migration_key, Some(&migration_meta))
            .map_err(|error| error.to_string())?;

        Ok(map_snapshot(saved_snapshot))
    }

    pub async fn extract_textbook_content(
        &self,
        request: ExtractTextbookRequest,
    ) -> Result<ExtractTextbookResult, String> {
        if let Some(file_path) = request
            .file_path
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
        {
            let path = Path::new(file_path);
            let inferred_name = request.file_name.clone().or_else(|| {
                path.file_name()
                    .and_then(|name| name.to_str())
                    .map(|name| name.to_string())
            });
            let is_pdf = looks_like_pdf(
                path.extension().and_then(|value| value.to_str()),
                request.mime_type.as_deref(),
            );
            if is_pdf {
                let content = extract_pdf_content(file_path).await?;
                return Ok(ExtractTextbookResult {
                    content,
                    source: "path".to_string(),
                    file_name: inferred_name,
                    page_count: None,
                });
            }

            let bytes = std::fs::read(path)
                .map_err(|error| format!("Failed to read textbook file from path: {error}"))?;
            let content = String::from_utf8_lossy(&bytes).to_string();
            return Ok(ExtractTextbookResult {
                content,
                source: "path".to_string(),
                file_name: inferred_name,
                page_count: None,
            });
        }

        if let Some(file_bytes_base64) = request
            .file_bytes_base64
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
        {
            let bytes = base64::engine::general_purpose::STANDARD
                .decode(file_bytes_base64)
                .map_err(|error| format!("Failed to decode textbook base64 bytes: {error}"))?;
            let is_pdf = looks_like_pdf(
                request.file_name.as_deref().and_then(file_extension_from_name),
                request.mime_type.as_deref(),
            );
            if is_pdf {
                let temp_path = std::env::temp_dir()
                    .join(format!("speedpass_textbook_{}.pdf", uuid::Uuid::new_v4()));
                std::fs::write(&temp_path, &bytes)
                    .map_err(|error| format!("Failed to write temp pdf file: {error}"))?;
                let pdf_result = extract_pdf_content(temp_path.to_string_lossy().as_ref()).await;
                let _ = std::fs::remove_file(&temp_path);
                let content = pdf_result?;
                return Ok(ExtractTextbookResult {
                    content,
                    source: "bytes".to_string(),
                    file_name: request.file_name,
                    page_count: None,
                });
            }

            return Ok(ExtractTextbookResult {
                content: String::from_utf8_lossy(&bytes).to_string(),
                source: "bytes".to_string(),
                file_name: request.file_name,
                page_count: None,
            });
        }

        Err("Either filePath or fileBytesBase64 is required".to_string())
    }

    pub fn match_teacher_keypoints(
        &self,
        user_id: Option<String>,
        request: TeacherKeyPointMatchRequest,
    ) -> Result<TeacherKeyPointMatchResult, String> {
        let normalized_user_id = normalize_user_id(user_id.as_deref());
        let snapshot = self
            .storage
            .load_snapshot(&normalized_user_id)
            .map_err(|error| error.to_string())?
            .ok_or_else(|| "No SpeedPass snapshot found for user".to_string())?;

        let payload =
            serde_json::from_value::<SnapshotPayload>(snapshot.snapshot.clone()).unwrap_or_default();
        let textbook_id = request.textbook_id.trim();
        if textbook_id.is_empty() {
            return Err("textbookId is required".to_string());
        }

        let chapters = payload
            .textbook_chapters
            .get(textbook_id)
            .cloned()
            .unwrap_or_default();
        let raw_points = payload
            .textbook_knowledge_points
            .get(textbook_id)
            .cloned()
            .unwrap_or_default();
        let questions = payload
            .textbook_questions
            .get(textbook_id)
            .cloned()
            .unwrap_or_default();

        if raw_points.is_empty() {
            return Err("No textbook knowledge points available".to_string());
        }

        let knowledge_points = raw_points
            .iter()
            .filter_map(parse_knowledge_point)
            .collect::<Vec<_>>();

        if knowledge_points.is_empty() {
            return Err("Textbook knowledge point payload is invalid".to_string());
        }

        let threshold = request.confidence_override.unwrap_or(0.45).clamp(0.1, 0.95);

        if request.ai_enhance.unwrap_or(false) {
            log::info!(
                "[speedpass-runtime] aiEnhance requested but currently using offline rule engine (provider={:?}, model={:?})",
                request.provider,
                request.model
            );
        }

        let chapter_by_id = chapters
            .iter()
            .filter(|chapter| !chapter.id.is_empty())
            .map(|chapter| (chapter.id.clone(), chapter.clone()))
            .collect::<HashMap<_, _>>();
        let chapter_order = chapters
            .iter()
            .enumerate()
            .map(|(index, chapter)| {
                (
                    chapter.id.clone(),
                    chapter
                        .order_index
                        .and_then(|value| usize::try_from(value).ok())
                        .unwrap_or(index + 1),
                )
            })
            .collect::<HashMap<_, _>>();

        let mut matched_points = Vec::new();
        let mut unmatched_notes = Vec::new();
        let mut chapter_numbers = HashSet::<i64>::new();
        let mut total_examples = HashSet::<String>::new();
        let mut total_exercises = HashSet::<String>::new();

        for note in request
            .teacher_notes
            .iter()
            .map(|note| note.trim())
            .filter(|note| !note.is_empty())
        {
            let note_tokens = tokenize(note);
            let mut best: Option<(usize, f64)> = None;
            for (index, knowledge_point) in knowledge_points.iter().enumerate() {
                let chapter = chapter_by_id.get(&knowledge_point.chapter_id);
                let order = *chapter_order.get(&knowledge_point.chapter_id).unwrap_or(&1);
                let score =
                    calculate_match_score(note, &note_tokens, knowledge_point, chapter, order);
                if let Some((_, best_score)) = best {
                    if score > best_score {
                        best = Some((index, score));
                    }
                } else {
                    best = Some((index, score));
                }
            }

            let (best_index, best_score) = match best {
                Some(value) if value.1 >= threshold => value,
                _ => {
                    unmatched_notes.push(note.to_string());
                    continue;
                }
            };

            let matched = &knowledge_points[best_index];
            let chapter = chapter_by_id.get(&matched.chapter_id);
            let parsed_chapter_number = parse_chapter_number(chapter);
            chapter_numbers.insert(parsed_chapter_number);

            let related_examples = questions
                .iter()
                .filter(|question| {
                    question
                        .knowledge_point_ids
                        .iter()
                        .any(|knowledge_point_id| knowledge_point_id == &matched.id)
                        && is_example_source(question.source_type.as_deref())
                })
                .take(5)
                .map(|question| {
                    total_examples.insert(question.id.clone());
                    MatchedKnowledgeExample {
                        id: question.id.clone(),
                        title: question
                            .question_number
                            .clone()
                            .or_else(|| question.content.clone())
                            .map(|value| truncate_text(&value, 48))
                            .unwrap_or_else(|| question.id.clone()),
                        page: question.page_number.unwrap_or(matched.page_number),
                        difficulty: question.difficulty.unwrap_or(0.5),
                    }
                })
                .collect::<Vec<_>>();

            let related_exercises = questions
                .iter()
                .filter(|question| {
                    question
                        .knowledge_point_ids
                        .iter()
                        .any(|knowledge_point_id| knowledge_point_id == &matched.id)
                        && !is_example_source(question.source_type.as_deref())
                })
                .take(8)
                .map(|question| {
                    total_exercises.insert(question.id.clone());
                    question.id.clone()
                })
                .collect::<Vec<_>>();

            let related_definitions = knowledge_points
                .iter()
                .filter(|knowledge_point| {
                    knowledge_point.chapter_id == matched.chapter_id
                        && knowledge_point.id != matched.id
                        && matches!(
                            knowledge_point.point_type.as_deref(),
                            Some("definition") | Some("concept")
                        )
                })
                .take(3)
                .map(|knowledge_point| knowledge_point.title.clone())
                .collect::<Vec<_>>();

            let page_range = chapter
                .and_then(|chapter_value| {
                    if let (Some(start), Some(end)) = (chapter_value.page_start, chapter_value.page_end)
                    {
                        Some(format!("P{start}-P{end}"))
                    } else {
                        None
                    }
                })
                .unwrap_or_else(|| format!("P{}", matched.page_number.max(0)));

            matched_points.push(MatchedKnowledgePointResult {
                teacher_note: note.to_string(),
                matched_knowledge_point: matched.raw.clone(),
                match_confidence: round_to(best_score, 4),
                chapter: MatchedKnowledgeChapter {
                    number: chapter
                        .and_then(|chapter_value| chapter_value.chapter_number.clone())
                        .unwrap_or_else(|| parsed_chapter_number.to_string()),
                    title: chapter
                        .and_then(|chapter_value| chapter_value.title.clone())
                        .unwrap_or_else(|| "未知章节".to_string()),
                },
                page_range,
                related_definitions: if related_definitions.is_empty() {
                    None
                } else {
                    Some(related_definitions)
                },
                related_formulas: Some(matched.formulas_count),
                related_examples,
                related_exercises,
            });
        }

        let status = if matched_points.is_empty() {
            "failed"
        } else if unmatched_notes.is_empty() {
            "success"
        } else {
            "partial"
        };
        let estimated_minutes =
            (matched_points.len() * 18 + total_examples.len() * 5 + total_exercises.len() * 7)
                .max(20);
        let estimated_hours = round_to(estimated_minutes as f64 / 60.0, 1);
        let total_notes = request
            .teacher_notes
            .iter()
            .filter(|note| !note.trim().is_empty())
            .count();
        let match_rate = if total_notes == 0 {
            0.0
        } else {
            round_to(matched_points.len() as f64 / total_notes as f64, 4)
        };
        let total_knowledge_points = matched_points.len();

        Ok(TeacherKeyPointMatchResult {
            status: status.to_string(),
            matched_points,
            unmatched_notes,
            textbook_coverage: TeacherKeyPointCoverage {
                chapters_involved: {
                    let mut values = chapter_numbers.into_iter().collect::<Vec<_>>();
                    values.sort_unstable();
                    values
                },
                total_examples: total_examples.len(),
                total_exercises: total_exercises.len(),
            },
            study_plan_suggestion: TeacherKeyPointStudyPlanSuggestion {
                total_knowledge_points,
                total_examples: total_examples.len(),
                total_exercises: total_exercises.len(),
                estimated_time: format!("{estimated_hours}小时"),
            },
            match_rate,
        })
    }
}
