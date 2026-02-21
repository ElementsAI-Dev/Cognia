# SpeedPass Learning

SpeedPass is an interactive learning system that enables rapid knowledge acquisition through textbooks, quizzes, tutorials, and extreme learning modes.

## Overview

| Feature | Description |
|---------|-------------|
| **Textbook Library** | Upload and manage learning materials |
| **Tutorial Generator** | AI-generated tutorials from textbook content |
| **Extreme Mode** | Timed, high-pressure learning sessions |
| **Mode Detection** | NLP-based intelligent mode recommendation |
| **Knowledge Matching** | Match teacher notes with knowledge points |
| **Progress Tracking** | Study sessions, streaks, and daily goals |
| **Textbook Upload** | PDF/document parsing into structured content |
| **xAPI Interop** | Export/import standards-aligned xAPI statements |
| **QTI 3 Interop** | Export/import QTI 3 item XML + package zip |

## Getting Started

1. Navigate to **SpeedPass** from the sidebar
2. Upload a textbook or learning material
3. Select a learning mode (Normal, Speed, Extreme)
4. Work through AI-generated tutorials and quizzes
5. Track progress in the overview tab

## Learning Modes

### Normal Mode

Standard-paced learning with full explanations and examples.

### Speed Mode

Condensed content focusing on key concepts and summaries.

### Extreme Mode

Timed sessions with countdown phases:

- **Warm-up**: Brief overview
- **Sprint**: Rapid content delivery
- **Review**: Quick recall check
- **Cooldown**: Summary and next steps

The `ExtremeModeEngine` manages countdown, phases, and urgency levels.

## Architecture

```text
app/(main)/speedpass/              → SpeedPass pages
  ├── page.tsx                     → Main page with textbook library
  └── tutorial/[id]/               → Tutorial detail page
components/speedpass/              → UI components
  ├── textbook-library.tsx         → Textbook browser
  ├── textbook-uploader.tsx        → File upload component
  ├── mode-selector-dialog.tsx     → Learning mode picker
  └── textbook-card-skeleton.tsx   → Loading skeleton
hooks/learning/                    → Learning hooks
  ├── use-speedpass.ts             → SpeedPass core hook
  └── use-textbook-processor.ts    → Textbook parsing hook
stores/learning/                   → Learning state
  └── speedpass-store.ts           → Tutorial and progress persistence
lib/learning/speedpass/            → Core logic
  ├── extreme-mode-engine.ts       → Extreme mode timing
  ├── knowledge-matcher.ts         → Knowledge point matching
  ├── mode-router.ts               → Mode detection and routing
  └── tutorial-generator.ts        → AI tutorial generation
```

## Key Libraries

- **Tutorial Generator**: Creates structured tutorials with summaries, key points, memory tips, and common mistakes
- **Knowledge Matcher**: Matches teacher key points with textbook knowledge points
- **Mode Router**: Uses NLP to detect learning intent and recommend appropriate modes
- **Extreme Mode Engine**: Manages countdown timers and phase transitions
- **xAPI Adapter**: Maps SpeedPass events to/from xAPI Statement (`id/actor/verb/object/result/context/timestamp`)
- **QTI Adapter**: Maps internal questions to/from QTI 3 `assessmentItem` XML and manifest package

## Interoperability & Rollout

- `learningInteropV2Enabled`: controls strict xAPI/QTI 3 interop path (env + localStorage override)
- `learningModeV2Enabled`: controls learning-mode v2 message/tool/session linkage
- SpeedPass constraints injected into learning prompts include auditable structured JSON with ISO timestamps
