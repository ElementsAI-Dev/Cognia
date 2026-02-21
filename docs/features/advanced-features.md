# Advanced Features Guide

Cognia includes powerful advanced features for power users, including learning modes, skills systems, workflow automation, and extensive customization options.

## Learning Mode (Socratic Method)

Learning Mode uses the Socratic teaching method to guide your learning through questions and guided discovery rather than direct answers.

### How Learning Mode Works

**Socratic Approach**:

- AI asks guiding questions
- Builds understanding step by step
- Provides hints instead of answers
- Checks for understanding
- Adapts difficulty based on responses

**Learning Process**:

1. You ask a question or state a learning goal
2. AI responds with a question to assess your understanding
3. You answer, demonstrating your knowledge
4. AI provides targeted guidance
5. Repeat until concept is mastered

### Using Learning Mode

1. Select **Learning** mode from chat header dropdown
2. State what you want to learn
3. Engage in dialogue with AI tutor
4. Answer questions honestly
5. Ask for clarification when needed

**Example Session**:

```
You: "I want to understand recursion in programming."

AI: "Great choice! Let me check your current understanding first.
In your own words, what do you think recursion means?"

You: "I think it's when a function calls itself."

AI: "Exactly! You've got the basic concept. Now, why do you think
a function would need to call itself? Can you think of a real-world
example where this kind of repetition might be useful?"
```

### Learning Mode Features

**Generative UI Toolchain**:

- Unified snake_case tool names (`display_*`) with camelCase alias compatibility
- 10 interactive renderers (flashcard, quiz, review, progress, concept explanation, step guide, concept map, animation)
- Tool invocation parts stream into chat message parts in real time

**Session State Machine Automation**:

- Automatically increments attempts on active sub-question
- Extracts and de-duplicates sub-questions from assistant output
- Detects phase transitions and advances/finishes sessions automatically
- Updates engagement, response stats, achievements, and global learning metrics

**Adaptive Difficulty**:

- Starts with basics
- Increases complexity gradually
- Detects confusion and simplifies
- Advances quickly when appropriate

**Progress Tracking**:

- Tracks concepts covered
- Monitors understanding level
- Suggests review topics
- Identifies knowledge gaps

**Hint System**:

- Progressive hints
- Reveals information gradually
- Encourages thinking
- Avoids giving answers

**Practice Exercises**:

- Generates practice problems
- Checks solutions
- Explains mistakes
- Provides similar problems

### Best Practices for Learning Mode

**For Learners**:

- Be honest about your understanding
- Don't rush to answers
- Ask questions freely
- Practice between sessions
- Apply what you learn

**Effective Prompts**:

```
"Help me understand [topic] step by step."
"I'm confused about [concept]. Can you guide me through it?"
"Quiz me on [topic] to test my understanding."
"Explain [concept] like I'm a beginner."
```

## Skills System

The Skills System allows you to create reusable AI capabilities that can be activated and shared across conversations.

### What Are Skills?

Skills are modular AI capabilities that:

- Perform specific tasks
- Can be activated in conversations
- Maintain independent state
- Can be shared and imported
- Have configurable parameters

### Creating Skills

1. Navigate to **Skills** in sidebar
2. Click **Create Skill**
3. Fill in skill details:
   - **Name**: Skill identifier
   - **Description**: What skill does
   - **Icon**: Visual representation
   - **Category**: Organization
   - **System Prompt**: Core instruction
   - **Parameters**: Configurable options
4. Click **Save Skill**

### Skill Types

**Generator Skills**:

- Create content (text, code, etc.)
- Template-based generation
- Customizable output
- Example: Blog post generator

**Analyzer Skills**:

- Process and analyze input
- Extract insights
- Provide reports
- Example: Sentiment analyzer

**Transformer Skills**:

- Convert input format
- Translate content
- Refactor code
- Example: JS to TS converter

**Assistant Skills**:

- Guide through processes
- Provide step-by-step help
- Check work
- Example: Writing coach

### Skill Parameters

