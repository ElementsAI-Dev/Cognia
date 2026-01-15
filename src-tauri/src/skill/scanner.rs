//! Skill Security Scanner

use crate::skill::types::{
    SecurityCategory, SecurityFinding, SecurityScanOptions, SecurityScanReport, SecuritySeverity,
};
use anyhow::{Context, Result};
use regex::Regex;
use std::fs;
use std::path::Path;
use std::time::Instant;

#[derive(Debug, Clone)]
pub struct SecurityRule {
    pub id: &'static str,
    pub title: &'static str,
    pub description: &'static str,
    pub severity: SecuritySeverity,
    pub category: SecurityCategory,
    pub pattern: &'static str,
    pub extensions: &'static [&'static str],
    pub suggestion: Option<&'static str>,
}

fn get_security_rules() -> Vec<SecurityRule> {
    vec![
        SecurityRule {
            id: "SEC001",
            title: "Shell Command Execution",
            description: "Direct shell command execution can lead to arbitrary code execution.",
            severity: SecuritySeverity::Critical,
            category: SecurityCategory::CommandExecution,
            pattern: r"\b(exec|execSync|spawn|spawnSync)\s*\(",
            extensions: &["js", "ts", "mjs", "cjs"],
            suggestion: Some("Avoid executing shell commands."),
        },
        SecurityRule {
            id: "SEC002",
            title: "Python OS Command Execution",
            description: "os.system and subprocess can execute arbitrary commands.",
            severity: SecuritySeverity::Critical,
            category: SecurityCategory::CommandExecution,
            pattern: r"\b(os\.system|subprocess\.run)\s*\(",
            extensions: &["py"],
            suggestion: Some("Use subprocess with shell=False."),
        },
        SecurityRule {
            id: "SEC003",
            title: "PowerShell Invoke-Expression",
            description: "Invoke-Expression can execute arbitrary code.",
            severity: SecuritySeverity::Critical,
            category: SecurityCategory::CommandExecution,
            pattern: r"(?i)\bInvoke-Expression\b",
            extensions: &["ps1", "psm1"],
            suggestion: Some("Avoid Invoke-Expression."),
        },
        SecurityRule {
            id: "SEC010",
            title: "JavaScript eval()",
            description: "eval() executes arbitrary JavaScript code.",
            severity: SecuritySeverity::Critical,
            category: SecurityCategory::CodeInjection,
            pattern: r"\beval\s*\(",
            extensions: &["js", "ts", "mjs", "cjs"],
            suggestion: Some("Never use eval()."),
        },
        SecurityRule {
            id: "SEC011",
            title: "JavaScript Function Constructor",
            description: "new Function() can execute arbitrary code.",
            severity: SecuritySeverity::Critical,
            category: SecurityCategory::CodeInjection,
            pattern: r"\bnew\s+Function\s*\(",
            extensions: &["js", "ts"],
            suggestion: Some("Avoid dynamic function creation."),
        },
        SecurityRule {
            id: "SEC012",
            title: "Python exec/eval",
            description: "exec() and eval() can execute arbitrary Python code.",
            severity: SecuritySeverity::Critical,
            category: SecurityCategory::CodeInjection,
            pattern: r"\b(exec|eval)\s*\(",
            extensions: &["py"],
            suggestion: Some("Use ast.literal_eval() instead."),
        },
        SecurityRule {
            id: "SEC020",
            title: "Sensitive Path Access",
            description: "Accessing sensitive system paths.",
            severity: SecuritySeverity::High,
            category: SecurityCategory::FilesystemAccess,
            pattern: r"(?i)(/etc/passwd|\.ssh/|\.aws/)",
            extensions: &[],
            suggestion: Some("Avoid accessing sensitive paths."),
        },
        SecurityRule {
            id: "SEC021",
            title: "Path Traversal",
            description: "Path traversal sequences can escape directories.",
            severity: SecuritySeverity::High,
            category: SecurityCategory::FilesystemAccess,
            pattern: r"\.\.[/\\]",
            extensions: &[],
            suggestion: Some("Validate file paths."),
        },
        SecurityRule {
            id: "SEC030",
            title: "HTTP Requests",
            description: "HTTP requests to external servers.",
            severity: SecuritySeverity::Medium,
            category: SecurityCategory::NetworkAccess,
            pattern: r"\b(fetch|axios|requests\.get)\s*\(",
            extensions: &["js", "ts", "py"],
            suggestion: Some("Review external network calls."),
        },
        SecurityRule {
            id: "SEC040",
            title: "Hardcoded Credentials",
            description: "Hardcoded secrets can be exposed.",
            severity: SecuritySeverity::High,
            category: SecurityCategory::SensitiveData,
            pattern: r#"(?i)(password|api_key|secret)\s*[=:]\s*["'][^"']{8,}["']"#,
            extensions: &[],
            suggestion: Some("Use environment variables."),
        },
        SecurityRule {
            id: "SEC041",
            title: "Private Key",
            description: "Private keys should not be in code.",
            severity: SecuritySeverity::Critical,
            category: SecurityCategory::SensitiveData,
            pattern: r"-----BEGIN.*PRIVATE KEY-----",
            extensions: &[],
            suggestion: Some("Use secure key management."),
        },
        SecurityRule {
            id: "SEC050",
            title: "Sudo Usage",
            description: "Elevated privileges are risky.",
            severity: SecuritySeverity::High,
            category: SecurityCategory::PrivilegeEscalation,
            pattern: r"\bsudo\b",
            extensions: &["sh", "bash"],
            suggestion: Some("Avoid requiring sudo."),
        },
        SecurityRule {
            id: "SEC060",
            title: "Base64 Encoded Strings",
            description: "Long base64 may hide malicious code.",
            severity: SecuritySeverity::Low,
            category: SecurityCategory::ObfuscatedCode,
            pattern: r"[A-Za-z0-9+/]{100,}={0,2}",
            extensions: &["js", "ts", "py"],
            suggestion: Some("Review base64 content."),
        },
    ]
}

