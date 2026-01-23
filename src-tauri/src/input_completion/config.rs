//! Configuration for input completion

use serde::{Deserialize, Serialize};

/// Main configuration for input completion
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletionConfig {
    /// Whether input completion is enabled
    pub enabled: bool,
    /// Model configuration
    pub model: CompletionModelConfig,
    /// Trigger configuration
    pub trigger: CompletionTriggerConfig,
    /// UI configuration
    pub ui: CompletionUiConfig,
}

/// Model configuration for completions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletionModelConfig {
    /// Provider type
    pub provider: CompletionProvider,
    /// Model identifier
    pub model_id: String,
    /// API endpoint (for custom providers)
    pub endpoint: Option<String>,
    /// API key (if required)
    pub api_key: Option<String>,
    /// Maximum tokens to generate
    pub max_tokens: u32,
    /// Temperature for sampling
    pub temperature: f32,
    /// Request timeout in seconds
    pub timeout_secs: u32,
}

/// Supported completion providers
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum CompletionProvider {
    /// Use Ollama for local inference
    Ollama,
    /// Use OpenAI API
    OpenAI,
    /// Use Groq for fast inference
    Groq,
    /// Use project's auto-router
    Auto,
    /// Custom provider
    Custom,
}

/// Trigger configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletionTriggerConfig {
    /// Debounce delay in milliseconds
    pub debounce_ms: u64,
    /// Minimum context length to trigger completion
    pub min_context_length: usize,
    /// Maximum context length to send
    pub max_context_length: usize,
    /// Whether to trigger on word boundaries only
    pub trigger_on_word_boundary: bool,
    /// Characters that should not trigger completion
    pub skip_chars: Vec<char>,
    /// Whether to skip when modifier keys are held
    pub skip_with_modifiers: bool,
}

/// UI configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletionUiConfig {
    /// Whether to show inline preview
    pub show_inline_preview: bool,
    /// Maximum number of suggestions to show
    pub max_suggestions: usize,
    /// Font size for suggestions
    pub font_size: u32,
    /// Opacity for ghost text (0.0 - 1.0)
    pub ghost_text_opacity: f32,
    /// Auto-dismiss timeout in milliseconds (0 = never)
    pub auto_dismiss_ms: u64,
    /// Whether to show accept hint (e.g., "[Tab]")
    pub show_accept_hint: bool,
}

impl Default for CompletionConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            model: CompletionModelConfig::default(),
            trigger: CompletionTriggerConfig::default(),
            ui: CompletionUiConfig::default(),
        }
    }
}

impl Default for CompletionModelConfig {
    fn default() -> Self {
        Self {
            provider: CompletionProvider::Ollama,
            model_id: "qwen2.5-coder:0.5b".to_string(),
            endpoint: None,
            api_key: None,
            max_tokens: 128,
            temperature: 0.1,
            timeout_secs: 5,
        }
    }
}

impl Default for CompletionTriggerConfig {
    fn default() -> Self {
        Self {
            debounce_ms: 400,
            min_context_length: 5,
            max_context_length: 500,
            trigger_on_word_boundary: false,
            skip_chars: vec![' ', '\n', '\t', '\r'],
            skip_with_modifiers: true,
        }
    }
}

impl Default for CompletionUiConfig {
    fn default() -> Self {
        Self {
            show_inline_preview: true,
            max_suggestions: 1,
            font_size: 14,
            ghost_text_opacity: 0.5,
            auto_dismiss_ms: 5000,
            show_accept_hint: true,
        }
    }
}

impl CompletionConfig {
    /// Load configuration from file
    pub fn load(path: &std::path::Path) -> Result<Self, String> {
        if path.exists() {
            let content = std::fs::read_to_string(path)
                .map_err(|e| format!("Failed to read config file: {}", e))?;
            serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse config: {}", e))
        } else {
            Ok(Self::default())
        }
    }

    /// Save configuration to file
    pub fn save(&self, path: &std::path::Path) -> Result<(), String> {
        let content = serde_json::to_string_pretty(self)
            .map_err(|e| format!("Failed to serialize config: {}", e))?;
        
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create config directory: {}", e))?;
        }
        
        std::fs::write(path, content)
            .map_err(|e| format!("Failed to write config file: {}", e))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_default_config() {
        let config = CompletionConfig::default();
        assert!(config.enabled);
        assert_eq!(config.model.provider, CompletionProvider::Ollama);
        assert_eq!(config.trigger.debounce_ms, 400);
        assert!(config.ui.show_inline_preview);
    }

