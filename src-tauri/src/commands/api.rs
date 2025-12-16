//! API testing and HTTP request commands

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// API test result
#[derive(Debug, Serialize, Deserialize)]
pub struct ApiTestResult {
    pub success: bool,
    pub message: String,
    pub latency_ms: Option<u64>,
    pub model_info: Option<String>,
}

/// Test OpenAI API connection
#[tauri::command]
pub async fn test_openai_connection(api_key: String, base_url: Option<String>) -> Result<ApiTestResult, String> {
    let url = base_url.unwrap_or_else(|| "https://api.openai.com/v1".to_string());
    let client = reqwest::Client::new();
    let start = std::time::Instant::now();

    let response = client
        .get(format!("{}/models", url))
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let latency = start.elapsed().as_millis() as u64;

    if response.status().is_success() {
        let body: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
        let model_count = body.get("data").and_then(|d| d.as_array()).map(|a| a.len()).unwrap_or(0);
        Ok(ApiTestResult {
            success: true,
            message: format!("Connected successfully. {} models available.", model_count),
            latency_ms: Some(latency),
            model_info: Some(format!("{} models", model_count)),
        })
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        Ok(ApiTestResult {
            success: false,
            message: format!("API error: {} - {}", status, error_text),
            latency_ms: Some(latency),
            model_info: None,
        })
    }
}

/// Test Anthropic API connection
#[tauri::command]
pub async fn test_anthropic_connection(api_key: String) -> Result<ApiTestResult, String> {
    let client = reqwest::Client::new();
    let start = std::time::Instant::now();

    // Anthropic doesn't have a models endpoint, so we send a minimal message request
    let mut body = HashMap::new();
    body.insert("model", "claude-3-haiku-20240307");
    body.insert("max_tokens", "1");
    
    let messages: Vec<HashMap<&str, &str>> = vec![{
        let mut m = HashMap::new();
        m.insert("role", "user");
        m.insert("content", "Hi");
        m
    }];

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
        Ok(ApiTestResult {
            success: true,
            message: "Connected successfully to Anthropic API.".to_string(),
            latency_ms: Some(latency),
            model_info: Some("Claude models available".to_string()),
        })
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        Ok(ApiTestResult {
            success: false,
            message: format!("API error: {} - {}", status, error_text),
            latency_ms: Some(latency),
            model_info: None,
        })
    }
}

/// Test Google AI API connection
#[tauri::command]
pub async fn test_google_connection(api_key: String) -> Result<ApiTestResult, String> {
    let client = reqwest::Client::new();
    let start = std::time::Instant::now();

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
        let model_count = body.get("models").and_then(|m| m.as_array()).map(|a| a.len()).unwrap_or(0);
        Ok(ApiTestResult {
            success: true,
            message: format!("Connected successfully. {} models available.", model_count),
            latency_ms: Some(latency),
            model_info: Some(format!("{} models", model_count)),
        })
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        Ok(ApiTestResult {
            success: false,
            message: format!("API error: {} - {}", status, error_text),
            latency_ms: Some(latency),
            model_info: None,
        })
    }
}

/// Test DeepSeek API connection
#[tauri::command]
pub async fn test_deepseek_connection(api_key: String) -> Result<ApiTestResult, String> {
    let client = reqwest::Client::new();
    let start = std::time::Instant::now();

    let response = client
        .get("https://api.deepseek.com/v1/models")
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let latency = start.elapsed().as_millis() as u64;

    if response.status().is_success() {
        Ok(ApiTestResult {
            success: true,
            message: "Connected successfully to DeepSeek API.".to_string(),
            latency_ms: Some(latency),
            model_info: Some("DeepSeek models available".to_string()),
        })
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        Ok(ApiTestResult {
            success: false,
            message: format!("API error: {} - {}", status, error_text),
            latency_ms: Some(latency),
            model_info: None,
        })
    }
}

/// Test Groq API connection
#[tauri::command]
pub async fn test_groq_connection(api_key: String) -> Result<ApiTestResult, String> {
    let client = reqwest::Client::new();
    let start = std::time::Instant::now();

    let response = client
        .get("https://api.groq.com/openai/v1/models")
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let latency = start.elapsed().as_millis() as u64;

    if response.status().is_success() {
        let body: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
        let model_count = body.get("data").and_then(|d| d.as_array()).map(|a| a.len()).unwrap_or(0);
        Ok(ApiTestResult {
            success: true,
            message: format!("Connected successfully. {} models available.", model_count),
            latency_ms: Some(latency),
            model_info: Some(format!("{} models", model_count)),
        })
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        Ok(ApiTestResult {
            success: false,
            message: format!("API error: {} - {}", status, error_text),
            latency_ms: Some(latency),
            model_info: None,
        })
    }
}

/// Test Mistral API connection
#[tauri::command]
pub async fn test_mistral_connection(api_key: String) -> Result<ApiTestResult, String> {
    let client = reqwest::Client::new();
    let start = std::time::Instant::now();

    let response = client
        .get("https://api.mistral.ai/v1/models")
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let latency = start.elapsed().as_millis() as u64;

    if response.status().is_success() {
        let body: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
        let model_count = body.get("data").and_then(|d| d.as_array()).map(|a| a.len()).unwrap_or(0);
        Ok(ApiTestResult {
            success: true,
            message: format!("Connected successfully. {} models available.", model_count),
            latency_ms: Some(latency),
            model_info: Some(format!("{} models", model_count)),
        })
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        Ok(ApiTestResult {
            success: false,
            message: format!("API error: {} - {}", status, error_text),
            latency_ms: Some(latency),
            model_info: None,
        })
    }
}

/// Test Ollama connection
#[tauri::command]
pub async fn test_ollama_connection(base_url: String) -> Result<ApiTestResult, String> {
    let client = reqwest::Client::new();
    let start = std::time::Instant::now();

    let url = if base_url.ends_with("/v1") {
        base_url.trim_end_matches("/v1").to_string()
    } else {
        base_url
    };

    let response = client
        .get(format!("{}/api/tags", url))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let latency = start.elapsed().as_millis() as u64;

    if response.status().is_success() {
        let body: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
        let model_count = body.get("models").and_then(|m| m.as_array()).map(|a| a.len()).unwrap_or(0);
        Ok(ApiTestResult {
            success: true,
            message: format!("Connected successfully. {} local models available.", model_count),
            latency_ms: Some(latency),
            model_info: Some(format!("{} models", model_count)),
        })
    } else {
        let status = response.status();
        Ok(ApiTestResult {
            success: false,
            message: format!("Connection failed: {}", status),
            latency_ms: Some(latency),
            model_info: None,
        })
    }
}

/// Test custom OpenAI-compatible API connection
#[tauri::command]
pub async fn test_custom_provider_connection(
    base_url: String,
    api_key: String,
) -> Result<ApiTestResult, String> {
    let client = reqwest::Client::new();
    let start = std::time::Instant::now();

    let url = if base_url.ends_with('/') {
        format!("{}models", base_url)
    } else {
        format!("{}/models", base_url)
    };

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let latency = start.elapsed().as_millis() as u64;

    if response.status().is_success() {
        Ok(ApiTestResult {
            success: true,
            message: "Connected successfully to custom provider.".to_string(),
            latency_ms: Some(latency),
            model_info: Some("Custom provider available".to_string()),
        })
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        Ok(ApiTestResult {
            success: false,
            message: format!("API error: {} - {}", status, error_text),
            latency_ms: Some(latency),
            model_info: None,
        })
    }
}
