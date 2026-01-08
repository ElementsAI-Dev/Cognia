"""
Data Analysis Plugin for Cognia

Provides tools for analyzing CSV and JSON data files using pandas.
"""

from cognia import Plugin, tool, hook
from typing import List, Optional, Dict, Any

# Try to import pandas, provide helpful error if not available
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False
    pd = None


class DataAnalysisPlugin(Plugin):
    """Data Analysis Plugin - Analyze data files with pandas"""
    
    name = "data-analysis"
    version = "1.0.0"
    description = "Analyze CSV and JSON data files with pandas"
    python_dependencies = ["pandas>=2.0"]
    
    def __init__(self, context=None):
        super().__init__(context)
        self._dataframe_cache: Dict[str, Any] = {}
    
    async def on_load(self):
        """Called when plugin loads"""
        if not PANDAS_AVAILABLE:
            self.logger.log_error("pandas is not installed. Please install with: pip install pandas")
        else:
            self.logger.log_info("Data Analysis Plugin loaded successfully")
    
    async def on_enable(self):
        """Called when plugin is enabled"""
        await super().on_enable()
        self.logger.log_info("Data Analysis Plugin enabled")
    
    def _get_dataframe(self, file_path: str) -> "pd.DataFrame":
        """Load dataframe with optional caching"""
        if not PANDAS_AVAILABLE:
            raise RuntimeError("pandas is not installed")
        
        # Check cache
        if self.config.get("enableCache", True) and file_path in self._dataframe_cache:
            return self._dataframe_cache[file_path]
        
        # Load based on extension
        if file_path.endswith(".csv"):
            df = pd.read_csv(file_path)
        elif file_path.endswith(".json"):
            df = pd.read_json(file_path)
        elif file_path.endswith(".xlsx") or file_path.endswith(".xls"):
            df = pd.read_excel(file_path)
        else:
            raise ValueError(f"Unsupported file format: {file_path}")
        
        # Cache if enabled
        if self.config.get("enableCache", True):
            self._dataframe_cache[file_path] = df
        
        return df
    
    @tool(
        name="analyze_data",
        description="Load and analyze a data file (CSV, JSON, or Excel)",
        parameters={
            "file_path": {
                "type": "string",
                "description": "Path to the data file"
            },
            "query": {
                "type": "string",
                "description": "Optional pandas query to filter data",
                "required": False
            }
        }
    )
    async def analyze_data(self, file_path: str, query: Optional[str] = None) -> Dict[str, Any]:
        """Analyze a data file and return statistics"""
        df = self._get_dataframe(file_path)
        max_rows = self.config.get("maxRows", 100)
        
        result = {
            "file": file_path,
            "shape": {"rows": len(df), "columns": len(df.columns)},
            "columns": list(df.columns),
            "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
            "memory_usage": f"{df.memory_usage(deep=True).sum() / 1024:.2f} KB",
            "null_counts": df.isnull().sum().to_dict(),
        }
        
        # Add numeric column statistics
        numeric_cols = df.select_dtypes(include=['number']).columns
        if len(numeric_cols) > 0:
            result["numeric_stats"] = df[numeric_cols].describe().to_dict()
        
        # Apply query if provided
        if query:
            filtered = df.query(query)
            result["query"] = query
            result["query_result"] = {
                "matching_rows": len(filtered),
                "sample": filtered.head(max_rows).to_dict("records")
            }
        else:
            result["sample"] = df.head(min(10, max_rows)).to_dict("records")
        
        return result
    
    @tool(
        name="column_stats",
        description="Get detailed statistics for a specific column",
        parameters={
            "file_path": {
                "type": "string",
                "description": "Path to the data file"
            },
            "column": {
                "type": "string",
                "description": "Column name to analyze"
            }
        }
    )
    async def column_stats(self, file_path: str, column: str) -> Dict[str, Any]:
        """Get detailed statistics for a column"""
        df = self._get_dataframe(file_path)
        
        if column not in df.columns:
            raise ValueError(f"Column '{column}' not found. Available columns: {list(df.columns)}")
        
        col = df[column]
        
        result = {
            "column": column,
            "dtype": str(col.dtype),
            "count": int(col.count()),
            "null_count": int(col.isnull().sum()),
            "unique_count": int(col.nunique()),
        }
        
        # Add stats based on dtype
        if pd.api.types.is_numeric_dtype(col):
            result.update({
                "min": float(col.min()) if not pd.isna(col.min()) else None,
                "max": float(col.max()) if not pd.isna(col.max()) else None,
                "mean": float(col.mean()) if not pd.isna(col.mean()) else None,
                "median": float(col.median()) if not pd.isna(col.median()) else None,
                "std": float(col.std()) if not pd.isna(col.std()) else None,
            })
        elif pd.api.types.is_string_dtype(col):
            result.update({
                "top_values": col.value_counts().head(10).to_dict(),
                "avg_length": float(col.str.len().mean()) if col.str.len().mean() else None,
            })
        elif pd.api.types.is_datetime64_any_dtype(col):
            result.update({
                "min": str(col.min()),
                "max": str(col.max()),
            })
        
        return result
    
    @tool(
        name="group_by",
        description="Group data by columns and compute aggregations",
        parameters={
            "file_path": {
                "type": "string",
                "description": "Path to the data file"
            },
            "group_columns": {
                "type": "array",
                "description": "Columns to group by"
            },
            "agg_column": {
                "type": "string",
                "description": "Column to aggregate"
            },
            "agg_func": {
                "type": "string",
                "description": "Aggregation function (sum, mean, count, min, max)",
                "enum": ["sum", "mean", "count", "min", "max"]
            }
        }
    )
    async def group_by(
        self,
        file_path: str,
        group_columns: List[str],
        agg_column: str,
        agg_func: str = "sum"
    ) -> Dict[str, Any]:
        """Group data and compute aggregations"""
        df = self._get_dataframe(file_path)
        max_rows = self.config.get("maxRows", 100)
        
        # Validate columns
        for col in group_columns:
            if col not in df.columns:
                raise ValueError(f"Group column '{col}' not found")
        if agg_column not in df.columns:
            raise ValueError(f"Aggregation column '{agg_column}' not found")
        
        # Perform groupby
        grouped = df.groupby(group_columns)[agg_column].agg(agg_func).reset_index()
        grouped.columns = list(grouped.columns[:-1]) + [f"{agg_column}_{agg_func}"]
        
        return {
            "group_columns": group_columns,
            "agg_column": agg_column,
            "agg_func": agg_func,
            "result_count": len(grouped),
            "results": grouped.head(max_rows).to_dict("records")
        }
    
    @tool(
        name="clear_cache",
        description="Clear the dataframe cache"
    )
    async def clear_cache(self) -> Dict[str, Any]:
        """Clear cached dataframes"""
        count = len(self._dataframe_cache)
        self._dataframe_cache.clear()
        return {"cleared": count, "message": f"Cleared {count} cached dataframes"}
    
    @hook("on_config_change")
    def on_config_changed(self, config: Dict[str, Any]):
        """Handle configuration changes"""
        super().on_config_change(config)
        
        # Clear cache if caching is disabled
        if not config.get("enableCache", True):
            self._dataframe_cache.clear()
            self.logger.log_info("Cache disabled, cleared cached dataframes")


# Export the plugin class for discovery
__all__ = ["DataAnalysisPlugin"]
