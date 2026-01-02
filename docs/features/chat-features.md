# Chat Features Guide

Cognia provides a comprehensive chat interface with multiple modes, advanced input options, and powerful conversation management features.

## Chat Modes

Cognia offers four distinct chat modes optimized for different use cases.

### 1. Chat Mode

Standard conversational AI for general tasks.

**Best For**:

- General questions and answers
- Brainstorming ideas
- Everyday assistance
- Casual conversations
- Quick explanations

**Features**:

- Natural conversation flow
- Context awareness
- Tool calling support
- Custom instructions application

**Default Model**: Auto-selected based on task complexity

**How to Use**:

1. Click mode selector in chat header
2. Select **Chat** from dropdown
3. Start typing your message

### 2. Agent Mode

Autonomous agent that can use tools and perform multi-step tasks.

**Best For**:

- Complex multi-step tasks
- Research and analysis
- Code generation with execution
- Data processing workflows
- Automated workflows

**Features**:

- Tool calling (web search, file operations, code execution)
- Step-by-step reasoning
- Task decomposition
- Progress visualization
- Error recovery

**Visualization**:

- Agent Steps panel shows execution progress
- Tool invocations displayed in real-time
- Completion status tracking

**How to Use**:

1. Select **Agent** mode from mode selector
2. Describe your task
3. Agent will plan and execute steps
4. Monitor progress in Agent Steps panel

**Example Prompt**:

```
Research the latest React best practices, create a component following those practices, and write unit tests for it.
```

### 3. Research Mode

Deep research with web search and citation capabilities.

**Best For**:

- Academic research
- Fact-checking
- Market analysis
- Competitive analysis
- Literature reviews

**Features**:

- Web search integration (Tavily, Brave, Google)
- Source citation
- Multi-source synthesis
- Reference management
- Export to citations

**Search Providers**:

- Tavily (default)
- Brave Search
- Google Search
- Perplexity

**How to Use**:

1. Select **Research** mode
2. Configure search providers in Settings > Search
3. Ask research questions
4. Review cited sources

**Example Prompt**:

```
Compare the performance characteristics of PostgreSQL vs MySQL for read-heavy workloads, with sources from the last 12 months.
```

### 4. Learning Mode

Socratic teaching method for interactive learning.

**Best For**:

- Learning new topics
- Skill development
- Concept understanding
- Problem-solving practice
- Test preparation

**Features**:

- Socratic questioning approach
- Step-by-step guidance
- Hints instead of answers
- Progress tracking
- Adaptive difficulty

**How It Works**:
AI guides learning through questions rather than direct answers, helping you discover solutions yourself.

**Example Prompt**:

```
Help me understand recursion in programming. Don't just show me examples, guide me through understanding how it works.
```

## Conversation Branching

Create alternative conversation paths to explore different directions.

### Creating Branches

1. Hover over any message in the conversation
2. Click the branch icon that appears
3. Enter a name for the new branch
4. Conversation splits from that point

### Managing Branches

**View Branches**:

- Branch selector appears in chat header when branches exist
- Shows current branch name
- Displays branch count

**Switch Branches**:

1. Click branch selector in header
2. Select branch from dropdown
3. Conversation updates to show that branch

**Branch Metadata**:

- Name: Custom branch label
- Parent: Original branch it split from
- Message Count: Number of messages in branch
- Created At: Timestamp of creation
- Active Status: Currently selected branch

### Use Cases

- Explore different solutions to a problem
- Test alternative approaches
- A/B test responses
- Separate topics from same context
- Parallel conversations

### Deleting Branches

1. Switch to branch you want to delete
2. Click **More** menu in chat header
3. Select **Delete Branch**
4. Confirm deletion

**Note**: Deleting a branch removes all messages unique to that branch.

## Voice Input

Use speech-to-text for hands-free message input.

### Enabling Voice Input

**Requirements**:

- Web Speech API support (Chrome, Edge, Safari)
- Microphone permission

**Setup**:

1. Go to **Settings** > **Speech**
2. Enable **Speech-to-Text**
3. Select language (English, Chinese)
4. Choose provider (Browser Default, Google Cloud)
5. Configure continuous mode if desired

### Using Voice Input

1. Click microphone icon in chat input
2. Speak your message
3. Click again or wait for auto-stop
4. Transcribed text appears in input
5. Edit if needed, then send

### Voice Input Modes

**Single Sentence**:

- Click mic, speak one sentence
- Auto-stops after pause
- Best for quick messages

**Continuous Mode**:

- Mic stays on after each sentence
- Keeps transcribing until stopped
- Best for longer dictation
- Enable in Settings > **Continuous Mode**

**Auto-Send**:

- Automatically sends after each sentence
- For faster conversations
- Enable in Settings > **Auto-Send**

### Language Support

- English (US, UK, Australian, Indian)
- Chinese (Simplified, Traditional)

Add more languages in Settings > **Speech Language**

### Visual Feedback

- **Pulsing indicator**: Listening active
- **Waveform visualization**: Audio level
- **Live transcription**: Real-time text display
- **Error messages**: Clear feedback on issues

### Troubleshooting Voice Input

**Microphone Not Working**:

- Check browser permissions
- Ensure mic is not in use by another app
- Try different browser (Chrome/Edge recommended)

**Poor Transcription**:

- Speak clearly and at moderate pace
- Reduce background noise
- Get closer to microphone
- Try continuous mode for better accuracy

## File Upload and Drag-Drop

Attach files to conversations for AI analysis and processing.

### Supported File Types

**Documents**:

- PDF (.pdf)
- Word (.docx)
- Plain text (.txt)
- Markdown (.md)
- RTF (.rtf)

**Spreadsheets**:

- CSV (.csv)
- Excel (.xlsx)

**Code**:

- All programming language files
- Jupyter notebooks (.ipynb)
- Config files (.json, .yaml, .xml)

**Images**:

- PNG (.png)
- JPEG (.jpg, .jpeg)
- GIF (.gif)
- WebP (.webp)
- BMP (.bmp)

**Archives**:

- ZIP (.zip) - extracts and analyzes contents

### Upload Methods

**Click to Upload**:

1. Click attachment/paperclip icon in chat input
2. Select file from file picker
3. Wait for upload to complete
4. File appears as attachment preview

**Drag and Drop**:

1. Drag file from file manager
2. Drop onto chat input area
3. Auto-uploads with visual feedback
4. Shows file preview

**Clipboard Paste**:

1. Copy file (Ctrl/Cmd+C)
2. Paste in chat input (Ctrl/Cmd+V)
3. File auto-uploads

**Multiple Files**:

- Select multiple files at once
- All files upload simultaneously
- Individual progress indicators
- Remove individual files before sending

### File Limits

Configure in Settings > **Upload Settings**:

- **Max Files**: Maximum files per message (default: 10)
- **Max Size**: Maximum file size in MB (default: 50MB)
- **Allowed Types**: Restrict file types if needed

### File Processing

**Automatic Processing**:

- Text extraction from documents
- OCR for images (text extraction)
- Data parsing from spreadsheets
- Code syntax highlighting

**Analysis Capabilities**:

- Summarize documents
- Extract key information
- Analyze data in spreadsheets
- Explain code
- Transcribe images

### File Previews

**Image Previews**:

- Thumbnail display
- Full-size view on click
- Image metadata (size, dimensions)

**Document Previews**:

- File name and size
- Page count (PDF)
- Word count estimate
- First few lines preview

**Code Previews**:

- Syntax highlighted
- Language detected
- Line count
- Copy button

### Privacy and Security

- Files processed locally when possible
- Sensitive data: Use desktop app for full local processing
- Files never stored on Cognia servers
- Web app: Files sent to AI provider for processing
- Delete attachments: Remove from conversation immediately

## Message Management

Full control over your conversation messages.

### Editing Messages

**Edit Your Messages**:

1. Hover over your message
2. Click edit (pencil) icon
3. Make changes
4. Click **Save** or press Enter

**Regenerate AI Response**:

1. Hover over AI message
2. Click regenerate icon
3. AI generates new response
4. Previous response archived

**Edit After Regeneration**:

- Can edit your original prompt again
- AI responds based on edited prompt
- Creates new response branch

### Deleting Messages

**Delete Single Message**:

1. Hover over message
2. Click delete (trash) icon
3. Confirm deletion
4. Message removed from conversation

**Delete Conversation**:

1. Click **More** menu in header
2. Select **Clear Chat**
3. Confirm deletion
4. All messages cleared

**Bulk Delete**:

- Use branch selector to manage
- Delete entire branches
- Clear message ranges

### Copying Messages

**Copy Message Text**:

1. Hover over message
2. Click copy icon
3. Text copied to clipboard
4. Success notification

**Copy Code Blocks**:

- Each code block has copy button
- Copies without syntax highlighting
- Includes language identifier

**Batch Copy**:

1. Click **More** menu
2. Select **Select and Copy**
3. Choose messages to copy
4. Click **Copy Selected**
5. All selected messages copied

### Message Actions

**Add Reaction**:

- Click reaction icon on message
- Choose emoji reaction
- Visual feedback

**Pin Message**:

- Pin important messages
- Access from pinned section
- Unpin anytime

**Reference Message**:

- Quote message in reply
- Click quote icon
- Referenced in new message

**Share Message**:

- Export single message
- Copy as Markdown
- Generate share link (if enabled)

## Session Search

Quickly find information across your conversation history.

### Search Functionality

**Access Search**:

1. Click search icon in chat header
2. Search popover opens
3. Type search query
4. Results appear in real-time

**Search Scope**:

- Current session only
- All message content
- Code blocks
- Artifact content
- File attachments

**Search Features**:

- Full-text search
- Case-insensitive
- Partial matching
- Highlighted results
- Result preview

### Advanced Search

**Search Operators**:

- `exact phrase`: Use quotes for exact match
- `exclude -term`: Minus to exclude term
- `OR`: Use OR between terms
- `file:term`: Search in file attachments
- `code:term`: Search in code blocks

**Search Filters**:

- By date range
- By message role (user/assistant)
- By content type (text/code/artifact)
- By branch

**Search Shortcuts**:

- `Ctrl/Cmd+K`: Quick search in current session
- `Ctrl/Cmd+F`: Find in current page
- `Ctrl/Cmd+Shift+F`: Search across sessions

### Navigating Results

**Click Result**: Jumps to message in conversation
**Scroll to Message**: Smooth scroll animation
**Highlight Match**: Search term highlighted
**Close Search**: Press Escape or click outside

## Memory System

Cross-session memory allows AI to remember important information across conversations.

### How Memory Works

**Automatic Detection**:

- AI identifies important information
- Prompts to save memories
- Stores in memory bank
- Retrieves in relevant contexts

**Memory Types**:

- **User Preferences**: Your preferences and settings
- **Facts About You**: Personal information
- **Project Context**: Work-related details
- **Learning Progress**: Skills and knowledge
- **Interests**: Topics you care about

### Managing Memories

**View Memories**:

1. Go to **Settings** > **Memory**
2. Browse all stored memories
3. See memory usage count

**Create Manual Memory**:

1. Click **Add Memory** button
2. Enter memory content
3. Save

**Edit Memory**:

1. Click memory to edit
2. Update content
3. Save changes

**Delete Memory**:

1. Click delete icon on memory
2. Confirm deletion
3. Memory removed

### Memory Settings

**Enable/Disable Memory**:

- Toggle in Settings > **Memory**
- Per-provider memory control
- Session-specific memory

**Memory Limits**:

- Maximum memories stored
- Auto-delete old memories
- Memory retention period

**Privacy**:

- Memories stored locally
- Encrypted in storage
- Never shared with providers
- Export available

### Memory in Conversations

AI automatically uses relevant memories:

```
User: "Help me write a Python script"
AI: "I'll help you with that. I remember from our previous conversations that
you prefer type hints and docstrings, so I'll include those in the script."
```

## Custom Instructions

Set global instructions that apply to all conversations.

### Custom Instruction Types

**Custom Instructions**:

- Global prompts applied to every message
- Guides AI behavior and response style
- Applied before each request

**About User**:

- Information about yourself
- Your background and expertise
- Your goals and preferences

**Response Preferences**:

- How you want responses formatted
- Tone and style preferences
- Output format requirements

### Setting Up Custom Instructions

1. Navigate to **Settings** > **Custom Instructions**
2. Fill in each section:
   - **Custom Instructions**: "You are a helpful assistant who explains technical concepts clearly with examples."
   - **About User**: "I'm a software developer with 5 years of experience in web development."
   - **Response Preferences**: "Use bullet points for lists. Include code examples. Avoid jargon when possible."
3. Enable **Apply Custom Instructions**
4. Save

### Instruction Templates

**For Developers**:

```
You are an expert software development assistant. When suggesting code:
- Include type annotations
- Add error handling
- Write docstrings
- Follow best practices
- Explain trade-offs
```

**For Writers**:

```
You are a creative writing assistant. Help with:
- Brainstorming ideas
- Developing plots and characters
- Editing and improving prose
- Suggesting vivid descriptions
- Maintaining consistent tone
```

**For Learning**:

```
You are a patient tutor. When explaining concepts:
- Start with basics
- Use analogies and examples
- Check for understanding
- Build complexity gradually
- Encourage questions
```

### Per-Session Instructions

Override global instructions for specific sessions:

1. Create new session or open existing
2. Click **More** menu
3. Select **Session Settings**
4. Add session-specific instructions
5. These override global instructions

