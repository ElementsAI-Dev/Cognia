"""
Unit tests for cognia.modes module
"""

import pytest
from cognia.modes import (
    OutputFormat,
    ModeToolConfig,
    ModePromptTemplate,
    ModeDef,
    ModeContext,
    mode,
    ModeBuilder,
    ModeTemplates,
)


class TestOutputFormat:
    """Tests for OutputFormat enum"""
    
    def test_format_values(self):
        """Test OutputFormat enum values"""
        assert OutputFormat.TEXT.value == "text"
        assert OutputFormat.MARKDOWN.value == "markdown"
        assert OutputFormat.CODE.value == "code"
        assert OutputFormat.JSON.value == "json"


class TestModeToolConfig:
    """Tests for ModeToolConfig"""
    
    def test_basic_config(self):
        """Test basic tool config"""
        config = ModeToolConfig(name="read_file")
        assert config.name == "read_file"
        assert config.enabled == True
        assert config.required == False
    
    def test_full_config(self):
        """Test full tool config"""
        config = ModeToolConfig(
            name="execute",
            enabled=True,
            required=True,
            config={"timeout": 30}
        )
        assert config.name == "execute"
        assert config.required == True
        assert config.config["timeout"] == 30


class TestModePromptTemplate:
    """Tests for ModePromptTemplate"""
    
    def test_basic_template(self):
        """Test basic prompt template"""
        template = ModePromptTemplate(
            template="Hello {name}!",
            variables={"name": "World"}
        )
        result = template.render()
        assert result == "Hello World!"
    
    def test_template_override(self):
        """Test template with override"""
        template = ModePromptTemplate(
            template="Hello {name}!",
            variables={"name": "Default"}
        )
        result = template.render(name="Override")
        assert result == "Hello Override!"


class TestModeDef:
    """Tests for ModeDef"""
    
    def test_basic_mode(self):
        """Test basic mode definition"""
        mode_def = ModeDef(
            id="test-mode",
            name="Test Mode",
            description="A test mode",
            icon="test"
        )
        assert mode_def.id == "test-mode"
        assert mode_def.name == "Test Mode"
        assert mode_def.preview_enabled == True
    
    def test_mode_to_dict(self):
        """Test mode to dict conversion"""
        mode_def = ModeDef(
            id="code-mode",
            name="Code Mode",
            description="For coding",
            icon="code",
            system_prompt="You are a coder",
            tools=["read_file", "write_file"],
            output_format="code",
            temperature=0.3
        )
        result = mode_def.to_dict()
        
        assert result["id"] == "code-mode"
        assert result["systemPrompt"] == "You are a coder"
        assert result["tools"] == ["read_file", "write_file"]
        assert result["outputFormat"] == "code"
        assert result["temperature"] == 0.3
    
    def test_mode_with_tool_configs(self):
        """Test mode with ModeToolConfig"""
        mode_def = ModeDef(
            id="advanced-mode",
            name="Advanced Mode",
            description="Advanced",
            icon="settings",
            tools=[
                "simple_tool",
                ModeToolConfig("complex_tool", required=True, config={"x": 1})
            ]
        )
        result = mode_def.to_dict()
        
        assert result["tools"][0] == "simple_tool"
        assert result["tools"][1]["name"] == "complex_tool"
        assert result["tools"][1]["required"] == True


class TestModeDecorator:
    """Tests for @mode decorator"""
    
    def test_basic_decorator(self):
        """Test basic mode decorator"""
        @mode(
            "my-mode",
            "My Mode",
            "A custom mode",
            "star",
            system_prompt="You are helpful"
        )
        def configure_mode(context):
            return {}
        
        assert hasattr(configure_mode, "_mode_metadata")
        metadata = configure_mode._mode_metadata
        assert metadata.id == "my-mode"
        assert metadata.name == "My Mode"
        assert metadata.system_prompt == "You are helpful"
    
    def test_decorator_with_tools(self):
        """Test mode decorator with tools"""
        @mode(
            "tool-mode",
            "Tool Mode",
            "Has tools",
            "wrench",
            tools=["tool1", "tool2"]
        )
        def configure_tools(context):
            pass
        
        metadata = configure_tools._mode_metadata
        assert metadata.tools == ["tool1", "tool2"]


