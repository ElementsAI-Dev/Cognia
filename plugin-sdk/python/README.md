# Cognia Plugin SDK for Python

Create powerful Python plugins for Cognia with ease. This SDK provides full access to Cognia's extensive API including session management, RAG/vector search, theme customization, and more.

## Installation

```bash
pip install cognia-plugin-sdk
```

Or install from source:

```bash
cd plugin-sdk/python
pip install -e .
```

## Quick Start

Create a new plugin by subclassing `Plugin`:

```python
from cognia import Plugin, tool, hook, ExtendedPluginContext

class MyPlugin(Plugin):
    name = "my-awesome-plugin"
    version = "1.0.0"
    description = "An awesome plugin that does cool things"
    capabilities = ["tools", "hooks"]
    permissions = ["session:read", "network:fetch"]
    
    def __init__(self, context: ExtendedPluginContext = None):
        super().__init__(context)
    
    @tool(description="Add two numbers together")
    def add(self, a: int, b: int) -> int:
        """Add two numbers and return the result."""
        return a + b
    
    @tool(
        name="analyze_text",
        description="Analyze text and return statistics",
        parameters={
            "text": {"type": "string", "description": "Text to analyze"},
            "include_words": {"type": "boolean", "description": "Include word count", "required": False}
        }
    )
    def analyze(self, text: str, include_words: bool = True) -> dict:
        result = {
            "length": len(text),
            "lines": text.count("\n") + 1,
        }
        if include_words:
            result["words"] = len(text.split())
        return result
    
    @hook("on_agent_step")
    async def on_agent_step(self, agent_id: str, step: dict):
        self.logger.log_info(f"Agent {agent_id} completed step: {step.get('type')}")
    
    @hook("on_message_receive")
    async def on_message(self, message):
        # Access extended APIs via context
        if self.context.session:
            session = self.context.session.get_current_session()
            self.logger.log_info(f"Message in session: {session.title}")
        return message
```

## Decorators

### @tool

Mark a method as a tool that can be called by the AI agent:

```python
@tool(
    name="tool_name",           # Optional, defaults to method name
    description="What it does", # Required
    parameters={...},           # Optional, auto-detected from type hints
    requires_approval=False,    # Whether user must approve execution
    category="utilities"        # Optional category for organization
)
def my_tool(self, arg1: str, arg2: int = 10) -> dict:
    ...
```

### @hook

Subscribe to system events:

```python
@hook("on_agent_start", priority=10)
async def on_start(self, agent_id: str, config: dict):
    ...
```

Available hooks:

- `on_load` - Plugin loaded
- `on_enable` - Plugin enabled
- `on_disable` - Plugin disabled
- `on_unload` - Plugin unloaded
- `on_config_change` - Configuration changed
- `on_agent_start` - Agent execution started
- `on_agent_step` - Agent completed a step
- `on_agent_tool_call` - Agent calling a tool
- `on_agent_complete` - Agent finished
- `on_message_send` - Message being sent
- `on_message_receive` - Message received
- `on_session_create` - New chat session
- `on_session_switch` - Switched sessions

### @command

Register a slash command:

```python
@command(
    name="mycommand",
    description="Do something",
    shortcut="Ctrl+Alt+M"
)
def my_command(self, args: list):
    ...
```

## Plugin Manifest

Generate a `plugin.json` manifest:

```python
MyPlugin.generate_manifest_file("plugin.json")
```

Or manually create `plugin.json`:

```json
{
  "id": "my-awesome-plugin",
  "name": "My Awesome Plugin",
  "version": "1.0.0",
  "description": "An awesome plugin",
  "type": "python",
  "capabilities": ["tools"],
  "pythonMain": "main.py",
  "pythonDependencies": ["requests>=2.28"],
  "permissions": ["network:fetch"]
}
```

## Project Structure

```text
my-plugin/
├── plugin.json       # Plugin manifest
├── main.py          # Main entry point
├── requirements.txt # Python dependencies (optional)
└── README.md        # Documentation
```

## Example: Data Analysis Plugin

```python
# main.py
from cognia import Plugin, tool
import pandas as pd

class DataAnalysisPlugin(Plugin):
    name = "data-analysis"
    version = "1.0.0"
    description = "Analyze CSV data with pandas"
    python_dependencies = ["pandas>=2.0"]
    
    @tool(description="Load and analyze a CSV file")
    async def analyze_csv(self, file_path: str, query: str = None) -> dict:
        """Load CSV and optionally run a query."""
        df = pd.read_csv(file_path)
        
        result = {
            "rows": len(df),
            "columns": list(df.columns),
            "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
            "summary": df.describe().to_dict(),
        }
        
        if query:
            # Execute query using pandas query method
            filtered = df.query(query)
            result["query_result"] = {
                "matching_rows": len(filtered),
                "sample": filtered.head(10).to_dict("records"),
            }
        
        return result
    
    @tool(description="Get column statistics")
    def column_stats(self, file_path: str, column: str) -> dict:
        df = pd.read_csv(file_path)
        col = df[column]
        
        return {
            "column": column,
            "count": int(col.count()),
            "unique": int(col.nunique()),
            "null_count": int(col.isnull().sum()),
            "dtype": str(col.dtype),
            "sample_values": col.head(5).tolist(),
        }
```

