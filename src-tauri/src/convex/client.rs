//! Convex HTTP API client
//!
//! Uses the project's existing `crate::http` module for proxy-aware HTTP requests
//! to Convex HTTP endpoints (`/api/query`, `/api/mutation`, `/api/action`, `/health`).

use serde_json::Value as JsonValue;

use super::config::ConvexConfig;
use super::error::ConvexError;
use crate::http::create_proxy_client;

pub struct ConvexHttpClient {
    deployment_url: String,
    deploy_key: String,
    client: reqwest::Client,
}

impl ConvexHttpClient {
    pub fn new(config: &ConvexConfig) -> Result<Self, ConvexError> {
        let client = create_proxy_client()
            .map_err(|e| ConvexError::Http(format!("Failed to create HTTP client: {}", e)))?;

        Ok(Self {
            deployment_url: config.deployment_url.trim_end_matches('/').to_string(),
            deploy_key: config.deploy_key.clone(),
            client,
        })
    }

    fn url(&self, path: &str) -> String {
        format!("{}{}", self.deployment_url, path)
    }

    fn auth_header(&self) -> String {
        format!("Convex {}", self.deploy_key)
    }

    pub async fn health_check(&self) -> Result<bool, ConvexError> {
        let response = self
            .client
            .get(self.url("/health"))
            .header("Authorization", self.auth_header())
            .send()
            .await?;

        Ok(response.status().is_success())
    }

    pub async fn query(
        &self,
        function_path: &str,
        args: JsonValue,
    ) -> Result<JsonValue, ConvexError> {
        let body = serde_json::json!({
            "path": function_path,
            "args": args,
        });

        let response = self
            .client
            .post(self.url("/api/query"))
            .header("Authorization", self.auth_header())
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(ConvexError::Http(format!(
                "Query failed ({}): {}",
                status, text
            )));
        }

        let result: JsonValue = response.json().await?;
        Ok(result)
    }

    pub async fn mutation(
        &self,
        function_path: &str,
        args: JsonValue,
    ) -> Result<JsonValue, ConvexError> {
        let body = serde_json::json!({
            "path": function_path,
            "args": args,
        });

        let response = self
            .client
            .post(self.url("/api/mutation"))
            .header("Authorization", self.auth_header())
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(ConvexError::Http(format!(
                "Mutation failed ({}): {}",
                status, text
            )));
        }

        let result: JsonValue = response.json().await?;
        Ok(result)
    }

    pub async fn action(
        &self,
        function_path: &str,
        args: JsonValue,
    ) -> Result<JsonValue, ConvexError> {
        let body = serde_json::json!({
            "path": function_path,
            "args": args,
        });

        let response = self
            .client
            .post(self.url("/api/action"))
            .header("Authorization", self.auth_header())
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(ConvexError::Http(format!(
                "Action failed ({}): {}",
                status, text
            )));
        }

        let result: JsonValue = response.json().await?;
        Ok(result)
    }

    /// Call a Convex HTTP route (custom HTTP endpoints defined in convex/http.ts)
    pub async fn http_get(&self, path: &str) -> Result<JsonValue, ConvexError> {
        let response = self
            .client
            .get(self.url(path))
            .header("Authorization", self.auth_header())
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(ConvexError::Http(format!(
                "HTTP GET {} failed ({}): {}",
                path, status, text
            )));
        }

        let result: JsonValue = response.json().await?;
        Ok(result)
    }

    pub async fn http_post(&self, path: &str, body: JsonValue) -> Result<JsonValue, ConvexError> {
        let response = self
            .client
            .post(self.url(path))
            .header("Authorization", self.auth_header())
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(ConvexError::Http(format!(
                "HTTP POST {} failed ({}): {}",
                path, status, text
            )));
        }

        let result: JsonValue = response.json().await?;
        Ok(result)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_url_construction() {
        let config = ConvexConfig {
            deployment_url: "https://example.convex.cloud/".to_string(),
            deploy_key: "prod:key123".to_string(),
            ..Default::default()
        };

        let client = ConvexHttpClient::new(&config).unwrap();
        assert_eq!(
            client.url("/api/query"),
            "https://example.convex.cloud/api/query"
        );
        assert_eq!(client.url("/health"), "https://example.convex.cloud/health");
    }

    #[test]
    fn test_auth_header() {
        let config = ConvexConfig {
            deployment_url: "https://example.convex.cloud".to_string(),
            deploy_key: "prod:key123".to_string(),
            ..Default::default()
        };

        let client = ConvexHttpClient::new(&config).unwrap();
        assert_eq!(client.auth_header(), "Convex prod:key123");
    }
}
