# Native Selection Guide

Cognia's Native Selection system provides intelligent text selection capabilities with AI-powered actions, available exclusively in the desktop app.

## Overview

The native selection system enhances your text selection experience across all applications with:

- **12 Smart Selection Modes** - Automatically expand selections intelligently
- **Floating Toolbar** - Quick actions appear when you select text
- **AI Integration** - Explain, translate, summarize with one click
- **Selection History** - Never lose an important selection
- **Clipboard Management** - Advanced clipboard with search and pinning

## Desktop App Required

**Important**: Native selection features are only available in the Cognia desktop app.

### Why Desktop Only?

The selection system requires system-level access to:
- Monitor global mouse events
- Detect text selections in any application
- Access system clipboard
- Show floating toolbar across apps

Web browsers cannot provide these capabilities due to security sandboxing.

## Getting Started

### Enabling Selection

1. Open Cognia desktop app
2. Go to **Settings** → **Native Tools** → **Selection**
3. Ensure **Enable Selection** is toggled on
4. Configure your preferences:
   - **Trigger Mode**: Auto (toolbar appears automatically) or Manual
   - **Text Length**: Minimum and maximum text length
   - **Delay**: How long to wait before showing toolbar
   - **Auto-hide**: Automatically hide toolbar after action

### Basic Usage

1. Select text in any application (browser, code editor, document, etc.)
2. The floating toolbar appears near your selection
3. Click an action:
   - **Copy** - Copy to clipboard
   - **Explain** - AI explains the text
   - **Translate** - Translate to another language
   - **Summarize** - Generate a summary
4. View the result in the toolbar

## Smart Selection Modes

Cognia provides 12 intelligent selection expansion modes:

### 1. Word Selection

Selects complete words.

**Example**:
- Selection: `hel` → Expands to: `hello`

**Best for**: Single word lookups, spell checking

### 2. Line Selection

Selects entire lines of text.

**Example**:
```
| This is line one|
| This is line two|
```
Selects one complete line.

**Best for**: Log file analysis, code review

### 3. Sentence Selection

Intelligently selects complete sentences using punctuation detection.

**Example**:
```
This is sentence one. This is sentence two.
```
Selects from `This` to `one.`

**Best for**: Document editing, text analysis

### 4. Paragraph Selection

Selects complete paragraphs using blank line detection.

**Best for**: Document review, content organization

### 5. Code Block Selection

Detects and selects complete code blocks with language-specific syntax.

**Supported Languages**:
- JavaScript/TypeScript
- Python
- Rust
- Go
- Java
- C/C++
- And more...

**Example**:
```python
def hello():
    print("Hello, World!")
```
Selects the entire function.

**Best for**: Code review, documentation

### 6. Function Selection

Selects entire functions with bracket matching.

**Example**:
```typescript
function myFunction(param: string) {
  const result = param.toUpperCase();
  return result;
}
```
Selects from `function` to closing `}`

**Best for**: Code understanding, refactoring

### 7. Bracket Matching

Selects content between matching brackets.

**Supported Brackets**:
- Parentheses: `()`
- Square brackets: `[]`
- Curly braces: `{}`
- Angle brackets: `<>`

**Example**:
```
const data = { key: 'value', nested: { item: 1 } }
```
If you select `key: 'value'`, it expands to `{ key: 'value' }`

**Best for**: JSON/JSONC editing, object manipulation

### 8. Quote Matching

Selects content between matching quotes.

**Supported Quotes**:
- Single quotes: `'`
- Double quotes: `"`
- Backticks: `` ` ``

**Example**:
```
const text = "Hello, World!"
```
Selects `Hello, World!`

**Best for**: String editing, template literals

### 9. URL Detection

Intelligently selects complete URLs.

**Example**:
```
Visit https://example.com/path/to/page?param=value for more info
```
Selects the entire URL.

**Best for**: Link extraction, URL sharing

### 10. Email Detection

Selects complete email addresses.

**Example**:
```
Contact support@example.com for help
```
Selects `support@example.com`

**Best for**: Email extraction, contact management

### 11. File Path Detection

Selects complete file paths.

**Supported Formats**:
- Windows: `C:\Users\Name\Documents\file.txt`
- Unix: `/home/user/documents/file.txt`
- UNC: `\\server\share\path\file.txt`

**Best for**: File operations, path sharing

### 12. Auto-Expand (Recommended)

Automatically determines the best expansion mode based on context.

**How it works**:
1. Analyzes selected text
2. Detects patterns (URL, email, file path)
3. Considers surrounding context
4. Chooses optimal expansion mode

**Best for**: General use - covers most scenarios

## Floating Toolbar

The floating toolbar provides quick actions when you select text.

### Toolbar Layout

```
┌─────────────────────────────────────┐
│  [Copy] [Explain] [Translate] [...] │
└─────────────────────────────────────┘
```

### Available Actions

#### Copy

Copy selected text to clipboard.

**When to use**: Quick copy without keyboard shortcuts

#### Explain

AI explains the selected text.

**Features**:
- Understands code with language detection
- Explains technical concepts
- Provides context-aware explanations
- Includes surrounding context when available

**Best for**:
- Understanding code snippets
- Learning new concepts
- Clarifying technical documentation
- Explaining error messages

**Example Output**:
```
Selected: "const arr = [1, 2, 3];"

