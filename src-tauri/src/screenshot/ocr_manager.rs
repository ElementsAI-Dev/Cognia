//! OCR Provider Manager
//!
//! Manages multiple OCR providers and routes requests to the appropriate provider.

use super::ocr_provider::{
    OcrError, OcrErrorCode, OcrOptions, OcrProvider, OcrProviderConfig, OcrProviderInfo,
    OcrProviderType, OcrResult,
};
use parking_lot::RwLock;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;

/// OCR Manager that handles multiple providers
#[derive(Clone)]
pub struct OcrManager {
    /// Registered providers
    providers: Arc<RwLock<HashMap<OcrProviderType, Arc<dyn OcrProvider>>>>,
    /// Provider configurations
    configs: Arc<RwLock<HashMap<OcrProviderType, OcrProviderConfig>>>,
    /// Default provider
    default_provider: Arc<RwLock<OcrProviderType>>,
    /// Result cache
    cache: Arc<RwLock<OcrCache>>,
}

/// Simple LRU-like cache for OCR results
struct OcrCache {
    entries: HashMap<String, CacheEntry>,
    max_entries: usize,
}

struct CacheEntry {
    result: OcrResult,
    timestamp: Instant,
}

impl Default for OcrCache {
    fn default() -> Self {
        Self {
            entries: HashMap::new(),
            max_entries: 100,
        }
    }
}

impl OcrCache {
    fn get(&self, key: &str) -> Option<&OcrResult> {
        self.entries.get(key).map(|e| &e.result)
    }

    fn insert(&mut self, key: String, result: OcrResult) {
        // Simple eviction: remove oldest if at capacity
        if self.entries.len() >= self.max_entries {
            if let Some(oldest_key) = self
                .entries
                .iter()
                .min_by_key(|(_, v)| v.timestamp)
                .map(|(k, _)| k.clone())
            {
                self.entries.remove(&oldest_key);
            }
        }
        self.entries.insert(
            key,
            CacheEntry {
                result,
                timestamp: Instant::now(),
            },
        );
    }

    fn clear(&mut self) {
        self.entries.clear();
    }
}

impl OcrManager {
    /// Create a new OCR manager
    pub fn new() -> Self {
        Self {
            providers: Arc::new(RwLock::new(HashMap::new())),
            configs: Arc::new(RwLock::new(HashMap::new())),
            default_provider: Arc::new(RwLock::new(OcrProviderType::WindowsOcr)),
            cache: Arc::new(RwLock::new(OcrCache::default())),
        }
    }

    /// Register a provider
    pub fn register_provider(&self, provider: Arc<dyn OcrProvider>) {
        let provider_type = provider.provider_type();
        self.providers.write().insert(provider_type, provider);
    }

    /// Set provider configuration
    pub fn set_config(&self, config: OcrProviderConfig) {
        self.configs.write().insert(config.provider_type.clone(), config);
    }

    /// Get provider configuration
    pub fn get_config(&self, provider_type: &OcrProviderType) -> Option<OcrProviderConfig> {
        self.configs.read().get(provider_type).cloned()
    }

    /// Get all configurations
    pub fn get_all_configs(&self) -> Vec<OcrProviderConfig> {
        self.configs.read().values().cloned().collect()
    }

    /// Set default provider
    pub fn set_default_provider(&self, provider_type: OcrProviderType) {
        *self.default_provider.write() = provider_type;
    }

    /// Get default provider type
    pub fn get_default_provider(&self) -> OcrProviderType {
        self.default_provider.read().clone()
    }

    /// Get provider by type
    pub fn get_provider(&self, provider_type: &OcrProviderType) -> Option<Arc<dyn OcrProvider>> {
        self.providers.read().get(provider_type).cloned()
    }

    /// Get all registered provider types
    pub fn get_registered_providers(&self) -> Vec<OcrProviderType> {
        self.providers.read().keys().cloned().collect()
    }

    /// Get information about all providers
    pub async fn get_provider_info(&self) -> Vec<OcrProviderInfo> {
        let mut infos = Vec::new();
        let providers = self.providers.read().clone();

        for (provider_type, provider) in providers {
            let available = provider.is_available().await;
            let languages = provider
                .get_supported_languages()
                .await
                .unwrap_or_default();

            infos.push(OcrProviderInfo::new(provider_type, available, languages));
        }

        // Add info for unregistered providers
        for provider_type in OcrProviderType::all() {
            if !infos.iter().any(|i| i.provider_type == provider_type) {
                infos.push(OcrProviderInfo::new(provider_type, false, vec![]));
            }
        }

        infos
    }

