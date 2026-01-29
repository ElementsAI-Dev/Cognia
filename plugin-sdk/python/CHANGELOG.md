# Changelog

All notable changes to the Cognia Plugin SDK for Python will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-29

### Added

- Initial release of Cognia Plugin SDK for Python
- Plugin base class with lifecycle management
- Decorators: `@tool`, `@hook`, `@command`
- Schema builders for type-safe parameter definitions
- A2UI component support with `A2UIBuilder`
- Custom mode definitions with `ModeBuilder`
- Runtime context with IPC communication
- Full API access:
  - Session API
  - Project API
  - Vector/RAG API
  - Theme API
  - Export API
  - Canvas API
  - Artifact API
  - Notification API
  - AI Provider API
  - Network API
  - File System API
  - Shell API
  - Database API
  - Shortcuts API
  - Context Menu API
  - Debug API
  - Profiler API
  - Version API
  - Dependencies API
  - Message Bus API
  - Clipboard API
- Testing utilities with mock objects
- CLI tool for plugin development
- Example plugins:
  - A2UI Dashboard
  - Custom Mode
  - Data Analysis
  - RAG Integration
  - Session Manager
  - Theme Customizer
