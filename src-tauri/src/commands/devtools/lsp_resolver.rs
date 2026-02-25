//! LSP language to runtime resolver.

use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashSet;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum LspProvider {
    OpenVsx,
    VsMarketplace,
}

impl LspProvider {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::OpenVsx => "open_vsx",
            Self::VsMarketplace => "vs_marketplace",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspResolvedLaunch {
    pub language_id: String,
    pub normalized_language_id: String,
    pub command: String,
    pub args: Vec<String>,
    pub cwd: Option<String>,
    pub source: String,
    pub extension_id: Option<String>,
    pub trusted: bool,
    pub requires_approval: bool,
    pub npm_package: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspLanguageRecommendation {
    pub language_id: String,
    pub normalized_language_id: String,
    pub display_name: String,
    pub extension_id: Option<String>,
    pub provider: LspProvider,
    pub command: String,
    pub args: Vec<String>,
    pub npm_package: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone)]
pub struct KnownLspProfile {
    pub normalized_language_id: &'static str,
    pub display_name: &'static str,
    pub extension_id: Option<&'static str>,
    pub command: &'static str,
    pub args: &'static [&'static str],
    pub npm_package: Option<&'static str>,
}

static ALLOWED_COMMANDS: Lazy<HashSet<&'static str>> = Lazy::new(|| {
    HashSet::from([
        "node",
        "npx",
        "npm",
        "typescript-language-server",
        "vscode-html-language-server",
        "vscode-css-language-server",
        "vscode-json-language-server",
        "vscode-eslint-language-server",
    ])
});

fn known_profiles() -> &'static [KnownLspProfile] {
    &[
        KnownLspProfile {
            normalized_language_id: "typescript",
            display_name: "TypeScript / JavaScript Language Server",
            extension_id: Some("ms-vscode.vscode-typescript-next"),
            command: "typescript-language-server",
            args: &["--stdio"],
            npm_package: Some("typescript-language-server"),
        },
        KnownLspProfile {
            normalized_language_id: "html",
            display_name: "HTML Language Server",
            extension_id: Some("ecmel.vscode-html-css"),
            command: "vscode-html-language-server",
            args: &["--stdio"],
            npm_package: Some("vscode-langservers-extracted"),
        },
        KnownLspProfile {
            normalized_language_id: "css",
            display_name: "CSS Language Server",
            extension_id: Some("ecmel.vscode-html-css"),
            command: "vscode-css-language-server",
            args: &["--stdio"],
            npm_package: Some("vscode-langservers-extracted"),
        },
        KnownLspProfile {
            normalized_language_id: "json",
            display_name: "JSON Language Server",
            extension_id: Some("vscode.json-language-features"),
            command: "vscode-json-language-server",
            args: &["--stdio"],
            npm_package: Some("vscode-langservers-extracted"),
        },
        KnownLspProfile {
            normalized_language_id: "eslint",
            display_name: "ESLint Language Server",
            extension_id: Some("dbaeumer.vscode-eslint"),
            command: "vscode-eslint-language-server",
            args: &["--stdio"],
            npm_package: Some("vscode-langservers-extracted"),
        },
    ]
}

pub fn normalize_language_id(language_id: &str) -> String {
    let normalized = language_id.to_ascii_lowercase();
    match normalized.as_str() {
        "typescriptreact" => "typescript".to_string(),
        "javascriptreact" => "javascript".to_string(),
        "javascript" => "javascript".to_string(),
        "jsonc" => "json".to_string(),
        "scss" | "less" => "css".to_string(),
        "jsx" => "javascript".to_string(),
        "tsx" => "typescript".to_string(),
        value => value.to_string(),
    }
}

fn resolve_profile_key(normalized_language_id: &str) -> &str {
    match normalized_language_id {
        "javascript" => "typescript",
        value => value,
    }
}

pub fn profile_for_language(language_id: &str) -> Option<KnownLspProfile> {
    let normalized = normalize_language_id(language_id);
    let profile_key = resolve_profile_key(&normalized);
    known_profiles()
        .iter()
        .find(|profile| profile.normalized_language_id == profile_key)
        .cloned()
}

pub fn supported_language(language_id: &str) -> bool {
    profile_for_language(language_id).is_some()
}

pub fn is_command_allowed(command: &str) -> bool {
    ALLOWED_COMMANDS.contains(command)
}

fn build_launch_from_command(
    language_id: &str,
    profile: &KnownLspProfile,
    command: String,
    args: Vec<String>,
    source: &str,
) -> LspResolvedLaunch {
    let normalized_language_id = normalize_language_id(language_id);
    let trusted = is_command_allowed(&command);
    LspResolvedLaunch {
        language_id: language_id.to_string(),
        normalized_language_id,
        command,
        args,
        cwd: None,
        source: source.to_string(),
        extension_id: profile.extension_id.map(ToString::to_string),
        trusted,
        requires_approval: !trusted,
        npm_package: profile.npm_package.map(ToString::to_string),
    }
}