Define configurable parameters for skills:

**Parameter Types**:

- **text**: Free-form text input
- **number**: Numeric value
- **select**: Dropdown selection
- **toggle**: Boolean on/off
- **textarea**: Multi-line text

**Example Parameters**:

```json
{
  "tone": {
    "type": "select",
    "options": ["formal", "casual", "friendly"],
    "default": "friendly"
  },
  "length": {
    "type": "select",
    "options": ["short", "medium", "long"],
    "default": "medium"
  },
  "includeExamples": {
    "type": "toggle",
    "default": true
  }
}
```

### Using Skills

**Activate Skill in Chat**:

1. Click skill indicator in chat header
2. Select skill from list
3. Configure parameters
4. Skill becomes active for conversation

**Skill Context**:

- Active skills shown in header
- Skills can access conversation history
- Skills can call tools
- Skills can invoke other skills

**Example Skill Usage**:

```
Skill: Code Reviewer
Parameter: language = TypeScript
Parameter: strictness = high

You: "Check this function for issues:"
[code]

AI: [Using Code Reviewer skill]
"I found 3 issues:
1. Missing error handling on line 5
2. Unused variable on line 8
3. Missing type annotation..."
```

### Skill Marketplace

**Browse Skills**:

- Community-created skills
- Searchable by category
- Rating and reviews
- Usage statistics

**Import Skills**:

- Click **Import** on skill card
- Skill added to your collection
- Configure parameters
- Use in conversations

**Export Skills**:

- Click **Export** on your skill
- Generate shareable link
- Share with community
- Or keep private

### Built-in Skills

Cognia includes several pre-built skills:

**Code Explainer**:

- Explains code line by line
- Identifies patterns
- Suggests improvements

**Writing Assistant**:

- Grammar checking
- Style suggestions
- Tone adjustment

**Data Analyzer**:

- Statistics summary
- Pattern detection
- Visualization suggestions

**Research Assistant**:

- Source gathering
- Citation formatting
- Literature review

## Workflow Automation

Automate repetitive tasks and create custom workflows.

### Workflow Triggers

**Automatic Triggers**:

- New message received
- Specific keyword detected
- Time-based schedule
- External event (webhook)

**Manual Triggers**:

- Keyboard shortcut
- Button click
- Command palette
- Voice command

### Workflow Actions

**Message Actions**:

- Send automatic reply
- Modify message content
- Route to different mode
- Apply custom instructions

**Tool Actions**:

- Call MCP tool
- Execute code
- Search knowledge base
- Query database

**External Actions**:

- Send webhook
- Update external system
- Create calendar event
- Send email

### Creating Workflows

1. Go to **Settings** > **Workflows**
2. Click **Create Workflow**
3. Define trigger:
   - Type: keyword, schedule, event
   - Condition: when to trigger
4. Add actions:
   - Sequential steps
   - Conditional branches
   - Loops and iterations
5. Test workflow
6. Enable automation

**Example Workflow**:

```
Name: Daily Summary
Trigger: Schedule (daily at 9 AM)
Actions:
  1. Get all messages from last 24 hours
  2. Summarize key topics
  3. Extract action items
  4. Create summary artifact
  5. Send notification
```

### Workflow Editor

**Visual Editor**:

- Drag-and-drop interface
- Connect actions with lines
- Add conditions and branches
- Preview workflow execution

**Code Editor**:

- JSON-based configuration
- Advanced logic
- Custom functions
- Integration with external APIs

### Workflow Templates

**Meeting Notes**:

- Transcribe meeting
- Extract action items
- Create summary
- Send to participants

**Code Review**:

- Monitor repository
- Analyze pull requests
- Generate review comments
- Post to GitHub

**Daily Standup**:

- Collect yesterday's progress
- Identify today's goals
- Note blockers
- Format as standup notes

## Preset Management

Presets are saved configurations for quick access to favorite chat setups.

### Creating Presets

1. Configure chat as desired:
   - Select provider and model
   - Choose mode (Chat/Agent/Research)
   - Set temperature, max tokens
   - Enable features (web search, tools)
