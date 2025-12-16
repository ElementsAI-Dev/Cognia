//! Sampling protocol handlers (reverse AI calls)

use serde::{Deserialize, Serialize};

use crate::mcp::types::{SamplingRequest, SamplingResult};

/// Request params for sampling/createMessage
pub type SamplingCreateMessageParams = SamplingRequest;

/// Response for sampling/createMessage
pub type SamplingCreateMessageResponse = SamplingResult;

/// Progress notification during sampling
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SamplingProgressParams {
    pub progress_token: String,
    pub progress: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total: Option<f64>,
}
