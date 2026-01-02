# Native Context & Screenshot Guide

Cognia's context awareness and screenshot capture features provide intelligent environment understanding and powerful screen capture capabilities, available exclusively in the desktop app.

## Overview

This guide covers two related native features:

**Context Awareness**:

- Automatic window and application detection
- File context for code editors
- Browser context (URL, domain, security)
- Editor context (language, line numbers, git branch)

**Screenshot Capture**:

- Multiple capture modes (fullscreen, window, region)
- OCR text extraction
- Searchable screenshot history
- Pin and organize screenshots

## Desktop App Required

**Important**: Context detection and screenshot features require the Cognia desktop app for system-level access.

### Why Desktop Only?

These features need access to:

- Window information and titles
- Process information
- Screen capture APIs
- OCR engines (Windows OCR)
- File system for screenshots

## Context Awareness

### What Context Detects

#### Window Information

Current active window details:

- **Window Title** - Title of the window
- **Application Name** - App that owns the window
- **Process ID** - System process identifier
- **Bounds** - Window position and size
- **Focused** - Whether window has focus

#### Application Context

Automatic application type detection:

**Browser**

- Chrome, Firefox, Edge, Safari
- Provides URL, domain, security info

**Code Editor**

- VS Code, IntelliJ, Vim, Emacs
- Provides file info, language, git branch

**Terminal**

- Terminal, PowerShell, iTerm2
- Provides command shell context

**Text Editor**

- Notepad, TextEdit, Sublime Text
- Provides file information

**IDE**

- Visual Studio, Xcode, PyCharm
- Provides project context

**Design Tool**

- Figma, Adobe Suite, Blender
- Provides design context

#### File Context

When working in code editors or text editors:

**File Information**:

- File path and name
- File extension
- Programming language (if code)
- Line count
- Encoding

**Project Information** (when available):

- Project name
- Project root path
- Project type (npm, cargo, maven, etc.)

**Git Information** (when available):

- Current branch
- Repository name
- Commit hash
- Working tree status (clean, modified)

**Editor State** (when available):

- Current line number
- Current column
- Cursor offset
- Selected text (if any)

#### Browser Context

When using web browsers:

**URL Information**:

- Full URL
- Protocol (http, https)
- Domain name
- Path

**Security Status**:

- HTTPS secure indicator
- Certificate validity
- Mixed content warnings

**Page Information**:

- Page title
- Page type classification

**Tab Information**:

- Current tab
- Tab index

#### Editor Context

For code editors and IDEs:

**Language Detection**:

- Programming language
- Dialect (TypeScript, JSX, etc.)
- File extension association

**Cursor Position**:

- Line number
- Column number
- Character offset

**Selection**:

- Start position (line, column)
- End position (line, column)
- Selected text

### How Context is Used

#### AI Assistance

Context awareness makes AI smarter:

**Example 1 - Code Context**:

```
You're editing: use-selection.ts
Line 42
Language: TypeScript
Git Branch: feature/native-tools

AI Response: "I see you're working on the selection
feature in TypeScript. Would you like me to explain
the handleAction function at line 42?"
```

**Example 2 - Browser Context**:

```
You're viewing: https://github.com/username/repo/issues/123
Domain: github.com
Page Type: Development

AI Response: "I can see you're looking at a GitHub issue.
Would you like help understanding the problem or
generating a fix?"
```

**Example 3 - File Context**:

```
You're editing: /home/user/project/src/utils.ts
Project: my-project
Language: TypeScript

AI Response: "I notice you're in the utils module of
your project. What would you like to work on?"
```

### Context Caching

Context data is cached for **500 milliseconds** to optimize performance:

**Benefits**:

- Reduces system calls
- Improves responsiveness
- Lower CPU usage

**Trade-off**:

- Slightly delayed updates (max 500ms)
- Acceptable for most use cases

**Configure Cache**:

1. Go to Settings → Native Tools → Context
2. Adjust "Cache Duration"
3. Options: 100ms, 500ms (default), 1000ms

### Platform Differences

Context detection varies by platform:

