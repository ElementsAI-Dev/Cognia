//! Language configurations for sandbox execution
//!
//! Defines supported programming languages and their execution settings.

use serde::{Deserialize, Serialize};

/// Language definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Language {
    pub id: &'static str,
    pub name: &'static str,
    pub extension: &'static str,
    pub category: LanguageCategory,
}

/// Language category
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LanguageCategory {
    Interpreted,
    Compiled,
    JIT,
    Shell,
}

/// Language configuration for execution
#[derive(Debug, Clone)]
pub struct LanguageConfig {
    pub id: &'static str,
    pub name: &'static str,
    pub extension: &'static str,
    pub aliases: &'static [&'static str],
    pub docker_image: &'static str,
    pub compile_cmd: Option<&'static str>,
    pub run_cmd: &'static str,
    pub category: LanguageCategory,
    pub file_name: &'static str,
}

/// All supported language configurations
pub static LANGUAGE_CONFIGS: &[LanguageConfig] = &[
    // Python
    LanguageConfig {
        id: "python",
        name: "Python",
        extension: "py",
        aliases: &["py", "python3", "py3"],
        docker_image: "python:3.12-slim",
        compile_cmd: None,
        run_cmd: "python3 {file}",
        category: LanguageCategory::Interpreted,
        file_name: "main.py",
    },
    // JavaScript (Node.js)
    LanguageConfig {
        id: "javascript",
        name: "JavaScript",
        extension: "js",
        aliases: &["js", "node", "nodejs"],
        docker_image: "node:22-slim",
        compile_cmd: None,
        run_cmd: "node {file}",
        category: LanguageCategory::Interpreted,
        file_name: "main.js",
    },
    // TypeScript
    LanguageConfig {
        id: "typescript",
        name: "TypeScript",
        extension: "ts",
        aliases: &["ts"],
        docker_image: "node:22-slim",
        compile_cmd: Some("npx tsc {file} --outDir /tmp/out --esModuleInterop --target ES2022 --module NodeNext --moduleResolution NodeNext"),
        run_cmd: "node /tmp/out/{basename}.js",
        category: LanguageCategory::Compiled,
        file_name: "main.ts",
    },
    // Go
    LanguageConfig {
        id: "go",
        name: "Go",
        extension: "go",
        aliases: &["golang"],
        docker_image: "golang:1.23-alpine",
        compile_cmd: None,
        run_cmd: "go run {file}",
        category: LanguageCategory::Compiled,
        file_name: "main.go",
    },
    // Rust
    LanguageConfig {
        id: "rust",
        name: "Rust",
        extension: "rs",
        aliases: &["rs"],
        docker_image: "rust:1.83-slim",
        compile_cmd: Some("rustc {file} -o /tmp/main"),
        run_cmd: "/tmp/main",
        category: LanguageCategory::Compiled,
        file_name: "main.rs",
    },
    // Java
    LanguageConfig {
        id: "java",
        name: "Java",
        extension: "java",
        aliases: &[],
        docker_image: "eclipse-temurin:21-jdk",
        compile_cmd: Some("javac -d /tmp {file}"),
        run_cmd: "java -cp /tmp Main",
        category: LanguageCategory::Compiled,
        file_name: "Main.java",
    },
    // C
    LanguageConfig {
        id: "c",
        name: "C",
        extension: "c",
        aliases: &[],
        docker_image: "gcc:14",
        compile_cmd: Some("gcc {file} -o /tmp/main -lm"),
        run_cmd: "/tmp/main",
        category: LanguageCategory::Compiled,
        file_name: "main.c",
    },
    // C++
    LanguageConfig {
        id: "cpp",
        name: "C++",
        extension: "cpp",
        aliases: &["c++", "cxx"],
        docker_image: "gcc:14",
        compile_cmd: Some("g++ {file} -o /tmp/main -std=c++20"),
        run_cmd: "/tmp/main",
        category: LanguageCategory::Compiled,
        file_name: "main.cpp",
    },
    // Ruby
    LanguageConfig {
        id: "ruby",
        name: "Ruby",
        extension: "rb",
        aliases: &["rb"],
        docker_image: "ruby:3.3-slim",
        compile_cmd: None,
        run_cmd: "ruby {file}",
        category: LanguageCategory::Interpreted,
        file_name: "main.rb",
    },
    // PHP
    LanguageConfig {
        id: "php",
        name: "PHP",
        extension: "php",
        aliases: &[],
        docker_image: "php:8.3-cli",
        compile_cmd: None,
        run_cmd: "php {file}",
        category: LanguageCategory::Interpreted,
        file_name: "main.php",
    },
    // Bash
    LanguageConfig {
        id: "bash",
        name: "Bash",
        extension: "sh",
        aliases: &["sh", "shell"],
        docker_image: "bash:5",
        compile_cmd: None,
        run_cmd: "bash {file}",
        category: LanguageCategory::Shell,
        file_name: "main.sh",
    },
    // PowerShell
    LanguageConfig {
        id: "powershell",
        name: "PowerShell",
        extension: "ps1",
        aliases: &["ps1", "pwsh"],
        docker_image: "mcr.microsoft.com/powershell:latest",
        compile_cmd: None,
        run_cmd: "pwsh -File {file}",
        category: LanguageCategory::Shell,
        file_name: "main.ps1",
    },
    // R
    LanguageConfig {
        id: "r",
        name: "R",
        extension: "r",
        aliases: &["rlang"],
        docker_image: "r-base:4.4.0",
        compile_cmd: None,
        run_cmd: "Rscript {file}",
        category: LanguageCategory::Interpreted,
        file_name: "main.r",
    },
    // Julia
    LanguageConfig {
        id: "julia",
        name: "Julia",
        extension: "jl",
        aliases: &["jl"],
        docker_image: "julia:1.11",
        compile_cmd: None,
        run_cmd: "julia {file}",
        category: LanguageCategory::JIT,
        file_name: "main.jl",
    },
    // Lua
    LanguageConfig {
        id: "lua",
        name: "Lua",
        extension: "lua",
        aliases: &[],
        docker_image: "nickblah/lua:5.4",
        compile_cmd: None,
        run_cmd: "lua {file}",
        category: LanguageCategory::Interpreted,
        file_name: "main.lua",
    },
    // Perl
    LanguageConfig {
        id: "perl",
        name: "Perl",
        extension: "pl",
        aliases: &["pl"],
        docker_image: "perl:5.40",
        compile_cmd: None,
        run_cmd: "perl {file}",
        category: LanguageCategory::Interpreted,
        file_name: "main.pl",
    },
    // Swift
    LanguageConfig {
        id: "swift",
        name: "Swift",
        extension: "swift",
        aliases: &[],
        docker_image: "swift:6.0",
        compile_cmd: Some("swiftc {file} -o /tmp/main"),
        run_cmd: "/tmp/main",
        category: LanguageCategory::Compiled,
        file_name: "main.swift",
    },
    // Kotlin
    LanguageConfig {
        id: "kotlin",
        name: "Kotlin",
        extension: "kt",
        aliases: &["kt"],
        docker_image: "zenika/kotlin:1.9",
        compile_cmd: Some("kotlinc {file} -include-runtime -d /tmp/main.jar"),
        run_cmd: "java -jar /tmp/main.jar",
        category: LanguageCategory::Compiled,
        file_name: "Main.kt",
    },
    // Scala
    LanguageConfig {
        id: "scala",
        name: "Scala",
        extension: "scala",
        aliases: &["sc"],
        docker_image: "sbtscala/scala-sbt:eclipse-temurin-21_36_1.10.5_3.5.2",
        compile_cmd: None,
        run_cmd: "scala-cli run {file}",
        category: LanguageCategory::Compiled,
        file_name: "Main.scala",
    },
    // Haskell
    LanguageConfig {
        id: "haskell",
        name: "Haskell",
        extension: "hs",
        aliases: &["hs"],
        docker_image: "haskell:9.8",
        compile_cmd: Some("ghc {file} -o /tmp/main"),
        run_cmd: "/tmp/main",
        category: LanguageCategory::Compiled,
        file_name: "Main.hs",
    },
    // Elixir
    LanguageConfig {
        id: "elixir",
        name: "Elixir",
        extension: "exs",
        aliases: &["ex", "exs"],
        docker_image: "elixir:1.17",
        compile_cmd: None,
        run_cmd: "elixir {file}",
        category: LanguageCategory::Interpreted,
        file_name: "main.exs",
    },
    // Clojure
    LanguageConfig {
        id: "clojure",
        name: "Clojure",
        extension: "clj",
        aliases: &["clj"],
        docker_image: "clojure:temurin-21-tools-deps",
        compile_cmd: None,
        run_cmd: "clojure -M {file}",
        category: LanguageCategory::JIT,
        file_name: "main.clj",
    },
    // F#
    LanguageConfig {
        id: "fsharp",
        name: "F#",
        extension: "fsx",
        aliases: &["fs", "fsx"],
        docker_image: "mcr.microsoft.com/dotnet/sdk:9.0",
        compile_cmd: None,
        run_cmd: "dotnet fsi {file}",
        category: LanguageCategory::JIT,
        file_name: "main.fsx",
    },
    // C#
    LanguageConfig {
        id: "csharp",
        name: "C#",
        extension: "cs",
        aliases: &["cs", "c#"],
        docker_image: "mcr.microsoft.com/dotnet/sdk:9.0",
        compile_cmd: Some("dotnet new console -o /tmp/app && cp {file} /tmp/app/Program.cs && cd /tmp/app && dotnet build -o /tmp/out"),
        run_cmd: "/tmp/out/app",
        category: LanguageCategory::Compiled,
        file_name: "Program.cs",
    },
    // Zig
    LanguageConfig {
        id: "zig",
        name: "Zig",
        extension: "zig",
        aliases: &[],
        docker_image: "euantorano/zig:0.13.0",
        compile_cmd: None,
        run_cmd: "zig run {file}",
        category: LanguageCategory::Compiled,
        file_name: "main.zig",
    },
];

/// Get language config by ID or alias
#[allow(dead_code)]
pub fn get_language_config(lang: &str) -> Option<&'static LanguageConfig> {
    let lang_lower = lang.to_lowercase();
    LANGUAGE_CONFIGS
        .iter()
        .find(|l| l.id == lang_lower || l.aliases.contains(&lang_lower.as_str()))
}

/// Get all languages as Language structs
#[allow(dead_code)]
pub fn get_all_languages() -> Vec<Language> {
    LANGUAGE_CONFIGS
        .iter()
        .map(|l| Language {
            id: l.id,
            name: l.name,
            extension: l.extension,
            category: l.category,
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_language_config() {
        assert!(get_language_config("python").is_some());
        assert!(get_language_config("py").is_some());
        assert!(get_language_config("Python").is_some());
        assert!(get_language_config("unknown").is_none());
    }

    #[test]
    fn test_all_languages_have_docker_image() {
        for lang in LANGUAGE_CONFIGS {
            assert!(!lang.docker_image.is_empty(), "{} has no docker image", lang.id);
        }
    }
}
