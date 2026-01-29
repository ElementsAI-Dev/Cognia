# Homepage Simplified Mode Optimization Plan

## Execution Summary

Enhanced the homepage simplified mode to provide a ChatGPT-like experience while maintaining full functionality. Users can now easily switch between full and simplified modes, change chat modes (Chat/Agent/Research/Learning), and see the current AI model being used.

## Changes Implemented

### 1. Enhanced SimplifiedWelcome Component
**File**: `@/components/chat/welcome/simplified-welcome.tsx`

**New Features**:
- **Mode Switcher Dropdown**: ChatGPT-style dropdown to switch between Chat, Agent, Research, and Learning modes
- **Model Indicator**: Badge showing current AI model and provider (e.g., "openai / gpt-4o")
- **Full Mode Toggle**: Button to quickly switch back to the full interface
- **Simplified Mode Indicator**: Subtle text showing current preset (Focused/Zen) with keyboard shortcut hint
- **Improved Animations**: Staggered fade-in animations for a polished feel

**Props Added**:
- `onModeChange?: (mode: ChatMode) => void` - Callback for mode switching
- `modelName?: string` - Current AI model name
- `providerName?: string` - Current AI provider name

### 2. Updated WelcomeState Component
**File**: `@/components/chat/welcome/welcome-state.tsx`

**Changes**:
- Added `modelName` and `providerName` props to interface
- Passes these props to SimplifiedWelcome when in focused/zen mode

### 3. Updated ChatContainer Component  
**File**: `@/components/chat/core/chat-container.tsx`

**Changes**:
- Passes `currentModel` and `currentProvider` to WelcomeState

## Mode Switching Behavior

### Simplified Mode Presets

| Preset | Description | Mode Selector Visible |
|--------|-------------|----------------------|
| `off` | Full interface with all features | N/A (uses WelcomeState) |
| `minimal` | Light simplification | Uses WelcomeState |
| `focused` | ChatGPT-like clean experience | ✅ Yes (dropdown) |
| `zen` | Ultra-minimal, distraction-free | Respects `hideModeSelector` setting |

### Keyboard Shortcuts
- **Ctrl+Shift+S**: Toggle between full and simplified mode

## UI Layout (Simplified Mode)

```
┌─────────────────────────────────────────────────┐
│ [Model Badge]                    [Full Mode] ⬜ │
├─────────────────────────────────────────────────┤
│                                                 │
│                    ✨                           │
│              (Sparkles Icon)                    │
│                                                 │
│         How can I help you today?               │
│    Ask me anything or choose a suggestion       │
│                                                 │
│              [ Chat ▼ ]                         │
│           (Mode Dropdown)                       │
│                                                 │
│  ┌─────────────────┐  ┌─────────────────┐      │
│  │ Suggestion 1    │  │ Suggestion 2    │      │
│  └─────────────────┘  └─────────────────┘      │
│  ┌─────────────────┐  ┌─────────────────┐      │
│  │ Suggestion 3    │  │ Suggestion 4    │      │
│  └─────────────────┘  └─────────────────┘      │
│                                                 │
│     Type a message or press [↑] to send         │
│                                                 │
│   Focused Mode • Press Ctrl+Shift+S for full   │
└─────────────────────────────────────────────────┘
```

## Backward Compatibility

All existing functionality is preserved:
- ✅ Full mode works exactly as before
- ✅ Minimal preset uses standard WelcomeState
- ✅ All settings in SimplifiedModeSettings are respected
- ✅ Mode switching works in both full and simplified modes
- ✅ Template selection continues to work in full mode

## Testing Verification

1. **Mode Toggle**: Switch between Chat/Agent/Research/Learning in simplified mode
2. **Full Mode Toggle**: Click "Full Mode" button to exit simplified mode
3. **Model Display**: Verify model badge shows correct provider/model
4. **Keyboard Shortcut**: Press Ctrl+Shift+S to toggle modes
5. **Suggestion Click**: Click suggestions to start conversation
6. **Preset Switching**: Toggle between off/minimal/focused/zen presets

## Files Modified

| File | Lines Changed | Description |
|------|---------------|-------------|
| `components/chat/welcome/simplified-welcome.tsx` | +120 | Enhanced with mode switcher, model badge, full mode toggle |
| `components/chat/welcome/welcome-state.tsx` | +6 | Added new props for model info |
| `components/chat/core/chat-container.tsx` | +2 | Pass model info to WelcomeState |

## Future Enhancements

### Potential Improvements
- [ ] Add model picker in simplified mode (currently view-only)
- [ ] Internationalization for mode labels
- [ ] Custom greeting messages per mode in simplified view
- [ ] Animation preferences (reduce motion support)

## Date
2025-01-29
