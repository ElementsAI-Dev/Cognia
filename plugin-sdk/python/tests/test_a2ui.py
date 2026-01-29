"""
Unit tests for cognia.a2ui module
"""

import pytest
from cognia.a2ui import (
    A2UIComponentType,
    A2UIAction,
    A2UIDataBinding,
    A2UIStyle,
    A2UIComponentDef,
    A2UIVariable,
    A2UITemplateDef,
    A2UIDataChange,
    A2UIActionEvent,
    A2UIComponentRenderer,
    A2UIBuilder,
    a2ui_component,
    a2ui_template,
    component,
    register_component_renderer,
    get_component_renderer,
)


class TestA2UIComponentType:
    """Tests for A2UIComponentType enum"""
    
    def test_basic_types(self):
        """Test basic component types"""
        assert A2UIComponentType.TEXT.value == "text"
        assert A2UIComponentType.BUTTON.value == "button"
        assert A2UIComponentType.INPUT.value == "input"
        assert A2UIComponentType.TABLE.value == "table"
    
    def test_chart_types(self):
        """Test chart component types"""
        assert A2UIComponentType.BAR_CHART.value == "bar-chart"
        assert A2UIComponentType.LINE_CHART.value == "line-chart"
        assert A2UIComponentType.PIE_CHART.value == "pie-chart"
    
    def test_layout_types(self):
        """Test layout component types"""
        assert A2UIComponentType.CONTAINER.value == "container"
        assert A2UIComponentType.GRID.value == "grid"
        assert A2UIComponentType.FLEX.value == "flex"


class TestA2UIAction:
    """Tests for A2UIAction dataclass"""
    
    def test_basic_action(self):
        """Test basic action creation"""
        action = A2UIAction(
            id="submit",
            label="Submit",
            type="primary"
        )
        assert action.id == "submit"
        assert action.label == "Submit"
        assert action.type == "primary"
    
    def test_action_with_icon(self):
        """Test action with icon"""
        action = A2UIAction(
            id="refresh",
            label="Refresh",
            icon="refresh-cw"
        )
        assert action.icon == "refresh-cw"
    
    def test_action_to_dict(self):
        """Test action serialization"""
        action = A2UIAction(
            id="delete",
            label="Delete",
            type="danger",
            icon="trash",
            disabled=False
        )
        result = action.to_dict()
        
        assert result["id"] == "delete"
        assert result["label"] == "Delete"
        assert result["type"] == "danger"
        assert result["icon"] == "trash"


class TestA2UIDataBinding:
    """Tests for A2UIDataBinding dataclass"""
    
    def test_basic_binding(self):
        """Test basic data binding"""
        binding = A2UIDataBinding(
            source="user.name",
            target="props.value"
        )
        assert binding.source == "user.name"
        assert binding.target == "props.value"
    
    def test_binding_with_transform(self):
        """Test binding with transform"""
        binding = A2UIDataBinding(
            source="data.items",
            target="props.rows",
            transform="map"
        )
        assert binding.transform == "map"
    
    def test_binding_to_dict(self):
        """Test binding serialization"""
        binding = A2UIDataBinding(
            source="count",
            target="text",
            format="{value} items"
        )
        result = binding.to_dict()
        
        assert result["source"] == "count"
        assert result["target"] == "text"
        assert result["format"] == "{value} items"


class TestA2UIStyle:
    """Tests for A2UIStyle dataclass"""
    
    def test_basic_style(self):
        """Test basic style"""
        style = A2UIStyle(
            width="100%",
            height="auto"
        )
        assert style.width == "100%"
        assert style.height == "auto"
    
    def test_style_with_colors(self):
        """Test style with colors"""
        style = A2UIStyle(
            background="#ffffff",
            color="#000000",
            border_color="#cccccc"
        )
        assert style.background == "#ffffff"
        assert style.color == "#000000"
    
    def test_style_to_dict(self):
        """Test style serialization"""
        style = A2UIStyle(
            padding="16px",
            margin="8px",
            border_radius="4px",
            shadow="md"
        )
        result = style.to_dict()
        
        assert result["padding"] == "16px"
        assert result["margin"] == "8px"
        assert result["borderRadius"] == "4px"
        assert result["shadow"] == "md"


class TestA2UIVariable:
    """Tests for A2UIVariable dataclass"""
    
    def test_basic_variable(self):
        """Test basic variable"""
        var = A2UIVariable(
            name="count",
            type="number"
        )
        assert var.name == "count"
        assert var.type == "number"
    
    def test_variable_with_default(self):
        """Test variable with default value"""
        var = A2UIVariable(
            name="title",
            type="string",
            default="Untitled",
            required=False
        )
        assert var.default == "Untitled"
        assert var.required == False
    
    def test_variable_to_dict(self):
        """Test variable serialization"""
        var = A2UIVariable(
            name="items",
            type="array",
            description="List of items",
            required=True
        )
        result = var.to_dict()
        
        assert result["name"] == "items"
        assert result["type"] == "array"
        assert result["description"] == "List of items"
        assert result["required"] == True


