"""
A2UI Dashboard Plugin for Cognia

Demonstrates A2UI component support for creating interactive dashboards.
"""

from cognia import (
    Plugin, tool, hook,
    Schema, parameters,
    A2UIComponentDef, A2UIBuilder, A2UIVariable, A2UITemplateDef,
    A2UIComponentType, A2UIAction, A2UIStyle,
    a2ui_component, a2ui_template,
    ExtendedPluginContext,
)
from typing import List, Dict, Any, Optional


class A2UIDashboardPlugin(Plugin):
    """A2UI Dashboard Plugin - Create interactive data dashboards"""
    
    name = "a2ui-dashboard"
    version = "1.0.0"
    description = "Create interactive A2UI dashboards with charts and tables"
    capabilities = ["tools", "a2ui"]
    permissions = []
    
    def __init__(self, context: Optional[ExtendedPluginContext] = None):
        super().__init__(context)
        self._dashboards: Dict[str, Dict] = {}
    
    @tool(
        name="create_dashboard",
        description="Create a new A2UI dashboard with components",
        parameters=parameters({
            "title": Schema.string("Dashboard title"),
            "components": Schema.array(
                Schema.object({
                    "type": Schema.string("Component type", enum=[
                        "table", "bar-chart", "line-chart", "pie-chart", "card", "list"
                    ]),
                    "title": Schema.string("Component title"),
                    "data": Schema.array(Schema.object({}), "Component data"),
                }),
                "List of dashboard components"
            ),
        })
    )
    async def create_dashboard(
        self,
        title: str,
        components: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Create a dashboard with multiple A2UI components"""
        import uuid
        
        dashboard_id = str(uuid.uuid4())[:8]
        
        # Build A2UI components
        a2ui_components = []
        for comp in components:
            builder = (
                A2UIBuilder()
                .type(comp.get("type", "card"))
                .name(comp.get("title", "Component"))
                .props({
                    "data": comp.get("data", []),
                    "title": comp.get("title", ""),
                })
            )
            
            # Add refresh action for data components
            if comp.get("type") in ["table", "bar-chart", "line-chart"]:
                builder.action("refresh", "Refresh", icon="refresh-cw")
            
            a2ui_components.append(builder.build())
        
        dashboard = {
            "id": dashboard_id,
            "title": title,
            "components": [c.to_dict() for c in a2ui_components],
            "created_at": "now",
        }
        
        self._dashboards[dashboard_id] = dashboard
        
        return {
            "success": True,
            "dashboard_id": dashboard_id,
            "title": title,
            "component_count": len(a2ui_components),
            "a2ui": dashboard,
        }
    
    @tool(
        name="create_data_table",
        description="Create an interactive data table",
        parameters=parameters({
            "title": Schema.string("Table title"),
            "columns": Schema.array(
                Schema.object({
                    "key": Schema.string("Column key"),
                    "label": Schema.string("Column label"),
                    "sortable": Schema.optional(Schema.boolean("Is sortable")),
                }),
                "Column definitions"
            ),
            "data": Schema.array(Schema.object({}), "Table data rows"),
            "pagination": Schema.optional(Schema.boolean("Enable pagination")),
        })
    )
    async def create_data_table(
        self,
        title: str,
        columns: List[Dict[str, Any]],
        data: List[Dict[str, Any]],
        pagination: bool = True
    ) -> Dict[str, Any]:
        """Create an interactive data table component"""
        table = (
            A2UIBuilder()
            .type(A2UIComponentType.TABLE)
            .name(title)
            .props({
                "columns": columns,
                "data": data,
                "pagination": pagination,
                "pageSize": 10,
            })
            .action("export", "Export CSV", icon="download")
            .action("filter", "Filter", icon="filter")
            .style(
                width="100%",
                border_radius="8px",
                shadow="sm"
            )
            .build()
        )
        
        return {
            "success": True,
            "a2ui": table.to_dict(),
        }
    
    @tool(
        name="create_chart",
        description="Create a chart visualization",
        parameters=parameters({
            "type": Schema.string("Chart type", enum=[
                "bar", "line", "pie", "area", "scatter"
            ]),
            "title": Schema.string("Chart title"),
            "data": Schema.array(Schema.object({}), "Chart data"),
            "x_axis": Schema.optional(Schema.string("X-axis key")),
            "y_axis": Schema.optional(Schema.string("Y-axis key")),
        })
    )
    async def create_chart(
        self,
        type: str,
        title: str,
        data: List[Dict[str, Any]],
        x_axis: Optional[str] = None,
        y_axis: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a chart visualization component"""
        chart_type_map = {
            "bar": A2UIComponentType.BAR_CHART,
            "line": A2UIComponentType.LINE_CHART,
            "pie": A2UIComponentType.PIE_CHART,
            "area": A2UIComponentType.AREA_CHART,
            "scatter": A2UIComponentType.SCATTER_CHART,
        }
        
        chart = (
            A2UIBuilder()
            .type(chart_type_map.get(type, A2UIComponentType.BAR_CHART))
            .name(title)
            .props({
                "data": data,
                "xAxis": x_axis,
                "yAxis": y_axis,
                "showLegend": True,
                "showTooltip": True,
            })
            .action("fullscreen", "Fullscreen", icon="maximize")
            .action("download", "Download Image", icon="image")
            .style(height="300px")
            .build()
        )
        
        return {
            "success": True,
            "chart_type": type,
            "a2ui": chart.to_dict(),
        }
    
    @a2ui_template(
        "analytics-dashboard",
        "Analytics Dashboard",
        "Complete analytics dashboard with KPIs, charts, and tables",
        category="dashboards",
        icon="bar-chart-2",
        variables=[
            A2UIVariable("title", "string", required=True),
            A2UIVariable("kpis", "array", description="KPI cards data"),
            A2UIVariable("chartData", "array", description="Chart data"),
            A2UIVariable("tableData", "array", description="Table data"),
        ]
    )
    def analytics_dashboard_template(self, variables: Dict[str, Any]) -> List[Dict]:
        """Generate analytics dashboard template"""
        components = []
        
        # Header
        components.append({
            "type": "heading",
            "props": {"level": 1, "text": variables.get("title", "Analytics")}
        })
        
        # KPI cards row
        kpis = variables.get("kpis", [])
        if kpis:
            kpi_cards = []
            for kpi in kpis:
                kpi_cards.append({
                    "type": "card",
                    "props": {
                        "title": kpi.get("label", ""),
                        "value": kpi.get("value", 0),
                        "change": kpi.get("change"),
                        "icon": kpi.get("icon", "trending-up"),
                    }
                })
            components.append({
                "type": "grid",
                "props": {"columns": len(kpis)},
                "children": kpi_cards
            })
        
        # Chart
        chart_data = variables.get("chartData", [])
        if chart_data:
            components.append({
                "type": "line-chart",
                "props": {
                    "data": chart_data,
                    "title": "Trend Analysis",
                }
            })
        
        # Table
        table_data = variables.get("tableData", [])
        if table_data:
            components.append({
                "type": "table",
                "props": {
                    "data": table_data,
                    "title": "Details",
                    "pagination": True,
                }
            })
        
        return components
    
    @hook("on_artifact_create")
    async def on_artifact_create(self, artifact):
        """Log when dashboards are created as artifacts"""
        if artifact.type == "a2ui":
            self.logger.log_info(f"A2UI artifact created: {artifact.id}")


# Export the plugin class
__all__ = ["A2UIDashboardPlugin"]
