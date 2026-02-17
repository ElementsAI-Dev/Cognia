use std::collections::HashMap;
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};
use std::time::Duration;

use reqwest::{header::HeaderMap, Method, Url};
use serde_json::{Map as JsonMap, Value as JsonValue};

use super::code::step_timeout_ms;
use crate::workflow_runtime::expression::render_template;
use crate::workflow_runtime::WorkflowStepDefinition;

#[allow(clippy::incompatible_msrv)]
fn is_internal_or_localhost(hostname: &str) -> bool {
    if hostname.eq_ignore_ascii_case("localhost")
        || hostname.eq_ignore_ascii_case("0.0.0.0")
        || hostname.ends_with(".local")
    {
        return true;
    }

    if let Ok(ip) = hostname.parse::<IpAddr>() {
        return match ip {
            IpAddr::V4(ipv4) => {
                ipv4.is_private()
                    || ipv4.is_loopback()
                    || ipv4.is_link_local()
                    || ipv4 == Ipv4Addr::UNSPECIFIED
            }
            IpAddr::V6(ipv6) => {
                ipv6.is_loopback()
                    || ipv6.is_unspecified()
                    || ipv6.is_unique_local()
                    || ipv6.is_unicast_link_local()
                    || ipv6 == Ipv6Addr::LOCALHOST
            }
        };
    }

    false
}

fn validate_webhook_url(url: &str, allow_internal_network: bool) -> Result<Url, String> {
    let parsed = Url::parse(url).map_err(|_| format!("invalid webhook URL: {url}"))?;
    if parsed.scheme() != "http" && parsed.scheme() != "https" {
        return Err(format!(
            "invalid webhook protocol: {} (http/https only)",
            parsed.scheme()
        ));
    }
    if !allow_internal_network {
        let host = parsed.host_str().unwrap_or_default();
        if is_internal_or_localhost(host) {
            return Err(format!(
                "blocked webhook host: {host}. Internal network access is not allowed"
            ));
        }
    }
    Ok(parsed)
}

fn parse_http_method(raw: &str) -> Result<Method, String> {
    Method::from_bytes(raw.as_bytes()).map_err(|_| format!("unsupported HTTP method: {raw}"))
}

fn header_map_to_json(headers: &HeaderMap) -> JsonValue {
    let mut json_headers = JsonMap::new();
    for (name, value) in headers {
        json_headers.insert(
            name.as_str().to_string(),
            JsonValue::String(value.to_str().unwrap_or_default().to_string()),
        );
    }
    JsonValue::Object(json_headers)
}

pub(crate) async fn execute_webhook_step(
    step: &WorkflowStepDefinition,
    input: &HashMap<String, JsonValue>,
) -> Result<HashMap<String, JsonValue>, String> {
    let url_template = step
        .webhook_url
        .as_deref()
        .ok_or_else(|| "webhook step requires webhookUrl".to_string())?;
    let rendered_url = render_template(url_template, input);
    let allow_internal = step.allow_internal_network.unwrap_or(false);
    let parsed_url = validate_webhook_url(&rendered_url, allow_internal)?;

    let method_name = step
        .method
        .clone()
        .unwrap_or_else(|| "POST".to_string())
        .to_uppercase();
    let method = parse_http_method(&method_name)?;
    let timeout_ms = step_timeout_ms(step, 30_000);
    let retries = step.retries.or(step.retry_count).unwrap_or(0).min(8);
    let rendered_body = render_template(step.body.as_deref().unwrap_or(""), input);

    let client = reqwest::Client::builder()
        .timeout(Duration::from_millis(timeout_ms))
        .build()
        .map_err(|error| format!("failed to build webhook client: {error}"))?;

    let mut headers = HeaderMap::new();
    for (key, value) in &step.headers {
        let rendered = render_template(value, input);
        let name = reqwest::header::HeaderName::from_bytes(key.as_bytes())
            .map_err(|error| format!("invalid header name '{key}': {error}"))?;
        let val = reqwest::header::HeaderValue::from_str(&rendered)
            .map_err(|error| format!("invalid header value for '{key}': {error}"))?;
        headers.insert(name, val);
    }
    if !headers.contains_key(reqwest::header::CONTENT_TYPE) {
        headers.insert(
            reqwest::header::CONTENT_TYPE,
            reqwest::header::HeaderValue::from_static("application/json"),
        );
    }

    let mut attempt = 0_u32;
    loop {
        let mut request_builder = client
            .request(method.clone(), parsed_url.clone())
            .headers(headers.clone());

        if method != Method::GET && !rendered_body.is_empty() {
            request_builder = request_builder.body(rendered_body.clone());
        }

        match request_builder.send().await {
            Ok(response) => {
                let status_code = response.status().as_u16();
                let status_text = response
                    .status()
                    .canonical_reason()
                    .unwrap_or_default()
                    .to_string();
                let is_ok = response.status().is_success();
                let response_headers = header_map_to_json(response.headers());
                let response_text = response
                    .text()
                    .await
                    .map_err(|error| format!("webhook response read failed: {error}"))?;
                let response_data = serde_json::from_str::<JsonValue>(&response_text)
                    .unwrap_or(JsonValue::String(response_text));

                let mut output = HashMap::new();
                output.insert(
                    "status".to_string(),
                    JsonValue::Number((status_code as i64).into()),
                );
                output.insert("statusText".to_string(), JsonValue::String(status_text));
                output.insert("ok".to_string(), JsonValue::Bool(is_ok));
                output.insert("data".to_string(), response_data);
                output.insert("headers".to_string(), response_headers);
                return Ok(output);
            }
            Err(error) => {
                if attempt < retries {
                    let backoff_ms = (200_u64 * 2_u64.saturating_pow(attempt)).min(2_000);
                    tokio::time::sleep(Duration::from_millis(backoff_ms)).await;
                    attempt += 1;
                    continue;
                }
                return Err(format!("webhook request failed: {error}"));
            }
        }
    }
}
