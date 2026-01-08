# Cognia Plugin SDK for Python

Create powerful Python plugins for Cognia with ease.

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
from cognia import Plugin, tool, hook

class MyPlugin(Plugin):
    name = "my-awesome-plugin"
    version = "1.0.0"
    description = "An awesome plugin that does cool things"
    
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

```
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

| Attribute | Type | Description |
|-----------|------|-------------|
| `name` | `str` | Plugin identifier |
| `version` | `str` | Semantic version |
| `description` | `str` | Plugin description |
| `capabilities` | `List[PluginCapability]` | What the plugin provides |
| `permissions` | `List[str]` | Required permissions |
| `python_dependencies` | `List[str]` | pip packages needed |

| Method | Description |
|--------|-------------|
| `on_load()` | Called when plugin loads |
| `on_enable()` | Called when plugin enables |
| `on_disable()` | Called when plugin disables |
| `on_unload()` | Called when plugin unloads |
| `on_config_change(config)` | Called when config changes |
| `get_manifest()` | Get plugin manifest |
| `get_tools()` | Get registered tools |
| `get_hooks()` | Get registered hooks |

### PluginContext

| Property | Description |
|----------|-------------|
| `plugin_id` | Plugin identifier |
| `plugin_path` | Path to plugin directory |
| `config` | Plugin configuration dict |

| Method | Description |
|--------|-------------|
| `log_debug(msg)` | Log debug message |
| `log_info(msg)` | Log info message |
| `log_warn(msg)` | Log warning message |
| `log_error(msg)` | Log error message |

## License

MIT License
