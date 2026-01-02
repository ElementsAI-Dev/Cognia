# Agent System Guide

Cognia's Agent system provides autonomous AI agents that can use tools, perform multi-step tasks, and work in the background.

## Overview

The agent system enables AI to go beyond simple conversations by:

- **Tool Calling** - Interact with external services and APIs
- **Multi-Step Planning** - Automatically break down complex tasks
- **Background Execution** - Run long tasks while you work
- **Sub-Agent Orchestration** - Coordinate multiple specialized agents
- **Progress Visualization** - Real-time execution tracking

## Agent Modes

Cognia provides 8 built-in agent modes optimized for different tasks:

### 1. General Mode

**Purpose**: All-purpose assistance for everyday tasks

**Best For**:

- General questions and advice
- Multi-step tasks without specific requirements
- Exploratory conversations
- Tasks that don't fit other categories

**Tools Available**:

- Calculator
- Web Search

**How to Use**:

1. Select **Agent** mode from chat header
2. Select **General** from agent mode dropdown
3. Describe your task
4. Agent will plan and execute steps

**Example Prompt**:

```
Help me plan a weekend trip to San Francisco. Find attractions,
restaurants, and create a rough itinerary.
```

### 2. Web Designer Mode

**Purpose**: Generate and preview web interfaces with React and Tailwind CSS

**Best For**:

- Creating landing pages
- Designing UI components
- Prototyping web applications
- Generating responsive layouts

**Tools Available**:

- Code Interpreter (JavaScript/TypeScript)
- Web Preview (live preview)
- Designer (opens full designer panel)

**Output Format**: React code with Tailwind CSS

**How to Use**:

1. Select **Agent** mode
2. Select **Web Designer** from agent mode dropdown
3. Describe the interface you want
4. Agent generates code and shows live preview

**Example Prompt**:

```
Create a modern landing page for a SaaS product with:
- Hero section with CTA
- Feature grid (3 columns)
- Pricing table (3 tiers)
- Footer with links
Use a blue color scheme.
```

**Preview Capabilities**:

- Live preview of generated code
- Interactive components
- Responsive design preview
- One-click export to Designer panel

### 3. Code Generator Mode

**Purpose**: Write, explain, and refactor code across multiple languages

**Best For**:

- Writing new code from specifications
- Explaining existing code
- Refactoring for best practices
- Adding features to codebases
- Code review and optimization

**Tools Available**:

- Code Interpreter
- File operations (read, write, list)
- Web Search (for documentation lookup)

**Supported Languages**:

- JavaScript/TypeScript
- Python
- Java
- C/C++
- Go
- Rust
- PHP
- Ruby
- And more...

**How to Use**:

1. Select **Agent** mode
2. Select **Code Generator** from agent mode dropdown
3. Provide requirements or paste existing code
4. Agent writes code with explanations

**Example Prompts**:

```
Write a TypeScript function that validates email addresses using regex,
with proper error handling and unit tests.
```

```
Review this code and suggest refactoring improvements for better performance:
[paste code]
```

**Code Features**:

- Syntax highlighting
- Type annotations
- Error handling
- Documentation comments
- Best practices adherence

### 4. Data Analyst Mode

**Purpose**: Analyze data and create visualizations

**Best For**:

- CSV/data analysis
- Statistical calculations
- Chart generation
- Data insights and trends
- Report generation

**Tools Available**:

- Code Interpreter (Python, JavaScript)
- File operations (read CSV, Excel, JSON)
- Calculator

**Supported Formats**:

- CSV files
- Excel spreadsheets
- JSON data
- SQL queries

**How to Use**:

1. Select **Agent** mode
2. Select **Data Analyst** from agent mode dropdown
3. Upload data file or describe analysis
4. Agent analyzes and creates visualizations

**Example Prompt**:

```
Analyze the uploaded sales.csv file and:
1. Calculate total sales by month
2. Find top 5 products
3. Create a bar chart showing sales trend
4. Identify any anomalies
```

**Output Types**:

- Statistical summaries
- Charts (bar, line, pie, scatter)
- Tables and pivot tables
- Trend analysis
- Anomaly detection

### 5. Writing Assistant Mode

**Purpose**: Content creation and editing assistance

**Best For**:

