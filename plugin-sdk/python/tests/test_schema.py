"""
Unit tests for cognia.schema module
"""

import pytest
from cognia.schema import (
    Schema, parameters,
    string, number, integer, boolean, array, object, optional, nullable,
)


class TestSchemaString:
    """Tests for Schema.string"""
    
    def test_basic_string(self):
        """Test basic string schema"""
        result = Schema.string()
        assert result == {"type": "string"}
    
    def test_string_with_description(self):
        """Test string with description"""
        result = Schema.string("A description")
        assert result == {"type": "string", "description": "A description"}
    
    def test_string_with_enum(self):
        """Test string with enum values"""
        result = Schema.string("Choose one", enum=["a", "b", "c"])
        assert result == {
            "type": "string",
            "description": "Choose one",
            "enum": ["a", "b", "c"]
        }
    
    def test_string_with_constraints(self):
        """Test string with length constraints"""
        result = Schema.string("Input", min_length=1, max_length=100)
        assert result == {
            "type": "string",
            "description": "Input",
            "minLength": 1,
            "maxLength": 100
        }
    
    def test_string_with_pattern(self):
        """Test string with regex pattern"""
        result = Schema.string(pattern=r"^\d{3}-\d{4}$")
        assert result == {
            "type": "string",
            "pattern": r"^\d{3}-\d{4}$"
        }
    
    def test_string_with_format(self):
        """Test string with format"""
        result = Schema.string(format="email")
        assert result == {"type": "string", "format": "email"}
    
    def test_string_with_default(self):
        """Test string with default value"""
        result = Schema.string(default="hello")
        assert result == {"type": "string", "default": "hello"}


class TestSchemaNumber:
    """Tests for Schema.number and Schema.integer"""
    
    def test_basic_number(self):
        """Test basic number schema"""
        result = Schema.number()
        assert result == {"type": "number"}
    
    def test_number_with_description(self):
        """Test number with description"""
        result = Schema.number("A value")
        assert result == {"type": "number", "description": "A value"}
    
    def test_number_with_range(self):
        """Test number with min/max"""
        result = Schema.number(minimum=0, maximum=100)
        assert result == {"type": "number", "minimum": 0, "maximum": 100}
    
    def test_number_exclusive_range(self):
        """Test number with exclusive min/max"""
        result = Schema.number(exclusive_minimum=0, exclusive_maximum=100)
        assert result == {
            "type": "number",
            "exclusiveMinimum": 0,
            "exclusiveMaximum": 100
        }
    
    def test_integer_type(self):
        """Test integer schema"""
        result = Schema.integer("Count")
        assert result == {"type": "integer", "description": "Count"}
    
    def test_integer_with_multiple_of(self):
        """Test integer with multipleOf"""
        result = Schema.integer(multiple_of=5)
        assert result == {"type": "integer", "multipleOf": 5}


class TestSchemaBoolean:
    """Tests for Schema.boolean"""
    
    def test_basic_boolean(self):
        """Test basic boolean schema"""
        result = Schema.boolean()
        assert result == {"type": "boolean"}
    
    def test_boolean_with_description(self):
        """Test boolean with description"""
        result = Schema.boolean("Is enabled")
        assert result == {"type": "boolean", "description": "Is enabled"}
    
    def test_boolean_with_default(self):
        """Test boolean with default"""
        result = Schema.boolean(default=True)
        assert result == {"type": "boolean", "default": True}


class TestSchemaArray:
    """Tests for Schema.array"""
    
    def test_basic_array(self):
        """Test basic array schema"""
        result = Schema.array(Schema.string())
        assert result == {"type": "array", "items": {"type": "string"}}
    
    def test_array_with_description(self):
        """Test array with description"""
        result = Schema.array(Schema.string(), "List of names")
        assert result == {
            "type": "array",
            "items": {"type": "string"},
            "description": "List of names"
        }
    
    def test_array_with_constraints(self):
        """Test array with min/max items"""
        result = Schema.array(Schema.number(), min_items=1, max_items=10)
        assert result == {
            "type": "array",
            "items": {"type": "number"},
            "minItems": 1,
            "maxItems": 10
        }
    
    def test_array_unique_items(self):
        """Test array with unique items"""
        result = Schema.array(Schema.string(), unique_items=True)
        assert result == {
            "type": "array",
            "items": {"type": "string"},
            "uniqueItems": True
        }


