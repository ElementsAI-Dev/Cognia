# Video Studio

Video Studio is a unified video editing and generation interface combining screen recording, AI video generation, and video editing capabilities.

## Overview

| Feature | Description |
|---------|-------------|
| **Screen Recording** | Record screen, window, or region with audio |
| **AI Generation** | Text-to-video and image-to-video generation |
| **Video Preview** | Built-in video player with controls |
| **Video Gallery** | History of recordings and AI generations |
| **Trimming** | Cut and trim video segments |
| **Export** | Download in multiple formats |

## Modes

### Recording Mode

Record your screen with configurable options:

- **Fullscreen**: Capture the entire screen
- **Window**: Record a specific application window
- **Region**: Select a custom screen region
- **Audio**: System audio and microphone capture

### AI Generation Mode

Generate videos from text or images:

- Describe a scene in natural language
- Upload a reference image for style guidance
- Configure duration, resolution, and style
- Monitor generation progress in real-time

## Architecture

```text
app/(main)/video-studio/page.tsx    → Unified video studio page
components/video-studio/            → 76 video components
  ├── video-player.tsx              → Video preview player
  ├── video-gallery.tsx             → Recording/generation history
  ├── video-trimmer.tsx             → Video trimming tool
  ├── recording-controls.tsx        → Screen recording controls
  └── ai-generation-panel.tsx       → AI video generation UI
hooks/video-studio/                 → Video hooks
stores/media/                       → Video state
  ├── media-store.ts                → Media management
  └── screen-recording-store.ts     → Recording state
src-tauri/src/screen_recording/     → Rust screen recording backend
```

## Desktop Only

Screen recording requires the Tauri desktop app for system-level screen capture. AI video generation works in both web and desktop modes.
