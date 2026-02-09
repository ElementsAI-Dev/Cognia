# Screen Recording Module — Comprehensive Improvement Plan

## Executive Summary

After thorough review of the entire screen recording module (7 Rust files, 4 TypeScript API files, 3 React components, 2 Zustand stores, 1 hook, and the Video Studio page), this document identifies **unused code**, **architecture gaps**, **code quality issues**, and proposes a prioritized roadmap for improvements.

---

## 1. Current Architecture Overview

### Rust Backend (`src-tauri/src/screen_recording/`)
| File | Responsibility |
|------|---------------|
| `mod.rs` | Core `ScreenRecordingManager`, configs, recording lifecycle |
| `ffmpeg.rs` | FFmpeg detection, version check, HW acceleration, install guides |
| `storage.rs` | File organization, cleanup, disk space monitoring |
| `toolbar.rs` | Native floating toolbar window with edge snapping |
| `history.rs` | Recording history persistence (max 100 entries) |
| `progress.rs` | FFmpeg output parsing for real-time progress |
| `error.rs` | Structured error codes with user-facing suggestions |

### TypeScript Layer
| File | Responsibility |
|------|---------------|
| `lib/native/screen-recording.ts` | 35+ Tauri command bindings + types |
| `lib/native/recording-toolbar.ts` | 12 toolbar command bindings |
| `lib/native/video-processing.ts` | Trim, convert, thumbnail, encoding support |
| `stores/media/screen-recording-store.ts` | Main Zustand store (759 lines) |
| `stores/media/recording-toolbar-store.ts` | Toolbar state store (333 lines) |
| `hooks/native/use-screen-recording.ts` | Simplified hook wrapper (220 lines) |
| `hooks/native/use-media-shortcuts.ts` | Global keyboard shortcuts |

### React Components (`components/screen-recording/`)
| Component | Responsibility |
|-----------|---------------|
| `RecordingControls` | Start/stop/pause UI with mode selection |
| `RegionSelector` | Full-screen overlay for region drawing |
| `RecordingHistoryPanel` | History list with search, tags, pinning |
| `FFmpegStatus` | FFmpeg availability alert + install guide dialog |

### Integration Point
- `app/(main)/video-studio/page.tsx` — Unified Video Studio combining recording, editing, and AI generation

---

## 2. Unused Code (Dead Exports)

### 2.1 `lib/native/screen-recording.ts` — 8 Unused Functions

These functions are exported but **never imported or called** anywhere in the codebase:

| Function | Line | Purpose | Suggested Integration |
|----------|------|---------|----------------------|
| `getFFmpegInfo()` | 409 | Detailed FFmpeg version, path, encoders/decoders | → `FFmpegStatus` component |
| `getFFmpegInstallGuide()` | 416 | Platform-specific install instructions | → `FFmpegStatus` dialog |
| `checkHardwareAcceleration()` | 423 | Detect NVIDIA/Intel/AMD/VAAPI support | → Recording settings panel |
| `checkFFmpegVersion()` | 430 | Version requirement validation | → `FFmpegStatus` component |
| `generateRecordingFilename()` | 459 | Semantic filename generation via Tauri | → Recording start flow |
| `getRecordingPath()` | 470 | Full path resolution for recordings | → Storage management UI |
| `generateScreenshotFilename()` | 477 | Semantic filename for screenshots | → Screenshot module |
| `getScreenshotPath()` | 488 | Full path resolution for screenshots | → Screenshot module |

### 2.2 `lib/native/recording-toolbar.ts` — 4 Under-Utilized Functions

Used only in the toolbar store or tests, but **not exposed to any UI component**:

| Function | Used In | Missing From |
|----------|---------|-------------|
| `snapRecordingToolbarToEdge()` | Store only | No UI button/gesture triggers it |
| `toggleRecordingToolbarCompact()` | Store only | No UI toggle exposed |
| `setRecordingToolbarHovered()` | Store only | No hover event wired |
| `destroyRecordingToolbar()` | Store only | No cleanup trigger in UI |

### 2.3 `lib/native/video-processing.ts` — Partial Usage

| Function | Status |
|----------|--------|
| `getVideoInfo()` | Used in progressive-video, a2ui, e2e tests ✅ |
| `generateThumbnail()` | Used in a2ui, e2e tests ✅ |
| `generateThumbnailWithProgress()` | Used in e2e tests only ⚠️ |
| `checkEncodingSupport()` | Used in e2e tests only ⚠️ |
| `estimateFileSize()` | Used in export presets, e2e tests ✅ |
| `cancelVideoProcessing()` | Stubbed (always returns false) ⚠️ |

---

## 3. Code Quality Issues

### 3.1 Duplicate `formatDuration` Functions (3 copies)

