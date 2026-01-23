//! Completion service for AI-powered text completion
//!
//! Handles requesting completions from various AI providers.

use super::config::{CompletionModelConfig, CompletionProvider};
use super::types::{CompletionContext, CompletionResult, CompletionSuggestion, CompletionType};
use parking_lot::RwLock;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;

/// Completion service for getting AI suggestions
pub struct CompletionService {
    /// HTTP client for API requests
    client: reqwest::Client,
    /// Simple cache for completions
    cache: Arc<RwLock<HashMap<String, CacheEntry>>>,
    /// Maximum cache size
    max_cache_size: usize,
    /// Cache TTL in seconds
    cache_ttl_secs: u64,
    /// Statistics
    stats: Arc<RwLock<ServiceStats>>,
}

/// Internal statistics for the completion service
#[derive(Debug, Clone, Default)]
struct ServiceStats {
    total_requests: u64,
    successful_completions: u64,
    failed_completions: u64,
    cache_hits: u64,
    total_latency_ms: u64,
}

/// Cache entry for completions
struct CacheEntry {
    result: CompletionResult,
    timestamp: Instant,
}

impl CompletionService {
    /// Create a new completion service
    pub fn new() -> Self {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()
            .unwrap_or_default();

        Self {
            client,
            cache: Arc::new(RwLock::new(HashMap::new())),
            max_cache_size: 100,
            cache_ttl_secs: 60,
            stats: Arc::new(RwLock::new(ServiceStats::default())),
        }
    }

    /// Get completion for the given context
    pub async fn get_completion(
        &self,
        context: &CompletionContext,
        config: &CompletionModelConfig,
    ) -> Result<CompletionResult, String> {
        let start = Instant::now();

        // Increment request count
        self.stats.write().total_requests += 1;

        // Check cache first
        let cache_key = self.compute_cache_key(context);
        if let Some(cached) = self.get_cached(&cache_key) {
            log::trace!("Cache hit for completion");
            self.stats.write().cache_hits += 1;
            return Ok(cached);
        }

        // Request completion based on provider
        let result = match config.provider {
            CompletionProvider::Ollama => self.get_ollama_completion(context, config).await,
            CompletionProvider::OpenAI => self.get_openai_completion(context, config).await,
            CompletionProvider::Groq => self.get_groq_completion(context, config).await,
            CompletionProvider::Auto => self.get_auto_completion(context, config).await,
            CompletionProvider::Custom => self.get_custom_completion(context, config).await,
        };

        match result {
            Ok(mut result) => {
                let latency = start.elapsed().as_millis() as u64;
                result.latency_ms = latency;
                
                // Update stats
                {
                    let mut stats = self.stats.write();
                    stats.successful_completions += 1;
                    stats.total_latency_ms += latency;
                }
                
                // Cache the result
                self.set_cached(cache_key, result.clone());
                
                Ok(result)
            }
            Err(e) => {
                self.stats.write().failed_completions += 1;
                Err(e)
            }
        }
    }

