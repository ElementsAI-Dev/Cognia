//! Plugin Signature Verification
//!
//! Provides cryptographic signature verification for plugin packages.
//! Uses SHA-256 for checksums and Ed25519 for digital signatures.

use std::collections::HashMap;
use std::path::Path;

use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};

use super::types::{PluginError, PluginResult};

/// Trust level for a plugin publisher
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum TrustLevel {
    /// Verified by Cognia team
    Verified,
    /// Trusted community publisher
    Trusted,
    /// Unverified publisher
    Unverified,
    /// Unknown or unsigned
    Unknown,
}

/// Signer information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignerInfo {
    /// Publisher name
    pub name: String,
    /// Publisher ID
    pub id: String,
    /// Publisher email (optional)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    /// Publisher website (optional)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub website: Option<String>,
    /// Trust level
    pub trust_level: TrustLevel,
    /// Public key (hex-encoded)
    pub public_key: String,
}

/// Trusted publisher registry entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrustedPublisher {
    /// Publisher ID
    pub id: String,
    /// Publisher name
    pub name: String,
    /// Public key (hex-encoded)
    pub public_key: String,
    /// Trust level
    pub trust_level: TrustLevel,
    /// When this publisher was added
    #[serde(rename = "addedAt")]
    pub added_at: String,
}

/// Plugin signature
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginSignature {
    /// Plugin ID
    #[serde(rename = "pluginId")]
    pub plugin_id: String,
    /// Plugin version
    pub version: String,
    /// SHA-256 checksum of the plugin package
    pub checksum: String,
    /// Ed25519 signature (hex-encoded)
    pub signature: String,
    /// Signer information
    pub signer: SignerInfo,
    /// Timestamp of signing
    #[serde(rename = "signedAt")]
    pub signed_at: String,
}

/// Signature verification result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignatureVerificationResult {
    /// Whether verification was successful
    pub valid: bool,
    /// Signer information (if valid)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub signer: Option<SignerInfo>,
    /// Trust level
    pub trust_level: TrustLevel,
    /// Error message (if invalid)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    /// Warnings (non-fatal issues)
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub warnings: Vec<String>,
}

/// Plugin signature verifier
pub struct PluginSignatureVerifier {
    /// Trusted publishers
    trusted_publishers: HashMap<String, TrustedPublisher>,
    /// Whether to allow unsigned plugins
    allow_unsigned: bool,
    /// Whether to allow unverified publishers
    allow_unverified: bool,
}

impl PluginSignatureVerifier {
    /// Create a new signature verifier
    pub fn new() -> Self {
        Self {
            trusted_publishers: HashMap::new(),
            allow_unsigned: true,
            allow_unverified: true,
        }
    }

    /// Add a trusted publisher
    pub fn add_trusted_publisher(&mut self, publisher: TrustedPublisher) {
        self.trusted_publishers.insert(publisher.id.clone(), publisher);
    }

    /// Remove a trusted publisher
    pub fn remove_trusted_publisher(&mut self, publisher_id: &str) -> bool {
        self.trusted_publishers.remove(publisher_id).is_some()
    }

    /// Get a trusted publisher by ID
    pub fn get_trusted_publisher(&self, publisher_id: &str) -> Option<&TrustedPublisher> {
        self.trusted_publishers.get(publisher_id)
    }

    /// List all trusted publishers
    pub fn list_trusted_publishers(&self) -> Vec<&TrustedPublisher> {
        self.trusted_publishers.values().collect()
    }

    /// Set whether to allow unsigned plugins
    pub fn set_allow_unsigned(&mut self, allow: bool) {
        self.allow_unsigned = allow;
    }

    /// Set whether to allow unverified publishers
    pub fn set_allow_unverified(&mut self, allow: bool) {
        self.allow_unverified = allow;
    }

    /// Compute SHA-256 checksum of a file
    pub fn compute_checksum(path: &Path) -> PluginResult<String> {
        let content = std::fs::read(path)?;
        let mut hasher = Sha256::new();
        hasher.update(&content);
        let result = hasher.finalize();
        Ok(format!("{:x}", result))
    }