1. `lib/native/screen-recording.ts:332` — `formatDuration(ms: number)` → takes milliseconds
2. `lib/native/video-processing.ts:161` — `formatDuration(seconds: number)` → takes seconds
3. `hooks/native/use-screen-recording.ts:69` — `formatDuration(ms: number)` → takes milliseconds

**Problem**: Different signatures (ms vs seconds), confusing for consumers.
**Fix**: Consolidate into a single utility in `lib/utils.ts` with clear naming (`formatDurationMs`, `formatDurationSec`).

### 3.2 Redundant Status Update Mechanisms

The `screen-recording-store.ts` has two overlapping mechanisms:
- **Event listeners** (`recording-status-changed`) for real-time updates
- **Polling timer** (`setInterval` every 1s for duration) that duplicates event data

The polling timer starts when status changes to `Recording`, but the `recording-status-changed` event already includes `duration_ms`. The timer adds unnecessary IPC overhead.

**Fix**: Remove the polling timer; rely solely on backend events for duration updates. If sub-second precision is needed, increase backend event emission frequency.

### 3.3 Dead Code in Video Studio Page

`app/(main)/video-studio/page.tsx` contains `_`-prefixed callbacks:
- `_handleTimeUpdate` (line 781)
- `_handleLoadedMetadata` (line 787)
- `_handleVideoEnded` (line 794)
- `_toggleMute` (line 801)
- `_setExportQuality` (line 165)
- `_referenceImageFile` (line 197)
- `_handleApplyTemplate` (line 629)

These indicate incomplete refactoring — the functions exist but aren't wired to the video element.

### 3.4 Missing Error Boundaries

The `RecordingControls` and `RecordingHistoryPanel` components lack `ErrorBoundary` wrappers. A Tauri IPC failure could crash the entire UI.

### 3.5 Store Size

`screen-recording-store.ts` at 759 lines is quite large. Consider splitting into:
- `recording-control-store.ts` (recording lifecycle)
- `recording-history-store.ts` (history, tags, pinning)
- `recording-storage-store.ts` (storage stats, cleanup)

---

## 4. Feature Gaps (vs. Industry Standard)

Based on analysis of OBS Studio, Loom, Snagit, Camtasia, and ShareX:

### 4.1 Critical Missing Features

| Feature | Competitors | Difficulty | Priority |
|---------|------------|------------|----------|
| **Webcam overlay** | Loom, OBS, Camtasia | Medium | P1 |
| **Hardware acceleration in recording** | OBS, Camtasia | Medium | P1 |
| **Recording presets** (Tutorial, Gaming, Presentation) | Snagit, Camtasia | Low | P1 |
| **Auto-save recovery** (crash protection) | OBS | Medium | P1 |

### 4.2 High-Value Features

| Feature | Competitors | Difficulty | Priority |
|---------|------------|------------|----------|
| **Annotation during recording** (draw, highlight) | Snagit, ShareX | High | P2 |
| **Watermark support** (image/text overlay) | OBS, Camtasia | Low | P2 |
| **Scheduled recording** (start at time) | OBS | Low | P2 |
| **Recording countdown animation** | Loom, Snagit | Low | P2 |
| **GIF direct capture mode** | ShareX, Snagit | Medium | P2 |
| **Post-recording auto-actions** (upload, copy link) | Loom, ShareX | Medium | P2 |

### 4.3 Nice-to-Have Features

| Feature | Competitors | Difficulty | Priority |
|---------|------------|------------|----------|
| **AI-powered chapter markers** | Loom | High | P3 |
| **Automatic silence detection/removal** | Camtasia | High | P3 |
| **Multi-track audio** (separate mic/system) | OBS | High | P3 |
| **Live streaming (RTMP)** | OBS | Very High | P3 |
| **Zoom/pan effects during playback** | Camtasia | Medium | P3 |
| **Speed ramping** | Camtasia | Medium | P3 |

---

## 5. Integration Opportunities

### 5.1 FFmpegStatus Component Enhancement

Current `FFmpegStatus` uses only `checkFFmpeg()` (boolean). It should leverage:
- `getFFmpegInfo()` → Show version, path, available encoders
- `checkHardwareAcceleration()` → Show GPU acceleration status
- `checkFFmpegVersion()` → Specific version validation
- `getFFmpegInstallGuide()` → Dynamic install instructions (currently hardcoded in component)

### 5.2 Recording Settings Panel

The `RecordingConfig` type has rich options that aren't fully exposed in UI:
- `highlight_clicks` — No toggle in settings
- `pause_on_minimize` — No toggle in settings
- `max_duration` — No input in settings
- `bitrate` — No custom bitrate control
- Hardware acceleration codec selection (use `checkHardwareAcceleration()`)

### 5.3 Storage Management Dashboard

The storage API surface (`getStorageStats`, `getStorageConfig`, `updateStorageConfig`, `cleanupStorage`, `getStorageUsagePercent`, `isStorageExceeded`) is well-designed but could power a dedicated settings panel with:
- Visual disk usage breakdown (recordings vs screenshots)
- Auto-cleanup configuration
- Storage limit warnings
- Manual cleanup with preview