2. Click **Preset** dropdown in header
3. Select **Save as Preset**
4. Enter preset details:
   - Name and description
   - Icon and color
   - Configuration captured automatically
5. Click **Save**

### Preset Features

**Quick Application**:

- One-click apply preset
- Instantly switch configurations
- Maintain conversation context

**Preset Categories**:

- Coding: Code-focused settings
- Writing: Creative writing setup
- Research: Deep research configuration
- Chat: Casual conversation
- Learning: Educational settings

**Built-in Presets**:

- **General Assistant**: Balanced all-rounder
- **Creative Writer**: High temperature, GPT-4o
- **Code Expert**: Claude Sonnet, low temperature
- **Deep Thinker**: o1 for reasoning
- **Quick Helper**: GPT-4o Mini for speed
- **Researcher**: Gemini Pro with search

### Managing Presets

**Edit Preset**:

1. Go to **Presets** in sidebar
2. Click preset card
3. Modify settings
4. Save changes

**Delete Preset**:

- Click delete icon on preset
- Confirm deletion

**Set Default**:

- Click star icon on preset
- Becomes default for new sessions

**Import/Export**:

- Export preset as JSON
- Share with others
- Import shared presets

## Usage Tracking

Monitor your API usage and costs across all providers.

### Usage Dashboard

**Access**:

- Settings > Usage
- View statistics across all providers

**Metrics Tracked**:

- Total tokens used
- Input/output tokens
- Request count
- Estimated cost
- Error rate

**Time Periods**:

- Today
- This week
- This month
- Custom range

### Cost Analysis

**By Provider**:

- Cost breakdown per provider
- Most/least expensive
- Cost per request
- Budget tracking

**By Model**:

- Most used models
- Cost efficiency
- Token usage patterns
- Model recommendations

**By Session**:

- Cost per conversation
- Token distribution
- Request patterns
- Session comparison

### Budget Management

**Set Budgets**:

- Daily/monthly limits
- Per-provider caps
- Notification thresholds
- Auto-disable when exceeded

**Alerts**:

- Percentage warnings
- Approaching limit
- Exceeded budget
- Unusual usage patterns

### Usage Optimization

**Recommendations**:

- Switch to cheaper models for simple tasks
- Reduce context length
- Use streaming to estimate tokens
- Enable caching for repeated queries

**Cost Saving Tips**:

- Use Auto mode for optimal model selection
- Reduce max tokens for shorter responses
- Lower temperature for deterministic tasks
- Batch similar requests

## Keyboard Shortcuts

Customizable keyboard shortcuts for power users.

### Default Shortcuts

**Global Shortcuts**:

- `Ctrl/Cmd+K`: Quick search
- `Ctrl/Cmd+N`: New session
- `Ctrl/Cmd+,`: Open settings
- `Ctrl/Cmd+P`: Go to projects
- `Ctrl/Cmd+/`: Toggle sidebar

**Chat Shortcuts**:

- `Enter`: Send message (if enabled)
- `Shift+Enter`: New line
- `Ctrl/Cmd+I`: Focus input
- `Ctrl/Cmd+Shift+V`: Paste and upload
- `Ctrl/Cmd+Up/Down`: Navigate messages

**Panel Shortcuts**:

- `Ctrl/Cmd+B`: Toggle side panel
- `Ctrl/Cmd+]`: Next tab
- `Ctrl/Cmd+[`: Previous tab
- `Escape`: Close panel/dialog

**Editor Shortcuts** (Monaco):

- `Ctrl/Cmd+S`: Save
- `Ctrl/Cmd+F`: Find
- `Ctrl/Cmd+H`: Replace
- `Alt+Shift+F`: Format
- `F11`: Toggle full screen

### Customizing Shortcuts

1. Go to **Settings** > **Keyboard**
2. Click shortcut to modify
3. Press new key combination
4. Confirm change
5. Shortcut updated

**Conflict Resolution**:

- Warnings for conflicts
- Automatic suggestions
- Override protection

**Reset Shortcuts**:

- Reset to defaults
- Reset single shortcut
- Reset all shortcuts

### Shortcut Categories

**Navigation**:

- Move between sessions
- Jump to panels
- Navigate messages

**Actions**:

- Create new items
- Save/export
- Delete items

**Editing**:

- Text manipulation
- Code editing
- Selection

**Panels**:

- Toggle visibility
- Switch tabs
- Focus controls

## Theme Customization

Personalize Cognia's appearance with themes and colors.

### Theme Modes

**Light Mode**:

- Clean, bright interface
- Good for well-lit environments
- Reduced eye strain in daylight

**Dark Mode**:

- Easy on eyes
- Reduced screen glare
- Better for dark environments

**System Mode**:

- Follows OS preference
- Automatic switching
- Best of both worlds

### Color Themes

**Built-in Themes**:

- Default: Blue and gray
- Purple: Violet accent
- Green: Nature-inspired
- Rose: Pink accent
- Orange: Warm tones

**Custom Themes**:

1. Go to **Settings** > **Appearance**
2. Click **Create Custom Theme**
3. Configure colors:
   - Primary: Main accent color
   - Secondary: Secondary accent
   - Background: Base background
   - Foreground: Text color
   - Muted: Subdued elements
4. Preview changes
5. Save theme

### Editor Themes

**Code Editor Themes**:

- GitHub Dark
- GitHub Light
- Monokai
- Dracula
- Nord
- One Dark

**Configure**:

- Settings > Appearance > Code Theme
- Preview in sample code
- Apply immediately

### UI Customization

**Font Size**:

- UI font size: 12-20px
- Code font size: 12-18px
- Line height: 1.0-2.0

**Message Bubbles**:

- Default: Rounded corners
- Minimal: Flat design
- Bordered: Outlined style
- Gradient: Modern gradient

**Display Options**:

- Show/hide timestamps
- Show/hide token count
- Show/hide model in chat
- Compact mode

### Advanced Styling

**Custom CSS**:

1. Go to **Settings** > **Appearance**
2. Click **Advanced**
3. Add custom CSS rules
4. Live preview
5. Apply changes

**Example Custom CSS**:

```css
/* Make messages wider */
.message-container {
  max-width: 900px;
}

/* Custom accent color */
.button-primary {
  background: #yourcolor;
}
```

## Advanced Configuration

### Environment Variables

Configure Cognia behavior with environment variables.

**For Desktop App**:
Create `.env` file in application directory:

```bash
# API Endpoints
COGNIA_API_URL=https://api.cognia.app
COGNIA_WS_URL=wss://api.cognia.app/ws

# Features
ENABLE_EXPERIMENTAL_FEATURES=true
MAX_FILE_SIZE_MB=100

# Storage
STORAGE_PATH=/path/to/storage
CACHE_SIZE_MB=512

# Logging
LOG_LEVEL=debug
LOG_TO_FILE=true
```

**For Web App**:
Set in browser console or via URL parameters.

### Provider Settings

**Advanced Provider Configuration**:

```json
{
  "providerSettings": {
    "openai": {
      "apiKey": "sk-...",
      "baseURL": "https://api.openai.com/v1",
      "timeout": 60000,
      "maxRetries": 3,
      "organization": "org-..."
    }
  }
}
```

**Custom Endpoints**:

- Use self-hosted models
- Proxy through custom server
- Load balancing
- A/B testing

### Experimental Features

Enable experimental features:

1. Go to **Settings** > **Advanced**
2. Enable **Show Experimental Features**
3. Access experimental options:
   - Beta models
   - New UI components
   - Advanced analytics
   - Developer tools

**Warning**: Experimental features may be unstable or change without notice.

## Developer Tools

For developers building on Cognia.

### API Access

**REST API**:

- Conversations management
- Artifact CRUD
- Session operations
- Usage statistics

**WebSocket API**:

- Real-time message streaming
- Live updates
- Event subscriptions

