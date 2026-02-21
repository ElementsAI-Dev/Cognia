//! LSP registry providers (OpenVSX + VS Marketplace compatible querying).

use super::lsp_resolver::{
    normalize_language_id, recommendations_for_language, LspLanguageRecommendation, LspProvider,
};
use crate::http::{create_proxy_client, create_proxy_client_long};
use reqwest::header::{HeaderMap, HeaderValue, ACCEPT, CONTENT_TYPE};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

const OPEN_VSX_QUERY_URL: &str = "https://open-vsx.org/vscode/gallery/extensionquery";
const OPEN_VSX_METADATA_URL: &str = "https://open-vsx.org/api";
const MARKETPLACE_QUERY_URL: &str =
    "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery";
const VSIX_ASSET_TYPE: &str = "Microsoft.VisualStudio.Services.VSIXPackage";
const OPENVSX_PROVIDER_NAME: &str = "open_vsx";
const MARKETPLACE_PROVIDER_NAME: &str = "vs_marketplace";

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspRegistrySearchRequest {
    pub query: String,
    pub language_id: Option<String>,
    pub providers: Option<Vec<LspProvider>>,
    pub page_number: Option<u32>,
    pub page_size: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspRegistryEntry {
    pub extension_id: String,
    pub provider: String,
    pub publisher: String,
    pub name: String,
    pub display_name: String,
    pub description: Option<String>,
    pub version: String,
    pub target_platform: Option<String>,
    pub verified: bool,
    pub download_url: Option<String>,
    pub sha256_url: Option<String>,
    pub homepage: Option<String>,
    pub tags: Vec<String>,
    pub languages: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspRegistryRecommendedResponse {
    pub language_id: String,
    pub normalized_language_id: String,
    pub entries: Vec<LspRegistryEntry>,
    pub recommendations: Vec<LspLanguageRecommendation>,
}

#[derive(Debug, Clone)]
pub struct RegistryDownloadAsset {
    pub extension_id: String,
    pub provider: LspProvider,
    pub download_url: String,
    pub version: String,
    pub display_name: Option<String>,
    pub sha256: Option<String>,
    pub target_platform: Option<String>,
}

fn default_providers() -> Vec<LspProvider> {
    vec![LspProvider::OpenVsx, LspProvider::VsMarketplace]
}

fn build_query_payload(query: &str, page_number: u32, page_size: u32) -> Value {
    json!({
      "filters": [
        {
          "criteria": [
            { "filterType": 8, "value": "Microsoft.VisualStudio.Code" },
            { "filterType": 10, "value": query },
            { "filterType": 12, "value": "4096" }
          ],
          "pageNumber": page_number,
          "pageSize": page_size,
          "sortBy": 0,
          "sortOrder": 0
        }
      ],
      "flags": 914
    })
}

fn build_extension_id_query_payload(extension_id: &str) -> Value {
    json!({
      "filters": [
        {
          "criteria": [
            { "filterType": 8, "value": "Microsoft.VisualStudio.Code" },
            { "filterType": 7, "value": extension_id },
            { "filterType": 12, "value": "4096" }
          ],
          "pageNumber": 1,
          "pageSize": 1,
          "sortBy": 0,
          "sortOrder": 0
        }
      ],
      "flags": 914
    })
}

fn gallery_headers() -> Result<HeaderMap, String> {
    let mut headers = HeaderMap::new();
    headers.insert(
        ACCEPT,
        HeaderValue::from_static("application/json;api-version=3.0-preview.1"),
    );
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    Ok(headers)
}

fn parse_gallery_entries(payload: &Value, provider: &str) -> Vec<LspRegistryEntry> {
    let Some(results) = payload.get("results").and_then(Value::as_array) else {
        return Vec::new();
    };
    let Some(first_result) = results.first() else {
        return Vec::new();
    };
    let Some(extensions) = first_result.get("extensions").and_then(Value::as_array) else {
        return Vec::new();
    };

    extensions
        .iter()
        .filter_map(|extension| {
            let publisher = extension
                .get("publisher")
                .and_then(|v| v.get("publisherName").or_else(|| v.get("displayName")))
                .and_then(Value::as_str)
                .unwrap_or_default();
            let name = extension
                .get("extensionName")
                .and_then(Value::as_str)
                .unwrap_or_default();
            if publisher.is_empty() || name.is_empty() {
                return None;
            }
            let extension_id = format!("{}.{}", publisher, name);
            let display_name = extension
                .get("displayName")
                .and_then(Value::as_str)
                .unwrap_or(name)
                .to_string();
            let description = extension
                .get("shortDescription")
                .and_then(Value::as_str)
                .map(ToString::to_string);
            let version = extension
                .get("versions")
                .and_then(Value::as_array)
                .and_then(|versions| versions.first())
                .and_then(|version| version.get("version"))
                .and_then(Value::as_str)
                .unwrap_or("latest")
                .to_string();
            let target_platform = extension
                .get("versions")
                .and_then(Value::as_array)
                .and_then(|versions| versions.first())
                .and_then(|version| version.get("targetPlatform"))
                .and_then(Value::as_str)
                .map(ToString::to_string);
            let fallback_asset_uri = extension
                .get("versions")
                .and_then(Value::as_array)
                .and_then(|versions| versions.first())
                .and_then(|version| version.get("fallbackAssetUri"))
                .and_then(Value::as_str);

            let download_url = fallback_asset_uri.map(|uri| {
                if let Some(platform) = target_platform.as_deref() {
                    format!("{uri}/{VSIX_ASSET_TYPE}?targetPlatform={platform}")
                } else {
                    format!("{uri}/{VSIX_ASSET_TYPE}")
                }
            });

            let tags = extension
                .get("tags")
                .and_then(Value::as_array)
                .map(|items| {
                    items
                        .iter()
                        .filter_map(Value::as_str)
                        .map(ToString::to_string)
                        .collect::<Vec<String>>()
                })
                .unwrap_or_default();

            Some(LspRegistryEntry {
                extension_id,
                provider: provider.to_string(),
                publisher: publisher.to_string(),
                name: name.to_string(),
                display_name,
                description,
                version,
                target_platform,
                verified: provider == OPENVSX_PROVIDER_NAME,
                download_url,
                sha256_url: None,
                homepage: None,
                tags,
                languages: Vec::new(),
            })
        })
        .collect()
}

async fn query_openvsx(payload: &Value) -> Result<Vec<LspRegistryEntry>, String> {
    let client = create_proxy_client()
        .map_err(|error| format!("Failed to create OpenVSX HTTP client: {}", error))?;
    let response = client
        .post(OPEN_VSX_QUERY_URL)
        .headers(gallery_headers()?)
        .json(payload)
        .send()
        .await
        .map_err(|error| format!("OpenVSX query request failed: {}", error))?;
    if !response.status().is_success() {
        return Err(format!(
            "OpenVSX query failed with status {}",
            response.status()
        ));
    }
    let body = response
        .json::<Value>()
        .await
        .map_err(|error| format!("Failed to parse OpenVSX response: {}", error))?;
    Ok(parse_gallery_entries(&body, OPENVSX_PROVIDER_NAME))
}

async fn query_marketplace(payload: &Value) -> Result<Vec<LspRegistryEntry>, String> {
    let client = create_proxy_client()
        .map_err(|error| format!("Failed to create Marketplace HTTP client: {}", error))?;
    let response = client
        .post(MARKETPLACE_QUERY_URL)
        .headers(gallery_headers()?)
        .json(payload)
        .send()
        .await
        .map_err(|error| format!("Marketplace query request failed: {}", error))?;
    if !response.status().is_success() {
        return Err(format!(
            "Marketplace query failed with status {}",
            response.status()
        ));
    }
    let body = response
        .json::<Value>()
        .await
        .map_err(|error| format!("Failed to parse Marketplace response: {}", error))?;
    Ok(parse_gallery_entries(&body, MARKETPLACE_PROVIDER_NAME))
}

pub async fn registry_search(
    request: LspRegistrySearchRequest,
) -> Result<Vec<LspRegistryEntry>, String> {
    let providers = request.providers.unwrap_or_else(default_providers);
    let page_number = request.page_number.unwrap_or(1);
    let page_size = request.page_size.unwrap_or(20).clamp(1, 100);
    let query_text = if let Some(language_id) = request.language_id.as_deref() {
        if request.query.trim().is_empty() {
            normalize_language_id(language_id)
        } else {
            format!(
                "{} {}",
                request.query.trim(),
                normalize_language_id(language_id)
            )
        }
    } else {
        request.query
    };
    let payload = build_query_payload(&query_text, page_number, page_size);

    let mut merged = Vec::new();
    for provider in providers {
        let result = match provider {
            LspProvider::OpenVsx => query_openvsx(&payload).await,
            LspProvider::VsMarketplace => query_marketplace(&payload).await,
        };
        if let Ok(entries) = result {
            merged.extend(entries);
        }
    }
    Ok(merged)
}

async fn fetch_openvsx_extension_details(
    extension_id: &str,
    version: Option<&str>,
) -> Result<Value, String> {
    let mut parts = extension_id.split('.');
    let Some(namespace) = parts.next() else {
        return Err(format!("Invalid extension id '{}'", extension_id));
    };
    let Some(name) = parts.next() else {
        return Err(format!("Invalid extension id '{}'", extension_id));
    };
    let version = version.unwrap_or("latest");
    let url = format!("{OPEN_VSX_METADATA_URL}/{namespace}/{name}/{version}");
    let client = create_proxy_client_long()
        .map_err(|error| format!("Failed to create OpenVSX metadata client: {}", error))?;
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|error| format!("OpenVSX metadata request failed: {}", error))?;
    if !response.status().is_success() {
        return Err(format!(
            "OpenVSX metadata request failed with status {}",
            response.status()
        ));
    }
    response
        .json::<Value>()
        .await
        .map_err(|error| format!("Failed to parse OpenVSX metadata response: {}", error))
}

async fn fetch_sha256_from_url(url: &str) -> Option<String> {
    let client = match create_proxy_client_long() {
        Ok(client) => client,
        Err(_) => return None,
    };
    let response = match client.get(url).send().await {
        Ok(response) if response.status().is_success() => response,
        _ => return None,
    };
    let text = match response.text().await {
        Ok(text) => text,
        Err(_) => return None,
    };
    let sha = text
        .split_whitespace()
        .next()
        .map(str::trim)
        .unwrap_or_default()
        .to_string();
    if sha.len() >= 32 {
        Some(sha)
    } else {
        None
    }
}

pub async fn resolve_download_asset(
    extension_id: &str,
    version: Option<&str>,
    provider: &LspProvider,
) -> Result<RegistryDownloadAsset, String> {
    match provider {
        LspProvider::OpenVsx => {
            let metadata = fetch_openvsx_extension_details(extension_id, version).await?;
            let files = metadata.get("files").cloned().unwrap_or_else(|| json!({}));
            let download_url = files
                .get("download")
                .and_then(Value::as_str)
                .ok_or_else(|| format!("Missing OpenVSX download URL for '{}'", extension_id))?
                .to_string();
            let sha256_url = files
                .get("sha256")
                .and_then(Value::as_str)
                .map(ToString::to_string);
            let sha256 = if let Some(url) = sha256_url.as_deref() {
                fetch_sha256_from_url(url).await
            } else {
                None
            };
            let resolved_version = metadata
                .get("version")
                .and_then(Value::as_str)
                .unwrap_or("latest")
                .to_string();
            let target_platform = metadata
                .get("targetPlatform")
                .and_then(Value::as_str)
                .map(ToString::to_string);
            let display_name = metadata
                .get("displayName")
                .or_else(|| metadata.get("name"))
                .and_then(Value::as_str)
                .map(ToString::to_string);
            Ok(RegistryDownloadAsset {
                extension_id: extension_id.to_string(),
                provider: LspProvider::OpenVsx,
                download_url,
                version: resolved_version,
                display_name,
                sha256,
                target_platform,
            })
        }
        LspProvider::VsMarketplace => {
            let payload = build_extension_id_query_payload(extension_id);
            let entries = query_marketplace(&payload).await?;
            let Some(entry) = entries.first() else {
                return Err(format!(
                    "Marketplace does not contain extension '{}'",
                    extension_id
                ));
            };
            let Some(download_url) = entry.download_url.clone() else {
                return Err(format!(
                    "Marketplace extension '{}' does not expose VSIX package",
                    extension_id
                ));
            };
            Ok(RegistryDownloadAsset {
                extension_id: entry.extension_id.clone(),
                provider: LspProvider::VsMarketplace,
                download_url,
                version: entry.version.clone(),
                display_name: Some(entry.display_name.clone()),
                sha256: None,
                target_platform: entry.target_platform.clone(),
            })
        }
    }
}

pub async fn recommended_servers(
    language_id: &str,
    providers: Option<Vec<LspProvider>>,
) -> Result<LspRegistryRecommendedResponse, String> {
    let normalized_language_id = normalize_language_id(language_id);
    let providers = providers.unwrap_or_else(default_providers);
    let recommendations = recommendations_for_language(language_id, &providers);

    let mut entries = Vec::new();
    for recommendation in &recommendations {
        let Some(extension_id) = recommendation.extension_id.as_deref() else {
            continue;
        };
        let provider = recommendation.provider.clone();
        let asset = resolve_download_asset(extension_id, None, &provider).await;
        if let Ok(asset) = asset {
            entries.push(LspRegistryEntry {
                extension_id: asset.extension_id.clone(),
                provider: provider.as_str().to_string(),
                publisher: extension_id
                    .split('.')
                    .next()
                    .unwrap_or_default()
                    .to_string(),
                name: extension_id
                    .split('.')
                    .nth(1)
                    .unwrap_or_default()
                    .to_string(),
                display_name: asset
                    .display_name
                    .clone()
                    .unwrap_or_else(|| extension_id.to_string()),
                description: Some(recommendation.display_name.clone()),
                version: asset.version.clone(),
                target_platform: asset.target_platform.clone(),
                verified: provider == LspProvider::OpenVsx,
                download_url: Some(asset.download_url.clone()),
                sha256_url: None,
                homepage: None,
                tags: vec![normalized_language_id.clone()],
                languages: vec![normalized_language_id.clone()],
            });
        }
    }

    Ok(LspRegistryRecommendedResponse {
        language_id: language_id.to_string(),
        normalized_language_id,
        entries,
        recommendations,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_vscode_compatible_query_payload() {
        let payload = build_query_payload("react lsp", 2, 25);
        assert_eq!(payload["filters"][0]["criteria"][0]["filterType"], 8);
        assert_eq!(payload["filters"][0]["criteria"][1]["filterType"], 10);
        assert_eq!(payload["filters"][0]["pageNumber"], 2);
        assert_eq!(payload["filters"][0]["pageSize"], 25);
        assert_eq!(payload["flags"], 914);
    }

    #[test]
    fn parses_gallery_entries() {
        let payload = json!({
          "results": [
            {
              "extensions": [
                {
                  "publisher": { "publisherName": "demo" },
                  "extensionName": "lsp",
                  "displayName": "Demo LSP",
                  "shortDescription": "Demo",
                  "tags": ["typescript"],
                  "versions": [
                    {
                      "version": "1.0.0",
                      "fallbackAssetUri": "https://example.com/vsix",
                      "targetPlatform": "universal"
                    }
                  ]
                }
              ]
            }
          ]
        });

        let entries = parse_gallery_entries(&payload, OPENVSX_PROVIDER_NAME);
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].extension_id, "demo.lsp");
        assert_eq!(
            entries[0].download_url.as_deref(),
            Some("https://example.com/vsix/Microsoft.VisualStudio.Services.VSIXPackage?targetPlatform=universal")
        );
    }
}
