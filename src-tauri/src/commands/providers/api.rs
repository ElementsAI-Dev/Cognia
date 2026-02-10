//! API testing and HTTP request commands
//!
//! This module provides commands for testing API connections to various
//! AI providers. It uses the shared HTTP client from the http module.

use crate::http::{create_proxy_client, get_client_for_url};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// API test result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiTestResult {
    pub success: bool,
    pub message: String,
    pub latency_ms: Option<u64>,
    pub model_info: Option<String>,
}

impl ApiTestResult {
    /// Create a successful test result
    fn success(message: impl Into<String>, latency_ms: u64, model_info: Option<String>) -> Self {
        Self {
            success: true,
            message: message.into(),
            latency_ms: Some(latency_ms),
            model_info,
        }
    }

    /// Create a failed test result
    fn failure(message: impl Into<String>, latency_ms: u64) -> Self {
        Self {
            success: false,
            message: message.into(),
            latency_ms: Some(latency_ms),
            model_info: None,
        }
    }
}

/// Helper to extract model count from JSON response
fn extract_model_count(body: &serde_json::Value, path: &str) -> usize {
    body.get(path)
        .and_then(|d| d.as_array())
        .map(|a| a.len())
        .unwrap_or(0)
}

/// Test OpenAI-compatible API with bearer token authentication
async fn test_bearer_auth_api(
    url: &str,
    api_key: &str,
    models_path: &str,
    _provider_name: &str,
) -> Result<ApiTestResult, String> {
    let start = std::time::Instant::now();

    let client = create_proxy_client().map_err(|e| format!("HTTP client error: {}", e))?;
    let response = client
        .get(url)
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let latency = start.elapsed().as_millis() as u64;

    if response.status().is_success() {
        let body: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
        let model_count = extract_model_count(&body, models_path);
        Ok(ApiTestResult::success(
            format!("Connected successfully. {} models available.", model_count),
            latency,
            Some(format!("{} models", model_count)),
        ))
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        Ok(ApiTestResult::failure(
            format!("API error: {} - {}", status, error_text),
            latency,
        ))
    }
}

/// Test OpenAI API connection
#[tauri::command]
pub async fn test_openai_connection(
    api_key: String,
    base_url: Option<String>,
) -> Result<ApiTestResult, String> {
    let url = base_url.unwrap_or_else(|| "https://api.openai.com/v1".to_string());
    test_bearer_auth_api(&format!("{}/models", url), &api_key, "data", "OpenAI").await
}