- Blog posts and articles
- Marketing copy
- Social media content
- Email drafts
- Creative writing

**Tools Available**:

- Web Search (for research)
- Calculator (word count, reading time)

**Output Format**: Markdown or plain text

**How to Use**:

1. Select **Agent** mode
2. Select **Writing Assistant** from agent mode dropdown
3. Provide topic or existing text
4. Agent creates or improves content

**Example Prompts**:

```
Write a 1000-word blog post about the benefits of meditation for productivity.
Include an engaging introduction, 3 main points, and a conclusion with a CTA.
```

```
Edit this email to be more professional and concise:
[paste email]
```

**Writing Features**:

- Tone adjustment
- Grammar and style correction
- SEO optimization
- Formatting consistency
- Plagiarism checking

### 6. Research Assistant Mode

**Purpose**: Information gathering and synthesis from multiple sources

**Best For**:

- Academic research
- Competitive analysis
- Market research
- Literature reviews
- Fact-checking

**Tools Available**:

- Web Search (Tavily, Brave, Google)
- RAG Search (knowledge base)
- Document operations

**Search Providers**:

- Tavily (default) - Optimized for AI research
- Brave Search - Privacy-focused
- Google Search - Comprehensive results

**How to Use**:

1. Select **Agent** mode
2. Select **Research Assistant** from agent mode dropdown
3. Ask research question
4. Agent searches, reads sources, and synthesizes

**Example Prompt**:

```
Research and compare the performance characteristics of PostgreSQL vs MySQL
for read-heavy workloads. Include sources from the last 12 months and cite
specific benchmarks.
```

**Research Features**:

- Source citation
- Multi-source synthesis
- Reference management
- Credibility assessment
- Export to citations

### 7. Presentation Generator Mode

**Purpose**: Create PowerPoint-style presentations

**Best For**:

- Business presentations
- Educational slides
- Pitch decks
- Training materials
- Conference talks

**Tools Available**:

- Slide Generator (DALL-E images)
- Code Interpreter (for content generation)
- Web Search (for research)

**Output Format**: PPTX with images and content

**How to Use**:

1. Select **Agent** mode
2. Select **Presentation Generator** from agent mode dropdown
3. Describe presentation topic and structure
4. Agent generates slides with images

**Example Prompt**:

```
Create a 10-slide presentation on "The Future of Remote Work":
- Slide 1: Title slide
- Slide 2: Introduction
- Slides 3-7: Main topics (trends, benefits, challenges)
- Slide 8: Statistics
- Slide 9: Predictions for 2030
- Slide 10: Conclusion and Q&A

Include relevant images for each slide.
```

**Slide Features**:

- Automatic image generation (DALL-E)
- Multiple layout options
- Style modifiers (photorealistic, illustration, minimalist)
- Title slides, content slides, image slides
- Chart and diagram slides
- Export to PPTX

### 8. Workflow Executor Mode

**Purpose**: Execute predefined multi-step workflows

**Best For**:

- Repetitive tasks
- Standard operating procedures
- Automated processes
- Quality checklists
- Deployment pipelines

**Tools Available**:

- All tools (configurable per workflow step)

**How to Use**:

1. Select **Agent** mode
2. Select **Workflow Executor** from agent mode dropdown
3. Describe workflow or load saved workflow
4. Agent executes each step sequentially

**Example Prompt**:

```
Execute this workflow for code review:
1. Read the file: src/components/Button.tsx
2. Check for accessibility issues
3. Verify TypeScript best practices
4. Suggest improvements
5. Generate a summary report
```

**Workflow Features**:

- Step-by-step execution
- Conditional branching
- Error handling per step
- Progress tracking
- Save/load workflows

## Tool Integration

Agents can use tools from multiple sources:

### Built-in Tools

**Calculator** - Mathematical calculations

```
Agent: "What's 15% of $350?"
Tool: calculator({ expression: "350 * 0.15" })
Result: 52.5
```

**Web Search** - Online information retrieval

```
Agent: "What are the latest React features?"
Tool: web_search({ query: "React latest features 2024" })
Result: List of articles and summaries
```

**Code Interpreter** - Execute JavaScript/TypeScript code

```
Agent: "Calculate fibonacci sequence"
Tool: execute_code({ code: "function fib(n) {...}" })
Result: Computed values
```

