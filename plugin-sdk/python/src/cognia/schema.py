"""
JSON Schema Helpers for Cognia Plugin SDK

Provides type-safe builders for JSON Schema used in tool parameter definitions.
Mirrors the TypeScript SDK's Schema helpers for consistency.
"""

from typing import Any, Dict, List, Optional, TypeVar, Union
from dataclasses import dataclass, field

T = TypeVar('T')


class Schema:
    """
    JSON Schema helpers for tool parameter definitions.
    
    Provides type-safe builders for JSON Schema used in tool parameters.
    
    Example:
        from cognia import Schema, parameters
        
        schema = parameters({
            # String parameter
            "query": Schema.string("Search query"),
            
            # Optional string with enum
            "language": Schema.optional(
                Schema.string("Language", enum=["en", "es", "fr"])
            ),
            
            # Number with constraints
            "limit": Schema.optional(
                Schema.integer("Max results", minimum=1, maximum=100)
            ),
            
            # Array
            "tags": Schema.optional(
                Schema.array(Schema.string("Tag"), "Tags to filter by")
            ),
            
            # Object
            "filters": Schema.optional(
                Schema.object({
                    "dateRange": Schema.string("Date range"),
                    "type": Schema.string("Type"),
                })
            ),
        }, required=["query"])
    """
    
    @staticmethod
    def string(
        description: Optional[str] = None,
        *,
        enum: Optional[List[str]] = None,
        min_length: Optional[int] = None,
        max_length: Optional[int] = None,
        pattern: Optional[str] = None,
        format: Optional[str] = None,
        default: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        String schema type.
        
        Args:
            description: Parameter description for AI
            enum: List of allowed values
            min_length: Minimum string length
            max_length: Maximum string length
            pattern: Regex pattern for validation
            format: String format (e.g., 'date', 'email', 'uri')
            default: Default value
            
        Returns:
            JSON Schema dict for string type
        """
        schema: Dict[str, Any] = {"type": "string"}
        if description:
            schema["description"] = description
        if enum:
            schema["enum"] = enum
        if min_length is not None:
            schema["minLength"] = min_length
        if max_length is not None:
            schema["maxLength"] = max_length
        if pattern:
            schema["pattern"] = pattern
        if format:
            schema["format"] = format
        if default is not None:
            schema["default"] = default
        return schema
    
    @staticmethod
    def number(
        description: Optional[str] = None,
        *,
        minimum: Optional[float] = None,
        maximum: Optional[float] = None,
        exclusive_minimum: Optional[float] = None,
        exclusive_maximum: Optional[float] = None,
        multiple_of: Optional[float] = None,
        default: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Number schema type (floating point).
        
        Args:
            description: Parameter description for AI
            minimum: Minimum value (inclusive)
            maximum: Maximum value (inclusive)
            exclusive_minimum: Minimum value (exclusive)
            exclusive_maximum: Maximum value (exclusive)
            multiple_of: Value must be multiple of this
            default: Default value
            
        Returns:
            JSON Schema dict for number type
        """
        schema: Dict[str, Any] = {"type": "number"}
        if description:
            schema["description"] = description
        if minimum is not None:
            schema["minimum"] = minimum
        if maximum is not None:
            schema["maximum"] = maximum
        if exclusive_minimum is not None:
            schema["exclusiveMinimum"] = exclusive_minimum
        if exclusive_maximum is not None:
            schema["exclusiveMaximum"] = exclusive_maximum
        if multiple_of is not None:
            schema["multipleOf"] = multiple_of
        if default is not None:
            schema["default"] = default
        return schema
    
    @staticmethod
    def integer(
        description: Optional[str] = None,
        *,
        minimum: Optional[int] = None,
        maximum: Optional[int] = None,
        exclusive_minimum: Optional[int] = None,
        exclusive_maximum: Optional[int] = None,
        multiple_of: Optional[int] = None,
        default: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Integer schema type.
        
        Args:
            description: Parameter description for AI
            minimum: Minimum value (inclusive)
            maximum: Maximum value (inclusive)
            exclusive_minimum: Minimum value (exclusive)
            exclusive_maximum: Maximum value (exclusive)
            multiple_of: Value must be multiple of this
            default: Default value
            
        Returns:
            JSON Schema dict for integer type
        """
        schema: Dict[str, Any] = {"type": "integer"}
        if description:
            schema["description"] = description
        if minimum is not None:
            schema["minimum"] = minimum
        if maximum is not None:
            schema["maximum"] = maximum
        if exclusive_minimum is not None:
            schema["exclusiveMinimum"] = exclusive_minimum
        if exclusive_maximum is not None:
            schema["exclusiveMaximum"] = exclusive_maximum
        if multiple_of is not None:
            schema["multipleOf"] = multiple_of
        if default is not None:
            schema["default"] = default
        return schema
    
    @staticmethod
    def boolean(
        description: Optional[str] = None,
        *,
        default: Optional[bool] = None,
    ) -> Dict[str, Any]:
        """
        Boolean schema type.
        
        Args:
            description: Parameter description for AI
            default: Default value
            
        Returns:
            JSON Schema dict for boolean type
        """
        schema: Dict[str, Any] = {"type": "boolean"}
        if description:
            schema["description"] = description
        if default is not None:
            schema["default"] = default
        return schema
    
    @staticmethod
    def array(
        items: Dict[str, Any],
        description: Optional[str] = None,
        *,
        min_items: Optional[int] = None,
        max_items: Optional[int] = None,
        unique_items: bool = False,
        default: Optional[List[Any]] = None,
    ) -> Dict[str, Any]:
        """
        Array schema type.
        
        Args:
            items: Schema for array items
            description: Parameter description for AI
            min_items: Minimum number of items
            max_items: Maximum number of items
            unique_items: Whether items must be unique
            default: Default value
            
        Returns:
            JSON Schema dict for array type
        """
        schema: Dict[str, Any] = {"type": "array", "items": items}
        if description:
            schema["description"] = description
        if min_items is not None:
            schema["minItems"] = min_items
        if max_items is not None:
            schema["maxItems"] = max_items
        if unique_items:
            schema["uniqueItems"] = True
        if default is not None:
            schema["default"] = default
        return schema
    
    @staticmethod
    def object(
        properties: Dict[str, Dict[str, Any]],
        required: Optional[List[str]] = None,
        description: Optional[str] = None,
        *,
        additional_properties: Optional[Union[bool, Dict[str, Any]]] = None,
        default: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Object schema type.
        
        Args:
            properties: Object property schemas
            required: Required property names
            description: Parameter description for AI
            additional_properties: Schema for additional properties, or False to disallow
            default: Default value
            
        Returns:
            JSON Schema dict for object type
        """
        schema: Dict[str, Any] = {"type": "object", "properties": properties}
        if required:
            schema["required"] = required
        if description:
            schema["description"] = description
        if additional_properties is not None:
            schema["additionalProperties"] = additional_properties
        if default is not None:
            schema["default"] = default
        return schema
    
    @staticmethod
    def any_of(*schemas: Dict[str, Any]) -> Dict[str, Any]:
        """
        Union type - value must match at least one schema.
        
        Args:
            schemas: Schemas that the value can match
            
        Returns:
            JSON Schema dict for anyOf
        """
        return {"anyOf": list(schemas)}
    
    @staticmethod
    def one_of(*schemas: Dict[str, Any]) -> Dict[str, Any]:
        """
        Exclusive union - value must match exactly one schema.
        
        Args:
            schemas: Schemas that the value can match
            
        Returns:
            JSON Schema dict for oneOf
        """
        return {"oneOf": list(schemas)}
    
    @staticmethod
    def all_of(*schemas: Dict[str, Any]) -> Dict[str, Any]:
        """
        Intersection type - value must match all schemas.
        
        Args:
            schemas: Schemas that the value must match
            
        Returns:
            JSON Schema dict for allOf
        """
        return {"allOf": list(schemas)}
    
    @staticmethod
    def null() -> Dict[str, Any]:
        """
        Null schema type.
        
        Returns:
            JSON Schema dict for null type
        """
        return {"type": "null"}
    
    @staticmethod
    def const(value: Any, description: Optional[str] = None) -> Dict[str, Any]:
        """
        Constant value schema.
        
        Args:
            value: The constant value
            description: Parameter description
            
        Returns:
            JSON Schema dict for const
        """
        schema: Dict[str, Any] = {"const": value}
        if description:
            schema["description"] = description
        return schema
    
    @staticmethod
    def ref(ref_path: str) -> Dict[str, Any]:
        """
        Reference to another schema.
        
        Args:
            ref_path: JSON Pointer path to the referenced schema
            
        Returns:
            JSON Schema dict for $ref
        """
        return {"$ref": ref_path}
    
    @staticmethod
    def optional(schema: Dict[str, Any]) -> Dict[str, Any]:
        """
        Mark a schema as optional.
        
        This adds a marker that the `parameters` function will use
        to exclude this property from the required list.
        
        Args:
            schema: The schema to mark as optional
            
        Returns:
            Schema with optional marker
        """
        return {**schema, "_optional": True}
    
    @staticmethod
    def nullable(schema: Dict[str, Any]) -> Dict[str, Any]:
        """
        Make a schema nullable (can be null or the specified type).
        
        Args:
            schema: The base schema
            
        Returns:
            Schema that allows null
        """
        return Schema.any_of(schema, Schema.null())


def parameters(
    props: Dict[str, Dict[str, Any]],
    required: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Type-safe parameter builder for tool schemas.
    
    Creates a JSON Schema object for tool parameters with proper typing.
    Automatically handles optional markers from Schema.optional().
    
    Args:
        props: Dictionary of property name to schema
        required: List of required property names. If not provided,
                  all properties without the _optional marker are required.
    
    Returns:
        Complete JSON Schema for tool parameters
    
    Example:
        params = parameters({
            "text": Schema.string("Input text"),
            "count": Schema.optional(Schema.integer("Count")),
        })
        
        # Result:
        # {
        #     "type": "object",
        #     "properties": {
        #         "text": {"type": "string", "description": "Input text"},
        #         "count": {"type": "integer", "description": "Count"}
        #     },
        #     "required": ["text"]
        # }
    """
    # Clean properties (remove _optional markers)
    clean_props = {}
    auto_required = []
    
    for name, schema in props.items():
        # Check for optional marker
        if schema.get("_optional"):
            # Remove the marker and don't add to required
            clean_schema = {k: v for k, v in schema.items() if k != "_optional"}
            clean_props[name] = clean_schema
        else:
            clean_props[name] = schema
            auto_required.append(name)
    
    # Use explicit required list if provided, otherwise use auto-detected
    final_required = required if required is not None else auto_required
    
    result: Dict[str, Any] = {
        "type": "object",
        "properties": clean_props,
    }
    
    if final_required:
        result["required"] = final_required
    
    return result


# Convenience aliases
string = Schema.string
number = Schema.number
integer = Schema.integer
boolean = Schema.boolean
array = Schema.array
object = Schema.object
optional = Schema.optional
nullable = Schema.nullable
any_of = Schema.any_of
one_of = Schema.one_of
all_of = Schema.all_of


__all__ = [
    "Schema",
    "parameters",
    # Convenience aliases
    "string",
    "number", 
    "integer",
    "boolean",
    "array",
    "object",
    "optional",
    "nullable",
    "any_of",
    "one_of",
    "all_of",
]
