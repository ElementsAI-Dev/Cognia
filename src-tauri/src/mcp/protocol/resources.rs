//! Resources protocol handlers

use serde::{Deserialize, Serialize};

use crate::mcp::types::{McpResource, ResourceContent};

/// Request params for resources/list
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ResourcesListParams {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cursor: Option<String>,
}

/// Response for resources/list
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourcesListResponse {
    pub resources: Vec<McpResource>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
}

/// Request params for resources/read
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourcesReadParams {
    pub uri: String,
}

/// Response for resources/read
pub type ResourcesReadResponse = ResourceContent;

/// Request params for resources/subscribe
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourcesSubscribeParams {
    pub uri: String,
}

/// Request params for resources/unsubscribe
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourcesUnsubscribeParams {
    pub uri: String,
}

/// Request params for resources/templates/list
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ResourcesTemplatesListParams {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cursor: Option<String>,
}

/// A resource template with a URI template
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourceTemplate {
    /// URI template (RFC 6570)
    pub uri_template: String,
    /// Human-readable name
    pub name: String,
    /// Description of the resource template
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    /// MIME type of resources produced
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>,
}

/// Response for resources/templates/list
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourcesTemplatesListResponse {
    pub resource_templates: Vec<ResourceTemplate>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
}

