# Native Tools Guide

Cognia's native tools provide desktop-exclusive features that enhance your productivity through system-level integration. These features are available only in the desktop app (Tauri build).

## Overview

Native tools leverage Tauri's system-level access to provide capabilities beyond web browser limitations:

- **Smart Selection** - Intelligent text selection with AI-powered actions
- **System Awareness** - Real-time system monitoring and productivity tracking
- **Context Detection** - Automatic understanding of your current environment
- **Screenshot Capture** - Advanced screenshots with OCR text extraction

## Desktop App Requirement

**Important**: Native tools are only available in the desktop app. Download and install the desktop app to access these features.

### Checking Your Environment

When you open Cognia in a web browser, you'll see a message directing you to download the desktop app. The native tools page will display:

> "Native tools are only available in the desktop app. Download the desktop app to access clipboard history, screenshots, focus tracking, and context awareness."

### Accessing Native Tools

Once you have the desktop app installed:

1. Open Cognia desktop app
2. Navigate to **Native Tools** from the main menu or sidebar
3. Choose from the available tools:
   - **Clipboard** - Clipboard history management
   - **Screenshot** - Screenshot capture and OCR
   - **Focus** - Focus tracking and productivity insights
   - **Context** - Real-time context awareness

## Platform Support

Native tools work across different platforms with varying feature support:

| Feature | Windows | macOS | Linux |
|---------|---------|-------|-------|
| Smart Selection | ✅ Full | ✅ Full | ✅ Full |
| Clipboard History | ✅ Full | ✅ Full | ✅ Full |
| System Monitoring | ✅ Full | ✅ Full | ✅ Full |
| Battery Monitoring | ✅ Full | ✅ Full | ❌ No |
| Context Detection | ✅ Full | ⚠️ Partial | ⚠️ Partial |
| Screenshot Capture | ✅ Full | ✅ Full | ✅ Full |
| Windows OCR | ✅ Enhanced | ❌ No | ❌ No |
| Basic OCR | ✅ Basic | ✅ Basic | ✅ Basic |

**Legend**:

- ✅ Full - All features available
- ⚠️ Partial - Some features limited
- ❌ No - Feature not available

## Feature Matrix

### Smart Selection

**What it does**: Intelligently expands text selections and provides quick AI actions

**Key capabilities**:

- 12 smart selection modes (word, sentence, paragraph, code block, function, etc.)
- Floating toolbar with quick actions
- AI-powered explain, translate, and summarize
- Selection history with search
- Clipboard history management

**Use cases**:

- Quickly explain code snippets
- Translate text without leaving your app
- Summarize selected content
- Copy and manage clipboard history

**Learn more**: [Native Selection Guide](native-selection.md)

### System Awareness

**What it does**: Monitors your system and tracks your productivity

**Key capabilities**:

- Real-time CPU, memory, disk, and battery monitoring
- Activity tracking (text selection, screenshots, app switches, etc.)
- Smart suggestions based on system state
- Focus tracking with productivity insights
- Application usage statistics

**Use cases**:

- Monitor system resources
- Track your focus sessions
- Get productivity insights
- Receive system health warnings
- Understand your work patterns

**Learn more**: [Native Awareness Guide](native-awareness.md)

### Context Detection

**What it does**: Automatically detects and understands your current environment

**Key capabilities**:

- Active window and application detection
- File context (for code editors)
- Browser context (URL, domain, security)
- Editor context (language, line numbers, git branch)
- 500ms caching for optimal performance

**Use cases**:

- AI understands what you're working on
- Context-aware suggestions
- Automatic project detection
- Browser-aware assistance

**Learn more**: [Native Context & Screenshot Guide](native-context-screenshot.md)

### Screenshot Capture

**What it does**: Advanced screenshot capture with OCR text extraction

**Key capabilities**:

- Multiple capture modes (fullscreen, window, region)
- OCR text extraction (basic + Windows OCR)
- Searchable screenshot history
- Pin important screenshots
- Export and share screenshots