| Feature | Windows | macOS | Linux |
|---------|---------|-------|-------|
| Window Detection | ✅ Full | ✅ Full | ✅ Full |
| App Classification | ✅ Full | ✅ Full | ⚠️ Partial |
| File Context | ✅ Full | ✅ Full | ⚠️ Partial |
| Browser Context | ✅ Full | ❌ No | ❌ No |
| Editor Context | ✅ Full | ❌ No | ❌ No |
| Git Integration | ✅ Full | ⚠️ Partial | ⚠️ Partial |

**Legend**:

- ✅ Full - All features available
- ⚠️ Partial - Some features limited
- ❌ No - Feature not available

### Configuring Context

**Enable/Disable Context Detection**:

1. Go to Settings → Native Tools → Context
2. Toggle "Enable Context Detection"
3. Choose which context types to enable:
   - Window Information
   - Application Context
   - File Context
   - Browser Context
   - Editor Context

**Refresh Settings**:

- **Refresh Interval** (Default: 5 seconds)
  - How often to update context
  - Lower = more accurate, higher CPU
  - Higher = less accurate, lower CPU

**Privacy Settings**:

- **Capture Window Titles** (Default: On)
- **Capture URLs** (Default: Off - privacy)
- **Capture File Paths** (Default: Off - privacy)

## Screenshot Capture

### Capture Modes

#### Fullscreen Capture

Capture your entire screen or all screens.

**How to Use**:

1. Open Native Tools → Screenshot tab
2. Click "Full Screen" button
3. Screenshot captured immediately
4. OCR processed automatically (if enabled)

**Multi-Monitor Support**:

- Captures all monitors by default
- Or select specific monitor from dropdown

**Use Cases**:

- Capture full workspace
- Document entire state
- Create visual records
- Bug reporting

#### Window Capture

Capture the currently active window.

**How to Use**:

1. Switch to the window you want to capture
2. Open Native Tools → Screenshot tab
3. Click "Window" button
4. Active window captured

**Options**:

- Include window decorations (title bar, borders)
- Capture specific window by handle

**Use Cases**:

- Capture error dialogs
- Document application states
- Save window configurations
- Application-specific screenshots

#### Region Capture

Capture a specific region of the screen.

**Interactive Mode**:

1. Open Native Tools → Screenshot tab
2. Click "Region" button
3. Screen dims
4. Click and drag to select region
5. Release to capture

**Precise Mode**:

1. Click region settings
2. Enter exact coordinates
3. Specify width and height
4. Click capture

**Use Cases**:

- Capture specific UI elements
- Select portions of documents
- Crop screenshots precisely
- Diagram or chart capture

### OCR Text Extraction

Screenshots are automatically processed with OCR to extract text.

#### Basic OCR

Cross-platform OCR engine:

- **Languages**: Major Latin scripts
- **Accuracy**: Good for clear text
- **Speed**: Fast processing
- **Platforms**: All platforms

**Use For**:

- General text extraction
- Quick text searches
- Mixed-language content

#### Windows OCR (Windows Only)

Enhanced OCR for Windows:

- **Languages**: 100+ languages
- **Accuracy**: Excellent
- **Speed**: Fast with GPU acceleration
- **Features**:
  - Text regions detected
  - Word bounding boxes
  - Confidence scores
  - Multiple text blocks

**Use For**:

- Accurate text extraction
- Non-Latin languages (Chinese, Japanese, etc.)
- Complex layouts
- Low-quality images

**Choosing OCR Engine**:

1. Go to Settings → Native Tools → Screenshot
2. Select "OCR Engine"
3. Options:
   - Basic (All platforms)
   - Windows OCR (Windows only, recommended)

### Screenshot History

All screenshots are automatically saved and searchable.

#### History Entry

Each screenshot includes:

- **Timestamp** - When captured
- **File Path** - Location on disk
- **Dimensions** - Width and height
- **Capture Mode** - Fullscreen, window, or region
- **Application** - App that was captured
- **Window Title** - Active window when captured
- **OCR Text** - Extracted text
- **Pinned Status** - Whether pinned
- **Tags** - User-added tags
- **Notes** - User-added notes

#### Searching Screenshots

Full-text search across all screenshots:

**Search by Text**:

1. Open Native Tools → Screenshot tab
2. Enter search query in search box
3. Results appear instantly
4. Shows matched text and context

**Search Filters**:

- **Date Range** - Filter by capture date
- **Application** - Filter by app
- **Tags** - Filter by tags
- **Pinned Only** - Show only pinned

**Use Cases**:

- Find error message screenshots
- Locate diagram with specific text
- Search for documentation screenshots
- Find reference images

#### Pinning Screenshots

Pin important screenshots to keep them indefinitely:

**How to Pin**:

1. Find screenshot in history
2. Click pin icon
3. Screenshot is protected from cleanup

**Unpinning**:

1. Click pin icon again
2. Screenshot is unpinned
3. Subject to normal cleanup

**Use For**:

- Important error messages
- Reference diagrams
- Documentation screenshots
- Templates

#### Export & Import

**Export Screenshot**:

1. Right-click screenshot
2. Choose "Export"
3. Save to external location

**Export History**:

1. Click export button in screenshot tab
2. Choose format (JSON with metadata)
3. Save to file

**Import History**:

1. Click import button
2. Select previously exported JSON
3. History is restored

### Screenshot Settings

#### Capture Settings

**Default Format**:

- PNG - Lossless, larger files
- JPG - Lossy, smaller files
- WebP - Modern format, good compression

**Quality** (for JPG/WebP):

- Range: 1-100
- Higher = better quality, larger file
- Recommended: 85-95

**Include Cursor**:

- Show mouse cursor in screenshots
- Useful for tutorials and demos

**Auto-Save Directory**:

- Where screenshots are saved
- Default: User's Pictures folder
- Customizable location

#### OCR Settings

**Enable Auto OCR** (Default: On):

- Automatically extract text after capture
- Disable to save processing time

**OCR Language**:

- Auto-detect (default)
- Or specify language (e.g., English, Chinese)

**Preferred Engine**:

- Basic OCR (all platforms)
- Windows OCR (Windows only, more accurate)

**Copy Text to Clipboard**:

- Automatically copy extracted text
- Quick paste into other apps

#### History Settings

**Max History Size** (Default: 500):

- Maximum screenshots to keep
- Older screenshots removed when limit reached

**Auto-Cleanup** (Default: On):

- Automatically delete old screenshots
- Pinned screenshots always kept

**Search Indexing**:

- Index screenshots for search
- Disable to save disk space

### Organizing Screenshots

#### Adding Tags

Organize screenshots with tags:

1. Click screenshot in history
2. Click "Add Tag"
3. Enter tag name
4. Press Enter

**Common Tags**:

- #bugs - Error messages
- #docs - Documentation
- #refs - Reference material
- #ideas - Ideas and inspiration
- #templates - Reusable content

#### Adding Notes

Add notes to screenshots:

1. Click screenshot
2. Click "Add Note"
3. Enter note text
4. Save

**Use For**:

- Context information
- Action items
- Reminders
- Explanations

### Integration with AI

#### Screenshot + AI

Send screenshots to AI with context:

**Share with AI**:

1. Capture screenshot
2. Click "Share with Chat"
3. AI receives:
   - Screenshot image
   - Extracted text (OCR)
   - Capture context
   - Timestamp

**Example Interactions**:

```
User: [Shares screenshot of error message]
AI: "I can see an error message: 'Cannot find
module @/components/Button'. This suggests a
missing import or incorrect path. Would you
like me to help fix this?"
```

```
User: [Shares screenshot of code]
AI: "I can see TypeScript code for a React
component. The screenshot shows a Button
component with props: children, variant,
and onClick. Would you like me to explain
this code or help modify it?"
```

## Workflow Examples

### Software Development

**Scenario**: Debugging an error

1. **Screenshot the error message**
   - Use region capture to select error dialog
   - OCR extracts error text automatically

2. **Context detection activates**
   - Detects you're in VS Code
   - Identifies the file and line number
   - Captures git branch information

3. **Share with AI**
   - Screenshot + context sent to AI
   - AI understands the full picture
   - Provides targeted assistance

### Research & Learning

**Scenario**: Researching documentation

1. **Screenshot important information**
   - Capture diagrams, tables, code
   - OCR extracts text automatically

2. **Tag and organize**
   - Add #research tag
   - Add notes about relevance
   - Pin important screenshots

3. **Search later**
   - Search by extracted text
   - Find specific information quickly
   - Reference across sessions

### Design Work

**Scenario**: Collecting design references