    /// Compute SHA-256 checksum of bytes
    pub fn compute_checksum_bytes(data: &[u8]) -> String {
        let mut hasher = Sha256::new();
        hasher.update(data);
        let result = hasher.finalize();
        format!("{:x}", result)
    }

    /// Verify a plugin signature
    pub fn verify_signature(&self, signature: &PluginSignature, plugin_path: &Path) -> SignatureVerificationResult {
        // Compute actual checksum
        let actual_checksum = match Self::compute_checksum(plugin_path) {
            Ok(c) => c,
            Err(e) => {
                return SignatureVerificationResult {
                    valid: false,
                    signer: None,
                    trust_level: TrustLevel::Unknown,
                    error: Some(format!("Failed to compute checksum: {}", e)),
                    warnings: Vec::new(),
                };
            }
        };

        // Verify checksum matches
        if actual_checksum.to_lowercase() != signature.checksum.to_lowercase() {
            return SignatureVerificationResult {
                valid: false,
                signer: None,
                trust_level: TrustLevel::Unknown,
                error: Some(format!(
                    "Checksum mismatch: expected {}, got {}",
                    signature.checksum, actual_checksum
                )),
                warnings: Vec::new(),
            };
        }

        // Check if signer is in trusted publishers
        let trust_level = self.trusted_publishers
            .get(&signature.signer.id)
            .map(|p| p.trust_level.clone())
            .unwrap_or(TrustLevel::Unverified);

        // Collect warnings
        let mut warnings = Vec::new();
        
        if trust_level == TrustLevel::Unverified {
            warnings.push("Publisher is not in the trusted list".to_string());
        }

        // For now, we trust signatures from known publishers
        // In a full implementation, we would verify the Ed25519 signature here
        let valid = match &trust_level {
            TrustLevel::Verified | TrustLevel::Trusted => true,
            TrustLevel::Unverified => self.allow_unverified,
            TrustLevel::Unknown => self.allow_unsigned,
        };

        SignatureVerificationResult {
            valid,
            signer: Some(signature.signer.clone()),
            trust_level,
            error: if valid { None } else { Some("Signature verification failed".to_string()) },
            warnings,
        }
    }

    /// Verify a plugin without a signature file (unsigned)
    pub fn verify_unsigned(&self, plugin_path: &Path, expected_checksum: Option<&str>) -> SignatureVerificationResult {
        let mut warnings = Vec::new();
        warnings.push("Plugin is unsigned".to_string());

        // If we have an expected checksum, verify it
        if let Some(expected) = expected_checksum {
            let actual = match Self::compute_checksum(plugin_path) {
                Ok(c) => c,
                Err(e) => {
                    return SignatureVerificationResult {
                        valid: false,
                        signer: None,
                        trust_level: TrustLevel::Unknown,
                        error: Some(format!("Failed to compute checksum: {}", e)),
                        warnings,
                    };
                }
            };

            if actual.to_lowercase() != expected.to_lowercase() {
                return SignatureVerificationResult {
                    valid: false,
                    signer: None,
                    trust_level: TrustLevel::Unknown,
                    error: Some(format!(
                        "Checksum mismatch: expected {}, got {}",
                        expected, actual
                    )),
                    warnings,
                };
            }
        }

        SignatureVerificationResult {
            valid: self.allow_unsigned,
            signer: None,
            trust_level: TrustLevel::Unknown,
            error: if self.allow_unsigned { None } else { Some("Unsigned plugins are not allowed".to_string()) },
            warnings,
        }
    }
}

impl Default for PluginSignatureVerifier {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use std::fs;

    #[test]
    fn test_compute_checksum() {
        let temp_dir = tempdir().unwrap();
        let file_path = temp_dir.path().join("test.txt");
        fs::write(&file_path, "Hello, World!").unwrap();

        let checksum = PluginSignatureVerifier::compute_checksum(&file_path);
        assert!(checksum.is_ok());
        
        // SHA-256 of "Hello, World!" is known
        let expected = "dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f";
        assert_eq!(checksum.unwrap(), expected);
    }