    #[test]
    fn test_config_serialization() {
        let config = CompletionConfig::default();
        let json = serde_json::to_string(&config).unwrap();
        let parsed: CompletionConfig = serde_json::from_str(&json).unwrap();
        
        assert_eq!(parsed.enabled, config.enabled);
        assert_eq!(parsed.model.model_id, config.model.model_id);
    }

    #[test]
    fn test_provider_serialization() {
        let provider = CompletionProvider::Ollama;
        let json = serde_json::to_string(&provider).unwrap();
        assert_eq!(json, "\"ollama\"");
    }

    #[test]
    fn test_trigger_config_defaults() {
        let trigger = CompletionTriggerConfig::default();
        assert!(trigger.debounce_ms >= 200);
        assert!(trigger.min_context_length >= 3);
        assert!(trigger.max_context_length >= 100);
    }

    #[test]
    fn test_model_config_default() {
        let model = CompletionModelConfig::default();
        assert_eq!(model.provider, CompletionProvider::Ollama);
        assert_eq!(model.model_id, "qwen2.5-coder:0.5b");
        assert!(model.endpoint.is_none());
        assert!(model.api_key.is_none());
        assert_eq!(model.max_tokens, 128);
        assert_eq!(model.temperature, 0.1);
        assert_eq!(model.timeout_secs, 5);
    }

    #[test]
    fn test_model_config_with_endpoint() {
        let model = CompletionModelConfig {
            provider: CompletionProvider::Custom,
            model_id: "custom-model".to_string(),
            endpoint: Some("http://localhost:8080".to_string()),
            api_key: Some("test-key".to_string()),
            max_tokens: 256,
            temperature: 0.5,
            timeout_secs: 10,
        };
        
        assert_eq!(model.provider, CompletionProvider::Custom);
        assert_eq!(model.endpoint, Some("http://localhost:8080".to_string()));
        assert_eq!(model.api_key, Some("test-key".to_string()));
    }

    #[test]
    fn test_ui_config_default() {
        let ui = CompletionUiConfig::default();
        assert!(ui.show_inline_preview);
        assert_eq!(ui.max_suggestions, 1);
        assert_eq!(ui.font_size, 14);
        assert_eq!(ui.ghost_text_opacity, 0.5);
        assert_eq!(ui.auto_dismiss_ms, 5000);
        assert!(ui.show_accept_hint);
    }

    #[test]
    fn test_ui_config_custom_values() {
        let ui = CompletionUiConfig {
            show_inline_preview: false,
            max_suggestions: 5,
            font_size: 16,
            ghost_text_opacity: 0.7,
            auto_dismiss_ms: 0,
            show_accept_hint: false,
        };
        
        assert!(!ui.show_inline_preview);
        assert_eq!(ui.max_suggestions, 5);
        assert_eq!(ui.auto_dismiss_ms, 0);
    }

    #[test]
    fn test_trigger_config_custom_values() {
        let trigger = CompletionTriggerConfig {
            debounce_ms: 200,
            min_context_length: 10,
            max_context_length: 1000,
            trigger_on_word_boundary: true,
            skip_chars: vec!['!', '@', '#'],
            skip_with_modifiers: false,
        };
        
        assert_eq!(trigger.debounce_ms, 200);
        assert!(trigger.trigger_on_word_boundary);
        assert_eq!(trigger.skip_chars.len(), 3);
        assert!(!trigger.skip_with_modifiers);
    }

    #[test]
    fn test_all_provider_variants() {
        let providers = vec![
            (CompletionProvider::Ollama, "\"ollama\""),
            (CompletionProvider::OpenAI, "\"openai\""),
            (CompletionProvider::Groq, "\"groq\""),
            (CompletionProvider::Auto, "\"auto\""),
            (CompletionProvider::Custom, "\"custom\""),
        ];
        
        for (provider, expected_json) in providers {
            let json = serde_json::to_string(&provider).unwrap();
            assert_eq!(json, expected_json);
            
            let parsed: CompletionProvider = serde_json::from_str(&json).unwrap();
            assert_eq!(parsed, provider);
        }
    }

    #[test]
    fn test_provider_equality() {
        assert_eq!(CompletionProvider::Ollama, CompletionProvider::Ollama);
        assert_eq!(CompletionProvider::OpenAI, CompletionProvider::OpenAI);
        assert_ne!(CompletionProvider::Ollama, CompletionProvider::OpenAI);
        assert_ne!(CompletionProvider::Groq, CompletionProvider::Auto);
    }

    #[test]
    fn test_config_save_and_load() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("test_config.json");
        