/// Test Anthropic API connection
#[tauri::command]
pub async fn test_anthropic_connection(api_key: String) -> Result<ApiTestResult, String> {
    let start = std::time::Instant::now();

    // Anthropic doesn't have a models endpoint, so we send a minimal message request
    let messages: Vec<HashMap<&str, &str>> = vec![{
        let mut m = HashMap::new();
        m.insert("role", "user");
        m.insert("content", "Hi");
        m
    }];

    let client = create_proxy_client().map_err(|e| format!("HTTP client error: {}", e))?;
    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&serde_json::json!({
            "model": "claude-3-haiku-20240307",
            "max_tokens": 1,
            "messages": messages
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let latency = start.elapsed().as_millis() as u64;

    if response.status().is_success() {
        Ok(ApiTestResult::success(
            "Connected successfully to Anthropic API.",
            latency,
            Some("Claude models available".to_string()),
        ))
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        Ok(ApiTestResult::failure(
            format!("API error: {} - {}", status, error_text),
            latency,
        ))
    }
}

/// Test Google AI API connection
#[tauri::command]
pub async fn test_google_connection(api_key: String) -> Result<ApiTestResult, String> {
    let start = std::time::Instant::now();

    let client = create_proxy_client().map_err(|e| format!("HTTP client error: {}", e))?;
    let response = client
        .get(format!(
            "https://generativelanguage.googleapis.com/v1beta/models?key={}",
            api_key
        ))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let latency = start.elapsed().as_millis() as u64;

    if response.status().is_success() {
        let body: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
        let model_count = extract_model_count(&body, "models");
        Ok(ApiTestResult::success(
            format!("Connected successfully. {} models available.", model_count),
            latency,
            Some(format!("{} models", model_count)),
        ))
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        Ok(ApiTestResult::failure(
            format!("API error: {} - {}", status, error_text),
            latency,
        ))
    }
}

/// Test DeepSeek API connection
#[tauri::command]
pub async fn test_deepseek_connection(api_key: String) -> Result<ApiTestResult, String> {
    let start = std::time::Instant::now();

    let client = create_proxy_client().map_err(|e| format!("HTTP client error: {}", e))?;
    let response = client
        .get("https://api.deepseek.com/v1/models")
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let latency = start.elapsed().as_millis() as u64;

    if response.status().is_success() {
        Ok(ApiTestResult::success(
            "Connected successfully to DeepSeek API.",
            latency,
            Some("DeepSeek models available".to_string()),
        ))
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        Ok(ApiTestResult::failure(
            format!("API error: {} - {}", status, error_text),
            latency,
        ))
    }
}

/// Test Groq API connection
#[tauri::command]
pub async fn test_groq_connection(api_key: String) -> Result<ApiTestResult, String> {
    test_bearer_auth_api(
        "https://api.groq.com/openai/v1/models",
        &api_key,
        "data",
        "Groq",
    )
    .await
}

/// Test Mistral API connection
#[tauri::command]
pub async fn test_mistral_connection(api_key: String) -> Result<ApiTestResult, String> {
    test_bearer_auth_api(
        "https://api.mistral.ai/v1/models",
        &api_key,
        "data",
        "Mistral",
    )
    .await
}

/// Test Ollama connection
#[tauri::command]
pub async fn test_ollama_connection(base_url: String) -> Result<ApiTestResult, String> {
    let start = std::time::Instant::now();

    let url = base_url.trim_end_matches("/v1");

    let client = get_client_for_url(url).map_err(|e| format!("HTTP client error: {}", e))?;
    let response = client
        .get(format!("{}/api/tags", url))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let latency = start.elapsed().as_millis() as u64;

    if response.status().is_success() {
        let body: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
        let model_count = extract_model_count(&body, "models");
        Ok(ApiTestResult::success(
            format!(
                "Connected successfully. {} local models available.",
                model_count
            ),
            latency,
            Some(format!("{} models", model_count)),
        ))
    } else {
        let status = response.status();
        Ok(ApiTestResult::failure(
            format!("Connection failed: {}", status),
            latency,
        ))
    }
}

/// Test custom OpenAI-compatible API connection
#[tauri::command]
pub async fn test_custom_provider_connection(
    base_url: String,
    api_key: String,
) -> Result<ApiTestResult, String> {
    let url = base_url.trim_end_matches('/');
    test_bearer_auth_api(&format!("{}/models", url), &api_key, "data", "Custom").await
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_api_test_result_success() {
        let result =
            ApiTestResult::success("Connected successfully", 150, Some("10 models".to_string()));

        assert!(result.success);
        assert_eq!(result.message, "Connected successfully");
        assert_eq!(result.latency_ms, Some(150));
        assert_eq!(result.model_info, Some("10 models".to_string()));
    }

    #[test]
    fn test_api_test_result_failure() {
        let result = ApiTestResult::failure("Connection failed", 500);

        assert!(!result.success);
        assert_eq!(result.message, "Connection failed");
        assert_eq!(result.latency_ms, Some(500));
        assert!(result.model_info.is_none());
    }

    #[test]
    fn test_extract_model_count_with_data() {
        let body = json!({
            "data": [
                {"id": "model-1"},
                {"id": "model-2"},
                {"id": "model-3"}
            ]
        });

        let count = extract_model_count(&body, "data");
        assert_eq!(count, 3);
    }

    #[test]
    fn test_extract_model_count_with_models() {
        let body = json!({
            "models": [
                {"name": "llama2"},
                {"name": "mistral"}
            ]
        });

        let count = extract_model_count(&body, "models");
        assert_eq!(count, 2);
    }

    #[test]
    fn test_extract_model_count_missing_path() {
        let body = json!({
            "other": "data"
        });

        let count = extract_model_count(&body, "data");
        assert_eq!(count, 0);
    }

    #[test]
    fn test_extract_model_count_not_array() {
        let body = json!({
            "data": "not an array"
        });

        let count = extract_model_count(&body, "data");
        assert_eq!(count, 0);
    }

    #[test]
    fn test_extract_model_count_empty_array() {
        let body = json!({
            "data": []
        });

        let count = extract_model_count(&body, "data");
        assert_eq!(count, 0);
    }

    #[test]
    fn test_api_test_result_serialization() {
        let result = ApiTestResult::success("Test", 100, Some("info".to_string()));

        let serialized = serde_json::to_string(&result).unwrap();
        let deserialized: ApiTestResult = serde_json::from_str(&serialized).unwrap();

        assert_eq!(result.success, deserialized.success);
        assert_eq!(result.message, deserialized.message);
        assert_eq!(result.latency_ms, deserialized.latency_ms);
        assert_eq!(result.model_info, deserialized.model_info);
    }

    #[test]
    fn test_api_test_result_with_into_string() {
        let result = ApiTestResult::success(String::from("test message"), 50, None);
        assert_eq!(result.message, "test message");

        let result2 = ApiTestResult::failure("error message", 100);
        assert_eq!(result2.message, "error message");
    }
}