## API Reference

### Plugin Class

**Attributes:**

- **`name`** (`str`): Plugin identifier
- **`version`** (`str`): Semantic version
- **`description`** (`str`): Plugin description
- **`capabilities`** (`List[PluginCapability]`): What the plugin provides
- **`permissions`** (`List[str]`): Required permissions
- **`python_dependencies`** (`List[str]`): pip packages needed

**Lifecycle Methods:**

- **`on_load()`**: Called when plugin loads
- **`on_enable()`**: Called when plugin enables
- **`on_disable()`**: Called when plugin disables
- **`on_unload()`**: Called when plugin unloads
- **`on_config_change(config)`**: Called when config changes

**Utility Methods:**

- **`get_manifest()`**: Get plugin manifest
- **`get_tools()`**: Get registered tools
- **`get_hooks()`**: Get registered hooks

### ExtendedPluginContext

The `ExtendedPluginContext` provides access to all Cognia APIs:

**Core Properties:**

- **`plugin_id`**: Plugin identifier
- **`plugin_path`**: Path to plugin directory
- **`config`**: Plugin configuration dict

**Logging:**

- **`log_debug(msg)`**: Log debug message
- **`log_info(msg)`**: Log info message
- **`log_warn(msg)`**: Log warning message
- **`log_error(msg)`**: Log error message

**Extended APIs:**

- **`session`** (`SessionAPI`): Chat session management
- **`project`** (`ProjectAPI`): Project management
- **`vector`** (`VectorAPI`): Vector/RAG operations
- **`theme`** (`ThemeAPI`): Theme customization
- **`export`** (`ExportAPI`): Export sessions/projects
- **`canvas`** (`CanvasAPI`): Canvas document editing
- **`artifact`** (`ArtifactAPI`): Artifact management
- **`notifications`** (`NotificationCenterAPI`): Notification center
- **`ai`** (`AIProviderAPI`): AI model access
- **`permissions`** (`PermissionAPI`): Permission management
- **`network`** (`NetworkAPI`): HTTP requests
- **`fs`** (`FileSystemAPI`): File operations
- **`shell`** (`ShellAPI`): Shell command execution
- **`db`** (`DatabaseAPI`): Local database operations
- **`shortcuts`** (`ShortcutsAPI`): Keyboard shortcuts
- **`context_menu`** (`ContextMenuAPI`): Context menu items
- **`storage`** (`StorageAPI`): Persistent key-value storage
- **`events`** (`EventsAPI`): Event emitter
- **`ui`** (`UIAPI`): UI utilities (notifications, dialogs)
- **`secrets`** (`SecretsAPI`): Secure credential storage
- **`i18n`** (`I18nAPI`): Internationalization

### Session API Example

```python
# Get current session
session = self.context.session.get_current_session()

# List sessions
sessions = await self.context.session.list_sessions(
    SessionFilter(limit=20, sort_by="updatedAt")
)

# Get messages
messages = await self.context.session.get_messages(session_id)

# Add a message
await self.context.session.add_message(
    session_id, 
    "Hello from plugin!",
    SendMessageOptions(role="assistant")
)
```

### Vector/RAG API Example

```python
# Add documents
await self.context.vector.add_documents("my_collection", [
    VectorDocument(content="Document text", metadata={"source": "web"})
])

# Semantic search
results = await self.context.vector.search(
    "my_collection",
    "search query",
    VectorSearchOptions(top_k=5, threshold=0.7)
)

# Generate embeddings
embedding = await self.context.vector.embed("Text to embed")
```

### Theme API Example

```python
# Get current theme
state = self.context.theme.get_theme()

# Set dark mode
self.context.theme.set_mode(ThemeMode.DARK)

# Create custom theme
theme_id = self.context.theme.register_custom_theme(
    "My Theme",
    ThemeColors(primary="#007ACC", background="#1E1E1E", ...),
    is_dark=True
)

# Activate custom theme
self.context.theme.activate_custom_theme(theme_id)
```

### Network API Example

```python
# HTTP GET request
response = await self.context.network.get("https://api.example.com/data")
if response.ok:
    data = response.data

# HTTP POST request
response = await self.context.network.post(
    "https://api.example.com/data",
    body={"key": "value"},
    options=NetworkRequestOptions(headers={"Authorization": "Bearer token"})
)

# Download file
result = await self.context.network.download(
    "https://example.com/file.pdf",
    "/path/to/save/file.pdf"
)
```