### 5.4 Toolbar ↔ UI Bidirectional Control

The toolbar store has `snapToEdge`, `toggleCompact`, `setHovered` actions that are wired to the store but never triggered from UI events. The recording toolbar window should:
- Expose edge-snap via drag gesture
- Add compact mode toggle button
- Wire hover detection for auto-hide

---

## 6. Prioritized Roadmap

### Phase 1: Code Quality & Dead Code Elimination (1-2 days)

1. **Integrate 8 unused `screen-recording.ts` functions** into appropriate UI components
2. **Consolidate 3 duplicate `formatDuration` functions** into `lib/utils.ts`
3. **Remove or wire `_`-prefixed dead code** in Video Studio page
4. **Eliminate redundant duration polling** in favor of event-driven updates
5. **Add error boundaries** to recording components

### Phase 2: FFmpeg & Settings Enhancement (2-3 days)

1. **Enhance FFmpegStatus** with detailed info, HW acceleration status, dynamic install guide
2. **Build Recording Settings panel** exposing all `RecordingConfig` options
3. **Add recording presets** (Tutorial: 1080p/30fps, Gaming: 1080p/60fps, Presentation: 720p/15fps)
4. **Wire toolbar UI controls** (compact toggle, edge snap, auto-hide)

### Phase 3: Missing Critical Features (3-5 days)

1. **Hardware-accelerated encoding** — Use `checkHardwareAcceleration()` to auto-select best codec
2. **Webcam overlay** — Add webcam capture source via FFmpeg filter_complex
3. **Auto-save/crash recovery** — Periodic metadata saves, recovery on next launch
4. **Recording countdown animation** — Use existing `recording-countdown` event for visual countdown

### Phase 4: Advanced Features (5-10 days)

1. **Watermark support** — Image/text overlay via FFmpeg filters
2. **Annotation during recording** — Drawing overlay window
3. **Scheduled recording** — Timer-based start with notification
4. **GIF direct capture** — Bypass MP4 conversion for short captures
5. **Post-recording actions** — Auto-upload, copy path, open folder
6. **Storage management dashboard** — Full settings UI for storage config

### Phase 5: AI-Powered Features (10+ days)

1. **AI chapter markers** — Analyze audio/video for topic changes
2. **Silence detection/removal** — FFmpeg `silencedetect` filter integration
3. **Smart thumbnails** — AI-selected best frame for recording preview
4. **Recording transcription** — Whisper integration for searchable recordings

---

## 7. Testing Strategy

### Current Test Coverage
- `screen-recording-store.test.ts` — 715 lines, comprehensive ✅
- `recording-toolbar-store.test.ts` — Tests exist ✅
- `recording-controls.test.tsx` — Component tests ✅
- `ffmpeg-status.test.tsx` — Component tests ✅
- `region-selector.test.tsx` — Component tests ✅
- `recording-history-panel.test.tsx` — Component tests ✅
- `lib/native/recording-toolbar.test.ts` — API tests ✅
- `e2e/features/video-studio-recording.spec.ts` — E2E tests ✅

### Recommended Additions
- Integration tests for the full recording lifecycle (start → pause → resume → stop → history)
- Performance benchmarks for FFmpeg operations
- HW acceleration detection tests (mocked per platform)
- Storage cleanup edge case tests (pinned items, concurrent access)

---

## 8. File Reference Map

```
src-tauri/src/screen_recording/
├── mod.rs          (765 lines) — Core manager & API
├── ffmpeg.rs       (358 lines) — FFmpeg detection
├── storage.rs      (595 lines) — File management
├── toolbar.rs      (628 lines) — Native toolbar window
├── history.rs      (576 lines) — Recording history
├── progress.rs     (257 lines) — Progress parsing
└── error.rs        (304 lines) — Error types

lib/native/
├── screen-recording.ts  (511 lines) — 35+ Tauri bindings
├── recording-toolbar.ts (177 lines) — 12 toolbar bindings
└── video-processing.ts  (214 lines) — Processing bindings

stores/media/
├── screen-recording-store.ts      (759 lines) — Main store
└── recording-toolbar-store.ts     (333 lines) — Toolbar store

hooks/native/
├── use-screen-recording.ts   (220 lines) — Hook wrapper
└── use-media-shortcuts.ts    (97 lines)  — Global shortcuts

components/screen-recording/
├── recording-controls.tsx         (400 lines)
├── region-selector.tsx            (392 lines)
├── recording-history-panel.tsx    (578 lines)
├── ffmpeg-status.tsx              (371 lines)
└── index.ts                       (9 lines)

app/(main)/video-studio/
└── page.tsx                       (1556 lines) — Unified studio
```
