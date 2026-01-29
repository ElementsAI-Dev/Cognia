"""
Custom Mode Support for Cognia Plugin SDK

Provides support for defining custom chat modes that change
the AI's behavior, available tools, and output format.
"""

from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, TypeVar, Union
from enum import Enum
import functools


class OutputFormat(Enum):
    """Standard output formats for modes"""
    TEXT = "text"
    MARKDOWN = "markdown"
    CODE = "code"
    JSON = "json"
    HTML = "html"
    XML = "xml"
    STRUCTURED = "structured"


@dataclass
class ModeToolConfig:
    """Tool configuration for a mode"""
    name: str
    enabled: bool = True
    required: bool = False
    config: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ModePromptTemplate:
    """Prompt template for mode"""
    template: str
    variables: Dict[str, str] = field(default_factory=dict)
    
    def render(self, **kwargs) -> str:
        """Render template with variables"""
        result = self.template
        merged_vars = {**self.variables, **kwargs}
        for key, value in merged_vars.items():
            result = result.replace(f"{{{key}}}", str(value))
        return result


@dataclass
class ModeDef:
    """
    Mode definition for custom chat modes.
    
    Modes allow customizing the AI's behavior for specific use cases.
    """
    id: str
    name: str
    description: str
    icon: str
    system_prompt: Optional[str] = None
    prompt_template: Optional[ModePromptTemplate] = None
    tools: Optional[List[Union[str, ModeToolConfig]]] = None
    excluded_tools: Optional[List[str]] = None
    output_format: Optional[str] = None
    preview_enabled: bool = True
    model_override: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    stop_sequences: Optional[List[str]] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    # UI Configuration
    color: Optional[str] = None
    shortcut: Optional[str] = None
    category: Optional[str] = None
    hidden: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        result = {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "icon": self.icon,
        }
        
        if self.system_prompt:
            result["systemPrompt"] = self.system_prompt
        if self.prompt_template:
            result["promptTemplate"] = {
                "template": self.prompt_template.template,
                "variables": self.prompt_template.variables,
            }
        if self.tools is not None:
            result["tools"] = [
                t if isinstance(t, str) else {
                    "name": t.name,
                    "enabled": t.enabled,
                    "required": t.required,
                    "config": t.config,
                }
                for t in self.tools
            ]
        if self.excluded_tools:
            result["excludedTools"] = self.excluded_tools
        if self.output_format:
            result["outputFormat"] = self.output_format
        if not self.preview_enabled:
            result["previewEnabled"] = False
        if self.model_override:
            result["modelOverride"] = self.model_override
        if self.temperature is not None:
            result["temperature"] = self.temperature
        if self.max_tokens:
            result["maxTokens"] = self.max_tokens
        if self.stop_sequences:
            result["stopSequences"] = self.stop_sequences
        if self.metadata:
            result["metadata"] = self.metadata
        if self.color:
            result["color"] = self.color
        if self.shortcut:
            result["shortcut"] = self.shortcut
        if self.category:
            result["category"] = self.category
        if self.hidden:
            result["hidden"] = True
            
        return result


@dataclass
class ModeContext:
    """Context passed to mode handlers"""
    mode_id: str
    session_id: Optional[str] = None
    user_input: Optional[str] = None
    variables: Dict[str, Any] = field(default_factory=dict)
    config: Dict[str, Any] = field(default_factory=dict)