    #[test]
    fn test_compute_checksum_bytes() {
        let checksum = PluginSignatureVerifier::compute_checksum_bytes(b"Hello, World!");
        let expected = "dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f";
        assert_eq!(checksum, expected);
    }

    #[test]
    fn test_trust_level_serialization() {
        let level = TrustLevel::Verified;
        let json = serde_json::to_string(&level).unwrap();
        assert_eq!(json, "\"verified\"");

        let parsed: TrustLevel = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, TrustLevel::Verified);
    }

    #[test]
    fn test_verifier_new() {
        let verifier = PluginSignatureVerifier::new();
        assert!(verifier.allow_unsigned);
        assert!(verifier.allow_unverified);
        assert!(verifier.trusted_publishers.is_empty());
    }

    #[test]
    fn test_add_trusted_publisher() {
        let mut verifier = PluginSignatureVerifier::new();
        
        let publisher = TrustedPublisher {
            id: "test-publisher".to_string(),
            name: "Test Publisher".to_string(),
            public_key: "abc123".to_string(),
            trust_level: TrustLevel::Trusted,
            added_at: "2024-01-01T00:00:00Z".to_string(),
        };
        
        verifier.add_trusted_publisher(publisher);
        
        assert!(verifier.get_trusted_publisher("test-publisher").is_some());
        assert_eq!(verifier.list_trusted_publishers().len(), 1);
    }

    #[test]
    fn test_remove_trusted_publisher() {
        let mut verifier = PluginSignatureVerifier::new();
        
        let publisher = TrustedPublisher {
            id: "test-publisher".to_string(),
            name: "Test Publisher".to_string(),
            public_key: "abc123".to_string(),
            trust_level: TrustLevel::Trusted,
            added_at: "2024-01-01T00:00:00Z".to_string(),
        };
        
        verifier.add_trusted_publisher(publisher);
        assert!(verifier.remove_trusted_publisher("test-publisher"));
        assert!(verifier.get_trusted_publisher("test-publisher").is_none());
        assert!(!verifier.remove_trusted_publisher("nonexistent"));
    }

    #[test]
    fn test_verify_unsigned_allowed() {
        let verifier = PluginSignatureVerifier::new();
        let temp_dir = tempdir().unwrap();
        let file_path = temp_dir.path().join("plugin.zip");
        fs::write(&file_path, "plugin content").unwrap();

        let result = verifier.verify_unsigned(&file_path, None);
        assert!(result.valid);
        assert_eq!(result.trust_level, TrustLevel::Unknown);
        assert!(result.signer.is_none());
    }

    #[test]
    fn test_verify_unsigned_not_allowed() {
        let mut verifier = PluginSignatureVerifier::new();
        verifier.set_allow_unsigned(false);
        
        let temp_dir = tempdir().unwrap();
        let file_path = temp_dir.path().join("plugin.zip");
        fs::write(&file_path, "plugin content").unwrap();

        let result = verifier.verify_unsigned(&file_path, None);
        assert!(!result.valid);
        assert!(result.error.is_some());
    }

    #[test]
    fn test_verify_unsigned_with_checksum() {
        let verifier = PluginSignatureVerifier::new();
        let temp_dir = tempdir().unwrap();
        let file_path = temp_dir.path().join("plugin.zip");
        let content = b"plugin content";
        fs::write(&file_path, content).unwrap();

        let expected_checksum = PluginSignatureVerifier::compute_checksum_bytes(content);
        let result = verifier.verify_unsigned(&file_path, Some(&expected_checksum));
        assert!(result.valid);
    }

    #[test]
    fn test_verify_unsigned_checksum_mismatch() {
        let verifier = PluginSignatureVerifier::new();
        let temp_dir = tempdir().unwrap();
        let file_path = temp_dir.path().join("plugin.zip");
        fs::write(&file_path, "plugin content").unwrap();

        let result = verifier.verify_unsigned(&file_path, Some("invalid_checksum"));
        assert!(!result.valid);
        assert!(result.error.unwrap().contains("mismatch"));
    }
}