    /// Get completion from Ollama
    async fn get_ollama_completion(
        &self,
        context: &CompletionContext,
        config: &CompletionModelConfig,
    ) -> Result<CompletionResult, String> {
        let endpoint = config
            .endpoint
            .clone()
            .unwrap_or_else(|| "http://localhost:11434".to_string());

        let prompt = self.build_completion_prompt(context);

        let request_body = serde_json::json!({
            "model": config.model_id,
            "prompt": prompt,
            "stream": false,
            "options": {
                "temperature": config.temperature,
                "num_predict": config.max_tokens,
                "stop": ["\n\n", "```", "// ", "# "]
            }
        });

        let response = self
            .client
            .post(format!("{}/api/generate", endpoint))
            .json(&request_body)
            .timeout(std::time::Duration::from_secs(config.timeout_secs.into()))
            .send()
            .await
            .map_err(|e| format!("Ollama request failed: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("Ollama returned status: {}", response.status()));
        }

        let response_json: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse Ollama response: {}", e))?;

        let completion_text = response_json["response"]
            .as_str()
            .unwrap_or("")
            .trim()
            .to_string();

        if completion_text.is_empty() {
            return Ok(CompletionResult::default());
        }

        let suggestion = CompletionSuggestion::new(
            completion_text.clone(),
            0.8,
            if completion_text.contains('\n') {
                CompletionType::Block
            } else {
                CompletionType::Line
            },
        );

        Ok(CompletionResult {
            suggestions: vec![suggestion],
            latency_ms: 0,
            model: config.model_id.clone(),
            cached: false,
        })
    }

    /// Get completion from OpenAI
    async fn get_openai_completion(
        &self,
        context: &CompletionContext,
        config: &CompletionModelConfig,
    ) -> Result<CompletionResult, String> {
        let endpoint = config
            .endpoint
            .clone()
            .unwrap_or_else(|| "https://api.openai.com/v1".to_string());

        let api_key = config
            .api_key
            .clone()
            .ok_or("OpenAI API key is required")?;

        let prompt = self.build_completion_prompt(context);

        let request_body = serde_json::json!({
            "model": config.model_id,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a code completion assistant. Complete the following text naturally. Only output the completion, nothing else."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "max_tokens": config.max_tokens,
            "temperature": config.temperature,
            "stop": ["\n\n"]
        });

        let response = self
            .client
            .post(format!("{}/chat/completions", endpoint))
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&request_body)
            .timeout(std::time::Duration::from_secs(config.timeout_secs.into()))
            .send()
            .await
            .map_err(|e| format!("OpenAI request failed: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("OpenAI returned status: {}", response.status()));
        }

        let response_json: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse OpenAI response: {}", e))?;

        let completion_text = response_json["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("")
            .trim()
            .to_string();

        if completion_text.is_empty() {
            return Ok(CompletionResult::default());
        }

        let suggestion = CompletionSuggestion::new(
            completion_text.clone(),
            0.85,
            if completion_text.contains('\n') {
                CompletionType::Block
            } else {
                CompletionType::Line
            },
        );

        Ok(CompletionResult {
            suggestions: vec![suggestion],
            latency_ms: 0,
            model: config.model_id.clone(),
            cached: false,
        })
    }

    /// Get completion from Groq
    async fn get_groq_completion(
        &self,
        context: &CompletionContext,
        config: &CompletionModelConfig,
    ) -> Result<CompletionResult, String> {
        let endpoint = config
            .endpoint
            .clone()
            .unwrap_or_else(|| "https://api.groq.com/openai/v1".to_string());

        let api_key = config.api_key.clone().ok_or("Groq API key is required")?;

        let prompt = self.build_completion_prompt(context);

        let request_body = serde_json::json!({
            "model": config.model_id,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a fast code completion assistant. Complete the following text naturally. Only output the completion, nothing else."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "max_tokens": config.max_tokens,
            "temperature": config.temperature,
            "stop": ["\n\n"]
        });

        let response = self
            .client
            .post(format!("{}/chat/completions", endpoint))
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&request_body)
            .timeout(std::time::Duration::from_secs(config.timeout_secs.into()))
            .send()
            .await
            .map_err(|e| format!("Groq request failed: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("Groq returned status: {}", response.status()));
        }

        let response_json: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse Groq response: {}", e))?;

        let completion_text = response_json["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("")
            .trim()
            .to_string();

        if completion_text.is_empty() {
            return Ok(CompletionResult::default());
        }

        let suggestion = CompletionSuggestion::new(
            completion_text.clone(),
            0.8,
            if completion_text.contains('\n') {
                CompletionType::Block
            } else {
                CompletionType::Line
            },
        );

        Ok(CompletionResult {
            suggestions: vec![suggestion],
            latency_ms: 0,
            model: config.model_id.clone(),
            cached: false,
        })
    }

    /// Get completion using auto-router (try Ollama first, then fallback)
    async fn get_auto_completion(
        &self,
        context: &CompletionContext,
        config: &CompletionModelConfig,
    ) -> Result<CompletionResult, String> {
        // Try Ollama first (local, fast)
        let ollama_config = CompletionModelConfig {
            provider: CompletionProvider::Ollama,
            model_id: "qwen2.5-coder:0.5b".to_string(),
            endpoint: Some("http://localhost:11434".to_string()),
            api_key: None,
            max_tokens: config.max_tokens,
            temperature: config.temperature,
            timeout_secs: 3, // Short timeout for local
        };

        match self.get_ollama_completion(context, &ollama_config).await {
            Ok(result) if !result.suggestions.is_empty() => return Ok(result),
            _ => {
                log::trace!("Ollama not available, trying Groq");
            }
        }

        // Fallback to Groq if API key is available
        if config.api_key.is_some() {
            let groq_config = CompletionModelConfig {
                provider: CompletionProvider::Groq,
                model_id: "llama-3.1-8b-instant".to_string(),
                endpoint: None,
                api_key: config.api_key.clone(),
                max_tokens: config.max_tokens,
                temperature: config.temperature,
                timeout_secs: config.timeout_secs,
            };

            return self.get_groq_completion(context, &groq_config).await;
        }

        Ok(CompletionResult::default())
    }

    /// Get completion from custom endpoint
    async fn get_custom_completion(
        &self,
        context: &CompletionContext,
        config: &CompletionModelConfig,
    ) -> Result<CompletionResult, String> {
        let endpoint = config
            .endpoint
            .clone()
            .ok_or("Custom endpoint is required")?;

        let prompt = self.build_completion_prompt(context);

        let mut request_body = serde_json::json!({
            "prompt": prompt,
            "max_tokens": config.max_tokens,
            "temperature": config.temperature
        });

        if !config.model_id.is_empty() {
            request_body["model"] = serde_json::json!(config.model_id);
        }

        let mut request = self
            .client
            .post(&endpoint)
            .header("Content-Type", "application/json")
            .json(&request_body);

        if let Some(api_key) = &config.api_key {
            request = request.header("Authorization", format!("Bearer {}", api_key));
        }

        let response = request
            .timeout(std::time::Duration::from_secs(config.timeout_secs.into()))
            .send()
            .await
            .map_err(|e| format!("Custom endpoint request failed: {}", e))?;

        if !response.status().is_success() {
            return Err(format!(
                "Custom endpoint returned status: {}",
                response.status()
            ));
        }

        let response_json: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse custom response: {}", e))?;

        // Try common response formats
        let completion_text = response_json["response"]
            .as_str()
            .or_else(|| response_json["text"].as_str())
            .or_else(|| response_json["choices"][0]["text"].as_str())
            .or_else(|| response_json["choices"][0]["message"]["content"].as_str())
            .unwrap_or("")
            .trim()
            .to_string();

        if completion_text.is_empty() {
            return Ok(CompletionResult::default());
        }

        let suggestion = CompletionSuggestion::new(
            completion_text.clone(),
            0.7,
            if completion_text.contains('\n') {
                CompletionType::Block
            } else {
                CompletionType::Line
            },
        );

        Ok(CompletionResult {
            suggestions: vec![suggestion],
            latency_ms: 0,
            model: config.model_id.clone(),
            cached: false,
        })
    }

    /// Build the completion prompt from context
    fn build_completion_prompt(&self, context: &CompletionContext) -> String {
        let mut prompt = String::new();

        // Add language hint if available
        if let Some(lang) = &context.language {
            prompt.push_str(&format!("Language: {}\n", lang));
        }

        // Add the text to complete
        prompt.push_str("Complete the following:\n");
        prompt.push_str(&context.text);
        prompt.push_str("\n\nCompletion:");

        prompt
    }

    /// Compute cache key for a context
    fn compute_cache_key(&self, context: &CompletionContext) -> String {
        use std::hash::{Hash, Hasher};
        let mut hasher = std::collections::hash_map::DefaultHasher::new();
        context.text.hash(&mut hasher);
        if let Some(lang) = &context.language {
            lang.hash(&mut hasher);
        }
        format!("{:x}", hasher.finish())
    }

    /// Get cached result
    fn get_cached(&self, key: &str) -> Option<CompletionResult> {
        let cache = self.cache.read();
        if let Some(entry) = cache.get(key) {
            if entry.timestamp.elapsed().as_secs() < self.cache_ttl_secs {
                let mut result = entry.result.clone();
                result.cached = true;
                return Some(result);
            }
        }
        None
    }

    /// Set cached result
    fn set_cached(&self, key: String, result: CompletionResult) {
        let mut cache = self.cache.write();
        
        // Evict old entries if cache is full
        if cache.len() >= self.max_cache_size {
            let oldest_key = cache
                .iter()
                .min_by_key(|(_, v)| v.timestamp)
                .map(|(k, _)| k.clone());
            
            if let Some(key) = oldest_key {
                cache.remove(&key);
            }
        }

        cache.insert(
            key,
            CacheEntry {
                result,
                timestamp: Instant::now(),
            },
        );
    }

    /// Clear the cache
    pub fn clear_cache(&self) {
        self.cache.write().clear();
    }

    /// Get statistics
    pub fn get_stats(&self) -> super::types::CompletionStats {
        let stats = self.stats.read();
        let avg_latency = if stats.successful_completions > 0 {
            stats.total_latency_ms as f64 / stats.successful_completions as f64
        } else {
            0.0
        };
        let cache_hit_rate = if stats.total_requests > 0 {
            stats.cache_hits as f64 / stats.total_requests as f64
        } else {
            0.0
        };

        super::types::CompletionStats {
            total_requests: stats.total_requests,
            successful_completions: stats.successful_completions,
            failed_completions: stats.failed_completions,
            accepted_suggestions: 0, // Tracked at manager level
            dismissed_suggestions: 0, // Tracked at manager level
            avg_latency_ms: avg_latency,
            cache_hit_rate,
        }
    }

    /// Reset statistics
    pub fn reset_stats(&self) {
        *self.stats.write() = ServiceStats::default();
    }
}

impl Default for CompletionService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_completion_service_creation() {
        let service = CompletionService::new();
        assert_eq!(service.max_cache_size, 100);
        assert_eq!(service.cache_ttl_secs, 60);
    }

    #[test]
    fn test_completion_service_default() {
        let service = CompletionService::default();
        assert_eq!(service.max_cache_size, 100);
    }

    #[test]
    fn test_build_completion_prompt() {
        let service = CompletionService::new();
        
        let context = CompletionContext {
            text: "fn hello".to_string(),
            cursor_position: None,
            file_path: None,
            language: Some("rust".to_string()),
            ime_state: None,
        };

        let prompt = service.build_completion_prompt(&context);
        assert!(prompt.contains("rust"));
        assert!(prompt.contains("fn hello"));
        assert!(prompt.contains("Language:"));
        assert!(prompt.contains("Complete the following:"));
    }

    #[test]
    fn test_build_completion_prompt_no_language() {
        let service = CompletionService::new();
        
        let context = CompletionContext {
            text: "hello world".to_string(),
            cursor_position: None,
            file_path: None,
            language: None,
            ime_state: None,
        };

        let prompt = service.build_completion_prompt(&context);
        assert!(!prompt.contains("Language:"));
        assert!(prompt.contains("hello world"));
    }

    #[test]
    fn test_build_completion_prompt_different_languages() {
        let service = CompletionService::new();
        
        let languages = vec!["python", "javascript", "typescript", "java", "go"];
        
        for lang in languages {
            let context = CompletionContext {
                text: "test code".to_string(),
                cursor_position: None,
                file_path: None,
                language: Some(lang.to_string()),
                ime_state: None,
            };
            
            let prompt = service.build_completion_prompt(&context);
            assert!(prompt.contains(lang));
        }
    }

    #[test]
    fn test_cache_key_generation() {
        let service = CompletionService::new();
        
        let context1 = CompletionContext {
            text: "hello".to_string(),
            cursor_position: None,
            file_path: None,
            language: None,
            ime_state: None,
        };

        let context2 = CompletionContext {
            text: "hello".to_string(),
            cursor_position: None,
            file_path: None,
            language: None,
            ime_state: None,
        };

        let key1 = service.compute_cache_key(&context1);
        let key2 = service.compute_cache_key(&context2);
        
        assert_eq!(key1, key2);
    }

    #[test]
    fn test_cache_key_different_text() {
        let service = CompletionService::new();
        
        let context1 = CompletionContext {
            text: "hello".to_string(),
            cursor_position: None,
            file_path: None,
            language: None,
            ime_state: None,
        };

        let context2 = CompletionContext {
            text: "world".to_string(),
            cursor_position: None,
            file_path: None,
            language: None,
            ime_state: None,
        };

        let key1 = service.compute_cache_key(&context1);
        let key2 = service.compute_cache_key(&context2);
        
        assert_ne!(key1, key2);
    }

    #[test]
    fn test_cache_key_different_language() {
        let service = CompletionService::new();
        
        let context1 = CompletionContext {
            text: "code".to_string(),
            cursor_position: None,
            file_path: None,
            language: Some("rust".to_string()),
            ime_state: None,
        };

        let context2 = CompletionContext {
            text: "code".to_string(),
            cursor_position: None,
            file_path: None,
            language: Some("python".to_string()),
            ime_state: None,
        };

        let key1 = service.compute_cache_key(&context1);
        let key2 = service.compute_cache_key(&context2);
        
        assert_ne!(key1, key2);
    }

    #[test]
    fn test_cache_operations() {
        let service = CompletionService::new();
        
        let result = CompletionResult {
            suggestions: vec![CompletionSuggestion::new(
                "test".to_string(),
                0.9,
                CompletionType::Line,
            )],
            latency_ms: 100,
            model: "test".to_string(),
            cached: false,
        };

        service.set_cached("test_key".to_string(), result.clone());
        
        let cached = service.get_cached("test_key");
        assert!(cached.is_some());
        assert!(cached.unwrap().cached);
    }

    #[test]
    fn test_cache_miss() {
        let service = CompletionService::new();
        
        let cached = service.get_cached("nonexistent_key");
        assert!(cached.is_none());
    }

    #[test]
    fn test_cache_preserves_data() {
        let service = CompletionService::new();
        
        let result = CompletionResult {
            suggestions: vec![CompletionSuggestion::new(
                "test suggestion".to_string(),
                0.85,
                CompletionType::Block,
            )],
            latency_ms: 150,
            model: "test-model".to_string(),
            cached: false,
        };

        service.set_cached("preserve_test".to_string(), result.clone());
        
        let cached = service.get_cached("preserve_test").unwrap();
        assert_eq!(cached.suggestions.len(), 1);
        assert_eq!(cached.suggestions[0].text, "test suggestion");
        assert_eq!(cached.latency_ms, 150);
        assert_eq!(cached.model, "test-model");
        assert!(cached.cached);
    }

    #[test]
    fn test_clear_cache() {
        let service = CompletionService::new();
        
        let result = CompletionResult::default();
        service.set_cached("key1".to_string(), result.clone());
        service.set_cached("key2".to_string(), result.clone());
        service.set_cached("key3".to_string(), result);
        
        service.clear_cache();
        
        assert!(service.get_cached("key1").is_none());
        assert!(service.get_cached("key2").is_none());
        assert!(service.get_cached("key3").is_none());
    }

    #[test]
    fn test_cache_multiple_entries() {
        let service = CompletionService::new();
        
        for i in 0..10 {
            let result = CompletionResult {
                suggestions: vec![CompletionSuggestion::new(
                    format!("suggestion_{}", i),
                    0.9,
                    CompletionType::Line,
                )],
                latency_ms: i as u64 * 10,
                model: format!("model_{}", i),
                cached: false,
            };
            service.set_cached(format!("key_{}", i), result);
        }
        
        for i in 0..10 {
            let cached = service.get_cached(&format!("key_{}", i));
            assert!(cached.is_some());
            assert_eq!(cached.unwrap().model, format!("model_{}", i));
        }
    }

    #[test]
    fn test_cache_eviction() {
        // Create service with small cache
        let service = CompletionService {
            client: reqwest::Client::new(),
            cache: Arc::new(RwLock::new(HashMap::new())),
            max_cache_size: 3,
            cache_ttl_secs: 60,
            stats: Arc::new(RwLock::new(ServiceStats::default())),
        };
        
        // Add entries beyond capacity
        for i in 0..5 {
            let result = CompletionResult::default();
            service.set_cached(format!("evict_key_{}", i), result);
            std::thread::sleep(std::time::Duration::from_millis(10));
        }
        
        // Cache should have at most max_cache_size entries
        let cache = service.cache.read();
        assert!(cache.len() <= 3);
    }

    #[test]
    fn test_cache_thread_safety() {
        let service = Arc::new(CompletionService::new());
        let mut handles = vec![];
        
        for i in 0..5 {
            let service_clone = service.clone();
            let handle = std::thread::spawn(move || {
                let result = CompletionResult::default();
                service_clone.set_cached(format!("thread_key_{}", i), result);
                service_clone.get_cached(&format!("thread_key_{}", i))
            });
            handles.push(handle);
        }
        
        for handle in handles {
            let result = handle.join().unwrap();
            assert!(result.is_some());
        }
    }

    #[test]
    fn test_completion_result_cached_flag() {
        let service = CompletionService::new();
        
        let result = CompletionResult {
            suggestions: vec![],
            latency_ms: 0,
            model: "test".to_string(),
            cached: false,
        };
        
        service.set_cached("flag_test".to_string(), result);
        
        let cached = service.get_cached("flag_test").unwrap();
        assert!(cached.cached, "Cached flag should be true when retrieved from cache");
    }

    #[test]
    fn test_compute_cache_key_deterministic() {
        let service = CompletionService::new();
        
        let context = CompletionContext {
            text: "deterministic test".to_string(),
            cursor_position: None,
            file_path: None,
            language: Some("rust".to_string()),
            ime_state: None,
        };

        let key1 = service.compute_cache_key(&context);
        let key2 = service.compute_cache_key(&context);
        let key3 = service.compute_cache_key(&context);
        
        assert_eq!(key1, key2);
        assert_eq!(key2, key3);
    }

    #[test]
    fn test_cache_key_hex_format() {
        let service = CompletionService::new();
        
        let context = CompletionContext::default();
        let key = service.compute_cache_key(&context);
        
        // Key should be a hex string
        assert!(key.chars().all(|c| c.is_ascii_hexdigit()));
    }
}