## Export Functionality

Export your conversations in various formats.

### Export Formats

**Markdown (.md)**:

- Formatted with Markdown syntax
- Code blocks with language tags
- Message separation
- Timestamps optional

**PDF (.pdf)**:

- Professional document format
- Preserves formatting
- Include metadata
- Page numbers

**JSON (.json)**:

- Structured data format
- Full message objects
- Metadata included
- Importable

**HTML (.html)**:

- Styled web page
- Interactive
- Syntax highlighting
- Responsive design

**Plain Text (.txt)**:

- Simple text format
- Universal compatibility
- Compact size
- Easy sharing

### Export Options

1. Click **More** menu in chat header
2. Select **Export**
3. Choose format from dropdown
4. Configure options:
   - Include timestamps
   - Include metadata
   - Include artifacts
   - Date range
5. Click **Export**
6. File downloads automatically

### Export Features

**Selective Export**:

- Export specific branches
- Date range selection
- Message count limit
- Include/exclude system messages

**Metadata Export**:

- Session title
- Model used
- Provider information
- Token usage
- Export timestamp

**Artifact Export**:

- Include artifact content
- Export as separate files
- Link to artifacts in export
- Code formatting preserved

### Sharing Exports

**Direct Share**:

- Email export
- Share to cloud storage
- Copy to clipboard

**Generate Link**:

- Create shareable link
- Set expiration
- Password protection (if enabled)
- Access tracking

## Best Practices

### For Effective Conversations

**Clear Prompts**:

- Be specific about what you want
- Provide context when needed
- Use examples for clarity
- Ask follow-up questions

**Mode Selection**:

- Use Chat for general questions
- Use Agent for complex tasks
- Use Research for fact-finding
- Use Learning for new topics

**Context Management**:

- Keep conversations focused
- Create new sessions for new topics
- Use branches to explore alternatives
- Delete irrelevant messages

### For File Attachments

**Choose Right Format**:

- Use PDF for final documents
- Use plain text for code
- Use CSV for data
- Use PNG/JPEG for images

**Optimize File Size**:

- Compress images before upload
- Split large documents
- Remove unnecessary pages
- Use appropriate resolution

**Describe File Context**:

- Explain what you need from the file
- Specify analysis requirements
- Highlight important sections
- Ask specific questions

### For Voice Input

**Optimize Accuracy**:

- Speak clearly and steadily
- Use quiet environment
- Position microphone properly
- Check preview before sending

**Use Continuous Mode**:

- For longer messages
- For detailed explanations
- When dictating lists
- For complex descriptions

## Keyboard Shortcuts

### Message Input

- `Enter`: Send message (when send-on-enter enabled)
- `Shift+Enter`: New line
- `Ctrl/Cmd+Enter`: Send message
- `Ctrl/Cmd+K`: Insert prompt template
- `Ctrl/Cmd+Shift+V`: Paste and upload

### Navigation

- `Ctrl/Cmd+K`: Search current session
- `Ctrl/Cmd+Up/Down`: Navigate messages
- `Ctrl/Cmd+Home`: Go to first message
- `Ctrl/Cmd+End`: Go to latest message
- `Escape`: Close panels/popovers

### Editing

- `Ctrl/Cmd+Z`: Undo (in input)
- `Ctrl/Cmd+Shift+Z`: Redo
- `Ctrl/Cmd+A`: Select all (in input)

### Quick Actions

- `Ctrl/Cmd+N`: New session
- `Ctrl/Cmd+Shift+N`: New session with template
- `Ctrl/Cmd+/`: Toggle sidebar
- `Ctrl/Cmd+B`: Toggle side panel
- `Ctrl/Cmd+,`: Open settings

## Troubleshooting

### Message Not Sending

**Check**:

- Internet connection
- Provider API key
- Model availability
- Message length (within limits)

**Solutions**:

- Try shorter message
- Switch provider/model
- Check rate limits
- Refresh page

### File Upload Failing

**Check**:

- File size limit
- File format supported
- Available storage
- Browser permissions

**Solutions**:

- Compress file
- Convert to supported format
- Clear browser cache
- Try different browser

### Voice Input Not Working

**Check**:

- Microphone permission
- Browser compatibility
- Audio input device
- Background noise

**Solutions**:

- Grant microphone permission
- Use Chrome/Edge browser
- Check system audio settings
- Use external microphone

### Search Not Finding Results

**Check**:

- Search query spelling
- Search scope (current session)
- Search filters

**Solutions**:

- Use broader search terms
- Clear filters
- Check message exists in session
- Use different keywords
