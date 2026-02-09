# Screen Recording (Desktop Only)

Screen recording with fullscreen, window, and region capture modes, powered by the Tauri Rust backend.

## Overview

| Feature | Description |
|---------|-------------|
| **Fullscreen** | Record the entire screen |
| **Window** | Record a specific application window |
| **Region** | Record a selected screen region |
| **Audio** | System audio and microphone capture |
| **History** | Browse and manage past recordings |
| **Export** | Download recordings in standard video formats |

## Architecture

```text
components/screen-recording/         → 10 recording UI components
stores/media/screen-recording-store.ts → Recording state
src-tauri/src/screen_recording/      → Rust backend
  ├── recorder.rs                   → Recording engine
  ├── config.rs                     → Recording configuration
  └── history.rs                    → Recording history management
```

## Usage

1. Open the Video Studio or trigger recording from the toolbar
2. Select capture mode (fullscreen, window, or region)
3. Configure audio options
4. Click Record to start, Stop to finish
5. View the recording in the Video Studio gallery

## Desktop Only

Requires Tauri for system-level screen capture. Uses FFmpeg for video encoding.
