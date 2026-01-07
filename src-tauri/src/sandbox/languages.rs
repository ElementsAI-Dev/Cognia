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
#[allow(clippy::upper_case_acronyms)]
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

    // ==================== Language Config Lookup Tests ====================

    #[test]
    fn test_get_language_config() {
        assert!(get_language_config("python").is_some());
        assert!(get_language_config("py").is_some());
        assert!(get_language_config("Python").is_some());
        assert!(get_language_config("unknown").is_none());
    }

    #[test]
    fn test_get_language_config_by_alias() {
        // Python aliases
        assert!(get_language_config("py").is_some());
        assert!(get_language_config("python3").is_some());
        assert!(get_language_config("py3").is_some());

        // JavaScript aliases
        assert!(get_language_config("js").is_some());
        assert!(get_language_config("node").is_some());
        assert!(get_language_config("nodejs").is_some());

        // TypeScript alias
        assert!(get_language_config("ts").is_some());

        // Go alias
        assert!(get_language_config("golang").is_some());

        // Rust alias
        assert!(get_language_config("rs").is_some());

        // Ruby alias
        assert!(get_language_config("rb").is_some());

        // Bash aliases
        assert!(get_language_config("sh").is_some());
        assert!(get_language_config("shell").is_some());

        // PowerShell aliases
        assert!(get_language_config("ps1").is_some());
        assert!(get_language_config("pwsh").is_some());
    }

    #[test]
    fn test_get_language_config_case_insensitive() {
        assert!(get_language_config("PYTHON").is_some());
        assert!(get_language_config("Python").is_some());
        assert!(get_language_config("pYtHoN").is_some());
        assert!(get_language_config("JAVASCRIPT").is_some());
        assert!(get_language_config("JavaScript").is_some());
    }

    // ==================== Language Config Validation Tests ====================

    #[test]
    fn test_all_languages_have_docker_image() {
        for lang in LANGUAGE_CONFIGS {
            assert!(
                !lang.docker_image.is_empty(),
                "{} has no docker image",
                lang.id
            );
        }
    }

    #[test]
    fn test_all_languages_have_run_cmd() {
        for lang in LANGUAGE_CONFIGS {
            assert!(!lang.run_cmd.is_empty(), "{} has no run command", lang.id);
        }
    }

    #[test]
    fn test_all_languages_have_file_name() {
        for lang in LANGUAGE_CONFIGS {
            assert!(!lang.file_name.is_empty(), "{} has no file name", lang.id);
        }
    }

    #[test]
    fn test_all_languages_have_extension() {
        for lang in LANGUAGE_CONFIGS {
            assert!(!lang.extension.is_empty(), "{} has no extension", lang.id);
        }
    }

    #[test]
    fn test_all_languages_have_unique_ids() {
        let mut ids = std::collections::HashSet::new();
        for lang in LANGUAGE_CONFIGS {
            assert!(ids.insert(lang.id), "Duplicate language ID: {}", lang.id);
        }
    }

    #[test]
    fn test_file_name_matches_extension() {
        for lang in LANGUAGE_CONFIGS {
            let expected_ext = format!(".{}", lang.extension);
            assert!(
                lang.file_name.ends_with(&expected_ext),
                "{} file_name '{}' doesn't end with extension '.{}'",
                lang.id,
                lang.file_name,
                lang.extension
            );
        }
    }

    // ==================== Language Category Tests ====================

    #[test]
    fn test_interpreted_languages() {
        let interpreted = [
            "python",
            "javascript",
            "ruby",
            "php",
            "lua",
            "perl",
            "elixir",
        ];
        for lang_id in interpreted {
            let config = get_language_config(lang_id).unwrap();
            assert_eq!(
                config.category,
                LanguageCategory::Interpreted,
                "{} should be Interpreted",
                lang_id
            );
            assert!(
                config.compile_cmd.is_none(),
                "{} should not have compile_cmd",
                lang_id
            );
        }
    }

    #[test]
    fn test_compiled_languages() {
        let compiled = [
            "rust", "c", "cpp", "java", "swift", "kotlin", "haskell", "csharp",
        ];
        for lang_id in compiled {
            let config = get_language_config(lang_id).unwrap();
            assert_eq!(
                config.category,
                LanguageCategory::Compiled,
                "{} should be Compiled",
                lang_id
            );
        }
    }

    #[test]
    fn test_shell_languages() {
        let shells = ["bash", "powershell"];
        for lang_id in shells {
            let config = get_language_config(lang_id).unwrap();
            assert_eq!(
                config.category,
                LanguageCategory::Shell,
                "{} should be Shell",
                lang_id
            );
        }
    }

    #[test]
    fn test_jit_languages() {
        let jit = ["julia", "clojure", "fsharp"];
        for lang_id in jit {
            let config = get_language_config(lang_id).unwrap();
            assert_eq!(
                config.category,
                LanguageCategory::JIT,
                "{} should be JIT",
                lang_id
            );
        }
    }

    // ==================== get_all_languages Tests ====================

    #[test]
    fn test_get_all_languages() {
        let languages = get_all_languages();
        assert!(!languages.is_empty());
        assert_eq!(languages.len(), LANGUAGE_CONFIGS.len());
    }

    #[test]
    fn test_get_all_languages_contains_major_languages() {
        let languages = get_all_languages();
        let ids: Vec<&str> = languages.iter().map(|l| l.id).collect();

        assert!(ids.contains(&"python"));
        assert!(ids.contains(&"javascript"));
        assert!(ids.contains(&"typescript"));
        assert!(ids.contains(&"rust"));
        assert!(ids.contains(&"go"));
        assert!(ids.contains(&"java"));
        assert!(ids.contains(&"c"));
        assert!(ids.contains(&"cpp"));
    }

    #[test]
    fn test_language_struct_fields() {
        let languages = get_all_languages();
        for lang in languages {
            assert!(!lang.id.is_empty());
            assert!(!lang.name.is_empty());
            assert!(!lang.extension.is_empty());
        }
    }

    // ==================== Specific Language Tests ====================

    #[test]
    fn test_python_config() {
        let config = get_language_config("python").unwrap();
        assert_eq!(config.id, "python");
        assert_eq!(config.name, "Python");
        assert_eq!(config.extension, "py");
        assert_eq!(config.file_name, "main.py");
        assert!(config.docker_image.contains("python"));
        assert!(config.compile_cmd.is_none());
        assert!(config.run_cmd.contains("python"));
    }

    #[test]
    fn test_javascript_config() {
        let config = get_language_config("javascript").unwrap();
        assert_eq!(config.id, "javascript");
        assert_eq!(config.name, "JavaScript");
        assert_eq!(config.extension, "js");
        assert_eq!(config.file_name, "main.js");
        assert!(config.docker_image.contains("node"));
        assert!(config.compile_cmd.is_none());
        assert!(config.run_cmd.contains("node"));
    }

    #[test]
    fn test_typescript_config() {
        let config = get_language_config("typescript").unwrap();
        assert_eq!(config.id, "typescript");
        assert_eq!(config.extension, "ts");
        assert!(config.compile_cmd.is_some());
        assert!(config.compile_cmd.unwrap().contains("tsc"));
    }

    #[test]
    fn test_rust_config() {
        let config = get_language_config("rust").unwrap();
        assert_eq!(config.id, "rust");
        assert_eq!(config.extension, "rs");
        assert!(config.compile_cmd.is_some());
        assert!(config.compile_cmd.unwrap().contains("rustc"));
    }

    #[test]
    fn test_go_config() {
        let config = get_language_config("go").unwrap();
        assert_eq!(config.id, "go");
        assert_eq!(config.extension, "go");
        assert!(config.docker_image.contains("golang"));
        assert!(config.run_cmd.contains("go run"));
    }

    #[test]
    fn test_java_config() {
        let config = get_language_config("java").unwrap();
        assert_eq!(config.id, "java");
        assert_eq!(config.extension, "java");
        assert_eq!(config.file_name, "Main.java");
        assert!(config.compile_cmd.is_some());
        assert!(config.compile_cmd.unwrap().contains("javac"));
    }

    #[test]
    fn test_c_config() {
        let config = get_language_config("c").unwrap();
        assert_eq!(config.id, "c");
        assert_eq!(config.extension, "c");
        assert!(config.compile_cmd.is_some());
        assert!(config.compile_cmd.unwrap().contains("gcc"));
    }

    #[test]
    fn test_cpp_config() {
        let config = get_language_config("cpp").unwrap();
        assert_eq!(config.id, "cpp");
        assert_eq!(config.extension, "cpp");
        assert!(config.compile_cmd.is_some());
        assert!(config.compile_cmd.unwrap().contains("g++"));
    }

    // ==================== Serialization Tests ====================

    #[test]
    fn test_language_category_serialization() {
        let interpreted = serde_json::to_string(&LanguageCategory::Interpreted).unwrap();
        assert_eq!(interpreted, "\"interpreted\"");

        let compiled = serde_json::to_string(&LanguageCategory::Compiled).unwrap();
        assert_eq!(compiled, "\"compiled\"");

        let jit = serde_json::to_string(&LanguageCategory::JIT).unwrap();
        assert_eq!(jit, "\"jit\"");

        let shell = serde_json::to_string(&LanguageCategory::Shell).unwrap();
        assert_eq!(shell, "\"shell\"");
    }

    #[test]
    fn test_language_category_deserialization() {
        let interpreted: LanguageCategory = serde_json::from_str("\"interpreted\"").unwrap();
        assert_eq!(interpreted, LanguageCategory::Interpreted);

        let compiled: LanguageCategory = serde_json::from_str("\"compiled\"").unwrap();
        assert_eq!(compiled, LanguageCategory::Compiled);

        let jit: LanguageCategory = serde_json::from_str("\"jit\"").unwrap();
        assert_eq!(jit, LanguageCategory::JIT);

        let shell: LanguageCategory = serde_json::from_str("\"shell\"").unwrap();
        assert_eq!(shell, LanguageCategory::Shell);
    }

    #[test]
    fn test_language_serialization() {
        let lang = Language {
            id: "test",
            name: "Test",
            extension: "test",
            category: LanguageCategory::Interpreted,
        };

        let json = serde_json::to_string(&lang).unwrap();
        assert!(json.contains("\"id\":\"test\""));
        assert!(json.contains("\"name\":\"Test\""));
        assert!(json.contains("\"extension\":\"test\""));
        assert!(json.contains("\"category\":\"interpreted\""));
    }

    #[test]
    fn test_language_deserialization() {
        let json = r#"{"id":"test","name":"Test","extension":"test","category":"compiled"}"#;
        let lang: Language = serde_json::from_str(json).unwrap();
        assert_eq!(lang.id, "test");
        assert_eq!(lang.name, "Test");
        assert_eq!(lang.extension, "test");
        assert_eq!(lang.category, LanguageCategory::Compiled);
    }

    // ==================== Edge Cases ====================

    #[test]
    fn test_empty_string_lookup() {
        assert!(get_language_config("").is_none());
    }

    #[test]
    fn test_whitespace_lookup() {
        assert!(get_language_config(" ").is_none());
        assert!(get_language_config("  python  ").is_none());
    }

    #[test]
    fn test_special_characters_lookup() {
        assert!(get_language_config("python!").is_none());
        assert!(get_language_config("c++").is_some()); // cpp alias
        assert!(get_language_config("c#").is_some()); // csharp alias
        assert!(get_language_config("f#").is_none()); // not an alias
    }

    // ==================== Run Command Placeholder Tests ====================

    #[test]
    fn test_run_cmd_has_file_placeholder() {
        for lang in LANGUAGE_CONFIGS {
            // For compiled languages with fixed output names (like Java), the run_cmd may reference
            // a fixed class/binary name. These are valid as long as compile_cmd uses {file}.
            let has_placeholder = lang.run_cmd.contains("{file}")
                || lang.run_cmd.contains("{basename}")
                || lang.run_cmd.starts_with("/tmp/")
                || lang.run_cmd.contains("/tmp/");

            // If no placeholder in run_cmd, there must be a compile step that uses {file}
            let has_compile_with_placeholder = lang
                .compile_cmd
                .map(|cmd| cmd.contains("{file}"))
                .unwrap_or(false);

            assert!(
                has_placeholder || has_compile_with_placeholder,
                "{} run_cmd should have {{file}} or {{basename}} placeholder, or compile_cmd should have {{file}}",
                lang.id
            );
        }
    }

    #[test]
    fn test_compile_cmd_has_file_placeholder() {
        for lang in LANGUAGE_CONFIGS {
            if let Some(compile_cmd) = lang.compile_cmd {
                assert!(
                    compile_cmd.contains("{file}"),
                    "{} compile_cmd should have {{file}} placeholder",
                    lang.id
                );
            }
        }
    }

    // ==================== Clone and Debug Tests ====================

    #[test]
    fn test_language_category_clone() {
        let cat = LanguageCategory::Interpreted;
        let cloned = cat;
        assert_eq!(cat, cloned);
    }

    #[test]
    fn test_language_category_debug() {
        let cat = LanguageCategory::Compiled;
        let debug = format!("{:?}", cat);
        assert!(debug.contains("Compiled"));
    }

    #[test]
    fn test_language_clone() {
        let lang = Language {
            id: "test",
            name: "Test",
            extension: "test",
            category: LanguageCategory::JIT,
        };
        let cloned = lang.clone();
        assert_eq!(lang.id, cloned.id);
        assert_eq!(lang.category, cloned.category);
    }

    #[test]
    fn test_language_debug() {
        let lang = Language {
            id: "test",
            name: "Test",
            extension: "test",
            category: LanguageCategory::Shell,
        };
        let debug = format!("{:?}", lang);
        assert!(debug.contains("test"));
        assert!(debug.contains("Test"));
    }

    #[test]
    fn test_language_config_clone() {
        let config = get_language_config("python").unwrap();
        let cloned = config.clone();
        assert_eq!(config.id, cloned.id);
        assert_eq!(config.docker_image, cloned.docker_image);
    }

    #[test]
    fn test_language_config_debug() {
        let config = get_language_config("python").unwrap();
        let debug = format!("{:?}", config);
        assert!(debug.contains("python"));
    }
}