        let config = CompletionConfig {
            enabled: false,
            model: CompletionModelConfig {
                provider: CompletionProvider::Groq,
                model_id: "test-model".to_string(),
                endpoint: Some("http://test.com".to_string()),
                api_key: Some("test-key".to_string()),
                max_tokens: 64,
                temperature: 0.3,
                timeout_secs: 3,
            },
            trigger: CompletionTriggerConfig::default(),
            ui: CompletionUiConfig::default(),
        };
        
        config.save(&path).unwrap();
        assert!(path.exists());
        
        let loaded = CompletionConfig::load(&path).unwrap();
        assert_eq!(loaded.enabled, config.enabled);
        assert_eq!(loaded.model.provider, config.model.provider);
        assert_eq!(loaded.model.model_id, config.model.model_id);
        assert_eq!(loaded.model.endpoint, config.model.endpoint);
    }

    #[test]
    fn test_config_load_nonexistent_returns_default() {
        let path = std::path::Path::new("/nonexistent/path/config.json");
        let config = CompletionConfig::load(path).unwrap();
        
        assert!(config.enabled);
        assert_eq!(config.model.provider, CompletionProvider::Ollama);
    }

    #[test]
    fn test_config_save_creates_directory() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("subdir").join("config.json");
        
        let config = CompletionConfig::default();
        config.save(&path).unwrap();
        
        assert!(path.exists());
    }

    #[test]
    fn test_config_full_serialization_roundtrip() {
        let config = CompletionConfig {
            enabled: true,
            model: CompletionModelConfig {
                provider: CompletionProvider::OpenAI,
                model_id: "gpt-4".to_string(),
                endpoint: Some("https://api.openai.com".to_string()),
                api_key: Some("sk-test".to_string()),
                max_tokens: 512,
                temperature: 0.7,
                timeout_secs: 30,
            },
            trigger: CompletionTriggerConfig {
                debounce_ms: 500,
                min_context_length: 3,
                max_context_length: 2000,
                trigger_on_word_boundary: true,
                skip_chars: vec![' ', '\n', '\t'],
                skip_with_modifiers: true,
            },
            ui: CompletionUiConfig {
                show_inline_preview: true,
                max_suggestions: 3,
                font_size: 12,
                ghost_text_opacity: 0.6,
                auto_dismiss_ms: 10000,
                show_accept_hint: false,
            },
        };
        
        let json = serde_json::to_string_pretty(&config).unwrap();
        let parsed: CompletionConfig = serde_json::from_str(&json).unwrap();
        
        assert_eq!(parsed.enabled, config.enabled);
        assert_eq!(parsed.model.provider, config.model.provider);
        assert_eq!(parsed.model.model_id, config.model.model_id);
        assert_eq!(parsed.model.max_tokens, config.model.max_tokens);
        assert_eq!(parsed.trigger.debounce_ms, config.trigger.debounce_ms);
        assert_eq!(parsed.ui.max_suggestions, config.ui.max_suggestions);
    }

    #[test]
    fn test_trigger_skip_chars_default() {
        let trigger = CompletionTriggerConfig::default();
        assert!(trigger.skip_chars.contains(&' '));
        assert!(trigger.skip_chars.contains(&'\n'));
        assert!(trigger.skip_chars.contains(&'\t'));
        assert!(trigger.skip_chars.contains(&'\r'));
    }

    #[test]
    fn test_model_config_serialization() {
        let model = CompletionModelConfig::default();
        let json = serde_json::to_string(&model).unwrap();
        let parsed: CompletionModelConfig = serde_json::from_str(&json).unwrap();
        
        assert_eq!(parsed.provider, model.provider);
        assert_eq!(parsed.model_id, model.model_id);
        assert_eq!(parsed.max_tokens, model.max_tokens);
    }

    #[test]
    fn test_ui_config_serialization() {
        let ui = CompletionUiConfig::default();
        let json = serde_json::to_string(&ui).unwrap();
        let parsed: CompletionUiConfig = serde_json::from_str(&json).unwrap();
        
        assert_eq!(parsed.show_inline_preview, ui.show_inline_preview);
        assert_eq!(parsed.ghost_text_opacity, ui.ghost_text_opacity);
    }

    #[test]
    fn test_trigger_config_serialization() {
        let trigger = CompletionTriggerConfig::default();
        let json = serde_json::to_string(&trigger).unwrap();
        let parsed: CompletionTriggerConfig = serde_json::from_str(&json).unwrap();
        
        assert_eq!(parsed.debounce_ms, trigger.debounce_ms);
        assert_eq!(parsed.min_context_length, trigger.min_context_length);
    }
}
