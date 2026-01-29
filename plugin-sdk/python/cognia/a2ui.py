"""
A2UI (AI-to-UI) Components for Cognia Plugin SDK

Provides support for defining A2UI components that can be rendered
in the Cognia UI based on AI-generated data.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, TypeVar, Union
from enum import Enum
import functools


class A2UIComponentType(Enum):
    """Standard A2UI component types"""
    # Data Display
    TABLE = "table"
    LIST = "list"
    TREE = "tree"
    CARD = "card"
    GRID = "grid"
    TIMELINE = "timeline"
    KANBAN = "kanban"
    
    # Charts
    BAR_CHART = "bar-chart"
    LINE_CHART = "line-chart"
    PIE_CHART = "pie-chart"
    SCATTER_CHART = "scatter-chart"
    AREA_CHART = "area-chart"
    
    # Forms
    FORM = "form"
    INPUT = "input"
    SELECT = "select"
    CHECKBOX = "checkbox"
    RADIO = "radio"
    SLIDER = "slider"
    DATE_PICKER = "date-picker"
    FILE_UPLOAD = "file-upload"
    
    # Layout
    CONTAINER = "container"
    TABS = "tabs"
    ACCORDION = "accordion"
    MODAL = "modal"
    DRAWER = "drawer"
    SPLIT_PANE = "split-pane"
    
    # Media
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    CODE_BLOCK = "code-block"
    MARKDOWN = "markdown"
    
    # Interactive
    BUTTON = "button"
    MENU = "menu"
    TOOLBAR = "toolbar"
    PAGINATION = "pagination"
    
    # Custom
    CUSTOM = "custom"


@dataclass
class A2UIAction:
    """Action that can be triggered from A2UI component"""
    id: str
    label: str
    icon: Optional[str] = None
    variant: str = "default"  # 'default', 'primary', 'destructive'
    disabled: bool = False
    confirm: Optional[str] = None  # Confirmation message


@dataclass
class A2UIDataBinding:
    """Data binding configuration for A2UI component"""
    source: str  # Data path
    transform: Optional[str] = None  # Transform expression
    default: Optional[Any] = None


@dataclass
class A2UIStyle:
    """Style configuration for A2UI component"""
    width: Optional[str] = None
    height: Optional[str] = None
    padding: Optional[str] = None
    margin: Optional[str] = None
    background: Optional[str] = None
    border: Optional[str] = None
    border_radius: Optional[str] = None
    shadow: Optional[str] = None
    class_name: Optional[str] = None
    custom: Dict[str, str] = field(default_factory=dict)


@dataclass
class A2UIComponentDef:
    """A2UI component definition"""
    type: str
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    icon: Optional[str] = None
    props_schema: Optional[Dict[str, Any]] = None
    default_props: Dict[str, Any] = field(default_factory=dict)
    actions: List[A2UIAction] = field(default_factory=list)
    style: Optional[A2UIStyle] = None
    children: Optional[List['A2UIComponentDef']] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        result = {
            "type": self.type,
            "name": self.name,
        }
        if self.description:
            result["description"] = self.description
        if self.category:
            result["category"] = self.category
        if self.icon:
            result["icon"] = self.icon
        if self.props_schema:
            result["propsSchema"] = self.props_schema
        if self.default_props:
            result["defaultProps"] = self.default_props
        if self.actions:
            result["actions"] = [
                {
                    "id": a.id,
                    "label": a.label,
                    "icon": a.icon,
                    "variant": a.variant,
                    "disabled": a.disabled,
                    "confirm": a.confirm,
                }
                for a in self.actions
            ]
        if self.style:
            result["style"] = {
                k: v for k, v in {
                    "width": self.style.width,
                    "height": self.style.height,
                    "padding": self.style.padding,
                    "margin": self.style.margin,
                    "background": self.style.background,
                    "border": self.style.border,
                    "borderRadius": self.style.border_radius,
                    "shadow": self.style.shadow,
                    "className": self.style.class_name,
                    **self.style.custom,
                }.items() if v is not None
            }
        if self.children:
            result["children"] = [c.to_dict() for c in self.children]
        return result


@dataclass
class A2UIVariable:
    """Variable definition for A2UI template"""
    name: str
    type: str  # 'string', 'number', 'boolean', 'array', 'object'
    description: Optional[str] = None
    default: Optional[Any] = None
    required: bool = False


@dataclass
class A2UITemplateDef:
    """A2UI template definition"""
    id: str
    name: str
    description: str
    components: List[A2UIComponentDef]
    variables: List[A2UIVariable] = field(default_factory=list)
    category: Optional[str] = None
    icon: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        result = {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "components": [c.to_dict() for c in self.components],
        }
        if self.variables:
            result["variables"] = [
                {
                    "name": v.name,
                    "type": v.type,
                    "description": v.description,
                    "default": v.default,
                    "required": v.required,
                }
                for v in self.variables
            ]
        if self.category:
            result["category"] = self.category
        if self.icon:
            result["icon"] = self.icon
        if self.tags:
            result["tags"] = self.tags
        return result


@dataclass
class A2UIDataChange:
    """Data change event from A2UI component"""
    component_id: str
    path: str
    old_value: Any
    new_value: Any
    source: str  # 'user', 'system', 'binding'


@dataclass
class A2UIActionEvent:
    """Action event from A2UI component"""
    component_id: str
    action_id: str
    data: Dict[str, Any] = field(default_factory=dict)


class A2UIComponentRenderer(ABC):
    """Abstract base class for A2UI component renderers"""
    
    @property
    @abstractmethod
    def component_type(self) -> str:
        """Return the component type this renderer handles"""
        pass
    
    @abstractmethod
    def render(self, props: Dict[str, Any], data: Any) -> str:
        """
        Render the component to HTML/React markup.
        
        Args:
            props: Component properties
            data: Component data
            
        Returns:
            Rendered HTML/React markup
        """
        pass
    
    def validate_props(self, props: Dict[str, Any]) -> List[str]:
        """
        Validate component properties.
        
        Args:
            props: Component properties
            
        Returns:
            List of validation error messages
        """
        return []


# Registry for component renderers
_component_renderers: Dict[str, A2UIComponentRenderer] = {}


def register_component_renderer(renderer: A2UIComponentRenderer) -> None:
    """Register a component renderer"""
    _component_renderers[renderer.component_type] = renderer


def get_component_renderer(component_type: str) -> Optional[A2UIComponentRenderer]:
    """Get a registered component renderer"""
    return _component_renderers.get(component_type)


def a2ui_component(
    component_type: str,
    name: str,
    *,
    description: Optional[str] = None,
    category: Optional[str] = None,
    icon: Optional[str] = None,
    props_schema: Optional[Dict[str, Any]] = None,
) -> Callable:
    """
    Decorator to mark a method as an A2UI component renderer.
    
    The decorated method should accept (self, props, data) and return
    rendered content or component definition.
    
    Args:
        component_type: Component type identifier
        name: Display name for the component
        description: Component description
        category: Category for organization
        icon: Icon name (Lucide icon)
        props_schema: JSON Schema for component props
        
    Example:
        @a2ui_component(
            "custom-chart",
            "Custom Chart",
            description="A custom chart component",
            category="visualization"
        )
        def render_custom_chart(self, props: dict, data: Any) -> dict:
            return {
                "type": "custom-chart",
                "props": props,
                "data": data,
            }
    """
    def decorator(func: Callable) -> Callable:
        func._a2ui_component = A2UIComponentDef(
            type=component_type,
            name=name,
            description=description,
            category=category,
            icon=icon,
            props_schema=props_schema,
        )
        
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        
        wrapper._a2ui_component = func._a2ui_component
        return wrapper
    
    return decorator


def a2ui_template(
    template_id: str,
    name: str,
    description: str,
    *,
    category: Optional[str] = None,
    icon: Optional[str] = None,
    tags: Optional[List[str]] = None,
    variables: Optional[List[A2UIVariable]] = None,
) -> Callable:
    """
    Decorator to mark a method as an A2UI template provider.
    
    The decorated method should accept (self, variables) and return
    a list of A2UIComponentDef or component dictionaries.
    
    Args:
        template_id: Unique template identifier
        name: Display name for the template
        description: Template description
        category: Category for organization
        icon: Icon name (Lucide icon)
        tags: Tags for filtering
        variables: Template variable definitions
        
    Example:
        @a2ui_template(
            "data-dashboard",
            "Data Dashboard",
            "Interactive dashboard for data visualization",
            category="dashboards",
            variables=[
                A2UIVariable("title", "string", required=True),
                A2UIVariable("data", "array", required=True),
            ]
        )
        def create_dashboard(self, variables: dict) -> list:
            return [
                {"type": "heading", "props": {"text": variables["title"]}},
                {"type": "table", "props": {"data": variables["data"]}},
            ]
    """
    def decorator(func: Callable) -> Callable:
        func._a2ui_template = {
            "id": template_id,
            "name": name,
            "description": description,
            "category": category,
            "icon": icon,
            "tags": tags or [],
            "variables": variables or [],
        }
        
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        
        wrapper._a2ui_template = func._a2ui_template
        return wrapper
    
    return decorator


class A2UIBuilder:
    """
    Fluent builder for A2UI component definitions.
    
    Example:
        builder = A2UIBuilder()
        component = (
            builder
            .type("table")
            .name("Data Table")
            .props({"columns": [...], "data": [...]})
            .action("refresh", "Refresh", icon="refresh-cw")
            .action("export", "Export", icon="download")
            .build()
        )
    """
    
    def __init__(self):
        self._type: str = "custom"
        self._name: str = ""
        self._description: Optional[str] = None
        self._category: Optional[str] = None
        self._icon: Optional[str] = None
        self._props_schema: Optional[Dict[str, Any]] = None
        self._default_props: Dict[str, Any] = {}
        self._actions: List[A2UIAction] = []
        self._style: Optional[A2UIStyle] = None
        self._children: List[A2UIComponentDef] = []
    
    def type(self, component_type: Union[str, A2UIComponentType]) -> 'A2UIBuilder':
        """Set component type"""
        if isinstance(component_type, A2UIComponentType):
            self._type = component_type.value
        else:
            self._type = component_type
        return self
    
    def name(self, name: str) -> 'A2UIBuilder':
        """Set component name"""
        self._name = name
        return self
    
    def description(self, description: str) -> 'A2UIBuilder':
        """Set component description"""
        self._description = description
        return self
    
    def category(self, category: str) -> 'A2UIBuilder':
        """Set component category"""
        self._category = category
        return self
    
    def icon(self, icon: str) -> 'A2UIBuilder':
        """Set component icon"""
        self._icon = icon
        return self
    
    def props_schema(self, schema: Dict[str, Any]) -> 'A2UIBuilder':
        """Set props JSON schema"""
        self._props_schema = schema
        return self
    
    def props(self, props: Dict[str, Any]) -> 'A2UIBuilder':
        """Set default props"""
        self._default_props = props
        return self
    
    def action(
        self,
        action_id: str,
        label: str,
        *,
        icon: Optional[str] = None,
        variant: str = "default",
        disabled: bool = False,
        confirm: Optional[str] = None,
    ) -> 'A2UIBuilder':
        """Add an action"""
        self._actions.append(A2UIAction(
            id=action_id,
            label=label,
            icon=icon,
            variant=variant,
            disabled=disabled,
            confirm=confirm,
        ))
        return self
    
    def style(
        self,
        *,
        width: Optional[str] = None,
        height: Optional[str] = None,
        padding: Optional[str] = None,
        margin: Optional[str] = None,
        background: Optional[str] = None,
        border: Optional[str] = None,
        border_radius: Optional[str] = None,
        shadow: Optional[str] = None,
        class_name: Optional[str] = None,
        **custom: str,
    ) -> 'A2UIBuilder':
        """Set component style"""
        self._style = A2UIStyle(
            width=width,
            height=height,
            padding=padding,
            margin=margin,
            background=background,
            border=border,
            border_radius=border_radius,
            shadow=shadow,
            class_name=class_name,
            custom=custom,
        )
        return self
    
    def child(self, component: A2UIComponentDef) -> 'A2UIBuilder':
        """Add a child component"""
        self._children.append(component)
        return self
    
    def children(self, components: List[A2UIComponentDef]) -> 'A2UIBuilder':
        """Add multiple child components"""
        self._children.extend(components)
        return self
    
    def build(self) -> A2UIComponentDef:
        """Build the component definition"""
        return A2UIComponentDef(
            type=self._type,
            name=self._name,
            description=self._description,
            category=self._category,
            icon=self._icon,
            props_schema=self._props_schema,
            default_props=self._default_props,
            actions=self._actions,
            style=self._style,
            children=self._children if self._children else None,
        )


# Convenience function for quick component creation
def component(
    component_type: Union[str, A2UIComponentType],
    props: Optional[Dict[str, Any]] = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Quick helper to create a component dictionary.
    
    Args:
        component_type: Component type
        props: Component props
        **kwargs: Additional component properties
        
    Returns:
        Component dictionary
    """
    if isinstance(component_type, A2UIComponentType):
        type_str = component_type.value
    else:
        type_str = component_type
    
    result = {"type": type_str}
    if props:
        result["props"] = props
    result.update(kwargs)
    return result


__all__ = [
    # Enums
    "A2UIComponentType",
    # Data classes
    "A2UIAction",
    "A2UIDataBinding",
    "A2UIStyle",
    "A2UIComponentDef",
    "A2UIVariable",
    "A2UITemplateDef",
    "A2UIDataChange",
    "A2UIActionEvent",
    # Base classes
    "A2UIComponentRenderer",
    # Registry functions
    "register_component_renderer",
    "get_component_renderer",
    # Decorators
    "a2ui_component",
    "a2ui_template",
    # Builder
    "A2UIBuilder",
    # Helpers
    "component",
]