**Use cases**:

- Capture error messages with automatic text extraction
- Save important information from any app
- Search screenshots by content
- Build a visual knowledge base
- Share screenshots with context

**Learn more**: [Native Context & Screenshot Guide](native-context-screenshot.md)

## Configuration

All native tools can be configured through the settings panel:

### Accessing Settings

1. Open Cognia desktop app
2. Go to **Settings** (gear icon)
3. Navigate to **Native Tools** tab
4. Configure individual tools

### Configuration Options

#### Selection Settings

- **Enable/Disable** - Turn smart selection on/off
- **Trigger Mode** - Auto-show or manual trigger
- **Text Length Limits** - Min/max text length for toolbar
- **Delay** - Time before toolbar appears
- **Auto-hide** - Automatically hide toolbar after action

#### Awareness Settings

- **Enable Monitoring** - Turn system monitoring on/off
- **Refresh Interval** - How often to update system state
- **Activity Tracking** - Enable/disable activity recording
- **Focus Tracking** - Track application usage
- **Privacy Controls** - Choose what data to record

#### Screenshot Settings

- **Capture Format** - PNG, JPG, or WebP
- **Image Quality** - Quality level for JPG/WebP
- **Include Cursor** - Show mouse cursor in screenshots
- **Auto OCR** - Automatically extract text after capture
- **OCR Engine** - Basic or Windows OCR (Windows only)
- **History Limit** - Maximum screenshots to keep

## Privacy & Security

### Data Storage

All native tools data is stored **locally on your device**:

- ✅ No cloud sync
- ✅ No external data transmission
- ✅ No telemetry or analytics
- ✅ You control your data

### Data Management

You can manage your data at any time:

**Clear History**:

- Selection history
- Clipboard history
- Activity logs
- Screenshot history
- Focus tracking data

**Export Data**:

- Selection history as JSON
- Screenshot metadata
- Activity statistics
- Productivity reports

**Privacy Controls**:

- Disable specific features
- Choose what data to record
- Exclude sensitive applications
- Auto-cleanup old entries

### Security Considerations

**What native tools need**:

- Clipboard access (for clipboard history)
- Screen capture (for screenshots)
- Window information (for context detection)
- Global mouse events (for selection detection)

**How we protect you**:

- All processing happens locally
- No data leaves your device
- No network access for native features
- Open-source implementation (auditable)

## Performance Impact

Native tools are designed to have minimal performance impact:

### Resource Usage

| Tool | CPU Usage | Memory | Disk I/O |
|------|-----------|--------|----------|
| Selection | Event-driven | ~5-10 MB | None |
| Awareness | ~1% every 10s | ~2-5 MB | None |
| Context | On-demand | ~1-3 MB | None |
| Screenshot | During capture only | ~10-50 MB | When saving |

### Optimizations

- **Duplicate Detection**: Skips identical entries within time windows
- **Lazy Loading**: History loaded only when needed
- **Size Limits**: Automatic cleanup of old entries
- **Event Throttling**: Prevents excessive processing
- **Caching**: Context data cached for 500ms

## Troubleshooting

### Native Tools Not Available

**Problem**: "Desktop app required" message in web browser

**Solution**: Native tools are desktop-only features. Download and install the Cognia desktop app.

### Clipboard History Not Working

**Problem**: Clipboard history not recording entries

**Solutions**:

1. Check if clipboard monitoring is enabled in settings
2. Ensure Cognia desktop app is running
3. Restart the desktop app
4. Check if another app is monopolizing the clipboard

### Screenshots Not Saving

**Problem**: Screenshots fail to save

**Solutions**:

1. Check screenshot directory in settings
2. Ensure write permissions for the directory
3. Check available disk space
4. Try a different screenshot format

### Context Detection Not Working

**Problem**: Context shows generic information

**Solutions**:

1. Context detection is Windows-only for browser/editor features
2. Make sure you're using a supported application
3. Restart the desktop app
4. Check if context detection is enabled in settings

### System Monitoring Inaccurate

**Problem**: System stats showing incorrect values

**Solutions**:

1. Refresh interval may be too long - decrease it in settings
2. Some features (battery) are platform-specific
3. Restart the desktop app to reset monitoring

## Best Practices

### For Productivity

1. **Enable Focus Tracking** - Understand your work patterns
2. **Use Smart Selection** - Quickly get AI assistance on any text
3. **Leverage OCR** - Search screenshots by content
4. **Review Activity Stats** - Identify productivity trends
5. **Configure Privacy** - Balance insights with privacy preferences

### For Development

1. **Code Context** - Use selection explain for code understanding
2. **Screenshot Errors** - Capture error messages with automatic OCR
3. **Clipboard History** - Never lose copied code snippets
4. **Focus Sessions** - Track coding sessions and productivity
5. **Context Awareness** - AI knows your current project/file

### For Research

1. **Clip Important Info** - Use selection to capture key points
2. **Screenshot Sources** - Build visual reference library
3. **OCR Search** - Find screenshots by extracted text
4. **Activity Timeline** - Track research progress
5. **Summarize Selections** - AI summaries of selected text

## Keyboard Shortcuts

Native tools support various keyboard shortcuts (desktop app):

### Global Shortcuts

- `Ctrl+Shift+S` - Start region selection screenshot
- `Ctrl+Shift+F` - Capture fullscreen screenshot
- `Ctrl+Shift+C` - Open clipboard history
- `Ctrl+Shift+A` - Open native tools panel

### In-App Shortcuts

- `Ctrl+K` - Focus search (works with selection history)
- `Ctrl+Shift+N` - New focus session
- `Ctrl+Shift+D` - View daily statistics

*Note: Shortcuts can be customized in settings*

## Integration with AI Features

Native tools seamlessly integrate with Cognia's AI capabilities:

### Context-Aware Responses

The AI uses context detection to provide better responses:

- Knows what file you're editing
- Understands your current project
- Aware of browser context
- Provides relevant suggestions

### Selection Actions

Selected text can be sent to AI with full context:

- Explains code with language detection
- Translates with source language awareness
- Summarizes with document type consideration

### Screenshot AI

Screenshots shared with AI include:

- Extracted text from OCR
- Capture context (window, app, website)
- Timestamp and metadata
- Searchable history

## FAQ

**Q: Are native tools available in the web version?**
A: No, native tools require the desktop app due to system-level access requirements.

**Q: Does Cognia upload my screenshots or clipboard content?**
A: No, all data stays on your device. Nothing is uploaded to any server.

**Q: Can I disable specific native tools?**
A: Yes, each tool can be individually enabled/disabled in settings.

**Q: How much disk space do screenshots use?**
A: Depends on format and quantity. PNG files are larger than JPG/WebP. Configure history limits in settings.

**Q: Will context detection work with any application?**
A: Context detection works best with popular applications (browsers, code editors, office apps). Some features are Windows-only.

**Q: How accurate is the OCR?**
A: Windows OCR is highly accurate for Latin languages. Basic OCR works across platforms but may be less accurate.

**Q: Can I export my data?**
A: Yes, all history can be exported as JSON for backup or analysis.

**Q: Does focus tracking impact privacy?**
A: Focus tracking only records application names and window titles. You can disable it or exclude specific apps.

**Q: How do I report issues with native tools?**
A: Open an issue on GitHub with details about your platform and steps to reproduce.

## See Also

- [Native Selection Guide](native-selection.md) - Deep dive into smart selection
- [Native Awareness Guide](native-awareness.md) - System monitoring details
- [Native Context & Screenshot Guide](native-context-screenshot.md) - Context and screenshots
- [Configuration Guide](configuration.md) - Settings and customization
- [Desktop Development](development/building.md) - Building the desktop app

---

**Last Updated**: December 26, 2024
