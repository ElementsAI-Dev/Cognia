# Video Studio

Video Studio is a unified video editing and generation interface combining screen recording, AI video generation, and video editing capabilities.

## Overview

| Feature | Description |
|---------|-------------|
| **Screen Recording** | Record screen, window, or region with audio |
| **AI Generation** | Text-to-video and image-to-video with camera motion controls |
| **Video Preview** | Built-in video player with playback controls |
| **Video Gallery** | Searchable grid with zoom levels and favorites |
| **Trimming** | Cut and trim video segments |
| **Export** | Download in multiple formats (MP4, WebM, GIF) |
| **Prompt Enhancement** | AI-powered prompt optimization via PromptOptimizerDialog |

## Modes

### Recording Mode

Record your screen with configurable options:

- **Fullscreen**: Capture the entire screen
- **Window**: Record a specific application window
- **Region**: Select a custom screen region
- **Audio**: System audio and microphone capture

### AI Generation Mode

Generate videos from text or images:

- **Prompt input** with Ctrl+Enter shortcut and character count
- **Prompt Enhance** button (reuses PromptOptimizerDialog)
- **Camera motion controls**: 6-axis sliders (Horizontal, Vertical, Pan, Tilt, Zoom, Roll) with 10 presets (Static, Dolly In, Orbit, Tracking, etc.)
- **Provider/Model selection** always visible (Google Veo, OpenAI Sora)
- **8 visual style presets** with gradient cards
- **Resizable panel layout** (sidebar + main content)
- **Search & filter** with debounced search and favorites toggle
- **Adjustable gallery zoom** (XL to XS, 2–6 columns)
- **Toast notifications** on generation complete
- **Inspiration empty state** with clickable template cards

### Editor Mode

Full video editor with timeline, effects, audio mixing, and composition layers.

## Architecture

```text
app/(main)/video-studio/
  ├── page.tsx                      → Orchestrator (ResizablePanelGroup layout)
  ├── ai-generation-mode.tsx        → AI generation content area
  └── recording-mode.tsx            → Recording content area

components/video-studio/
  ├── generation/
  │   ├── ai-generation-sidebar.tsx → Sidebar with prompt, settings, camera controls
  │   ├── camera-motion-controls.tsx→ 6-axis camera motion + presets (Runway-style)
  │   └── video-job-card.tsx        → Video result card with hover preview
  ├── recording/
  │   ├── video-studio-header.tsx   → Mode switcher, recording controls
  │   └── recording-sidebar.tsx     → Recording history list
  ├── management/
  │   ├── video-details-panel.tsx   → Details + Send to Editor / Use as Reference
  │   └── media-library-panel.tsx   → Media asset browser
  ├── preview/                      → Video preview and dialog
  ├── timeline/                     → Timeline, trimmer, subtitles, markers
  ├── effects/                      → Effects, transitions, color correction
  ├── audio/                        → Audio mixer, waveform, track controls
  ├── composition/                  → Layers, text overlays
  ├── export/                       → Export dialog, progress, render queue
  ├── editor/                       → Main editor panel, toolbar
  ├── common/                       → Playback, zoom, history, shortcuts, settings
  └── constants.ts                  → Templates, styles, presets, zoom levels

hooks/video-studio/
  ├── use-ai-generation-mode.ts     → AI generation state + camera motion + toast
  ├── use-recording-mode.ts         → Recording state and handlers
  ├── use-video-editor.ts           → Editor state
  └── use-video-timeline.ts         → Timeline management

stores/media/
  ├── media-store.ts                → Persistent video/image records (localStorage)
  ├── video-editor-store.ts         → Editor project state
  └── screen-recording-store.ts     → Recording state

types/
  ├── media/video.ts                → VideoProvider, VideoModel, generation options
  └── video-studio/types.ts         → VideoJob, CameraMotion, editor types
```

## Desktop Only

Screen recording requires the Tauri desktop app for system-level screen capture. AI video generation works in both web and desktop modes.
