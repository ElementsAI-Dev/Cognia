"""
CLI Tool for Cognia Plugin SDK

Provides command-line utilities for plugin development:
- cognia new <name>: Create a new plugin from template
- cognia manifest: Generate or validate plugin.json
- cognia test: Run plugin tests
- cognia pack: Package plugin for distribution
- cognia dev: Start development server with hot reload
"""

import argparse
import json
import os
import sys
import shutil
from pathlib import Path
from typing import Any, Dict, List, Optional
import subprocess


# Plugin template files
PLUGIN_TEMPLATE = '''"""
{name} - Cognia Plugin

{description}
"""

from cognia import Plugin, tool, hook, command
from cognia.schema import Schema, parameters
from typing import Dict, Any, Optional, List


class {class_name}(Plugin):
    """
    {description}
    """
    
    name = "{plugin_id}"
    version = "1.0.0"
    description = "{description}"
    capabilities = ["tools"]
    permissions = []
    
    async def on_enable(self):
        """Called when the plugin is enabled"""
        await super().on_enable()
        self.logger.log_info(f"{{self.name}} v{{self.version}} enabled")
    
    async def on_disable(self):
        """Called when the plugin is disabled"""
        await super().on_disable()
        self.logger.log_info(f"{{self.name}} disabled")
    
    @tool(
        name="hello_world",
        description="A simple hello world tool",
        parameters=parameters({{
            "name": Schema.string("Name to greet"),
        }})
    )
    async def hello_world(self, name: str) -> Dict[str, Any]:
        """
        Greets the user by name.
        
        Args:
            name: The name to greet
            
        Returns:
            Greeting message
        """
        return {{
            "message": f"Hello, {{name}}!",
            "plugin": self.name,
        }}
    
    @hook("on_message_receive")
    async def on_message(self, message):
        """Log received messages"""
        self.logger.log_debug(f"Message received: {{message.content[:50]}}")
        return message


# Export the plugin class
__all__ = ["{class_name}"]
'''

MANIFEST_TEMPLATE = {
    "id": "",
    "name": "",
    "version": "1.0.0",
    "description": "",
    "type": "python",
    "capabilities": ["tools"],
    "author": {
        "name": "",
        "email": "",
    },
    "pythonMain": "main.py",
    "pythonDependencies": [],
    "permissions": [],
    "configSchema": {},
    "defaultConfig": {},
}

README_TEMPLATE = '''# {name}

{description}

## Installation

1. Copy this plugin to your Cognia plugins directory
2. Enable the plugin in Cognia settings

## Features

- Hello World tool: Demonstrates basic tool usage

## Development

```bash
# Install dependencies
pip install cognia-sdk

# Run tests
cognia test

# Generate manifest
cognia manifest

# Package for distribution
cognia pack
```

## License

MIT
'''

TEST_TEMPLATE = '''"""
Tests for {name} plugin
"""

import pytest
from main import {class_name}


class Test{class_name}:
    """Tests for {class_name}"""
    
    @pytest.fixture
    def plugin(self):
        """Create plugin instance for testing"""
        return {class_name}()
    
    def test_plugin_name(self, plugin):
        """Test plugin name is set correctly"""
        assert plugin.name == "{plugin_id}"
    
    def test_plugin_version(self, plugin):
        """Test plugin version is set"""
        assert plugin.version == "1.0.0"
    
    @pytest.mark.asyncio
    async def test_hello_world(self, plugin):
        """Test hello_world tool"""
        result = await plugin.hello_world("Test")
        assert result["message"] == "Hello, Test!"
        assert result["plugin"] == plugin.name
'''

PYPROJECT_TEMPLATE = '''[project]
name = "{plugin_id}"
version = "1.0.0"
description = "{description}"
requires-python = ">=3.9"
dependencies = [
    "cognia-sdk>=1.0.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0.0",
    "pytest-asyncio>=0.21.0",
]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
'''


def to_class_name(name: str) -> str:
    """Convert plugin name to class name"""
    # Remove special characters and convert to PascalCase
    words = name.replace("-", " ").replace("_", " ").split()
    return "".join(word.capitalize() for word in words) + "Plugin"


def to_plugin_id(name: str) -> str:
    """Convert name to plugin ID"""
    return name.lower().replace(" ", "-").replace("_", "-")