class TestSchemaObject:
    """Tests for Schema.object"""
    
    def test_basic_object(self):
        """Test basic object schema"""
        result = Schema.object({
            "name": Schema.string(),
            "age": Schema.integer()
        })
        assert result == {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "age": {"type": "integer"}
            }
        }
    
    def test_object_with_required(self):
        """Test object with required fields"""
        result = Schema.object(
            {"name": Schema.string(), "email": Schema.string()},
            required=["name"]
        )
        assert result == {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "email": {"type": "string"}
            },
            "required": ["name"]
        }
    
    def test_object_with_description(self):
        """Test object with description"""
        result = Schema.object({"x": Schema.number()}, description="A point")
        assert result == {
            "type": "object",
            "properties": {"x": {"type": "number"}},
            "description": "A point"
        }
    
    def test_object_additional_properties(self):
        """Test object with additionalProperties"""
        result = Schema.object({}, additional_properties=False)
        assert result == {
            "type": "object",
            "properties": {},
            "additionalProperties": False
        }


class TestSchemaCombiners:
    """Tests for Schema combiners"""
    
    def test_any_of(self):
        """Test anyOf combiner"""
        result = Schema.any_of(Schema.string(), Schema.number())
        assert result == {
            "anyOf": [{"type": "string"}, {"type": "number"}]
        }
    
    def test_one_of(self):
        """Test oneOf combiner"""
        result = Schema.one_of(
            Schema.object({"type": Schema.const("a")}),
            Schema.object({"type": Schema.const("b")})
        )
        assert result["oneOf"][0]["properties"]["type"]["const"] == "a"
    
    def test_all_of(self):
        """Test allOf combiner"""
        result = Schema.all_of(
            Schema.object({"name": Schema.string()}),
            Schema.object({"age": Schema.integer()})
        )
        assert len(result["allOf"]) == 2


class TestSchemaOptional:
    """Tests for Schema.optional"""
    
    def test_optional_marker(self):
        """Test optional adds marker"""
        result = Schema.optional(Schema.string("Optional field"))
        assert result["_optional"] == True
        assert result["type"] == "string"
    
    def test_nullable(self):
        """Test nullable schema"""
        result = Schema.nullable(Schema.string())
        assert "anyOf" in result
        assert {"type": "null"} in result["anyOf"]


class TestParameters:
    """Tests for parameters function"""
    
    def test_basic_parameters(self):
        """Test basic parameters"""
        result = parameters({
            "name": Schema.string("Name"),
            "age": Schema.integer("Age")
        })
        assert result == {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Name"},
                "age": {"type": "integer", "description": "Age"}
            },
            "required": ["name", "age"]
        }
    
    def test_parameters_with_optional(self):
        """Test parameters with optional fields"""
        result = parameters({
            "name": Schema.string("Name"),
            "nickname": Schema.optional(Schema.string("Nickname"))
        })
        assert result["required"] == ["name"]
        assert "_optional" not in result["properties"]["nickname"]
    
    def test_parameters_explicit_required(self):
        """Test parameters with explicit required list"""
        result = parameters(
            {
                "a": Schema.string(),
                "b": Schema.string(),
                "c": Schema.string()
            },
            required=["a", "b"]
        )
        assert result["required"] == ["a", "b"]


class TestConvenienceAliases:
    """Tests for convenience aliases"""
    
    def test_string_alias(self):
        """Test string alias"""
        assert string("test") == Schema.string("test")
    
    def test_number_alias(self):
        """Test number alias"""
        assert number("val") == Schema.number("val")
    
    def test_integer_alias(self):
        """Test integer alias"""
        assert integer("count") == Schema.integer("count")
    
    def test_boolean_alias(self):
        """Test boolean alias"""
        assert boolean("flag") == Schema.boolean("flag")
    
    def test_array_alias(self):
        """Test array alias"""
        result = array(string())
        assert result == Schema.array(Schema.string())
    
    def test_object_alias(self):
        """Test object alias"""
        result = object({"x": number()})
        assert result == Schema.object({"x": Schema.number()})
    
    def test_optional_alias(self):
        """Test optional alias"""
        result = optional(string())
        assert result == Schema.optional(Schema.string())
    
    def test_nullable_alias(self):
        """Test nullable alias"""
        result = nullable(string())
        assert result == Schema.nullable(Schema.string())
