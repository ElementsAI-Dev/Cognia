"""
Custom Mode Plugin for Cognia

Demonstrates custom mode support for specialized AI behaviors.
"""

from cognia import (
    Plugin, tool, hook,
    Schema, parameters,
    mode, ModeBuilder, ModeTemplates, OutputFormat,
    ModeDef, ModeContext, ModeToolConfig,
    ExtendedPluginContext, HookType,
)
from typing import List, Dict, Any, Optional


class CustomModePlugin(Plugin):
    """Custom Mode Plugin - Define specialized AI chat modes"""
    
    name = "custom-modes"
    version = "1.0.0"
    description = "Provides custom chat modes for specialized AI interactions"
    capabilities = ["tools", "modes"]
    permissions = []
    
    def __init__(self, context: Optional[ExtendedPluginContext] = None):
        super().__init__(context)
        self._active_mode: Optional[str] = None
    
    # Define a mode using the decorator
    @mode(
        "python-expert",
        "Python Expert",
        "Expert Python developer mode with focus on best practices",
        "code",
        system_prompt="""You are an expert Python developer with deep knowledge of:
- Python 3.x features and best practices
- Type hints and mypy
- pytest and testing patterns
- async/await and concurrency
- Package structure and distribution
- Performance optimization

Always write clean, well-documented, type-annotated Python code.
Follow PEP 8 style guide. Suggest improvements and explain your reasoning.""",
        tools=[
            ModeToolConfig("read_file", required=True),
            ModeToolConfig("write_file", required=True),
            ModeToolConfig("run_command", enabled=True),
        ],
        output_format=OutputFormat.CODE,
        temperature=0.2,
        color="#3776AB",
        shortcut="Ctrl+Shift+P",
        category="development"
    )
    def configure_python_expert(self, context: ModeContext) -> Dict[str, Any]:
        """Configure Python expert mode"""
        return {
            "additionalPrompt": f"Project: {context.project_name or 'Unknown'}",
        }
    
    # Define a mode using ModeBuilder
    def get_code_reviewer_mode(self) -> ModeDef:
        """Build code reviewer mode"""
        return (
            ModeBuilder("code-reviewer")
            .name("Code Reviewer")
            .description("Thorough code review with actionable feedback")
            .icon("search")
            .system_prompt("""You are a senior code reviewer. Your reviews should:
1. Check for bugs and potential issues
2. Evaluate code quality and maintainability
3. Suggest performance improvements
4. Ensure proper error handling
5. Verify security best practices

Provide specific, actionable feedback with code examples when suggesting changes.
Be constructive and explain the "why" behind each suggestion.""")
            .tool("read_file", required=True)
            .tool("grep_search", required=True)
            .output_format(OutputFormat.MARKDOWN)
            .temperature(0.3)
            .color("#4CAF50")
            .category("development")
            .build()
        )
    
    # Use pre-defined templates
    def get_builtin_modes(self) -> List[ModeDef]:
        """Get built-in mode templates"""
        return [
            ModeTemplates.code_assistant("code-helper"),
            ModeTemplates.creative_writer("story-writer"),
            ModeTemplates.data_analyst("data-expert"),
            ModeTemplates.researcher("research-assistant"),
        ]
    
    @tool(
        name="list_custom_modes",
        description="List all available custom chat modes",
        parameters=parameters({})
    )
    async def list_custom_modes(self) -> Dict[str, Any]:
        """List all custom modes provided by this plugin"""
        modes = []
        
        # Add decorator-defined modes
        for method_name in dir(self):
            method = getattr(self, method_name)
            if hasattr(method, "_mode_metadata"):
                mode_def = method._mode_metadata
                modes.append({
                    "id": mode_def.id,
                    "name": mode_def.name,
                    "description": mode_def.description,
                    "category": mode_def.category,
                    "icon": mode_def.icon,
                })
        
        # Add builder modes
        reviewer = self.get_code_reviewer_mode()
        modes.append({
            "id": reviewer.id,
            "name": reviewer.name,
            "description": reviewer.description,
            "category": reviewer.category,
            "icon": reviewer.icon,
        })
        
        # Add template modes
        for template_mode in self.get_builtin_modes():
            modes.append({
                "id": template_mode.id,
                "name": template_mode.name,
                "description": template_mode.description,
                "category": template_mode.category,
                "icon": template_mode.icon,
            })
        
        return {
            "modes": modes,
            "count": len(modes),
        }
    
    @tool(
        name="create_custom_mode",
        description="Create a new custom mode dynamically",
        parameters=parameters({
            "id": Schema.string("Unique mode ID"),
            "name": Schema.string("Display name"),
            "description": Schema.string("Mode description"),
            "system_prompt": Schema.string("System prompt for the mode"),
            "temperature": Schema.optional(Schema.number("Temperature (0.0-1.0)")),
            "tools": Schema.optional(Schema.array(Schema.string(), "Tool names to enable")),
        })
    )
    async def create_custom_mode(
        self,
        id: str,
        name: str,
        description: str,
        system_prompt: str,
        temperature: Optional[float] = None,
        tools: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Create a custom mode dynamically"""
        mode_def = (
            ModeBuilder(id)
            .name(name)
            .description(description)
            .icon("sparkles")
            .system_prompt(system_prompt)
            .temperature(temperature or 0.7)
            .tools(tools or [])
            .category("custom")
            .build()
        )
        
        return {
            "success": True,
            "mode": mode_def.to_dict(),
            "message": f"Created mode '{name}' (ID: {id})",
        }
    
    @hook(HookType.ON_CHAT_REQUEST)
    async def on_chat_request(self, request):
        """Log when custom mode is used in chat"""
        mode_id = request.get("mode")
        if mode_id and mode_id.startswith(("python-expert", "code-reviewer")):
            self.logger.log_info(f"Custom mode active: {mode_id}")
        return request
    
    @hook("on_load")
    async def on_load(self):
        """Register modes when plugin loads"""
        await super().on_load()
        
        # Collect all modes
        all_modes = []
        
        # Decorator modes
        for method_name in dir(self):
            method = getattr(self, method_name)
            if hasattr(method, "_mode_metadata"):
                all_modes.append(method._mode_metadata)
        
        # Builder modes
        all_modes.append(self.get_code_reviewer_mode())
        
        # Template modes
        all_modes.extend(self.get_builtin_modes())
        
        self.logger.log_info(f"Registered {len(all_modes)} custom modes")


# Export the plugin class
__all__ = ["CustomModePlugin"]