Explanation:
This declares a constant variable named 'arr' containing an array
of three numbers: 1, 2, and 3. In JavaScript, arrays are ordered
lists that can hold multiple values.
```

#### Translate

Translates selected text to another language.

**Features**:
- Auto-detects source language
- Supports multiple target languages
- Preserves formatting
- Context-aware translation

**Supported Languages**:
- English ↔ Chinese
- English ↔ Spanish
- English ↔ French
- English ↔ German
- English ↔ Japanese
- And more...

**Best for**:
- Multilingual communication
- Document translation
- Learning languages
- Understanding foreign content

#### Summarize

Generates a concise summary of selected text.

**Features**:
- Extracts key points
- Maintains important details
- Handles long texts
- Preserves meaning

**Best for**:
- Article summaries
- Meeting notes
- Research papers
- Documentation review

### Additional Actions

Click the `...` button for more actions:
- **Rewrite** - Rewrite in different style
- **Extract Key Points** - Bullet point summary
- **Find Similar** - Search for similar content
- **Search Web** - Web search for selection

## Selection History

Never lose an important selection with automatic history tracking.

### History Features

#### Automatic Recording

All selections are automatically recorded with:
- Selected text
- Action performed
- AI result (if applicable)
- Application name
- Timestamp
- Metadata (language, file type, etc.)

#### Search History

Search your selection history by:
- **Text content** - Full-text search
- **Application** - Selections from specific apps
- **Type** - Code, text, URL, email, etc.
- **Date range** - Filter by time period

**How to Search**:
1. Open Native Tools → Clipboard tab
2. Click search icon
3. Enter search query
4. Results appear instantly

#### Statistics

View your selection statistics:
- Total selections
- Selections by application
- Selections by type
- Most common words
- Daily trends

**Access**: Native Tools → Clipboard → Statistics

#### Export & Import

**Export History**:
1. Go to Native Tools → Clipboard
2. Click export button
3. Choose JSON format
4. Save to file

**Import History**:
1. Click import button
2. Select previously exported JSON file
3. History is restored

### Privacy Controls

**Clear History**:
- Clear all history
- Clear by date range
- Clear specific entries
- Auto-cleanup after X days

**Exclude Applications**:
- Don't record selections from specific apps
- Useful for sensitive applications (password managers, etc.)

## Clipboard History

Advanced clipboard management beyond simple copy-paste.

### Features

#### Multi-Format Support

Clipboard history supports:
- **Text** - Plain text and rich text
- **HTML** - Formatted text from web browsers
- **Images** - Screenshots and copied images
- **Files** - Copied file paths

#### Automatic Recording

Every clipboard change is automatically captured:
- Text you copy
- Images you copy
- Files you copy
- Timestamped entries

#### Pinning

Pin important clipboard entries to keep them indefinitely:

**How to Pin**:
1. Open clipboard history
2. Find the entry
3. Click pin icon
4. Entry is protected from auto-cleanup

**Best for**:
- Frequently used code snippets
- Important URLs
- Template text
- Regular expressions

#### Duplicate Detection

Intelligent duplicate detection:
- Skips identical copies within 5 seconds
- Hash-based detection
- Prevents clutter

#### Preview

Quick preview of clipboard entries:
- Text preview (first 100 characters)
- Image thumbnails
- File names and counts

### Clipboard Actions

#### Copy Entry

Copy any historical entry back to clipboard:
1. Click on entry in history
2. Click "Copy to Clipboard"
3. Paste anywhere

#### Delete Entry

Remove individual entries:
1. Hover over entry
2. Click delete icon
3. Entry is removed immediately

#### Clear Unpinned

Remove all unpinned entries at once:
1. Go to clipboard settings
2. Click "Clear Unpinned"
3. Only pinned entries remain

## Configuration

### Access Settings

1. Open Cognia desktop app
2. Go to **Settings**
3. Select **Native Tools** tab
4. Configure **Selection** options

### Selection Settings

#### General Settings

**Enable Selection** (Default: On)
- Master toggle for selection features
- Turn off to disable all selection monitoring

**Trigger Mode**
- **Auto** (Recommended): Toolbar appears automatically
- **Manual**: Press keyboard shortcut to show toolbar

**Auto-hide Toolbar** (Default: On)
- Automatically hide toolbar after action
- Keep on if you prefer manual dismissal

#### Text Limits

**Minimum Text Length** (Default: 1 character)
- Minimum characters before toolbar shows
- Prevents toolbar for accidental clicks

**Maximum Text Length** (Default: 10,000 characters)
- Maximum characters for selection
- Prevents performance issues with large selections

**Delay** (Default: 1000ms)
- Time to wait before showing toolbar
- Prevents toolbar during drag-selection
- Lower = faster, Higher = less intrusive

### History Settings

#### Selection History

**Enable History** (Default: On)
- Record all selections
- Turn off to disable recording

**Max Entries** (Default: 100)
- Maximum selections to keep
- Older entries removed automatically

**Retention Days** (Default: 30)
- How long to keep history
- Auto-cleanup after X days

#### Clipboard History

**Enable Clipboard Monitoring** (Default: On)
- Monitor clipboard changes
- Turn off to disable

**Max Entries** (Default: 50)
- Maximum clipboard entries
- Fewer entries = less memory usage

**Auto-cleanup Old Entries** (Default: On)
- Automatically remove old entries
- Keep pinned entries

### Privacy Settings

#### What to Record

**Record Application Names** (Default: On)
- Track which app you're using
- Useful for statistics

**Record Window Titles** (Default: Off)
- More detailed tracking
- May contain sensitive information

**Record File Names** (Default: Off)
- Track specific files
- Privacy consideration

**Excluded Applications**
- Don't record from these apps
- Add password managers, etc.

## Tips & Tricks

### Productivity Tips

1. **Use Auto-Expand Mode** - Let Cognia choose the best selection
2. **Pin Frequently Used Clips** - Keep common code snippets accessible
3. **Search Clipboard History** - Find that thing you copied yesterday
4. **Keyboard Shortcuts** - Use shortcuts for faster access
5. **Configure Sensitivity** - Adjust delay and text length to your preference

### Code Development

1. **Function Selection** - Select entire functions quickly
2. **Explain Selection** - Understand unfamiliar code
3. **Code Snippets** - Pin common patterns
4. **Multi-Language Support** - Works with any programming language
5. **Context-Aware** - Knows the language you're working in

### Research & Writing

1. **Sentence Selection** - Extract complete sentences
2. **Summarize Selections** - Quick summaries of articles
3. **Translate Text** - Read foreign language content
4. **Selection History** - Never lose an important quote
5. **Citation Tracking** - Track source of selections

### Everyday Use

1. **URL Detection** - Select complete URLs easily
2. **Email Extraction** - Grab email addresses
3. **Address Selection** - Extract addresses and phone numbers
4. **Quick Actions** - One-click explain and translate
5. **Clipboard Management** - Never overwrite your clipboard

## Troubleshooting

### Toolbar Not Appearing

**Problem**: Toolbar doesn't show when selecting text

**Solutions**:
1. Check if selection is enabled in settings
2. Verify text length is within limits
3. Adjust delay setting (try 500ms)
4. Ensure desktop app is running
5. Check trigger mode (auto vs manual)

### Selection Not Recorded

**Problem**: Selections not appearing in history

**Solutions**:
1. Enable history recording in settings
2. Check if application is excluded
3. Verify history limit not reached
4. Clear old entries if limit reached
5. Check privacy settings

### Clipboard Not Working

**Problem**: Clipboard history not updating

**Solutions**:
1. Enable clipboard monitoring in settings
2. Restart desktop app
3. Check if another app is monopolizing clipboard
4. Verify clipboard permissions
5. Clear clipboard history and try again

### AI Actions Failing

**Problem**: Explain/translate not working

**Solutions**:
1. Check AI provider configuration
2. Verify API key is valid
3. Ensure internet connection
4. Try simpler selection first
5. Check error message in toolbar

### Performance Issues

**Problem**: System slow when selecting text

**Solutions**:
1. Increase delay setting (1500ms or more)
2. Reduce history limit
3. Disable unused features
4. Check for conflicting apps
5. Restart desktop app

## FAQ

**Q: Does selection work in all applications?**
A: Yes, selection monitoring works across all applications on your system.

**Q: Are my selections sent to the cloud?**
A: No, all selection data stays on your device. Only AI actions (explain/translate) use the cloud.

**Q: Can I customize toolbar actions?**
A: Currently toolbar actions are fixed. Custom actions may be added in future updates.

**Q: How long is history kept?**
A: Configurable, defaults to 30 days. You can change this in settings.

**Q: Does selection work with non-Latin languages?**
A: Yes, selection works with any language. Some smart modes (sentence, paragraph) are optimized for Latin scripts.

**Q: Can I export my selection history?**
A: Yes, use the export button to download history as JSON.

**Q: Does clipboard history support images?**
A: Yes, images are captured and can be previewed, searched, and managed.

**Q: What happens when history limit is reached?**
A: Oldest entries are automatically removed to make room for new ones. Pinned entries are never removed.

**Q: Can I search by date?**
A: Yes, use the date filter in the search interface.

**Q: Is there a keyboard shortcut to show toolbar?**
A: Yes, configure a global shortcut in settings for manual trigger mode.

## See Also

- [Native Tools Overview](native-tools.md) - All native tools
- [Native Awareness Guide](native-awareness.md) - System monitoring
- [Native Context & Screenshot Guide](native-context-screenshot.md) - Context and screenshots
- [Configuration Guide](configuration.md) - Settings and customization

---

**Last Updated**: December 26, 2024