## Available Hooks

### Lifecycle Hooks

- `on_load`, `on_enable`, `on_disable`, `on_unload`, `on_config_change`

### Agent Hooks

- `on_agent_start`, `on_agent_step`, `on_agent_tool_call`, `on_agent_complete`, `on_agent_error`

### Message Hooks

- `on_message_send`, `on_message_receive`, `on_message_render`

### Session Hooks

- `on_session_create`, `on_session_switch`, `on_session_delete`

### Project Hooks

- `on_project_create`, `on_project_update`, `on_project_delete`, `on_project_switch`

### Canvas Hooks

- `on_canvas_create`, `on_canvas_update`, `on_canvas_delete`, `on_canvas_content_change`

### Artifact Hooks

- `on_artifact_create`, `on_artifact_update`, `on_artifact_delete`, `on_artifact_open`

### Theme Hooks

- `on_theme_mode_change`, `on_color_preset_change`, `on_custom_theme_activate`

### AI Hooks

- `on_chat_request`, `on_stream_start`, `on_stream_chunk`, `on_stream_end`, `on_chat_error`

### Vector/RAG Hooks

- `on_documents_indexed`, `on_vector_search`, `on_rag_context_retrieved`

## Schema Helpers

Use the `Schema` class for type-safe parameter definitions:

```python
from cognia import Schema, parameters, tool

@tool(
    name="create_user",
    description="Create a new user",
    parameters=parameters({
        "name": Schema.string("User's full name", min_length=1, max_length=100),
        "email": Schema.string("Email address", format="email"),
        "age": Schema.integer("User's age", minimum=0, maximum=150),
        "role": Schema.string("User role", enum=["admin", "user", "guest"]),
        "tags": Schema.optional(Schema.array(Schema.string(), "User tags")),
        "metadata": Schema.optional(Schema.object({
            "department": Schema.string("Department name"),
            "manager_id": Schema.optional(Schema.string("Manager ID"))
        }))
    })
)
async def create_user(self, name: str, email: str, age: int, role: str, 
                      tags: list = None, metadata: dict = None):
    ...
```

## A2UI Components

Create interactive UI components with A2UI:

```python
from cognia import A2UIBuilder, A2UIComponentType, a2ui_component, a2ui_template

# Using the builder
chart = (
    A2UIBuilder()
    .type(A2UIComponentType.BAR_CHART)
    .name("Sales Chart")
    .props({"data": sales_data, "xAxis": "month", "yAxis": "revenue"})
    .action("refresh", "Refresh Data", icon="refresh-cw")
    .action("export", "Export CSV", icon="download")
    .style(height="300px", border_radius="8px")
    .build()
)

# Using decorators
@a2ui_component(
    "custom-card",
    "Custom Card",
    "A custom card component",
    category="widgets"
)
class CustomCardRenderer(A2UIComponentRenderer):
    async def render(self, props, context):
        return {"type": "card", "props": props}
```

## Custom Modes

Define custom AI chat modes:

```python
from cognia import mode, ModeBuilder, ModeTemplates, OutputFormat

# Using decorator
@mode(
    "python-expert",
    "Python Expert",
    "Expert Python development mode",
    "code",
    system_prompt="You are an expert Python developer...",
    tools=["read_file", "write_file", "run_command"],
    output_format=OutputFormat.CODE,
    temperature=0.2
)
def configure_python_mode(context):
    return {}

# Using builder
code_reviewer = (
    ModeBuilder("code-reviewer")
    .name("Code Reviewer")
    .description("Thorough code review mode")
    .icon("search")
    .system_prompt("You are a senior code reviewer...")
    .tool("read_file", required=True)
    .tool("grep_search", required=True)
    .temperature(0.3)
    .build()
)

# Using templates
analyst = ModeTemplates.data_analyst("my-analyst")
```

## CLI Tools

The SDK includes CLI tools for development:

```bash
# Create a new plugin from template
cognia new my-plugin --description "My awesome plugin"

# Generate/validate plugin.json
cognia manifest
cognia manifest --validate

# Run tests
cognia test
cognia test --verbose

# Package for distribution
cognia pack

# Start development server
cognia dev

# Show SDK version
cognia version
```

## Extended Hooks

All available hooks organized by category:

```python
from cognia import hook, HookType

# Use enum for type safety
@hook(HookType.ON_PROJECT_CREATE)
async def on_project(self, project):
    ...

# Or use string
@hook("on_artifact_create", priority=10)
async def on_artifact(self, artifact):
    ...
```

## Examples

See the `examples/` directory for complete plugin examples:

- **`python-plugin/`** - Basic plugin with tools and hooks
- **`rag_integration/`** - Semantic search and RAG capabilities
- **`a2ui_dashboard/`** - Interactive A2UI dashboards
- **`custom_mode/`** - Custom AI chat modes

## License

MIT License