class TestA2UIComponentDef:
    """Tests for A2UIComponentDef dataclass"""
    
    def test_basic_component(self):
        """Test basic component definition"""
        comp = A2UIComponentDef(
            type=A2UIComponentType.BUTTON,
            name="submit-btn"
        )
        assert comp.type == A2UIComponentType.BUTTON
        assert comp.name == "submit-btn"
    
    def test_component_with_props(self):
        """Test component with props"""
        comp = A2UIComponentDef(
            type=A2UIComponentType.TEXT,
            name="label",
            props={"content": "Hello", "size": "lg"}
        )
        assert comp.props["content"] == "Hello"
        assert comp.props["size"] == "lg"
    
    def test_component_with_actions(self):
        """Test component with actions"""
        actions = [
            A2UIAction(id="click", label="Click Me"),
            A2UIAction(id="hover", label="Hover"),
        ]
        comp = A2UIComponentDef(
            type=A2UIComponentType.CARD,
            name="card",
            actions=actions
        )
        assert len(comp.actions) == 2
    
    def test_component_to_dict(self):
        """Test component serialization"""
        comp = A2UIComponentDef(
            type=A2UIComponentType.TABLE,
            name="data-table",
            props={"columns": [], "data": []},
            style=A2UIStyle(width="100%")
        )
        result = comp.to_dict()
        
        assert result["type"] == "table"
        assert result["name"] == "data-table"
        assert result["props"]["columns"] == []
        assert result["style"]["width"] == "100%"


class TestA2UITemplateDef:
    """Tests for A2UITemplateDef dataclass"""
    
    def test_basic_template(self):
        """Test basic template"""
        template = A2UITemplateDef(
            id="card-template",
            name="Card Template",
            description="A card template"
        )
        assert template.id == "card-template"
        assert template.name == "Card Template"
    
    def test_template_with_variables(self):
        """Test template with variables"""
        template = A2UITemplateDef(
            id="list-template",
            name="List",
            description="List template",
            variables=[
                A2UIVariable("items", "array", required=True),
                A2UIVariable("title", "string", default="List"),
            ]
        )
        assert len(template.variables) == 2
    
    def test_template_to_dict(self):
        """Test template serialization"""
        template = A2UITemplateDef(
            id="dashboard",
            name="Dashboard",
            description="Dashboard template",
            category="dashboards",
            icon="layout-dashboard"
        )
        result = template.to_dict()
        
        assert result["id"] == "dashboard"
        assert result["category"] == "dashboards"
        assert result["icon"] == "layout-dashboard"


class TestA2UIBuilder:
    """Tests for A2UIBuilder fluent builder"""
    
    def test_basic_builder(self):
        """Test basic builder usage"""
        comp = (
            A2UIBuilder()
            .type(A2UIComponentType.BUTTON)
            .name("btn")
            .build()
        )
        assert comp.type == A2UIComponentType.BUTTON
        assert comp.name == "btn"
    
    def test_builder_with_string_type(self):
        """Test builder with string type"""
        comp = (
            A2UIBuilder()
            .type("text")
            .name("label")
            .build()
        )
        assert comp.type == A2UIComponentType.TEXT
    
    def test_builder_with_props(self):
        """Test builder with props"""
        comp = (
            A2UIBuilder()
            .type(A2UIComponentType.INPUT)
            .name("email-input")
            .props({"placeholder": "Enter email", "type": "email"})
            .build()
        )
        assert comp.props["placeholder"] == "Enter email"
    
    def test_builder_add_prop(self):
        """Test builder add_prop method"""
        comp = (
            A2UIBuilder()
            .type(A2UIComponentType.TABLE)
            .name("table")
            .prop("sortable", True)
            .prop("pagination", True)
            .build()
        )
        assert comp.props["sortable"] == True
        assert comp.props["pagination"] == True
    
    def test_builder_with_actions(self):
        """Test builder with actions"""
        comp = (
            A2UIBuilder()
            .type(A2UIComponentType.CARD)
            .name("card")
            .action("edit", "Edit", icon="edit")
            .action("delete", "Delete", type="danger", icon="trash")
            .build()
        )
        assert len(comp.actions) == 2
        assert comp.actions[0].id == "edit"
        assert comp.actions[1].type == "danger"
    
    def test_builder_with_style(self):
        """Test builder with style"""
        comp = (
            A2UIBuilder()
            .type(A2UIComponentType.CONTAINER)
            .name("wrapper")
            .style(
                width="100%",
                padding="16px",
                background="#f5f5f5",
                border_radius="8px"
            )
            .build()
        )
        assert comp.style.width == "100%"
        assert comp.style.padding == "16px"
        assert comp.style.border_radius == "8px"
    
    def test_builder_with_bindings(self):
        """Test builder with data bindings"""
        comp = (
            A2UIBuilder()
            .type(A2UIComponentType.TEXT)
            .name("user-name")
            .bind("user.name", "content")
            .build()
        )
        assert len(comp.bindings) == 1
        assert comp.bindings[0].source == "user.name"
    
    def test_builder_with_children(self):
        """Test builder with children"""
        child1 = A2UIBuilder().type("text").name("t1").build()
        child2 = A2UIBuilder().type("text").name("t2").build()
        
        comp = (
            A2UIBuilder()
            .type(A2UIComponentType.CONTAINER)
            .name("parent")
            .child(child1)
            .child(child2)
            .build()
        )
        assert len(comp.children) == 2
    
    def test_builder_chaining(self):
        """Test full builder chain"""
        comp = (
            A2UIBuilder()
            .type(A2UIComponentType.BAR_CHART)
            .name("sales-chart")
            .props({"data": [], "xAxis": "month", "yAxis": "sales"})
            .prop("showLegend", True)
            .action("refresh", "Refresh", icon="refresh-cw")
            .action("export", "Export", icon="download")
            .style(height="300px", width="100%")
            .build()
        )
        
        result = comp.to_dict()
        assert result["type"] == "bar-chart"
        assert result["name"] == "sales-chart"
        assert result["props"]["showLegend"] == True
        assert len(result["actions"]) == 2