class TestModeBuilder:
    """Tests for ModeBuilder"""
    
    def test_basic_builder(self):
        """Test basic mode builder"""
        mode_def = (
            ModeBuilder("builder-mode")
            .name("Builder Mode")
            .description("Built with builder")
            .icon("hammer")
            .build()
        )
        
        assert mode_def.id == "builder-mode"
        assert mode_def.name == "Builder Mode"
        assert mode_def.icon == "hammer"
    
    def test_full_builder(self):
        """Test full mode builder"""
        mode_def = (
            ModeBuilder("full-mode")
            .name("Full Mode")
            .description("All options")
            .icon("settings")
            .system_prompt("You are an expert")
            .tools(["read", "write"])
            .output_format(OutputFormat.MARKDOWN)
            .temperature(0.5)
            .max_tokens(4000)
            .color("#FF0000")
            .shortcut("Ctrl+Shift+M")
            .category("custom")
            .build()
        )
        
        result = mode_def.to_dict()
        assert result["systemPrompt"] == "You are an expert"
        assert result["tools"] == ["read", "write"]
        assert result["outputFormat"] == "markdown"
        assert result["temperature"] == 0.5
        assert result["maxTokens"] == 4000
        assert result["color"] == "#FF0000"
        assert result["shortcut"] == "Ctrl+Shift+M"
        assert result["category"] == "custom"
    
    def test_builder_tool_method(self):
        """Test builder with individual tool configs"""
        mode_def = (
            ModeBuilder("tool-config-mode")
            .name("Tool Config")
            .description("Individual tools")
            .icon("tool")
            .tool("read_file", required=True)
            .tool("write_file", enabled=True, timeout=30)
            .build()
        )
        
        assert len(mode_def.tools) == 2
        assert mode_def.tools[0].name == "read_file"
        assert mode_def.tools[0].required == True
    
    def test_builder_prompt_template(self):
        """Test builder with prompt template"""
        mode_def = (
            ModeBuilder("template-mode")
            .name("Template Mode")
            .description("Has template")
            .icon("file-text")
            .prompt_template("Focus on {topic}", topic="coding")
            .build()
        )
        
        assert mode_def.prompt_template is not None
        assert mode_def.prompt_template.render() == "Focus on coding"


class TestModeTemplates:
    """Tests for ModeTemplates pre-defined modes"""
    
    def test_code_assistant(self):
        """Test code assistant template"""
        mode_def = ModeTemplates.code_assistant()
        
        assert mode_def.id == "code-assistant"
        assert mode_def.name == "Code Assistant"
        assert mode_def.category == "development"
        assert mode_def.temperature == 0.3
        assert "read_file" in mode_def.tools
    
    def test_code_assistant_custom_id(self):
        """Test code assistant with custom ID"""
        mode_def = ModeTemplates.code_assistant("my-coder")
        assert mode_def.id == "my-coder"
    
    def test_creative_writer(self):
        """Test creative writer template"""
        mode_def = ModeTemplates.creative_writer()
        
        assert mode_def.id == "creative-writer"
        assert mode_def.temperature == 0.9
        assert mode_def.category == "writing"
    
    def test_data_analyst(self):
        """Test data analyst template"""
        mode_def = ModeTemplates.data_analyst()
        
        assert mode_def.id == "data-analyst"
        assert mode_def.category == "analysis"
    
    def test_researcher(self):
        """Test researcher template"""
        mode_def = ModeTemplates.researcher()
        
        assert mode_def.id == "researcher"
        assert mode_def.category == "research"
        assert "web_search" in mode_def.tools