fn compile_rules(rules: &[SecurityRule]) -> Vec<(SecurityRule, Regex)> {
    rules.iter().filter_map(|rule| {
        Regex::new(rule.pattern).ok().map(|re| (rule.clone(), re))
    }).collect()
}

fn should_scan_file(path: &Path, options: &SecurityScanOptions) -> bool {
    let file_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
    for pattern in &options.skip_patterns {
        if path.to_string_lossy().contains(pattern) { return false; }
    }
    if let Ok(meta) = fs::metadata(path) {
        if meta.len() > options.max_file_size { return false; }
    }
    let skip_ext = ["png","jpg","gif","ico","pdf","zip","exe","dll","so"];
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
    if skip_ext.contains(&ext.as_str()) { return false; }
    if file_name.starts_with('.') && file_name != ".env" { return false; }
    true
}

fn get_extension(path: &Path) -> String {
    path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase()
}

fn rule_applies(rule: &SecurityRule, ext: &str) -> bool {
    rule.extensions.is_empty() || rule.extensions.iter().any(|e| e.eq_ignore_ascii_case(ext))
}

fn extract_snippet(content: &str, line_num: usize) -> String {
    let lines: Vec<&str> = content.lines().collect();
    let start = line_num.saturating_sub(2);
    let end = (line_num + 3).min(lines.len());
    lines[start..end].iter().enumerate().map(|(i, l)| {
        let n = start + i + 1;
        if n == line_num + 1 { format!("> {} | {}", n, l) } else { format!("  {} | {}", n, l) }
    }).collect::<Vec<_>>().join("\n")
}

fn scan_file(path: &Path, base: &Path, rules: &[(SecurityRule, Regex)], findings: &mut Vec<SecurityFinding>) -> Result<()> {
    let content = fs::read_to_string(path).with_context(|| format!("Read {}", path.display()))?;
    let rel = path.strip_prefix(base).unwrap_or(path).to_string_lossy().to_string();
    let ext = get_extension(path);
    for (line_idx, line) in content.lines().enumerate() {
        for (rule, re) in rules {
            if !rule_applies(rule, &ext) { continue; }
            if let Some(m) = re.find(line) {
                findings.push(SecurityFinding {
                    rule_id: rule.id.to_string(),
                    title: rule.title.to_string(),
                    description: rule.description.to_string(),
                    severity: rule.severity,
                    category: rule.category.clone(),
                    file_path: rel.clone(),
                    line: (line_idx + 1) as u32,
                    column: (m.start() + 1) as u32,
                    snippet: Some(extract_snippet(&content, line_idx)),
                    suggestion: rule.suggestion.map(|s| s.to_string()),
                });
            }
        }
    }
    Ok(())
}

fn collect_files(dir: &Path, files: &mut Vec<std::path::PathBuf>, opts: &SecurityScanOptions) -> Result<()> {
    if !dir.is_dir() {
        if should_scan_file(dir, opts) { files.push(dir.to_path_buf()); }
        return Ok(());
    }
    for entry in fs::read_dir(dir)? {
        let path = entry?.path();
        let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
        if opts.skip_patterns.iter().any(|p| name == p) { continue; }
        if path.is_dir() { collect_files(&path, files, opts)?; }
        else if should_scan_file(&path, opts) && files.len() < opts.max_files as usize {
            files.push(path);
        }
    }
    Ok(())
}

pub struct SkillSecurityScanner {
    rules: Vec<SecurityRule>,
    compiled: Vec<(SecurityRule, Regex)>,
}

impl Default for SkillSecurityScanner {
    fn default() -> Self { Self::new() }
}

impl SkillSecurityScanner {
    pub fn new() -> Self {
        let rules = get_security_rules();
        let compiled = compile_rules(&rules);
        Self { rules, compiled }
    }

    pub fn rule_count(&self) -> usize { self.rules.len() }

    pub fn scan(&self, path: &Path, opts: &SecurityScanOptions) -> Result<SecurityScanReport> {
        let start = Instant::now();
        let id = path.file_name().and_then(|n| n.to_str()).unwrap_or("unknown").to_string();
        let mut report = SecurityScanReport::new(id, path.to_string_lossy().to_string());
        
        let skill_md = path.join("SKILL.md");
        if skill_md.exists() {
            if let Ok(c) = fs::read_to_string(&skill_md) {
                for l in c.lines() {
                    if let Some(n) = l.strip_prefix("name:") {
                        report.skill_name = Some(n.trim().to_string());
                        break;
                    }
                }
            }
        }

        let mut files = Vec::new();
        collect_files(path, &mut files, opts)?;
        report.summary.files_scanned = files.len() as u32;

        let mut findings = Vec::new();
        for f in &files {
            let _ = scan_file(f, path, &self.compiled, &mut findings);
        }

        if let Some(min) = &opts.min_severity {
            let w = min.weight();
            findings.retain(|f| f.severity.weight() >= w);
        }

        report.findings = findings;
        report.calculate_summary();
        report.sort_findings();
        report.duration_ms = start.elapsed().as_millis() as u64;
        Ok(report)
    }

    pub fn scan_installed(&self, ssot: &Path, dir: &str, opts: &SecurityScanOptions) -> Result<SecurityScanReport> {
        let p = ssot.join(dir);
        if !p.exists() { anyhow::bail!("Skill not found: {}", dir); }
        self.scan(&p, opts)
    }
}