/// Resource updated notification params
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceUpdatedParams {
    pub uri: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::mcp::types::ResourceContentItem;

    // ============================================================================
    // ResourcesListParams Tests
    // ============================================================================

    #[test]
    fn test_resources_list_params_default() {
        let params = ResourcesListParams::default();
        assert!(params.cursor.is_none());
    }

    #[test]
    fn test_resources_list_params_with_cursor() {
        let params = ResourcesListParams {
            cursor: Some("page-2".to_string()),
        };
        assert_eq!(params.cursor, Some("page-2".to_string()));
    }

    #[test]
    fn test_resources_list_params_serialization() {
        let params = ResourcesListParams {
            cursor: Some("next-page".to_string()),
        };
        let json = serde_json::to_value(&params).unwrap();
        assert_eq!(json["cursor"], "next-page");
    }

    #[test]
    fn test_resources_list_params_serialization_without_cursor() {
        let params = ResourcesListParams::default();
        let json = serde_json::to_string(&params).unwrap();
        assert!(!json.contains("cursor"));
    }

    #[test]
    fn test_resources_list_params_deserialization() {
        let json = r#"{"cursor": "token123"}"#;
        let params: ResourcesListParams = serde_json::from_str(json).unwrap();
        assert_eq!(params.cursor, Some("token123".to_string()));
    }

    // ============================================================================
    // ResourcesListResponse Tests
    // ============================================================================

    #[test]
    fn test_resources_list_response_empty() {
        let response = ResourcesListResponse {
            resources: vec![],
            next_cursor: None,
        };
        assert!(response.resources.is_empty());
    }

    #[test]
    fn test_resources_list_response_with_resources() {
        let response = ResourcesListResponse {
            resources: vec![
                McpResource {
                    uri: "file:///readme.md".to_string(),
                    name: "README".to_string(),
                    description: Some("Project readme".to_string()),
                    mime_type: Some("text/markdown".to_string()),
                },
                McpResource {
                    uri: "file:///config.json".to_string(),
                    name: "Config".to_string(),
                    description: None,
                    mime_type: Some("application/json".to_string()),
                },
            ],
            next_cursor: Some("page2".to_string()),
        };
        assert_eq!(response.resources.len(), 2);
        assert_eq!(response.next_cursor, Some("page2".to_string()));
    }

    #[test]
    fn test_resources_list_response_serialization() {
        let response = ResourcesListResponse {
            resources: vec![McpResource {
                uri: "file:///test.txt".to_string(),
                name: "Test File".to_string(),
                description: Some("A test file".to_string()),
                mime_type: Some("text/plain".to_string()),
            }],
            next_cursor: None,
        };

        let json = serde_json::to_value(&response).unwrap();
        assert_eq!(json["resources"][0]["uri"], "file:///test.txt");
        assert_eq!(json["resources"][0]["name"], "Test File");
    }

    #[test]
    fn test_resources_list_response_deserialization() {
        let json = r#"{
            "resources": [
                {
                    "uri": "http://example.com/api",
                    "name": "API Endpoint",
                    "description": "REST API",
                    "mimeType": "application/json"
                }
            ],
            "nextCursor": "abc123"
        }"#;

        let response: ResourcesListResponse = serde_json::from_str(json).unwrap();
        assert_eq!(response.resources.len(), 1);
        assert_eq!(response.resources[0].uri, "http://example.com/api");
        assert_eq!(response.next_cursor, Some("abc123".to_string()));
    }

    // ============================================================================
    // ResourcesReadParams Tests
    // ============================================================================

    #[test]
    fn test_resources_read_params_creation() {
        let params = ResourcesReadParams {
            uri: "file:///test.txt".to_string(),
        };
        assert_eq!(params.uri, "file:///test.txt");
    }

    #[test]
    fn test_resources_read_params_serialization() {
        let params = ResourcesReadParams {
            uri: "file:///path/to/file.txt".to_string(),
        };
        let json = serde_json::to_value(&params).unwrap();
        assert_eq!(json["uri"], "file:///path/to/file.txt");
    }

    #[test]
    fn test_resources_read_params_deserialization() {
        let json = r#"{"uri": "http://localhost:8080/resource"}"#;
        let params: ResourcesReadParams = serde_json::from_str(json).unwrap();
        assert_eq!(params.uri, "http://localhost:8080/resource");
    }

    // ============================================================================
    // ResourcesSubscribeParams Tests
    // ============================================================================

    #[test]
    fn test_resources_subscribe_params_creation() {
        let params = ResourcesSubscribeParams {
            uri: "file:///watched.txt".to_string(),
        };
        assert_eq!(params.uri, "file:///watched.txt");
    }

    #[test]
    fn test_resources_subscribe_params_serialization() {
        let params = ResourcesSubscribeParams {
            uri: "file:///config.json".to_string(),
        };
        let json = serde_json::to_value(&params).unwrap();
        assert_eq!(json["uri"], "file:///config.json");
    }

    #[test]
    fn test_resources_subscribe_params_deserialization() {
        let json = r#"{"uri": "file:///data.db"}"#;
        let params: ResourcesSubscribeParams = serde_json::from_str(json).unwrap();
        assert_eq!(params.uri, "file:///data.db");
    }

    // ============================================================================
    // ResourcesUnsubscribeParams Tests
    // ============================================================================

    #[test]
    fn test_resources_unsubscribe_params_creation() {
        let params = ResourcesUnsubscribeParams {
            uri: "file:///unwatched.txt".to_string(),
        };
        assert_eq!(params.uri, "file:///unwatched.txt");
    }

    #[test]
    fn test_resources_unsubscribe_params_serialization() {
        let params = ResourcesUnsubscribeParams {
            uri: "file:///old-config.json".to_string(),
        };
        let json = serde_json::to_value(&params).unwrap();
        assert_eq!(json["uri"], "file:///old-config.json");
    }

    #[test]
    fn test_resources_unsubscribe_params_deserialization() {
        let json = r#"{"uri": "file:///temp.log"}"#;
        let params: ResourcesUnsubscribeParams = serde_json::from_str(json).unwrap();
        assert_eq!(params.uri, "file:///temp.log");
    }

    // ============================================================================
    // ResourceUpdatedParams Tests
    // ============================================================================

    #[test]
    fn test_resource_updated_params_creation() {
        let params = ResourceUpdatedParams {
            uri: "file:///updated.txt".to_string(),
        };
        assert_eq!(params.uri, "file:///updated.txt");
    }

    #[test]
    fn test_resource_updated_params_serialization() {
        let params = ResourceUpdatedParams {
            uri: "file:///modified.json".to_string(),
        };
        let json = serde_json::to_value(&params).unwrap();
        assert_eq!(json["uri"], "file:///modified.json");
    }

    #[test]
    fn test_resource_updated_params_deserialization() {
        let json = r#"{"uri": "file:///changed.xml"}"#;
        let params: ResourceUpdatedParams = serde_json::from_str(json).unwrap();
        assert_eq!(params.uri, "file:///changed.xml");
    }

    // ============================================================================
    // ResourceContent Tests (via type alias)
    // ============================================================================

    #[test]
    fn test_resource_content_with_text() {
        let content = ResourceContent {
            contents: vec![ResourceContentItem {
                uri: "file:///test.txt".to_string(),
                mime_type: Some("text/plain".to_string()),
                text: Some("Hello, World!".to_string()),
                blob: None,
            }],
        };

        let json = serde_json::to_value(&content).unwrap();
        assert_eq!(json["contents"][0]["text"], "Hello, World!");
    }

    #[test]
    fn test_resource_content_with_blob() {
        let content = ResourceContent {
            contents: vec![ResourceContentItem {
                uri: "file:///image.png".to_string(),
                mime_type: Some("image/png".to_string()),
                text: None,
                blob: Some("iVBORw0KGgo=".to_string()),
            }],
        };

        let json = serde_json::to_value(&content).unwrap();
        assert_eq!(json["contents"][0]["blob"], "iVBORw0KGgo=");
    }

    #[test]
    fn test_resource_content_multiple_items() {
        let content = ResourceContent {
            contents: vec![
                ResourceContentItem {
                    uri: "file:///part1.txt".to_string(),
                    mime_type: Some("text/plain".to_string()),
                    text: Some("Part 1".to_string()),
                    blob: None,
                },
                ResourceContentItem {
                    uri: "file:///part2.txt".to_string(),
                    mime_type: Some("text/plain".to_string()),
                    text: Some("Part 2".to_string()),
                    blob: None,
                },
            ],
        };

        assert_eq!(content.contents.len(), 2);
    }

    // ============================================================================
    // Edge Cases
    // ============================================================================

    #[test]
    fn test_uri_with_special_characters() {
        let params = ResourcesReadParams {
            uri: "file:///path/to/file%20with%20spaces.txt".to_string(),
        };
        let json = serde_json::to_value(&params).unwrap();
        let deserialized: ResourcesReadParams = serde_json::from_value(json).unwrap();
        assert_eq!(deserialized.uri, "file:///path/to/file%20with%20spaces.txt");
    }

    #[test]
    fn test_uri_with_unicode() {
        let params = ResourcesReadParams {
            uri: "file:///文件/测试.txt".to_string(),
        };
        let json = serde_json::to_value(&params).unwrap();
        let deserialized: ResourcesReadParams = serde_json::from_value(json).unwrap();
        assert_eq!(deserialized.uri, "file:///文件/测试.txt");
    }

    #[test]
    fn test_empty_uri() {
        let params = ResourcesReadParams { uri: String::new() };
        let json = serde_json::to_value(&params).unwrap();
        assert_eq!(json["uri"], "");
    }

    #[test]
    fn test_resources_list_response_with_many_resources() {
        let resources: Vec<McpResource> = (0..50)
            .map(|i| McpResource {
                uri: format!("file:///resource_{}.txt", i),
                name: format!("Resource {}", i),
                description: None,
                mime_type: Some("text/plain".to_string()),
            })
            .collect();

        let response = ResourcesListResponse {
            resources,
            next_cursor: Some("more".to_string()),
        };

        assert_eq!(response.resources.len(), 50);
        assert_eq!(response.resources[25].uri, "file:///resource_25.txt");
    }

    #[test]
    fn test_resource_with_http_uri() {
        let params = ResourcesReadParams {
            uri: "https://api.example.com/v1/resource?id=123&format=json".to_string(),
        };
        let json = serde_json::to_value(&params).unwrap();
        assert!(json["uri"].as_str().unwrap().starts_with("https://"));
    }
}