def create_plugin(name: str, path: Optional[str] = None, description: str = "") -> None:
    """Create a new plugin from template"""
    plugin_id = to_plugin_id(name)
    class_name = to_class_name(name)
    
    # Determine target directory
    target_dir = Path(path) if path else Path.cwd() / plugin_id
    
    if target_dir.exists():
        print(f"Error: Directory '{target_dir}' already exists")
        sys.exit(1)
    
    # Create directory structure
    target_dir.mkdir(parents=True)
    (target_dir / "tests").mkdir()
    
    # Create main.py
    main_content = PLUGIN_TEMPLATE.format(
        name=name,
        plugin_id=plugin_id,
        class_name=class_name,
        description=description or f"A Cognia plugin: {name}",
    )
    (target_dir / "main.py").write_text(main_content)
    
    # Create plugin.json
    manifest = MANIFEST_TEMPLATE.copy()
    manifest["id"] = plugin_id
    manifest["name"] = name
    manifest["description"] = description or f"A Cognia plugin: {name}"
    (target_dir / "plugin.json").write_text(json.dumps(manifest, indent=2))
    
    # Create README.md
    readme_content = README_TEMPLATE.format(
        name=name,
        description=description or f"A Cognia plugin: {name}",
    )
    (target_dir / "README.md").write_text(readme_content)
    
    # Create test file
    test_content = TEST_TEMPLATE.format(
        name=name,
        plugin_id=plugin_id,
        class_name=class_name,
    )
    (target_dir / "tests" / "test_main.py").write_text(test_content)
    
    # Create pyproject.toml
    pyproject_content = PYPROJECT_TEMPLATE.format(
        plugin_id=plugin_id,
        description=description or f"A Cognia plugin: {name}",
    )
    (target_dir / "pyproject.toml").write_text(pyproject_content)
    
    # Create __init__.py files
    (target_dir / "__init__.py").write_text(f'from .main import {class_name}\n')
    (target_dir / "tests" / "__init__.py").write_text("")
    
    print(f"✅ Created plugin '{name}' at {target_dir}")
    print(f"\nNext steps:")
    print(f"  cd {target_dir}")
    print(f"  pip install -e .[dev]")
    print(f"  cognia test")


def generate_manifest(path: Optional[str] = None, validate_only: bool = False) -> None:
    """Generate or validate plugin.json"""
    target_dir = Path(path) if path else Path.cwd()
    manifest_path = target_dir / "plugin.json"
    main_path = target_dir / "main.py"
    
    if validate_only:
        if not manifest_path.exists():
            print(f"Error: plugin.json not found at {manifest_path}")
            sys.exit(1)
        
        try:
            with open(manifest_path) as f:
                manifest = json.load(f)
            
            # Validate required fields
            required = ["id", "name", "version", "description", "type"]
            missing = [f for f in required if not manifest.get(f)]
            if missing:
                print(f"❌ Missing required fields: {', '.join(missing)}")
                sys.exit(1)
            
            print(f"✅ plugin.json is valid")
            print(f"   ID: {manifest['id']}")
            print(f"   Name: {manifest['name']}")
            print(f"   Version: {manifest['version']}")
        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON: {e}")
            sys.exit(1)
    else:
        # Generate manifest from plugin class
        if not main_path.exists():
            print(f"Error: main.py not found at {main_path}")
            sys.exit(1)
        
        # Import the plugin and generate manifest
        sys.path.insert(0, str(target_dir))
        try:
            import importlib.util
            spec = importlib.util.spec_from_file_location("main", main_path)
            if spec and spec.loader:
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                
                # Find Plugin subclass
                from .plugin import Plugin
                plugin_class = None
                for name in dir(module):
                    obj = getattr(module, name)
                    if isinstance(obj, type) and issubclass(obj, Plugin) and obj is not Plugin:
                        plugin_class = obj
                        break
                
                if not plugin_class:
                    print("Error: No Plugin subclass found in main.py")
                    sys.exit(1)
                
                # Generate manifest
                manifest = plugin_class.generate_manifest()
                
                # Write manifest
                with open(manifest_path, "w") as f:
                    json.dump(manifest, f, indent=2)
                
                print(f"✅ Generated plugin.json")
        except Exception as e:
            print(f"Error generating manifest: {e}")
            sys.exit(1)
        finally:
            sys.path.pop(0)