**RAG Search** - Search your knowledge base

```
Agent: "What did we decide about the API design?"
Tool: rag_search({ query: "API design decision", top_k: 5 })
Result: Relevant documents from knowledge base
```

**File Operations** - Read, write, list files

```
Agent: "Read the configuration file"
Tool: read_file({ path: "./config.json" })
Result: File contents
```

**Document Tools** - Process uploaded documents

```
Agent: "Summarize this PDF"
Tool: summarize_document({ file_id: "..." })
Result: Document summary
```

### Skills Integration

Active Skills are automatically converted to agent tools:

**How it Works**:

1. Enable Skills in Settings → Skills
2. Activate the Skills you want agents to use
3. Agents automatically have access to Skill tools
4. Skill resources included in agent context

**Example**:

```
Enabled Skill: "Python Code Generator"
Agent Tool: python_generator({ prompt: "Create a REST API" })
Result: Generated Python code
```

### MCP Tools

Model Context Protocol (MCP) servers provide custom tools:

**Built-in MCP Tools**:

- Database queries
- API integrations
- Custom scripts
- Third-party services

**Configuration**:

1. Go to Settings → MCP Servers
2. Add MCP server URL
3. Configure authentication
4. Tools automatically available to agents

**Example**:

```
MCP Server: "company-database"
Agent Tool: company_db.query({ sql: "SELECT * FROM users" })
Result: Database query results
```

## Background Agents

Run long tasks in the background while you continue working.

### Creating Background Agents

**Method 1: From Chat**:

1. Run agent in Agent mode
2. Click "Run in Background" button
3. Agent continues execution in background
4. You can close the chat or work on other tasks

**Method 2: From Background Panel**:

1. Open Background Agents panel
2. Click "Create Agent"
3. Configure task and settings
4. Click "Start"

**Method 3: From useAgent Hook**:

```typescript
const { runInBackground } = useAgent();
runInBackground({
  name: 'Research Agent',
  task: 'Research latest AI trends',
  config: {
    notifyOnComplete: true,
    notifyOnError: true
  }
});
```

### Background Agent Features

**Queue Management**:

- Priority-based scheduling (1=highest, 5=lowest)
- Max 3 concurrent agents
- Pause/resume queue
- Automatic retry on failure

**Agent Lifecycle**:

```
idle → queued → initializing → running → completed/failed/cancelled
                                    ↓
                                 paused
```

**Notifications**:

- Agent started
- Progress updates (25%, 50%, 75%)
- Step completed
- Sub-agent completed
- Waiting for approval
- Completed
- Failed
- Cancelled

**State Persistence**:

- Agents survive page refresh
- Queued agents restored on restart
- Execution logs preserved
- Results available after completion

### Managing Background Agents

**View Running Agents**:

1. Click background agent indicator (status bar)
2. Background Agent Panel opens
3. See all agents with status

**Agent Actions**:

- **Pause** - Temporarily halt execution
- **Resume** - Continue paused agent
- **Cancel** - Stop agent execution
- **Delete** - Remove from list (completed only)
- **View Logs** - See detailed execution log
- **View Results** - Show agent output

**Queue Controls**:

- **Pause Queue** - Pause all queued agents
- **Resume Queue** - Resume processing queue
- **Clear Completed** - Remove all completed agents

### Background Agent Configuration

**Notification Settings**:

```typescript
{
  notifyOnProgress: boolean,    // Notify at 25%, 50%, 75%
  notifyOnComplete: boolean,    // Notify on completion
  notifyOnError: boolean,       // Notify on errors
}
```

**Retry Settings**:

```typescript
{
  autoRetry: boolean,           // Automatically retry on failure
  maxRetries: number,           // Max retry attempts (default: 3)
  retryDelay: number,           // Delay between retries (ms)
}
```

**Execution Settings**:

```typescript
{
  timeout: number,              // Execution timeout (ms)
  maxConcurrentSubAgents: number, // Max parallel sub-agents
  persistState: boolean,        // Save state for recovery
}
```

## Sub-Agent Orchestration

Complex tasks can be broken down into multiple sub-agents working together.

### Sub-Agent Execution Modes

**Sequential Mode** - Execute one after another:

```
Sub-Agent 1: Research topic
  ↓
Sub-Agent 2: Write article based on research
  ↓
Sub-Agent 3: Proofread and edit
```

**Parallel Mode** - Execute simultaneously:

```
Sub-Agent 1: Research aspect A
Sub-Agent 2: Research aspect B
Sub-Agent 3: Research aspect C
  ↓
Combine results
```

**Conditional Mode** - Execute based on conditions:

```
Sub-Agent 1: Analyze data
  ↓
If anomaly detected → Sub-Agent 2: Investigate
Else → Sub-Agent 3: Generate report
```

### Automatic Planning

When you provide a complex task, agents automatically:

1. **Generate Plan** - Break down into sub-tasks
2. **Create Sub-Agents** - Each sub-task gets a sub-agent
3. **Resolve Dependencies** - Determine execution order
4. **Execute** - Run based on mode (sequential/parallel/conditional)
5. **Aggregate Results** - Combine sub-agent outputs

**Example**:

```
User: "Research AI trends, write an article, and create social media posts"

Agent Plan:
1. Sub-Agent 1 (Research): Gather latest AI trends
2. Sub-Agent 2 (Write): Write 1500-word article
3. Sub-Agent 3 (Social Media): Create 5 tweets
4. Sub-Agent 4 (Social Media): Create LinkedIn post
5. Sub-Agent 5 (Social Media): Create Instagram caption

Execution: Sequential (1 → 2 → 3,4,5 parallel)
```

### Sub-Agent Configuration

**Priority Levels**:

- `critical` - Highest priority
- `high` - High priority
- `normal` - Default priority
- `low` - Background priority
- `background` - Lowest priority

**Dependencies**:

```typescript
{
  dependencies: ['agent-1-id', 'agent-2-id'],
  // This agent waits for dependencies to complete
}
```

**Context Sharing**:

```typescript
{
  inheritParentContext: true,  // Get parent's conversation history
  shareResults: true,          // Make results available to siblings
}
```

## Agent Planning

Create structured plans before execution for better control.

### Manual Plan Creation

**Create Plan in Editor**:

1. Open Agent Plan Editor (chat header → "Plan")
2. Add steps with descriptions
3. Define step dependencies
4. Assign tools to each step
5. Approve and execute plan

**Plan Structure**:

```typescript
{
  name: 'Data Migration Plan',
  steps: [
    {
      id: '1',
      description: 'Backup existing data',
      status: 'pending',
      dependencies: [],
      tools: ['file_operations'],
      estimatedDuration: 300
    },
    {
      id: '2',
      description: 'Transform data format',
      status: 'pending',
      dependencies: ['1'],
      tools: ['code_interpreter'],
      estimatedDuration: 600
    },
    {
      id: '3',
      description: 'Validate transformed data',
      status: 'pending',
      dependencies: ['2'],
      tools: ['calculator', 'code_interpreter'],
      estimatedDuration: 300
    }
  ]
}
```

### Executing Plans

**Execute Plan**:

1. Create or load plan
2. Review steps and dependencies
3. Click "Execute Plan"
4. Monitor progress in Agent Steps panel
5. View results after completion

**Plan Status**:

- `draft` - Plan being created
- `approved` - Ready to execute
- `executing` - Currently running
- `completed` - All steps finished
- `failed` - One or more steps failed
- `cancelled` - Execution cancelled

**Step Status**:

- `pending` - Waiting to execute
- `in_progress` - Currently executing
- `completed` - Finished successfully
- `failed` - Execution failed
- `skipped` - Not executed (conditional)

## Visualization

Monitor agent execution in real-time.

### Agent Steps Panel

**What it Shows**:

- Current step number (e.g., "Step 3 of 5")
- Progress bar with percentage
- List of all steps with status icons
- Tool execution cards
- Timing information (duration per step)
- Error messages (if any)

**Status Indicators**:

- ⚪ **Circle** - Pending
- 🔵 **Spinner** - In Progress
- ✅ **Check** - Completed
- ❌ **X** - Failed

**Tool Call Cards**:

- Tool name
- Input parameters
- Output results
- Execution duration
- Error details (if failed)

**Opening the Panel**:

- Automatically appears during agent execution
- Or click "Agent Steps" button in chat header

