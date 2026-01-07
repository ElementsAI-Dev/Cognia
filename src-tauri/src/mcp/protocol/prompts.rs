//! Prompts protocol handlers

use serde::{Deserialize, Serialize};

use crate::mcp::types::{McpPrompt, PromptContent};

/// Request params for prompts/list
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PromptsListParams {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cursor: Option<String>,
}

/// Response for prompts/list
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptsListResponse {
    pub prompts: Vec<McpPrompt>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
}

/// Request params for prompts/get
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptsGetParams {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub arguments: Option<serde_json::Value>,
}

/// Response for prompts/get
pub type PromptsGetResponse = PromptContent;

#[cfg(test)]
mod tests {
    use super::*;
    use crate::mcp::types::{PromptArgument, PromptMessage, PromptMessageContent, PromptRole};

    // ============================================================================
    // PromptsListParams Tests
    // ============================================================================

    #[test]
    fn test_prompts_list_params_default() {
        let params = PromptsListParams::default();
        assert!(params.cursor.is_none());
    }

    #[test]
    fn test_prompts_list_params_with_cursor() {
        let params = PromptsListParams {
            cursor: Some("page-token".to_string()),
        };
        assert_eq!(params.cursor, Some("page-token".to_string()));
    }

    #[test]
    fn test_prompts_list_params_serialization() {
        let params = PromptsListParams {
            cursor: Some("next".to_string()),
        };
        let json = serde_json::to_value(&params).unwrap();
        assert_eq!(json["cursor"], "next");
    }

    #[test]
    fn test_prompts_list_params_serialization_without_cursor() {
        let params = PromptsListParams::default();
        let json = serde_json::to_string(&params).unwrap();
        assert!(!json.contains("cursor"));
    }

    #[test]
    fn test_prompts_list_params_deserialization() {
        let json = r#"{"cursor": "abc"}"#;
        let params: PromptsListParams = serde_json::from_str(json).unwrap();
        assert_eq!(params.cursor, Some("abc".to_string()));
    }

    #[test]
    fn test_prompts_list_params_deserialization_empty() {
        let json = r#"{}"#;
        let params: PromptsListParams = serde_json::from_str(json).unwrap();
        assert!(params.cursor.is_none());
    }

    // ============================================================================
    // PromptsListResponse Tests
    // ============================================================================

    #[test]
    fn test_prompts_list_response_empty() {
        let response = PromptsListResponse {
            prompts: vec![],
            next_cursor: None,
        };
        assert!(response.prompts.is_empty());
    }

    #[test]
    fn test_prompts_list_response_with_prompts() {
        let response = PromptsListResponse {
            prompts: vec![
                McpPrompt {
                    name: "code_review".to_string(),
                    description: Some("Review code".to_string()),
                    arguments: Some(vec![PromptArgument {
                        name: "code".to_string(),
                        description: Some("Code to review".to_string()),
                        required: true,
                    }]),
                },
                McpPrompt {
                    name: "summarize".to_string(),
                    description: Some("Summarize text".to_string()),
                    arguments: None,
                },
            ],
            next_cursor: Some("page2".to_string()),
        };
        assert_eq!(response.prompts.len(), 2);
        assert_eq!(response.next_cursor, Some("page2".to_string()));
    }

    #[test]
    fn test_prompts_list_response_serialization() {
        let response = PromptsListResponse {
            prompts: vec![McpPrompt {
                name: "test_prompt".to_string(),
                description: Some("A test prompt".to_string()),
                arguments: Some(vec![PromptArgument {
                    name: "input".to_string(),
                    description: None,
                    required: false,
                }]),
            }],
            next_cursor: None,
        };

        let json = serde_json::to_value(&response).unwrap();
        assert_eq!(json["prompts"][0]["name"], "test_prompt");
    }

    #[test]
    fn test_prompts_list_response_deserialization() {
        let json = r#"{
            "prompts": [
                {
                    "name": "explain",
                    "description": "Explain code in detail",
                    "arguments": [
                        {"name": "code", "required": true},
                        {"name": "language", "required": false}
                    ]
                }
            ],
            "nextCursor": "token"
        }"#;