def mode(
    mode_id: str,
    name: str,
    description: str,
    icon: str,
    *,
    system_prompt: Optional[str] = None,
    tools: Optional[List[str]] = None,
    output_format: Optional[str] = None,
    preview_enabled: bool = True,
    model_override: Optional[str] = None,
    temperature: Optional[float] = None,
    color: Optional[str] = None,
    shortcut: Optional[str] = None,
    category: Optional[str] = None,
) -> Callable:
    """
    Decorator to define a custom mode.
    
    The decorated method will be called when the mode is activated
    to provide dynamic configuration.
    
    Args:
        mode_id: Unique mode identifier
        name: Display name for the mode
        description: Mode description
        icon: Icon name (Lucide icon)
        system_prompt: System prompt for the mode
        tools: List of tool names to enable
        output_format: Expected output format
        preview_enabled: Whether to show preview
        model_override: Override default model
        temperature: Override temperature
        color: Mode color
        shortcut: Keyboard shortcut
        category: Mode category
        
    Example:
        @mode(
            "code-review",
            "Code Review",
            "AI-powered code review mode",
            "code",
            system_prompt="You are a code reviewer...",
            tools=["read_file", "grep_search"],
            output_format="markdown"
        )
        def configure_code_review(self, context: ModeContext) -> dict:
            return {
                "additionalPrompt": f"Focus on: {context.variables.get('focus', 'all')}"
            }
    """
    def decorator(func: Callable) -> Callable:
        func._mode_metadata = ModeDef(
            id=mode_id,
            name=name,
            description=description,
            icon=icon,
            system_prompt=system_prompt,
            tools=tools,
            output_format=output_format,
            preview_enabled=preview_enabled,
            model_override=model_override,
            temperature=temperature,
            color=color,
            shortcut=shortcut,
            category=category,
        )
        
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        
        wrapper._mode_metadata = func._mode_metadata
        return wrapper
    
    return decorator


class ModeBuilder:
    """
    Fluent builder for mode definitions.
    
    Example:
        mode_def = (
            ModeBuilder("code-assistant")
            .name("Code Assistant")
            .description("AI-powered coding assistant")
            .icon("code")
            .system_prompt("You are an expert programmer...")
            .tools(["read_file", "write_file", "run_command"])
            .output_format("code")
            .temperature(0.3)
            .build()
        )
    """
    
    def __init__(self, mode_id: str):
        self._id = mode_id
        self._name: str = ""
        self._description: str = ""
        self._icon: str = "message-circle"
        self._system_prompt: Optional[str] = None
        self._prompt_template: Optional[ModePromptTemplate] = None
        self._tools: Optional[List[Union[str, ModeToolConfig]]] = None
        self._excluded_tools: Optional[List[str]] = None
        self._output_format: Optional[str] = None
        self._preview_enabled: bool = True
        self._model_override: Optional[str] = None
        self._temperature: Optional[float] = None
        self._max_tokens: Optional[int] = None
        self._stop_sequences: Optional[List[str]] = None
        self._metadata: Dict[str, Any] = {}
        self._color: Optional[str] = None
        self._shortcut: Optional[str] = None
        self._category: Optional[str] = None
        self._hidden: bool = False
    
    def name(self, name: str) -> 'ModeBuilder':
        """Set mode name"""
        self._name = name
        return self
    
    def description(self, description: str) -> 'ModeBuilder':
        """Set mode description"""
        self._description = description
        return self
    
    def icon(self, icon: str) -> 'ModeBuilder':
        """Set mode icon"""
        self._icon = icon
        return self
    
    def system_prompt(self, prompt: str) -> 'ModeBuilder':
        """Set system prompt"""
        self._system_prompt = prompt
        return self
    
    def prompt_template(self, template: str, **variables: str) -> 'ModeBuilder':
        """Set prompt template with variables"""
        self._prompt_template = ModePromptTemplate(template, variables)
        return self
    
    def tools(self, tool_names: List[str]) -> 'ModeBuilder':
        """Set enabled tools"""
        self._tools = tool_names
        return self
    
    def tool(self, name: str, *, enabled: bool = True, required: bool = False, **config) -> 'ModeBuilder':
        """Add a tool configuration"""
        if self._tools is None:
            self._tools = []
        self._tools.append(ModeToolConfig(name, enabled, required, config))
        return self
    
    def exclude_tools(self, tool_names: List[str]) -> 'ModeBuilder':
        """Exclude specific tools"""
        self._excluded_tools = tool_names
        return self
    
    def output_format(self, format: Union[str, OutputFormat]) -> 'ModeBuilder':
        """Set output format"""
        if isinstance(format, OutputFormat):
            self._output_format = format.value
        else:
            self._output_format = format
        return self
    
    def preview_enabled(self, enabled: bool) -> 'ModeBuilder':
        """Set preview enabled"""
        self._preview_enabled = enabled
        return self
    
    def model(self, model_id: str) -> 'ModeBuilder':
        """Override the model"""
        self._model_override = model_id
        return self
    
    def temperature(self, temp: float) -> 'ModeBuilder':
        """Set temperature"""
        self._temperature = temp
        return self
    
    def max_tokens(self, tokens: int) -> 'ModeBuilder':
        """Set max tokens"""
        self._max_tokens = tokens
        return self
    
    def stop_sequences(self, sequences: List[str]) -> 'ModeBuilder':
        """Set stop sequences"""
        self._stop_sequences = sequences
        return self
    
    def metadata(self, **kwargs) -> 'ModeBuilder':
        """Add metadata"""
        self._metadata.update(kwargs)
        return self
    
    def color(self, color: str) -> 'ModeBuilder':
        """Set mode color"""
        self._color = color
        return self
    
    def shortcut(self, shortcut: str) -> 'ModeBuilder':
        """Set keyboard shortcut"""
        self._shortcut = shortcut
        return self
    
    def category(self, category: str) -> 'ModeBuilder':
        """Set mode category"""
        self._category = category
        return self
    
    def hidden(self, hidden: bool = True) -> 'ModeBuilder':
        """Set hidden flag"""
        self._hidden = hidden
        return self
    
    def build(self) -> ModeDef:
        """Build the mode definition"""
        return ModeDef(
            id=self._id,
            name=self._name,
            description=self._description,
            icon=self._icon,
            system_prompt=self._system_prompt,
            prompt_template=self._prompt_template,
            tools=self._tools,
            excluded_tools=self._excluded_tools,
            output_format=self._output_format,
            preview_enabled=self._preview_enabled,
            model_override=self._model_override,
            temperature=self._temperature,
            max_tokens=self._max_tokens,
            stop_sequences=self._stop_sequences,
            metadata=self._metadata,
            color=self._color,
            shortcut=self._shortcut,
            category=self._category,
            hidden=self._hidden,
        )