pub fn resolve_launch_for_language(language_id: &str) -> Result<LspResolvedLaunch, String> {
    let Some(profile) = profile_for_language(language_id) else {
        return Err(format!(
            "LSP_UNSUPPORTED_LANGUAGE: no known LSP runtime for '{}'",
            language_id
        ));
    };

    if which::which(profile.command).is_ok() {
        return Ok(build_launch_from_command(
            language_id,
            &profile,
            profile.command.to_string(),
            profile.args.iter().map(|arg| (*arg).to_string()).collect(),
            "local_binary",
        ));
    }

    if which::which("npx").is_ok() {
        let mut args = vec!["--yes".to_string(), profile.command.to_string()];
        args.extend(profile.args.iter().map(|arg| (*arg).to_string()));
        return Ok(build_launch_from_command(
            language_id,
            &profile,
            "npx".to_string(),
            args,
            "npx_runtime",
        ));
    }

    if which::which("npm").is_ok() {
        let mut args = vec![
            "exec".to_string(),
            "--yes".to_string(),
            profile.command.to_string(),
            "--".to_string(),
        ];
        args.extend(profile.args.iter().map(|arg| (*arg).to_string()));
        return Ok(build_launch_from_command(
            language_id,
            &profile,
            "npm".to_string(),
            args,
            "npm_exec",
        ));
    }

    Err(format!(
        "LSP_DEPENDENCY_MISSING: '{}' or Node.js runtime tools are unavailable",
        profile.command
    ))
}

pub fn recommendations_for_language(
    language_id: &str,
    providers: &[LspProvider],
) -> Vec<LspLanguageRecommendation> {
    let Some(profile) = profile_for_language(language_id) else {
        return Vec::new();
    };
    let normalized_language_id = normalize_language_id(language_id);

    providers
        .iter()
        .map(|provider| LspLanguageRecommendation {
            language_id: language_id.to_string(),
            normalized_language_id: normalized_language_id.clone(),
            display_name: profile.display_name.to_string(),
            extension_id: profile.extension_id.map(ToString::to_string),
            provider: provider.clone(),
            command: profile.command.to_string(),
            args: profile.args.iter().map(|arg| (*arg).to_string()).collect(),
            npm_package: profile.npm_package.map(ToString::to_string),
            notes: Some(
                "Uses standalone language server binaries and falls back to npx/npm exec."
                    .to_string(),
            ),
        })
        .collect()
}

pub fn recommended_extension_id(language_id: &str) -> Option<String> {
    profile_for_language(language_id)
        .and_then(|profile| profile.extension_id.map(ToString::to_string))
}

pub fn resolve_launch_from_installed_package(
    language_id: &str,
    extension_id: &str,
    install_dir: &Path,
    package_json: &Value,
) -> Option<LspResolvedLaunch> {
    let profile = profile_for_language(language_id)?;
    let bin = package_json.get("bin")?;
    let node_command = if which::which("node").is_ok() {
        "node".to_string()
    } else {
        return None;
    };

    if let Some(bin_path) = bin.as_str() {
        let script_path = install_dir.join(bin_path);
        if script_path.exists() {
            let mut args = vec![script_path.to_string_lossy().to_string()];
            args.extend(profile.args.iter().map(|arg| (*arg).to_string()));
            return Some(LspResolvedLaunch {
                language_id: language_id.to_string(),
                normalized_language_id: normalize_language_id(language_id),
                command: node_command.clone(),
                args,
                cwd: Some(install_dir.to_string_lossy().to_string()),
                source: "installed_extension_manifest".to_string(),
                extension_id: Some(extension_id.to_string()),
                trusted: is_command_allowed("node"),
                requires_approval: !is_command_allowed("node"),
                npm_package: profile.npm_package.map(ToString::to_string),
            });
        }
        return None;
    }

    let bin_object = bin.as_object()?;
    let entry = bin_object.get(profile.command).and_then(Value::as_str)?;
    let script_path = install_dir.join(entry);
    if !script_path.exists() {
        return None;
    }

    let mut args = vec![script_path.to_string_lossy().to_string()];
    args.extend(profile.args.iter().map(|arg| (*arg).to_string()));
    Some(LspResolvedLaunch {
        language_id: language_id.to_string(),
        normalized_language_id: normalize_language_id(language_id),
        command: node_command,
        args,
        cwd: Some(install_dir.to_string_lossy().to_string()),
        source: "installed_extension_manifest".to_string(),
        extension_id: Some(extension_id.to_string()),
        trusted: is_command_allowed("node"),
        requires_approval: !is_command_allowed("node"),
        npm_package: profile.npm_package.map(ToString::to_string),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use tempfile::TempDir;

    #[test]
    fn normalizes_react_language_ids() {
        assert_eq!(normalize_language_id("typescriptreact"), "typescript");
        assert_eq!(normalize_language_id("javascriptreact"), "javascript");
        assert_eq!(normalize_language_id("jsonc"), "json");
    }

    #[test]
    fn maps_javascript_to_typescript_profile() {
        let profile = profile_for_language("javascript").expect("profile");
        assert_eq!(profile.normalized_language_id, "typescript");
    }

    #[test]
    fn builds_recommendations_for_language() {
        let recommendations = recommendations_for_language(
            "typescriptreact",
            &[LspProvider::OpenVsx, LspProvider::VsMarketplace],
        );
        assert_eq!(recommendations.len(), 2);
        assert_eq!(recommendations[0].normalized_language_id, "typescript");
    }

    #[test]
    fn resolves_launch_from_installed_manifest_bin_object() {
        let tmp_dir = TempDir::new().expect("tmp");
        let script = tmp_dir.path().join("server.js");
        std::fs::write(&script, "console.log('ok');").expect("script");

        let manifest = json!({
            "bin": {
                "typescript-language-server": "server.js"
            }
        });
        let launch = resolve_launch_from_installed_package(
            "typescript",
            "example.typescript",
            tmp_dir.path(),
            &manifest,
        );

        if which::which("node").is_ok() {
            assert!(launch.is_some());
        } else {
            assert!(launch.is_none());
        }
    }
}