        let response: PromptsListResponse = serde_json::from_str(json).unwrap();
        assert_eq!(response.prompts.len(), 1);
        assert_eq!(response.prompts[0].name, "explain");
        assert_eq!(response.next_cursor, Some("token".to_string()));
    }

    // ============================================================================
    // PromptsGetParams Tests
    // ============================================================================

    #[test]
    fn test_prompts_get_params_creation() {
        let params = PromptsGetParams {
            name: "my_prompt".to_string(),
            arguments: None,
        };
        assert_eq!(params.name, "my_prompt");
        assert!(params.arguments.is_none());
    }

    #[test]
    fn test_prompts_get_params_with_arguments() {
        let params = PromptsGetParams {
            name: "code_review".to_string(),
            arguments: Some(serde_json::json!({
                "code": "fn main() {}",
                "language": "rust"
            })),
        };
        assert_eq!(params.name, "code_review");
        assert!(params.arguments.is_some());
    }

    #[test]
    fn test_prompts_get_params_serialization() {
        let params = PromptsGetParams {
            name: "translate".to_string(),
            arguments: Some(serde_json::json!({
                "text": "Hello",
                "target": "Spanish"
            })),
        };

        let json = serde_json::to_value(&params).unwrap();
        assert_eq!(json["name"], "translate");
        assert_eq!(json["arguments"]["text"], "Hello");
    }

    #[test]
    fn test_prompts_get_params_serialization_without_arguments() {
        let params = PromptsGetParams {
            name: "simple".to_string(),
            arguments: None,
        };

        let json = serde_json::to_string(&params).unwrap();
        assert!(!json.contains("arguments"));
    }

    #[test]
    fn test_prompts_get_params_deserialization() {
        let json = r#"{
            "name": "generate_tests",
            "arguments": {
                "code": "function add(a, b) { return a + b; }",
                "framework": "jest"
            }
        }"#;

        let params: PromptsGetParams = serde_json::from_str(json).unwrap();
        assert_eq!(params.name, "generate_tests");
        assert!(params.arguments.is_some());
        assert_eq!(params.arguments.unwrap()["framework"], "jest");
    }

    #[test]
    fn test_prompts_get_params_deserialization_without_arguments() {
        let json = r#"{"name": "no_args"}"#;
        let params: PromptsGetParams = serde_json::from_str(json).unwrap();
        assert_eq!(params.name, "no_args");
        assert!(params.arguments.is_none());
    }

    // ============================================================================
    // PromptContent Tests (via type alias)
    // ============================================================================

    #[test]
    fn test_prompt_content_with_description() {
        let content = PromptContent {
            description: Some("A helpful prompt".to_string()),
            messages: vec![],
        };
        assert_eq!(content.description, Some("A helpful prompt".to_string()));
    }

    #[test]
    fn test_prompt_content_with_messages() {
        let content = PromptContent {
            description: None,
            messages: vec![
                PromptMessage {
                    role: PromptRole::User,
                    content: PromptMessageContent::Text("Hello".to_string()),
                },
                PromptMessage {
                    role: PromptRole::Assistant,
                    content: PromptMessageContent::Text("Hi there!".to_string()),
                },
            ],
        };
        assert_eq!(content.messages.len(), 2);
    }

    #[test]
    fn test_prompt_content_serialization() {
        let content = PromptContent {
            description: Some("Test prompt".to_string()),
            messages: vec![PromptMessage {
                role: PromptRole::User,
                content: PromptMessageContent::Text("Question?".to_string()),
            }],
        };

        let json = serde_json::to_value(&content).unwrap();
        assert_eq!(json["description"], "Test prompt");
        assert_eq!(json["messages"][0]["role"], "user");
    }

    #[test]
    fn test_prompt_content_deserialization() {
        let json = r#"{
            "description": "Code review prompt",
            "messages": [
                {"role": "user", "content": "Review this code"},
                {"role": "assistant", "content": "I'll review your code."}
            ]
        }"#;

        let content: PromptContent = serde_json::from_str(json).unwrap();
        assert_eq!(content.description, Some("Code review prompt".to_string()));
        assert_eq!(content.messages.len(), 2);
    }

    // ============================================================================
    // Edge Cases
    // ============================================================================

    #[test]
    fn test_prompts_get_params_with_complex_arguments() {
        let params = PromptsGetParams {
            name: "complex_prompt".to_string(),
            arguments: Some(serde_json::json!({
                "nested": {
                    "array": [1, 2, 3],
                    "object": {"key": "value"}
                },
                "list": ["a", "b", "c"]
            })),
        };

        let json = serde_json::to_value(&params).unwrap();
        assert_eq!(json["arguments"]["nested"]["array"][0], 1);
    }

    #[test]
    fn test_prompts_list_response_with_many_prompts() {
        let prompts: Vec<McpPrompt> = (0..25)
            .map(|i| McpPrompt {
                name: format!("prompt_{}", i),
                description: Some(format!("Prompt number {}", i)),
                arguments: None,
            })
            .collect();

        let response = PromptsListResponse {
            prompts,
            next_cursor: None,
        };

        assert_eq!(response.prompts.len(), 25);
        assert_eq!(response.prompts[12].name, "prompt_12");
    }

    #[test]
    fn test_prompts_get_params_with_unicode_name() {
        let params = PromptsGetParams {
            name: "提示_🎯".to_string(),
            arguments: Some(serde_json::json!({"input": "中文"})),
        };

        let json = serde_json::to_value(&params).unwrap();
        let deserialized: PromptsGetParams = serde_json::from_value(json).unwrap();
        assert_eq!(deserialized.name, "提示_🎯");
    }

    #[test]
    fn test_prompts_get_params_with_empty_name() {
        let params = PromptsGetParams {
            name: String::new(),
            arguments: None,
        };

        let json = serde_json::to_value(&params).unwrap();
        assert_eq!(json["name"], "");
    }

    #[test]
    fn test_prompt_content_with_empty_messages() {
        let content = PromptContent {
            description: Some("Empty".to_string()),
            messages: vec![],
        };

        let json = serde_json::to_value(&content).unwrap();
        assert!(json["messages"].as_array().unwrap().is_empty());
    }

    #[test]
    fn test_prompt_argument_with_description() {
        let arg = PromptArgument {
            name: "code".to_string(),
            description: Some("The code to analyze".to_string()),
            required: true,
        };

        let json = serde_json::to_value(&arg).unwrap();
        assert_eq!(json["name"], "code");
        assert_eq!(json["description"], "The code to analyze");
        assert_eq!(json["required"], true);
    }

    #[test]
    fn test_prompt_argument_without_description() {
        let arg = PromptArgument {
            name: "simple".to_string(),
            description: None,
            required: false,
        };

        let json = serde_json::to_value(&arg).unwrap();
        assert_eq!(json["name"], "simple");
        assert_eq!(json["required"], false);
    }
}