def run_tests(path: Optional[str] = None, verbose: bool = False) -> None:
    """Run plugin tests"""
    target_dir = Path(path) if path else Path.cwd()
    test_dir = target_dir / "tests"
    
    if not test_dir.exists():
        print(f"Error: tests directory not found at {test_dir}")
        sys.exit(1)
    
    # Run pytest
    cmd = ["python", "-m", "pytest", str(test_dir)]
    if verbose:
        cmd.append("-v")
    
    result = subprocess.run(cmd, cwd=str(target_dir))
    sys.exit(result.returncode)


def pack_plugin(path: Optional[str] = None, output: Optional[str] = None) -> None:
    """Package plugin for distribution"""
    target_dir = Path(path) if path else Path.cwd()
    manifest_path = target_dir / "plugin.json"
    
    if not manifest_path.exists():
        print(f"Error: plugin.json not found at {manifest_path}")
        sys.exit(1)
    
    # Load manifest
    with open(manifest_path) as f:
        manifest = json.load(f)
    
    plugin_id = manifest.get("id", "plugin")
    version = manifest.get("version", "1.0.0")
    
    # Determine output path
    output_name = f"{plugin_id}-{version}.zip"
    output_path = Path(output) if output else target_dir / "dist" / output_name
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Create zip archive
    import zipfile
    
    # Files to exclude
    exclude_patterns = [
        "__pycache__",
        "*.pyc",
        ".git",
        ".venv",
        "venv",
        "dist",
        "build",
        "*.egg-info",
        ".pytest_cache",
        ".coverage",
    ]
    
    def should_exclude(path: Path) -> bool:
        name = path.name
        for pattern in exclude_patterns:
            if pattern.startswith("*"):
                if name.endswith(pattern[1:]):
                    return True
            elif name == pattern:
                return True
        return False
    
    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for file_path in target_dir.rglob("*"):
            if file_path.is_file() and not should_exclude(file_path):
                # Check parent directories too
                if any(should_exclude(p) for p in file_path.parents):
                    continue
                rel_path = file_path.relative_to(target_dir)
                zf.write(file_path, rel_path)
    
    print(f"✅ Created package: {output_path}")


def start_dev_server(path: Optional[str] = None, port: int = 9876) -> None:
    """Start development server with hot reload"""
    target_dir = Path(path) if path else Path.cwd()
    
    print(f"Starting development server for plugin at {target_dir}")
    print(f"Watching for changes...")
    print(f"Press Ctrl+C to stop")
    
    # Note: This is a placeholder - actual implementation would require
    # file watching and IPC with Tauri backend
    try:
        import time
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopped development server")


def main() -> None:
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(
        prog="cognia",
        description="Cognia Plugin SDK CLI",
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # new command
    new_parser = subparsers.add_parser("new", help="Create a new plugin")
    new_parser.add_argument("name", help="Plugin name")
    new_parser.add_argument("-p", "--path", help="Target directory")
    new_parser.add_argument("-d", "--description", help="Plugin description", default="")
    
    # manifest command
    manifest_parser = subparsers.add_parser("manifest", help="Generate or validate plugin.json")
    manifest_parser.add_argument("-p", "--path", help="Plugin directory")
    manifest_parser.add_argument("--validate", action="store_true", help="Validate only")
    
    # test command
    test_parser = subparsers.add_parser("test", help="Run plugin tests")
    test_parser.add_argument("-p", "--path", help="Plugin directory")
    test_parser.add_argument("-v", "--verbose", action="store_true", help="Verbose output")
    
    # pack command
    pack_parser = subparsers.add_parser("pack", help="Package plugin for distribution")
    pack_parser.add_argument("-p", "--path", help="Plugin directory")
    pack_parser.add_argument("-o", "--output", help="Output file path")
    
    # dev command
    dev_parser = subparsers.add_parser("dev", help="Start development server")
    dev_parser.add_argument("-p", "--path", help="Plugin directory")
    dev_parser.add_argument("--port", type=int, default=9876, help="Server port")
    
    # version command
    subparsers.add_parser("version", help="Show SDK version")
    
    args = parser.parse_args()
    
    if args.command == "new":
        create_plugin(args.name, args.path, args.description)
    elif args.command == "manifest":
        generate_manifest(args.path, args.validate)
    elif args.command == "test":
        run_tests(args.path, args.verbose)
    elif args.command == "pack":
        pack_plugin(args.path, args.output)
    elif args.command == "dev":
        start_dev_server(args.path, args.port)
    elif args.command == "version":
        from . import __version__
        print(f"Cognia Plugin SDK v{__version__}")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
