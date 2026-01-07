//! Sampling protocol handlers (reverse AI calls)

use serde::{Deserialize, Serialize};

use crate::mcp::types::{SamplingRequest, SamplingResult};

/// Request for sampling/createMessage
pub type SamplingCreateMessageRequest = SamplingRequest;

/// Response for sampling/createMessage
pub type SamplingCreateMessageResponse = SamplingResult;

/// Progress notification params for sampling
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SamplingProgressParams {
    pub progress_token: String,
    pub progress: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total: Option<f64>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::mcp::types::{
        ModelHint, ModelPreferences, SamplingContent, SamplingMessage, SamplingRole,
    };

    // ============================================================================
    // SamplingProgressParams Tests
    // ============================================================================

    #[test]
    fn test_sampling_progress_params_creation() {
        let params = SamplingProgressParams {
            progress_token: "token-123".to_string(),
            progress: 0.5,
            total: Some(1.0),
        };
        assert_eq!(params.progress_token, "token-123");
        assert_eq!(params.progress, 0.5);
        assert_eq!(params.total, Some(1.0));
    }

    #[test]
    fn test_sampling_progress_params_without_total() {
        let params = SamplingProgressParams {
            progress_token: "token".to_string(),
            progress: 0.75,
            total: None,
        };
        assert!(params.total.is_none());
    }

    #[test]
    fn test_sampling_progress_params_serialization() {
        let params = SamplingProgressParams {
            progress_token: "progress-1".to_string(),
            progress: 0.33,
            total: Some(100.0),
        };

        let json = serde_json::to_value(&params).unwrap();
        assert_eq!(json["progressToken"], "progress-1");
        assert_eq!(json["progress"], 0.33);
        assert_eq!(json["total"], 100.0);
    }

    #[test]
    fn test_sampling_progress_params_serialization_without_total() {
        let params = SamplingProgressParams {
            progress_token: "p".to_string(),
            progress: 0.0,
            total: None,
        };

        let json = serde_json::to_string(&params).unwrap();
        assert!(!json.contains("total"));
    }

    #[test]
    fn test_sampling_progress_params_deserialization() {
        let json = r#"{"progressToken": "abc", "progress": 0.9, "total": 10.0}"#;
        let params: SamplingProgressParams = serde_json::from_str(json).unwrap();

        assert_eq!(params.progress_token, "abc");
        assert_eq!(params.progress, 0.9);
        assert_eq!(params.total, Some(10.0));
    }

    #[test]
    fn test_sampling_progress_params_deserialization_without_total() {
        let json = r#"{"progressToken": "xyz", "progress": 0.5}"#;
        let params: SamplingProgressParams = serde_json::from_str(json).unwrap();

        assert_eq!(params.progress_token, "xyz");
        assert!(params.total.is_none());
    }

    // ============================================================================
    // SamplingRequest Tests (via type alias)
    // ============================================================================

    #[test]
    fn test_sampling_request_minimal() {
        let request = SamplingRequest {
            messages: vec![SamplingMessage {
                role: SamplingRole::User,
                content: SamplingContent::Text("Hello".to_string()),
            }],
            model_preferences: None,
            system_prompt: None,
            include_context: None,
            temperature: None,
            max_tokens: Some(100),
            stop_sequences: None,
            metadata: None,
        };

        assert_eq!(request.messages.len(), 1);
        assert_eq!(request.max_tokens, Some(100));
    }

    #[test]
    fn test_sampling_request_full() {
        let request = SamplingRequest {
            messages: vec![
                SamplingMessage {
                    role: SamplingRole::User,
                    content: SamplingContent::Text("Question".to_string()),
                },
                SamplingMessage {
                    role: SamplingRole::Assistant,
                    content: SamplingContent::Text("Answer".to_string()),
                },
            ],
            model_preferences: Some(ModelPreferences {
                hints: Some(vec![ModelHint {
                    name: Some("gpt-4".to_string()),
                }]),
                cost_priority: Some(0.3),
                speed_priority: Some(0.5),
                intelligence_priority: Some(0.8),
            }),
            system_prompt: Some("You are helpful".to_string()),
            include_context: Some("all".to_string()),
            temperature: Some(0.7),
            max_tokens: Some(2000),
            stop_sequences: Some(vec!["STOP".to_string(), "END".to_string()]),
            metadata: Some(serde_json::json!({"session_id": "123"})),
        };

        assert_eq!(request.messages.len(), 2);
        assert_eq!(request.temperature, Some(0.7));
        assert!(request.model_preferences.is_some());
    }

    #[test]
    fn test_sampling_request_serialization() {
        let request = SamplingRequest {
            messages: vec![SamplingMessage {
                role: SamplingRole::User,
                content: SamplingContent::Text("Test".to_string()),
            }],
            model_preferences: None,
            system_prompt: Some("Be concise".to_string()),
            include_context: None,
            temperature: Some(0.5),
            max_tokens: Some(500),
            stop_sequences: None,
            metadata: None,
        };

        let json = serde_json::to_value(&request).unwrap();
        assert_eq!(json["messages"][0]["role"], "user");
        assert_eq!(json["systemPrompt"], "Be concise");
        assert_eq!(json["temperature"], 0.5);
        assert_eq!(json["maxTokens"], 500);
    }

    #[test]
    fn test_sampling_request_deserialization() {
        let json = r#"{
            "messages": [
                {"role": "user", "content": "What is 2+2?"}
            ],
            "temperature": 0.0,
            "maxTokens": 100
        }"#;

        let request: SamplingRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.messages.len(), 1);
        assert_eq!(request.temperature, Some(0.0));
    }

    // ============================================================================
    // SamplingResult Tests (via type alias)
    // ============================================================================

    #[test]
    fn test_sampling_result_creation() {
        let result = SamplingResult {
            role: SamplingRole::Assistant,
            content: SamplingContent::Text("The answer is 4".to_string()),
            model: "gpt-4".to_string(),
            stop_reason: Some("end_turn".to_string()),
        };

        assert_eq!(result.model, "gpt-4");
        assert_eq!(result.stop_reason, Some("end_turn".to_string()));
    }

    #[test]
    fn test_sampling_result_without_stop_reason() {
        let result = SamplingResult {
            role: SamplingRole::Assistant,
            content: SamplingContent::Text("Response".to_string()),
            model: "claude-3".to_string(),
            stop_reason: None,
        };

        assert!(result.stop_reason.is_none());
    }

    #[test]
    fn test_sampling_result_serialization() {
        let result = SamplingResult {
            role: SamplingRole::Assistant,
            content: SamplingContent::Text("Hello!".to_string()),
            model: "test-model".to_string(),
            stop_reason: Some("max_tokens".to_string()),
        };

        let json = serde_json::to_value(&result).unwrap();
        assert_eq!(json["role"], "assistant");
        assert_eq!(json["content"], "Hello!");
        assert_eq!(json["model"], "test-model");
        assert_eq!(json["stopReason"], "max_tokens");
    }

    #[test]
    fn test_sampling_result_deserialization() {
        let json = r#"{
            "role": "assistant",
            "content": "Generated response",
            "model": "gpt-3.5-turbo",
            "stopReason": "stop"
        }"#;

        let result: SamplingResult = serde_json::from_str(json).unwrap();
        assert_eq!(result.model, "gpt-3.5-turbo");
        assert_eq!(result.stop_reason, Some("stop".to_string()));
    }

    // ============================================================================
    // Edge Cases
    // ============================================================================

    #[test]
    fn test_sampling_progress_at_boundaries() {
        let params_start = SamplingProgressParams {
            progress_token: "t".to_string(),
            progress: 0.0,
            total: Some(1.0),
        };
        assert_eq!(params_start.progress, 0.0);

        let params_end = SamplingProgressParams {
            progress_token: "t".to_string(),
            progress: 1.0,
            total: Some(1.0),
        };
        assert_eq!(params_end.progress, 1.0);
    }

    #[test]
    fn test_sampling_progress_with_large_values() {
        let params = SamplingProgressParams {
            progress_token: "large".to_string(),
            progress: 999999.0,
            total: Some(1000000.0),
        };

        let json = serde_json::to_value(&params).unwrap();
        assert_eq!(json["progress"], 999999.0);
    }

    #[test]
    fn test_sampling_request_with_empty_messages() {
        let request = SamplingRequest {
            messages: vec![],
            model_preferences: None,
            system_prompt: None,
            include_context: None,
            temperature: None,
            max_tokens: None,
            stop_sequences: None,
            metadata: None,
        };

        let json = serde_json::to_value(&request).unwrap();
        assert!(json["messages"].as_array().unwrap().is_empty());
    }

    #[test]
    fn test_sampling_request_with_unicode() {
        let request = SamplingRequest {
            messages: vec![SamplingMessage {
                role: SamplingRole::User,
                content: SamplingContent::Text("你好，世界！🌍".to_string()),
            }],
            model_preferences: None,
            system_prompt: Some("请用中文回答".to_string()),
            include_context: None,
            temperature: None,
            max_tokens: None,
            stop_sequences: None,
            metadata: None,
        };

        let json = serde_json::to_value(&request).unwrap();
        let deserialized: SamplingRequest = serde_json::from_value(json).unwrap();
        assert_eq!(deserialized.system_prompt, Some("请用中文回答".to_string()));
    }

    #[test]
    fn test_model_preferences_serialization() {
        let prefs = ModelPreferences {
            hints: Some(vec![
                ModelHint {
                    name: Some("gpt-4".to_string()),
                },
                ModelHint {
                    name: Some("claude-3".to_string()),
                },
            ]),
            cost_priority: Some(0.2),
            speed_priority: Some(0.3),
            intelligence_priority: Some(0.9),
        };

        let json = serde_json::to_value(&prefs).unwrap();
        assert_eq!(json["hints"][0]["name"], "gpt-4");
        assert_eq!(json["costPriority"], 0.2);
    }

    #[test]
    fn test_sampling_message_roles() {
        let user_msg = SamplingMessage {
            role: SamplingRole::User,
            content: SamplingContent::Text("Q".to_string()),
        };
        let assistant_msg = SamplingMessage {
            role: SamplingRole::Assistant,
            content: SamplingContent::Text("A".to_string()),
        };

        let user_json = serde_json::to_value(&user_msg).unwrap();
        let assistant_json = serde_json::to_value(&assistant_msg).unwrap();

        assert_eq!(user_json["role"], "user");
        assert_eq!(assistant_json["role"], "assistant");
    }
}
