"""
Theme Customizer Plugin for Cognia

Demonstrates the Theme API for creating and managing custom themes.
"""

from cognia import (
    Plugin, tool, hook, command,
    ThemeColors, ThemeMode, ColorThemePreset,
    ExtendedPluginContext,
)
from typing import Dict, Any, Optional, List


class ThemeCustomizerPlugin(Plugin):
    """Theme Customizer Plugin - Create and manage custom themes"""
    
    name = "theme-customizer"
    version = "1.0.0"
    description = "Create, manage, and switch between custom themes"
    capabilities = ["tools", "hooks", "commands"]
    permissions = ["theme:read", "theme:write"]
    
    # Predefined color palettes
    COLOR_PALETTES = {
        "nord": {
            "primary": "#5E81AC",
            "primary_foreground": "#ECEFF4",
            "secondary": "#81A1C1",
            "secondary_foreground": "#2E3440",
            "accent": "#88C0D0",
            "accent_foreground": "#2E3440",
            "background": "#2E3440",
            "foreground": "#ECEFF4",
            "muted": "#3B4252",
            "muted_foreground": "#D8DEE9",
            "card": "#3B4252",
            "card_foreground": "#ECEFF4",
            "border": "#4C566A",
            "ring": "#5E81AC",
            "destructive": "#BF616A",
            "destructive_foreground": "#ECEFF4",
        },
        "dracula": {
            "primary": "#BD93F9",
            "primary_foreground": "#282A36",
            "secondary": "#6272A4",
            "secondary_foreground": "#F8F8F2",
            "accent": "#FF79C6",
            "accent_foreground": "#282A36",
            "background": "#282A36",
            "foreground": "#F8F8F2",
            "muted": "#44475A",
            "muted_foreground": "#6272A4",
            "card": "#44475A",
            "card_foreground": "#F8F8F2",
            "border": "#6272A4",
            "ring": "#BD93F9",
            "destructive": "#FF5555",
            "destructive_foreground": "#F8F8F2",
        },
        "solarized_dark": {
            "primary": "#268BD2",
            "primary_foreground": "#FDF6E3",
            "secondary": "#2AA198",
            "secondary_foreground": "#002B36",
            "accent": "#B58900",
            "accent_foreground": "#002B36",
            "background": "#002B36",
            "foreground": "#839496",
            "muted": "#073642",
            "muted_foreground": "#657B83",
            "card": "#073642",
            "card_foreground": "#839496",
            "border": "#586E75",
            "ring": "#268BD2",
            "destructive": "#DC322F",
            "destructive_foreground": "#FDF6E3",
        },
        "catppuccin_mocha": {
            "primary": "#CBA6F7",
            "primary_foreground": "#1E1E2E",
            "secondary": "#89B4FA",
            "secondary_foreground": "#1E1E2E",
            "accent": "#F5C2E7",
            "accent_foreground": "#1E1E2E",
            "background": "#1E1E2E",
            "foreground": "#CDD6F4",
            "muted": "#313244",
            "muted_foreground": "#A6ADC8",
            "card": "#313244",
            "card_foreground": "#CDD6F4",
            "border": "#45475A",
            "ring": "#CBA6F7",
            "destructive": "#F38BA8",
            "destructive_foreground": "#1E1E2E",
        },
        "github_dark": {
            "primary": "#58A6FF",
            "primary_foreground": "#0D1117",
            "secondary": "#238636",
            "secondary_foreground": "#FFFFFF",
            "accent": "#A371F7",
            "accent_foreground": "#0D1117",
            "background": "#0D1117",
            "foreground": "#C9D1D9",
            "muted": "#161B22",
            "muted_foreground": "#8B949E",
            "card": "#161B22",
            "card_foreground": "#C9D1D9",
            "border": "#30363D",
            "ring": "#58A6FF",
            "destructive": "#F85149",
            "destructive_foreground": "#FFFFFF",
        },
    }
    
    def __init__(self, context: Optional[ExtendedPluginContext] = None):
        super().__init__(context)
        self._created_themes: List[str] = []
    
    async def on_enable(self):
        """Initialize plugin"""
        await super().on_enable()
        self.logger.log_info("Theme Customizer Plugin enabled")
    
    async def on_disable(self):
        """Cleanup created themes if configured"""
        await super().on_disable()
        if self.config.get("cleanupOnDisable", False) and self.context.theme:
            for theme_id in self._created_themes:
                try:
                    self.context.theme.delete_custom_theme(theme_id)
                except Exception:
                    pass
    
    @tool(
        name="get_current_theme",
        description="Get information about the current theme"
    )
    async def get_current_theme(self) -> Dict[str, Any]:
        """Get current theme state"""
        if not self.context.theme:
            return {"success": False, "error": "Theme API not available"}
        
        try:
            state = self.context.theme.get_theme()
            return {
                "success": True,
                "mode": state.mode.value if hasattr(state.mode, 'value') else state.mode,
                "resolved_mode": state.resolved_mode,
                "color_preset": state.color_preset.value if hasattr(state.color_preset, 'value') else state.color_preset,
                "custom_theme_id": state.custom_theme_id,
                "colors": {
                    "primary": state.colors.primary,
                    "background": state.colors.background,
                    "foreground": state.colors.foreground,
                    "accent": state.colors.accent,
                },
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    @tool(
        name="set_theme_mode",
        description="Set the theme mode (light, dark, or system)",
        parameters={
            "mode": {
                "type": "string",
                "description": "Theme mode to set",
                "enum": ["light", "dark", "system"]
            }
        }
    )
    async def set_theme_mode(self, mode: str) -> Dict[str, Any]:
        """Set theme mode"""
        if not self.context.theme:
            return {"success": False, "error": "Theme API not available"}
        
        try:
            mode_map = {
                "light": ThemeMode.LIGHT,
                "dark": ThemeMode.DARK,
                "system": ThemeMode.SYSTEM,
            }
            self.context.theme.set_mode(mode_map[mode])
            return {"success": True, "mode": mode}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    @tool(
        name="list_color_presets",
        description="List available color presets"
    )
    async def list_color_presets(self) -> Dict[str, Any]:
        """List available color presets"""
        if not self.context.theme:
            return {"success": False, "error": "Theme API not available"}
        
        try:
            presets = self.context.theme.get_available_presets()
            return {
                "success": True,
                "presets": [p.value if hasattr(p, 'value') else p for p in presets],
                "current": self.context.theme.get_color_preset().value,
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    @tool(
        name="set_color_preset",
        description="Set the color preset",
        parameters={
            "preset": {
                "type": "string",
                "description": "Color preset to apply",
                "enum": ["default", "ocean", "forest", "sunset", "lavender", "rose", "slate", "amber"]
            }
        }
    )
    async def set_color_preset(self, preset: str) -> Dict[str, Any]:
        """Set color preset"""
        if not self.context.theme:
            return {"success": False, "error": "Theme API not available"}
        
        try:
            preset_map = {
                "default": ColorThemePreset.DEFAULT,
                "ocean": ColorThemePreset.OCEAN,
                "forest": ColorThemePreset.FOREST,
                "sunset": ColorThemePreset.SUNSET,
                "lavender": ColorThemePreset.LAVENDER,
                "rose": ColorThemePreset.ROSE,
                "slate": ColorThemePreset.SLATE,
                "amber": ColorThemePreset.AMBER,
            }
            self.context.theme.set_color_preset(preset_map[preset])
            return {"success": True, "preset": preset}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    @tool(
        name="create_custom_theme",
        description="Create a custom theme from a predefined palette or custom colors",
        parameters={
            "name": {
                "type": "string",
                "description": "Theme name"
            },
            "palette": {
                "type": "string",
                "description": "Predefined palette name",
                "enum": ["nord", "dracula", "solarized_dark", "catppuccin_mocha", "github_dark"],
                "required": False
            },
            "colors": {
                "type": "object",
                "description": "Custom colors (overrides palette)",
                "required": False
            },
            "is_dark": {
                "type": "boolean",
                "description": "Whether this is a dark theme",
                "required": False
            }
        }
    )
    async def create_custom_theme(
        self,
        name: str,
        palette: Optional[str] = None,
        colors: Optional[Dict[str, str]] = None,
        is_dark: bool = True
    ) -> Dict[str, Any]:
        """Create a custom theme"""
        if not self.context.theme:
            return {"success": False, "error": "Theme API not available"}
        
        try:
            # Start with palette if provided
            theme_colors = {}
            if palette and palette in self.COLOR_PALETTES:
                theme_colors = self.COLOR_PALETTES[palette].copy()
            
            # Override with custom colors
            if colors:
                theme_colors.update(colors)
            
            if not theme_colors:
                return {"success": False, "error": "No colors provided. Use a palette or custom colors."}
            
            # Create ThemeColors object
            tc = ThemeColors(
                primary=theme_colors.get("primary", ""),
                primary_foreground=theme_colors.get("primary_foreground", ""),
                secondary=theme_colors.get("secondary", ""),
                secondary_foreground=theme_colors.get("secondary_foreground", ""),
                accent=theme_colors.get("accent", ""),
                accent_foreground=theme_colors.get("accent_foreground", ""),
                background=theme_colors.get("background", ""),
                foreground=theme_colors.get("foreground", ""),
                muted=theme_colors.get("muted", ""),
                muted_foreground=theme_colors.get("muted_foreground", ""),
                card=theme_colors.get("card", ""),
                card_foreground=theme_colors.get("card_foreground", ""),
                border=theme_colors.get("border", ""),
                ring=theme_colors.get("ring", ""),
                destructive=theme_colors.get("destructive", ""),
                destructive_foreground=theme_colors.get("destructive_foreground", ""),
            )
            
            theme_id = self.context.theme.register_custom_theme(name, tc, is_dark)
            self._created_themes.append(theme_id)
            
            return {
                "success": True,
                "theme_id": theme_id,
                "name": name,
                "is_dark": is_dark,
                "palette_used": palette,
                "message": f"Theme '{name}' created. Use activate_theme to apply it.",
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    @tool(
        name="activate_theme",
        description="Activate a custom theme by ID",
        parameters={
            "theme_id": {
                "type": "string",
                "description": "Theme ID to activate"
            }
        }
    )
    async def activate_theme(self, theme_id: str) -> Dict[str, Any]:
        """Activate a custom theme"""
        if not self.context.theme:
            return {"success": False, "error": "Theme API not available"}
        
        try:
            self.context.theme.activate_custom_theme(theme_id)
            return {"success": True, "activated": theme_id}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    @tool(
        name="list_custom_themes",
        description="List all custom themes"
    )
    async def list_custom_themes(self) -> Dict[str, Any]:
        """List all custom themes"""
        if not self.context.theme:
            return {"success": False, "error": "Theme API not available"}
        
        try:
            themes = self.context.theme.get_custom_themes()
            return {
                "success": True,
                "count": len(themes),
                "themes": [
                    {
                        "id": t.id,
                        "name": t.name,
                        "is_dark": t.is_dark,
                    }
                    for t in themes
                ],
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    @tool(
        name="list_palettes",
        description="List available color palettes for creating themes"
    )
    async def list_palettes(self) -> Dict[str, Any]:
        """List available predefined palettes"""
        return {
            "success": True,
            "palettes": list(self.COLOR_PALETTES.keys()),
            "descriptions": {
                "nord": "Arctic, north-bluish color palette",
                "dracula": "Dark theme with purple accents",
                "solarized_dark": "Precision colors for dark backgrounds",
                "catppuccin_mocha": "Soothing pastel theme with warm colors",
                "github_dark": "GitHub's dark mode colors",
            },
        }
    
    @command(
        name="dark",
        description="Switch to dark mode",
        shortcut="Ctrl+Shift+D"
    )
    async def cmd_dark_mode(self, args: List[str]) -> None:
        """Switch to dark mode"""
        if self.context.theme:
            self.context.theme.set_mode(ThemeMode.DARK)
            self.logger.log_info("Switched to dark mode")
    
    @command(
        name="light",
        description="Switch to light mode",
        shortcut="Ctrl+Shift+L"
    )
    async def cmd_light_mode(self, args: List[str]) -> None:
        """Switch to light mode"""
        if self.context.theme:
            self.context.theme.set_mode(ThemeMode.LIGHT)
            self.logger.log_info("Switched to light mode")
    
    @hook("on_theme_mode_change")
    def on_theme_changed(self, mode: str, resolved_mode: str):
        """Log theme mode changes"""
        self.logger.log_debug(f"Theme mode changed to {mode} (resolved: {resolved_mode})")


# Export the plugin class
__all__ = ["ThemeCustomizerPlugin"]
