"""
Python Plugin Example

This example demonstrates how to create a Python plugin with tools.
"""

from cognia import Plugin, tool, hook
from typing import Dict, Any
import re


class WeatherPlugin(Plugin):
    """Example Python plugin demonstrating tool and hook usage."""
    
    name = "python-plugin-example"
    version = "1.0.0"
    description = "A simple example demonstrating how to create a Python plugin"
    capabilities = ["tools"]
    permissions = ["network:fetch"]
    
    @tool(
        name="fetch_weather",
        description="Fetch current weather for a city (mock implementation)",
        parameters={
            "type": "object",
            "properties": {
                "city": {
                    "type": "string",
                    "description": "The city name to get weather for"
                }
            },
            "required": ["city"]
        }
    )
    async def fetch_weather(self, city: str) -> Dict[str, Any]:
        """
        Fetch weather for a city.
        
        Note: This is a mock implementation. In a real plugin, you would
        call an actual weather API like OpenWeatherMap.
        """
        # Mock weather data
        mock_data = {
            "new york": {"temp": 72, "condition": "Partly Cloudy", "humidity": 65},
            "london": {"temp": 55, "condition": "Rainy", "humidity": 80},
            "tokyo": {"temp": 68, "condition": "Sunny", "humidity": 50},
            "paris": {"temp": 62, "condition": "Cloudy", "humidity": 70},
            "sydney": {"temp": 78, "condition": "Clear", "humidity": 45},
        }
        
        city_lower = city.lower()
        if city_lower in mock_data:
            data = mock_data[city_lower]
            return {
                "city": city,
                "temperature": data["temp"],
                "condition": data["condition"],
                "humidity": data["humidity"],
                "unit": "fahrenheit"
            }
        else:
            # Return generic data for unknown cities
            return {
                "city": city,
                "temperature": 65,
                "condition": "Unknown",
                "humidity": 60,
                "unit": "fahrenheit",
                "note": "Mock data - city not in database"
            }
    
    @tool(
        name="count_words",
        description="Count words in text",
        parameters={
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "The text to count words in"
                }
            },
            "required": ["text"]
        }
    )
    def count_words(self, text: str) -> Dict[str, Any]:
        """Count words, characters, and sentences in text."""
        # Count words (split by whitespace)
        words = text.split()
        word_count = len(words)
        
        # Count characters (excluding spaces)
        char_count = len(text.replace(" ", ""))
        
        # Count sentences (split by . ! ?)
        sentences = re.split(r'[.!?]+', text)
        sentence_count = len([s for s in sentences if s.strip()])
        
        # Find unique words
        unique_words = set(word.lower().strip('.,!?;:') for word in words)
        
        return {
            "word_count": word_count,
            "character_count": char_count,
            "sentence_count": sentence_count,
            "unique_word_count": len(unique_words),
            "average_word_length": char_count / word_count if word_count > 0 else 0
        }
    
    @hook("on_agent_step")
    async def log_agent_step(self, agent_id: str, step: Dict[str, Any]) -> None:
        """Log when an agent executes a step."""
        self.logger.info(f"Agent {agent_id} executed step: {step.get('action', 'unknown')}")
    
    async def on_load(self) -> None:
        """Called when the plugin is loaded."""
        self.logger.info("Python Plugin Example loaded!")
    
    async def on_enable(self) -> None:
        """Called when the plugin is enabled."""
        self.logger.info("Python Plugin Example enabled!")
    
    async def on_disable(self) -> None:
        """Called when the plugin is disabled."""
        self.logger.info("Python Plugin Example disabled!")


# Export the plugin class
__plugin__ = WeatherPlugin