1. **Screenshot designs**
   - Capture UI from websites
   - Capture designs from Figma
   - OCR extracts text content

2. **Organize by project**
   - Add project tags
   - Add notes about inspirations
   - Pin for easy access

3. **Search and reuse**
   - Search by color, element type
   - Find specific patterns
   - Build reference library

### Bug Reporting

**Scenario**: Documenting a bug

1. **Capture bug state**
   - Screenshot error message
   - Screenshot application state
   - Include browser context (URL)

2. **Add context**
   - OCR extracts error details
   - Context shows browser and URL
   - Notes describe reproduction steps

3. **Share with team**
   - Export screenshots with metadata
   - Include in bug report
   - Full context captured

## Tips & Tricks

### Context

1. **Trust the AI** - Context helps AI provide better assistance
2. **Check Context Panel** - See what's detected
3. **Customize Privacy** - Only capture what you're comfortable with
4. **Update Regularly** - Context refreshes every 5 seconds
5. **Multi-Monitor** - Context detects which monitor has focus

### Screenshots

1. **Use OCR Search** - Find anything in old screenshots
2. **Pin Important Ones** - Keep reference screenshots accessible
3. **Tag Liberally** - Makes search much more powerful
4. **Add Notes** - Context why you captured it
5. **Regular Cleanup** - Delete old screenshots to save space

### Productivity

1. **Keyboard Shortcuts** - Assign shortcuts for frequent captures
2. **Auto-Copy Text** - Extracted text copied to clipboard automatically
3. **Quick Share** - Share with AI directly from screenshot panel
4. **Organize Daily** - Spend 5 minutes organizing screenshots
5. **Export Weekly** - Backup important screenshots

## Troubleshooting

### Context Not Working

**Problem**: Context shows generic information

**Solutions**:

1. Check if context detection is enabled
2. Verify you're using supported application
3. Restart desktop app
4. Some features are Windows-only

**Problem**: Context not updating

**Solutions**:

1. Check refresh interval (may be too long)
2. Verify window is actually focused
3. Restart the application
4. Check if app is excluded

### Screenshot Issues

**Problem**: Screenshot not saving

**Solutions**:

1. Check save directory permissions
2. Verify available disk space
3. Try different save location
4. Check file name conflicts

**Problem**: OCR not working

**Solutions**:

1. Ensure auto-OCR is enabled
2. Try Windows OCR engine (if on Windows)
3. Check image quality (too blurry?)
4. Screenshot may not have text

**Problem**: Can't find old screenshot

**Solutions**:

1. Use search with extracted text
2. Check date filters
3. Verify not deleted by cleanup
4. Check if unpinned and old

### Performance Issues

**Problem**: System slow after many screenshots

**Solutions**:

1. Reduce history limit
2. Disable search indexing
3. Export and clear history
4. Use faster format (JPG instead of PNG)

## FAQ

**Q: Can I capture screenshots of specific apps?**
A: Yes, use window capture or switch to the app first.

**Q: Does OCR work with handwritten text?**
A: Windows OCR can handle some handwriting, but accuracy varies.

**Q: Can I capture screenshots from secure windows?**
A: Yes, but some protected content (DRM, banking) may appear black.

**Q: How much disk space do screenshots use?**
A: Depends on format and size. PNG is larger, JPG/WebP are smaller.

**Q: Is my screenshot data sent to the cloud?**
A: No, all screenshots are stored locally on your device.

**Q: Can I use screenshots in other apps?**
A: Yes, export them or copy from the save directory.

**Q: Does context detection work in games?**
A: Yes, but limited to window title and process name.

**Q: Can I disable OCR for privacy?**
A: Yes, disable auto-OCR in screenshot settings.

**Q: How do I delete all screenshots?**
A: Use "Clear All" in screenshot settings (be careful - can't undo!).

**Q: Can I change screenshot save location?**
A: Yes, configure in Settings → Native Tools → Screenshot.

## See Also

- [Native Tools Overview](native-tools.md) - All native tools
- [Native Selection Guide](native-selection.md) - Smart text selection
- [Native Awareness Guide](native-awareness.md) - System monitoring
- [Configuration Guide](configuration.md) - Settings and customization

---

**Last Updated**: December 26, 2024
