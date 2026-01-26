# Python Plugin Example

This example demonstrates how to create a Python plugin for Cognia.

## Features

- **fetch_weather**: Fetch mock weather data for a city
- **count_words**: Count words, characters, and sentences in text
- **Agent step hook**: Log when an agent executes a step

## Installation

1. Copy this directory to your Cognia plugins folder
2. The plugin will automatically install its Python dependencies
3. Enable the plugin in Cognia settings

## Usage

Once enabled, the tools will be available to the AI agent:

- "What's the weather in New York?"
- "Count the words in this paragraph..."

## Code Structure

```
python-plugin/
├── plugin.json    # Plugin manifest
├── main.py        # Python plugin implementation
└── README.md      # This file
```

## Key Concepts

### Plugin Class

```python
from cognia import Plugin, tool, hook

class WeatherPlugin(Plugin):
    name = "python-plugin-example"
    version = "1.0.0"
```

### Tool Decorator

```python
@tool(
    name="fetch_weather",
    description="Fetch current weather for a city",
    parameters={...}
)
async def fetch_weather(self, city: str):
    ...
```

### Hook Decorator

```python
@hook("on_agent_step")
async def log_agent_step(self, agent_id: str, step: dict):
    ...
```

### Lifecycle Methods

- `on_load()`: Called when plugin is loaded
- `on_enable()`: Called when plugin is enabled
- `on_disable()`: Called when plugin is disabled
- `on_unload()`: Called when plugin is unloaded

## Dependencies

Python dependencies are specified in `plugin.json`:

```json
{
  "pythonDependencies": [
    "requests>=2.28.0"
  ]
}
```

These are automatically installed when the plugin loads.