# Pre-defined mode templates
class ModeTemplates:
    """Pre-defined mode templates for common use cases"""
    
    @staticmethod
    def code_assistant(mode_id: str = "code-assistant") -> ModeDef:
        """Code assistant mode template"""
        return (
            ModeBuilder(mode_id)
            .name("Code Assistant")
            .description("AI-powered coding assistant for development tasks")
            .icon("code")
            .system_prompt(
                "You are an expert programmer. Help the user with coding tasks. "
                "Write clean, efficient, and well-documented code. "
                "Explain your code when asked."
            )
            .tools(["read_file", "write_file", "run_command", "grep_search"])
            .output_format("code")
            .temperature(0.3)
            .category("development")
            .build()
        )
    
    @staticmethod
    def creative_writer(mode_id: str = "creative-writer") -> ModeDef:
        """Creative writing mode template"""
        return (
            ModeBuilder(mode_id)
            .name("Creative Writer")
            .description("Creative writing and storytelling mode")
            .icon("pen-tool")
            .system_prompt(
                "You are a creative writer. Help the user with creative writing tasks. "
                "Be imaginative, expressive, and engaging. "
                "Adapt your style to match the requested genre or tone."
            )
            .output_format("markdown")
            .temperature(0.9)
            .category("writing")
            .build()
        )
    
    @staticmethod
    def data_analyst(mode_id: str = "data-analyst") -> ModeDef:
        """Data analysis mode template"""
        return (
            ModeBuilder(mode_id)
            .name("Data Analyst")
            .description("Data analysis and visualization mode")
            .icon("bar-chart")
            .system_prompt(
                "You are a data analyst. Help the user analyze data, "
                "create visualizations, and derive insights. "
                "Be precise and use statistical methods when appropriate."
            )
            .tools(["read_file", "run_command"])
            .output_format("structured")
            .temperature(0.2)
            .category("analysis")
            .build()
        )
    
    @staticmethod
    def researcher(mode_id: str = "researcher") -> ModeDef:
        """Research mode template"""
        return (
            ModeBuilder(mode_id)
            .name("Researcher")
            .description("Research and fact-finding mode")
            .icon("search")
            .system_prompt(
                "You are a researcher. Help the user find information, "
                "synthesize sources, and provide well-cited answers. "
                "Be thorough and objective."
            )
            .tools(["web_search", "read_url"])
            .output_format("markdown")
            .temperature(0.4)
            .category("research")
            .build()
        )


__all__ = [
    # Enums
    "OutputFormat",
    # Data classes
    "ModeToolConfig",
    "ModePromptTemplate",
    "ModeDef",
    "ModeContext",
    # Decorator
    "mode",
    # Builder
    "ModeBuilder",
    # Templates
    "ModeTemplates",
]