### Webhooks

Configure webhooks for events:

1. Go to **Settings** > **Developer**
2. Click **Add Webhook**
3. Configure:
   - URL: Endpoint to receive events
   - Events: Message sent, artifact created, etc.
   - Secret: Signature verification
4. Test webhook
5. Save configuration

**Webhook Events**:

- `message.created`: New message
- `message.updated`: Message edited
- `artifact.created`: Artifact created
- `session.created`: New session
- `usage.alert`: Budget threshold

### Extensions

Build custom extensions:

1. Go to **Settings** > **Extensions**
2. Click **Install Extension**
3. Upload extension package
4. Grant permissions
5. Configure settings

**Extension Types**:

- UI themes
- Custom renderers
- Tool integrations
- Data connectors

## Tips and Tricks

### Productivity Hacks

**Quick Actions**:

- Type `@` to mention tools/resources
- Use `/` for command palette
- Tab to complete suggestions
- Shift+Tab for reverse complete

**Workflow Optimization**:

- Create presets for common tasks
- Use keyboard shortcuts
- Enable auto-send for voice input
- Set up workflow automations

**Session Management**:

- Pin important sessions
- Archive completed work
- Use branches for alternatives
- Link sessions to projects

### Power User Features

**Advanced Search**:

- Use operators (AND, OR, NOT)
- Filter by date range
- Search in artifacts only
- Regular expressions

**Bulk Operations**:

- Select multiple messages
- Batch export
- Bulk delete
- Multi-file upload

**Integration Patterns**:

- Use MCP for external tools
- Chain multiple skills
- Automate with workflows
- Extend with custom code

### Performance Tips

**Reduce Latency**:

- Use geographically close providers
- Enable streaming
- Reduce context length
- Choose faster models

**Save Costs**:

- Use Auto mode for model selection
- Set budgets and alerts
- Cache frequent queries
- Use local models (Ollama)

**Optimize Storage**:

- Archive old sessions
- Clear cache regularly
- Compress knowledge base files
- Delete unused artifacts

## Image Studio

Image Studio provides professional image editing capabilities directly within Cognia.

### Features

**Background Removal**:

- AI-powered background removal
- Transparent PNG export
- Edge refinement options
- Batch processing support

**Image Adjustments**:

- Brightness and contrast
- Saturation and hue
- Sharpness and blur
- Color temperature

**Image Cropping**:

- Free-form cropping
- Aspect ratio presets
- Smart crop suggestions
- Rotation and flip

**Image Upscaling**:

- AI-powered upscaling
- 2x, 4x scale options
- Quality preservation
- Noise reduction

**Mask Painting**:

- Brush-based masking
- Eraser tool
- Mask refinement
- Layer support

### Using Image Studio

1. Open an image in chat or canvas
2. Click **Edit in Studio** button
3. Select editing tool from toolbar
4. Apply edits and preview
5. Export or save changes

---

## Jupyter Integration

Cognia integrates with Jupyter notebooks for interactive data analysis and code execution.

### Features

**Interactive Notebook**:

- Code cell execution
- Markdown rendering
- Output visualization
- Variable inspection

**Kernel Management**:

- Multiple kernel support (Python, Julia, R)
- Kernel status monitoring
- Auto-restart on failure
- Resource management

**Variable Inspector**:

- Real-time variable tracking
- Type information
- Value preview
- Memory usage

### Using Jupyter Integration

1. Create or open a Jupyter notebook artifact
2. Write code in cells
3. Execute with Shift+Enter
4. View outputs inline
5. Inspect variables in sidebar

### Jupyter Configuration

```typescript
// Settings for Jupyter integration
{
  jupyterUrl: 'http://localhost:8888',
  defaultKernel: 'python3',
  autoExecute: false,
  maxOutputSize: 10000,
}
```

---

## Visual Workflow Editor

The Visual Workflow Editor allows you to create automation workflows using a drag-and-drop interface powered by React Flow.

### Workflow Components

**Nodes**:

- **Trigger Nodes**: Start workflow execution (schedule, webhook, event)
- **Action Nodes**: Perform operations (AI call, API request, file operation)
- **Logic Nodes**: Control flow (condition, switch, loop)
- **Data Nodes**: Transform data (map, filter, merge)

**Edges**:

- Connect nodes to define execution flow
- Support conditional branching
- Handle error paths
- Enable parallel execution

### Creating Workflows

1. Open Workflow Editor from sidebar
2. Drag nodes from palette to canvas
3. Connect nodes with edges
4. Configure node settings
5. Test and debug workflow
6. Save and activate

### Workflow Features

**Debug Panel**:

- Step-by-step execution
- Variable inspection
- Breakpoint support
- Execution logs

**Execution Panel**:

- Real-time status monitoring
- Progress visualization
- Error handling
- Retry controls

**Version History**:

- Automatic versioning
- Rollback support
- Compare versions
- Restore previous states

### Example Workflow

```yaml
# Research and summarize workflow
trigger:
  type: manual
  
nodes:
  - id: search
    type: web_search
    config:
      query: "{{input.topic}}"
      
  - id: analyze
    type: ai_call
    config:
      model: gpt-4o
      prompt: "Analyze these search results..."
      
  - id: summarize
    type: ai_call
    config:
      model: gpt-4o
      prompt: "Create a summary..."
      
edges:
  - from: search
    to: analyze
  - from: analyze
    to: summarize
```

---

## Screen Recording

Screen Recording allows you to capture your screen directly within Cognia for tutorials, bug reports, or documentation.

### Features

- Full screen or region capture
- Audio recording (microphone and system)
- Cursor highlighting
- Recording timer
- Pause and resume

### Using Screen Recording

1. Click **Record** button in toolbar
2. Select capture region (full screen or area)
3. Configure audio settings
4. Click **Start Recording**
5. Click **Stop** when done
6. Preview and save recording

---

## Chat Widget

The embeddable Chat Widget allows you to integrate Cognia's chat functionality into external applications.

### Features

- Customizable appearance
- Keyboard shortcuts
- Suggestion chips
- Settings persistence
- Session management

### Widget Configuration

```typescript
// Chat widget configuration
{
  theme: 'light' | 'dark' | 'system',
  position: 'bottom-right' | 'bottom-left',
  initialMessage: 'How can I help you?',
  suggestedPrompts: ['Help me with...', 'Explain...'],
  allowFileUpload: true,
  maxTokens: 4096,
}
```

### Embedding the Widget

```html
<!-- Embed Cognia chat widget -->
<script src="cognia-widget.js"></script>
<script>
  CogniaWidget.init({
    apiKey: 'your-api-key',
    theme: 'dark',
  });
</script>
```

---

## Troubleshooting Advanced Features

### Learning Mode Issues

**AI Not Asking Questions**:

- Verify Learning mode is selected
- Check custom instructions don't override
- Rephrase prompt to be more open-ended

**Progress Not Tracking**:

- Enable memory system
- Check learning analytics enabled
- Clear browser cache

### Skills Not Working

**Skill Not Activating**:

- Check skill is enabled
- Verify parameters are set
- Review skill errors in logs

**Skill Performance**:

- Optimize system prompt
- Reduce parameter complexity
- Cache frequent operations

### Workflow Failures

**Trigger Not Firing**:

- Verify trigger condition
- Check event logs
- Test trigger manually

**Action Errors**:

- Review action configuration
- Check required permissions
- Test actions individually

### Performance Issues

**Slow Response**:

- Check internet connection
- Reduce context length
- Switch to faster model
- Clear browser cache

**High Memory Usage**:

- Close unused sessions
- Reduce stored history
- Clear artifact cache
- Restart application

### Customization Problems

**Theme Not Applying**:

- Clear browser cache
- Disable custom CSS temporarily
- Reset theme settings
- Check for syntax errors

**Shortcuts Not Working**:

- Check for conflicts
- Reset to defaults
- Disable browser extensions
- Try incognito mode