    /// Extract text using the specified provider
    pub async fn extract_text(
        &self,
        provider_type: Option<OcrProviderType>,
        image_data: &[u8],
        options: &OcrOptions,
    ) -> Result<OcrResult, OcrError> {
        let provider_type = provider_type.unwrap_or_else(|| self.get_default_provider());

        // Check cache first
        let cache_key = self.compute_cache_key(&provider_type, image_data, options);
        if let Some(cached) = self.cache.read().get(&cache_key) {
            return Ok(cached.clone());
        }

        // Get provider
        let provider = self.get_provider(&provider_type).ok_or_else(|| {
            OcrError::provider_unavailable(format!(
                "Provider {:?} is not registered",
                provider_type
            ))
        })?;

        // Check if provider is available
        if !provider.is_available().await {
            return Err(OcrError::provider_unavailable(format!(
                "Provider {} is not available",
                provider.display_name()
            ))
            .with_provider(provider_type.display_name()));
        }

        // Check if provider is enabled
        if let Some(config) = self.get_config(&provider_type) {
            if !config.enabled {
                return Err(OcrError::new(
                    OcrErrorCode::ConfigurationError,
                    format!("Provider {} is disabled", provider.display_name()),
                )
                .with_provider(provider_type.display_name()));
            }
        }

        // Perform OCR
        let start = Instant::now();
        let mut result = provider.extract_text(image_data, options).await?;
        result.processing_time_ms = start.elapsed().as_millis() as u64;
        result.provider = provider_type.display_name().to_string();

        // Cache result
        self.cache.write().insert(cache_key, result.clone());

        Ok(result)
    }

    /// Extract text with fallback to other providers
    pub async fn extract_text_with_fallback(
        &self,
        image_data: &[u8],
        options: &OcrOptions,
        preferred_providers: &[OcrProviderType],
    ) -> Result<OcrResult, OcrError> {
        let mut last_error = None;

        // Try preferred providers first
        for provider_type in preferred_providers {
            match self
                .extract_text(Some(provider_type.clone()), image_data, options)
                .await
            {
                Ok(result) => return Ok(result),
                Err(e) => {
                    log::warn!(
                        "OCR provider {:?} failed: {}",
                        provider_type,
                        e.message
                    );
                    last_error = Some(e);
                }
            }
        }

        // Try default provider if not in preferred list
        let default = self.get_default_provider();
        if !preferred_providers.contains(&default) {
            match self
                .extract_text(Some(default.clone()), image_data, options)
                .await
            {
                Ok(result) => return Ok(result),
                Err(e) => {
                    log::warn!("Default OCR provider {:?} failed: {}", default, e.message);
                    last_error = Some(e);
                }
            }
        }

        // Try any available provider
        let providers = self.get_registered_providers();
        for provider_type in providers {
            if preferred_providers.contains(&provider_type) || provider_type == default {
                continue;
            }

            match self
                .extract_text(Some(provider_type.clone()), image_data, options)
                .await
            {
                Ok(result) => return Ok(result),
                Err(e) => {
                    log::warn!(
                        "Fallback OCR provider {:?} failed: {}",
                        provider_type,
                        e.message
                    );
                    last_error = Some(e);
                }
            }
        }

        Err(last_error.unwrap_or_else(|| {
            OcrError::provider_unavailable("No OCR providers available")
        }))
    }

    /// Clear the result cache
    pub fn clear_cache(&self) {
        self.cache.write().clear();
    }

    /// Compute cache key for an OCR request
    fn compute_cache_key(
        &self,
        provider_type: &OcrProviderType,
        image_data: &[u8],
        options: &OcrOptions,
    ) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let mut hasher = DefaultHasher::new();
        format!("{:?}", provider_type).hash(&mut hasher);
        image_data.hash(&mut hasher);
        format!("{:?}", options.language).hash(&mut hasher);
        format!("{:?}", options.document_hint).hash(&mut hasher);

        format!("ocr_{:x}", hasher.finish())
    }
}

impl Default for OcrManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ocr_manager_new() {
        let manager = OcrManager::new();
        assert!(manager.get_registered_providers().is_empty());
    }

    #[test]
    fn test_ocr_manager_default_provider() {
        let manager = OcrManager::new();
        assert_eq!(manager.get_default_provider(), OcrProviderType::WindowsOcr);

        manager.set_default_provider(OcrProviderType::GoogleVision);
        assert_eq!(manager.get_default_provider(), OcrProviderType::GoogleVision);
    }

    #[test]
    fn test_ocr_manager_config() {
        let manager = OcrManager::new();
        
        let config = OcrProviderConfig {
            provider_type: OcrProviderType::GoogleVision,
            enabled: true,
            api_key: Some("test_key".to_string()),
            ..Default::default()
        };

        manager.set_config(config.clone());
        let retrieved = manager.get_config(&OcrProviderType::GoogleVision);
        
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().api_key, Some("test_key".to_string()));
    }

    #[test]
    fn test_cache_key_computation() {
        let manager = OcrManager::new();
        let image_data = vec![1, 2, 3, 4];
        let options = OcrOptions::default();

        let key1 = manager.compute_cache_key(&OcrProviderType::WindowsOcr, &image_data, &options);
        let key2 = manager.compute_cache_key(&OcrProviderType::WindowsOcr, &image_data, &options);
        let key3 = manager.compute_cache_key(&OcrProviderType::GoogleVision, &image_data, &options);

        assert_eq!(key1, key2);
        assert_ne!(key1, key3);
    }
}