class TestA2UIDecorators:
    """Tests for A2UI decorators"""
    
    def test_component_decorator(self):
        """Test @a2ui_component decorator"""
        @a2ui_component(
            "custom-widget",
            "Custom Widget",
            "A custom widget component",
            category="widgets"
        )
        class CustomWidgetRenderer(A2UIComponentRenderer):
            async def render(self, props, context):
                return {"type": "div", "props": props}
        
        assert hasattr(CustomWidgetRenderer, "_a2ui_component")
        metadata = CustomWidgetRenderer._a2ui_component
        assert metadata["id"] == "custom-widget"
        assert metadata["name"] == "Custom Widget"
        assert metadata["category"] == "widgets"
    
    def test_template_decorator(self):
        """Test @a2ui_template decorator"""
        @a2ui_template(
            "data-grid",
            "Data Grid",
            "A data grid template",
            icon="grid",
            variables=[
                A2UIVariable("columns", "array"),
                A2UIVariable("data", "array"),
            ]
        )
        def render_data_grid(variables):
            return [{"type": "table", "props": variables}]
        
        assert hasattr(render_data_grid, "_a2ui_template")
        metadata = render_data_grid._a2ui_template
        assert metadata.id == "data-grid"
        assert len(metadata.variables) == 2


class TestComponentHelper:
    """Tests for component helper function"""
    
    def test_component_helper(self):
        """Test component() helper function"""
        comp = component(
            "button",
            name="submit",
            props={"label": "Submit"}
        )
        assert comp.type == A2UIComponentType.BUTTON
        assert comp.props["label"] == "Submit"
    
    def test_component_helper_with_actions(self):
        """Test component() with actions"""
        comp = component(
            A2UIComponentType.CARD,
            name="card",
            actions=[("click", "Click"), ("hover", "Hover")]
        )
        assert len(comp.actions) == 2


class TestComponentRegistry:
    """Tests for component renderer registry"""
    
    def test_register_renderer(self):
        """Test registering a renderer"""
        class TestRenderer(A2UIComponentRenderer):
            async def render(self, props, context):
                return {"type": "test"}
        
        register_component_renderer("test-component", TestRenderer)
        renderer = get_component_renderer("test-component")
        
        assert renderer is not None
        assert isinstance(renderer, TestRenderer)
    
    def test_get_unregistered_renderer(self):
        """Test getting unregistered renderer"""
        renderer = get_component_renderer("nonexistent")
        assert renderer is None


class TestA2UIEvents:
    """Tests for A2UI event types"""
    
    def test_data_change(self):
        """Test A2UIDataChange"""
        change = A2UIDataChange(
            path="user.name",
            old_value="John",
            new_value="Jane"
        )
        assert change.path == "user.name"
        assert change.old_value == "John"
        assert change.new_value == "Jane"
    
    def test_action_event(self):
        """Test A2UIActionEvent"""
        event = A2UIActionEvent(
            action_id="submit",
            component_id="form-submit",
            payload={"form_data": {"name": "Test"}}
        )
        assert event.action_id == "submit"
        assert event.component_id == "form-submit"
        assert event.payload["form_data"]["name"] == "Test"