### Background Agent Panel

**Panel Features**:

- List of all background agents
- Agent cards with status badges
- Queue controls (pause/resume)
- Agent flow visualization
- Notification center
- Agent detail view

**Agent Card**:

- Agent name and mode
- Status badge (queued, running, completed, failed)
- Progress bar
- Execution time
- Notification count
- Action buttons (pause, resume, cancel, delete)

**Agent Flow Visualizer**:

- Visual representation of execution flow
- Sub-agent relationships
- Dependency graph
- Parallel/sequential execution indication

### Background Agent Indicator

**Status Bar Indicator**:

- Shows count of running agents
- Badge with number of unread notifications
- Click to open Background Agent Panel

**Indicator States**:

- Gray - No agents
- Blue - Agents queued
- Green - Agents running
- Red - Agent failed
- Yellow - Agent waiting for approval

## Configuration

### Agent Settings

**Access Settings**:

1. Go to Settings → Agent
2. Configure default behavior

**Default Settings**:

```typescript
{
  maxSteps: 10,                  // Max steps per agent execution
  requireApproval: false,        // Require approval for tool calls
  enableSkills: true,            // Enable Skills integration
  enableMcpTools: true,          // Enable MCP tools
  enableRAG: true,               // Enable RAG search
  timeout: 300000,               // Execution timeout (5 minutes)
  stopWhen: 'noToolCalls',       // When to stop execution
}
```

**Stop Conditions**:

- `stepCount` - Stop after maxSteps
- `hasToolCall` - Stop when tool call made
- `noToolCalls` - Stop when no more tool calls
- `custom` - Custom stop condition

### Tool Approval

**Require Approval**:
When enabled, agent asks for permission before calling tools:

```
Agent: "I need to search the web for 'latest AI trends'. Allow?"
[Approve] [Deny]
```

**Configure Approval**:

1. Go to Settings → Agent → Tool Approval
2. Toggle "Require Approval"
3. Choose which tools require approval:
   - All tools
   - Only sensitive tools (file operations, web search)
   - No tools

### Creating Custom Agent Modes

**Create Custom Mode**:

1. Go to Agent mode selector
2. Click "Create Custom Mode"
3. Configure:
   - Name and description
   - System prompt
   - Available tools
   - Output format
   - Icon and color
4. Save custom mode

**Example Custom Mode**:

```typescript
{
  name: 'SEO Writer',
  description: 'Optimized for SEO content creation',
  systemPrompt: 'You are an SEO expert. Always include keywords, meta descriptions, and optimize for search engines.',
  tools: ['web_search', 'calculator'],
  outputFormat: 'markdown',
  icon: 'search',
  color: 'blue'
}
```

## Tips & Tricks

### For Better Results

**1. Be Specific with Tasks**:

```
Bad: "Write code"
Good: "Write a TypeScript function that validates email addresses using regex, with error handling and JSDoc comments"
```

**2. Provide Context**:

```
Bad: "Fix this bug"
Good: "Fix the bug in the login form where users with special characters in passwords can't log in. The error occurs at line 42 in LoginForm.tsx"
```

**3. Use Appropriate Modes**:

- Web Designer → UI/UX tasks
- Code Generator → Programming tasks
- Data Analyst → Data analysis
- Writing Assistant → Content creation
- Research Assistant → Information gathering
- Presentation Generator → Slide decks
- Workflow Executor → Multi-step procedures

**4. Leverage Tools**:

- Upload files for analysis
- Enable relevant Skills
- Configure MCP servers for custom tools
- Use RAG with your knowledge base

**5. Monitor Execution**:

- Watch Agent Steps panel for progress
- Check tool call results
- Review errors and adjust
- Cancel if going in wrong direction

### For Complex Tasks

**Break Down Large Tasks**:

```
Instead of: "Build a full e-commerce site"
Try:
1. "Design the product listing page"
2. "Create the shopping cart component"
3. "Implement checkout flow"
```

**Use Background Mode**:

- For long-running tasks (research, large code generation)
- When you need to continue working
- For automated workflows

**Leverage Sub-Agents**:

- Let agent plan sub-tasks automatically
- Or manually create plan for more control
- Use parallel execution for independent tasks

**Set Appropriate Timeouts**:

- Simple tasks: 1-2 minutes
- Complex tasks: 5-10 minutes
- Background tasks: 30+ minutes

### For Productivity

**Keyboard Shortcuts**:

- `Ctrl/Cmd+Shift+A` - Open Background Agent Panel
- `Ctrl/Cmd+K` - Focus agent mode selector
- `Escape` - Close agent panels

**Quick Actions**:

- Pin frequently used agent modes
- Save commonly used plans
- Create custom modes for repetitive tasks

**Batch Operations**:

- Queue multiple similar tasks
- Use parallel sub-agents
- Set appropriate priorities

## Troubleshooting

### Agent Not Starting

**Problem**: Agent doesn't execute when you send message

**Solutions**:

1. Check if Agent mode is selected (not Chat mode)
2. Verify provider API key is valid
3. Ensure selected model supports tool calling
4. Check internet connection
5. Try restarting the page

### Agent Stuck in Loop

**Problem**: Agent keeps calling tools without finishing

**Solutions**:

1. Set `maxSteps` limit in agent settings
2. Change `stopWhen` condition to `noToolCalls`
3. Click "Stop" to halt execution
4. Rephrase your prompt to be more specific
5. Use a more capable model (e.g., Claude Opus)

### Tools Not Available

**Problem**: Agent can't access certain tools

**Solutions**:

1. Check if tools are enabled in agent settings
2. Verify MCP servers are connected
3. Ensure Skills are activated
4. Check if RAG is configured with vector database
5. Verify tool approval isn't blocking execution

### Background Agent Failed

**Problem**: Background agent shows failed status

**Solutions**:

1. View agent logs for error details
2. Check if provider API rate limit was hit
3. Verify task timeout isn't too short
4. Check network connectivity
5. Retry with adjusted configuration

### Slow Execution

**Problem**: Agent taking too long to complete

**Solutions**:

1. Use faster model (e.g., GPT-4o Mini instead of GPT-4o)
2. Reduce `maxSteps` limit
3. Disable unnecessary tools
4. Break task into smaller sub-tasks
5. Use background mode for long tasks

### Memory Issues

**Problem**: Agent using too much context or tokens

**Solutions**:

1. Reduce context length in settings
2. Disable verbose logging
3. Use fewer tools (less system prompt)
4. Clear old agent history
5. Break into smaller tasks

## FAQ

**Q: What's the difference between Chat mode and Agent mode?**
A: Chat mode is for simple conversations. Agent mode can use tools, plan multi-step tasks, and work in background.

**Q: Can agents use my custom Skills?**
A: Yes! Just activate your Skills in Settings, and agents will automatically have access to them.

**Q: How many agents can run in background?**
A: Maximum 3 concurrent agents. Additional agents are queued and executed when slots become available.

**Q: Do background agents continue if I close the browser?**
A: No, background agents only run while the app is open. They will be restored when you reopen the app if they haven't completed.

**Q: Can I schedule agents to run at specific times?**
A: Not directly. However, you can create a workflow and manually start it when needed.

**Q: How do I stop a running agent?**
A: Click the "Stop" button in the Agent Steps panel or use the cancel action in the Background Agent Panel.

**Q: Are my conversations shared with MCP tools?**
A: Only the specific tool call parameters are sent to MCP servers. The full conversation history stays local.

**Q: Can agents access files on my computer?**
A: Yes, if you enable file operation tools and grant permission. Be careful with sensitive files.

**Q: How do I see what tools an agent used?**
A: Check the Agent Steps panel during or after execution. Each tool call is logged with inputs and outputs.

**Q: What happens if an agent fails halfway through?**
A: The agent stops execution and shows an error. You can review the failure, adjust the task, and retry. Partial results are preserved.

**Q: Can I export agent results?**
A: Yes! Use the export button in the Agent Steps panel or Background Agent Panel to save results as text, JSON, or Markdown.

## See Also

- [AI Integration Guide](ai-integration.md) - Provider and model configuration
- [MCP Guide](mcp-guide.md) - MCP server setup and configuration
- [Chat Features Guide](chat-features.md) - General chat functionality
- [Configuration Guide](configuration.md) - Settings and customization

---

**Last Updated**: December 26, 2024
