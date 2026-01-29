"""
Unit tests for cognia.cli module
"""

import pytest
import os
import sys
import json
import tempfile
import shutil
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
from cognia.cli import (
    create_plugin,
    generate_manifest,
    run_tests,
    pack_plugin,
    to_class_name,
    to_plugin_id,
    main,
    PLUGIN_TEMPLATE,
    MANIFEST_TEMPLATE,
    README_TEMPLATE,
    TEST_TEMPLATE,
    PYPROJECT_TEMPLATE,
)


class TestToClassName:
    """Tests for to_class_name helper"""
    
    def test_simple_name(self):
        """Test simple name conversion"""
        assert to_class_name("my plugin") == "MyPluginPlugin"
    
    def test_hyphenated_name(self):
        """Test hyphenated name conversion"""
        assert to_class_name("my-awesome-plugin") == "MyAwesomePluginPlugin"
    
    def test_underscored_name(self):
        """Test underscored name conversion"""
        assert to_class_name("my_plugin") == "MyPluginPlugin"
    
    def test_single_word(self):
        """Test single word name"""
        assert to_class_name("utility") == "UtilityPlugin"
    
    def test_mixed_separators(self):
        """Test mixed separators"""
        assert to_class_name("my-awesome_plugin") == "MyAwesomePluginPlugin"


class TestToPluginId:
    """Tests for to_plugin_id helper"""
    
    def test_simple_name(self):
        """Test simple name conversion"""
        assert to_plugin_id("My Plugin") == "my-plugin"
    
    def test_underscores(self):
        """Test underscore conversion"""
        assert to_plugin_id("my_plugin") == "my-plugin"
    
    def test_mixed_case(self):
        """Test mixed case conversion"""
        assert to_plugin_id("MyAwesomePlugin") == "myawesomeplugin"
    
    def test_already_valid(self):
        """Test already valid id"""
        assert to_plugin_id("my-plugin") == "my-plugin"


class TestCreatePlugin:
    """Tests for create_plugin function"""
    
    @pytest.fixture
    def temp_dir(self):
        """Create temporary directory"""
        temp = tempfile.mkdtemp()
        yield temp
        shutil.rmtree(temp, ignore_errors=True)
    
    def test_create_plugin_basic(self, temp_dir):
        """Test basic plugin creation"""
        plugin_path = os.path.join(temp_dir, "my-plugin")
        
        create_plugin("My Plugin", path=plugin_path)
        
        assert os.path.exists(plugin_path)
        assert os.path.exists(os.path.join(plugin_path, "main.py"))
        assert os.path.exists(os.path.join(plugin_path, "plugin.json"))
        assert os.path.exists(os.path.join(plugin_path, "README.md"))
        assert os.path.exists(os.path.join(plugin_path, "tests"))
        assert os.path.exists(os.path.join(plugin_path, "tests", "test_main.py"))
        assert os.path.exists(os.path.join(plugin_path, "pyproject.toml"))
    
    def test_create_plugin_with_description(self, temp_dir):
        """Test plugin creation with description"""
        plugin_path = os.path.join(temp_dir, "desc-plugin")
        
        create_plugin(
            "Desc Plugin",
            path=plugin_path,
            description="A plugin with description"
        )
        
        # Check manifest has description
        manifest_path = os.path.join(plugin_path, "plugin.json")
        with open(manifest_path) as f:
            manifest = json.load(f)
        
        assert manifest["description"] == "A plugin with description"
    
    def test_create_plugin_main_py(self, temp_dir):
        """Test main.py content"""
        plugin_path = os.path.join(temp_dir, "test-plugin")
        
        create_plugin("Test Plugin", path=plugin_path)
        
        main_path = os.path.join(plugin_path, "main.py")
        with open(main_path) as f:
            content = f.read()
        
        assert "class TestPluginPlugin" in content
        assert "@tool" in content
        assert "@hook" in content
    
    def test_create_plugin_manifest(self, temp_dir):
        """Test plugin.json content"""
        plugin_path = os.path.join(temp_dir, "manifest-test")
        
        create_plugin("Manifest Test", path=plugin_path)
        
        manifest_path = os.path.join(plugin_path, "plugin.json")
        with open(manifest_path) as f:
            manifest = json.load(f)
        
        assert manifest["id"] == "manifest-test"
        assert manifest["name"] == "Manifest Test"
        assert manifest["type"] == "python"
        assert manifest["pythonMain"] == "main.py"
    
    def test_create_plugin_init_file(self, temp_dir):
        """Test __init__.py is created"""
        plugin_path = os.path.join(temp_dir, "init-test")
        
        create_plugin("Init Test", path=plugin_path)
        
        assert os.path.exists(os.path.join(plugin_path, "__init__.py"))
        assert os.path.exists(os.path.join(plugin_path, "tests", "__init__.py"))
    
    def test_create_plugin_existing_dir(self, temp_dir):
        """Test error when directory exists"""
        plugin_path = os.path.join(temp_dir, "existing")
        os.makedirs(plugin_path)
        
        with pytest.raises(SystemExit):
            create_plugin("Existing", path=plugin_path)


class TestGenerateManifest:
    """Tests for generate_manifest function"""
    
    @pytest.fixture
    def temp_plugin(self):
        """Create temporary plugin directory"""
        temp = tempfile.mkdtemp()
        
        # Create main.py with plugin class
        main_content = '''
from cognia import Plugin, tool

class TestPlugin(Plugin):
    name = "test-plugin"
    version = "1.0.0"
    description = "Test plugin"
    capabilities = ["tools"]
    
    @tool(description="Test tool")
    def test_tool(self):
        pass
'''
        with open(os.path.join(temp, "main.py"), "w") as f:
            f.write(main_content)
        
        yield temp
        shutil.rmtree(temp, ignore_errors=True)
    
    def test_validate_valid_manifest(self, temp_plugin):
        """Test validating a valid manifest"""
        manifest = {
            "id": "test-plugin",
            "name": "Test Plugin",
            "version": "1.0.0",
            "description": "Test",
            "type": "python"
        }
        
        manifest_path = os.path.join(temp_plugin, "plugin.json")
        with open(manifest_path, "w") as f:
            json.dump(manifest, f)
        
        # Should not raise
        generate_manifest(path=temp_plugin, validate_only=True)
    
    def test_validate_missing_fields(self, temp_plugin):
        """Test validating manifest with missing fields"""
        manifest = {"id": "test"}  # Missing required fields
        
        manifest_path = os.path.join(temp_plugin, "plugin.json")
        with open(manifest_path, "w") as f:
            json.dump(manifest, f)
        
        with pytest.raises(SystemExit):
            generate_manifest(path=temp_plugin, validate_only=True)
    
    def test_validate_invalid_json(self, temp_plugin):
        """Test validating invalid JSON"""
        manifest_path = os.path.join(temp_plugin, "plugin.json")
        with open(manifest_path, "w") as f:
            f.write("{ invalid json }")
        
        with pytest.raises(SystemExit):
            generate_manifest(path=temp_plugin, validate_only=True)
    
    def test_validate_no_manifest(self, temp_plugin):
        """Test validating when no manifest exists"""
        with pytest.raises(SystemExit):
            generate_manifest(path=temp_plugin, validate_only=True)


class TestPackPlugin:
    """Tests for pack_plugin function"""
    
    @pytest.fixture
    def temp_plugin(self):
        """Create temporary plugin with manifest"""
        temp = tempfile.mkdtemp()
        
        # Create plugin.json
        manifest = {
            "id": "pack-test",
            "name": "Pack Test",
            "version": "1.2.3"
        }
        with open(os.path.join(temp, "plugin.json"), "w") as f:
            json.dump(manifest, f)
        
        # Create main.py
        with open(os.path.join(temp, "main.py"), "w") as f:
            f.write("# Main plugin file")
        
        # Create some test files
        os.makedirs(os.path.join(temp, "tests"))
        with open(os.path.join(temp, "tests", "test_main.py"), "w") as f:
            f.write("# Tests")
        
        yield temp
        shutil.rmtree(temp, ignore_errors=True)
    
    def test_pack_creates_zip(self, temp_plugin):
        """Test packing creates zip file"""
        pack_plugin(path=temp_plugin)
        
        dist_dir = os.path.join(temp_plugin, "dist")
        assert os.path.exists(dist_dir)
        
        # Check zip file exists
        zip_files = list(Path(dist_dir).glob("*.zip"))
        assert len(zip_files) == 1
    
    def test_pack_includes_files(self, temp_plugin):
        """Test pack includes necessary files"""
        import zipfile
        
        pack_plugin(path=temp_plugin)
        
        dist_dir = os.path.join(temp_plugin, "dist")
        zip_path = list(Path(dist_dir).glob("*.zip"))[0]
        
        with zipfile.ZipFile(zip_path, 'r') as zf:
            names = zf.namelist()
            assert "plugin.json" in names
            assert "main.py" in names
    
    def test_pack_excludes_pycache(self, temp_plugin):
        """Test pack excludes __pycache__"""
        import zipfile
        
        # Create __pycache__
        pycache = os.path.join(temp_plugin, "__pycache__")
        os.makedirs(pycache)
        with open(os.path.join(pycache, "main.cpython-310.pyc"), "wb") as f:
            f.write(b"fake bytecode")
        
        pack_plugin(path=temp_plugin)
        
        dist_dir = os.path.join(temp_plugin, "dist")
        zip_path = list(Path(dist_dir).glob("*.zip"))[0]
        
        with zipfile.ZipFile(zip_path, 'r') as zf:
            names = zf.namelist()
            assert not any("__pycache__" in n for n in names)
    
    def test_pack_custom_output(self, temp_plugin):
        """Test pack with custom output path"""
        custom_output = os.path.join(temp_plugin, "custom", "output.zip")
        
        pack_plugin(path=temp_plugin, output=custom_output)
        
        assert os.path.exists(custom_output)
    
    def test_pack_no_manifest(self):
        """Test pack fails without manifest"""
        temp = tempfile.mkdtemp()
        try:
            with pytest.raises(SystemExit):
                pack_plugin(path=temp)
        finally:
            shutil.rmtree(temp, ignore_errors=True)


class TestRunTests:
    """Tests for run_tests function"""
    
    @pytest.fixture
    def temp_plugin(self):
        """Create temporary plugin with tests"""
        temp = tempfile.mkdtemp()
        
        # Create tests directory
        tests_dir = os.path.join(temp, "tests")
        os.makedirs(tests_dir)
        
        # Create test file
        test_content = '''
def test_example():
    assert True
'''
        with open(os.path.join(tests_dir, "test_example.py"), "w") as f:
            f.write(test_content)
        
        yield temp
        shutil.rmtree(temp, ignore_errors=True)
    
    def test_run_tests_no_tests_dir(self):
        """Test error when no tests directory"""
        temp = tempfile.mkdtemp()
        try:
            with pytest.raises(SystemExit):
                run_tests(path=temp)
        finally:
            shutil.rmtree(temp, ignore_errors=True)


class TestCLIMain:
    """Tests for CLI main function"""
    
    def test_main_no_args(self):
        """Test main with no arguments"""
        with patch('sys.argv', ['cognia']):
            with patch('argparse.ArgumentParser.print_help') as mock_help:
                main()
                mock_help.assert_called_once()
    
    def test_main_version(self, capsys):
        """Test version command"""
        with patch('sys.argv', ['cognia', 'version']):
            main()
            captured = capsys.readouterr()
            assert "v1.0.0" in captured.out
    
    def test_main_new_command(self):
        """Test new command parsing"""
        temp = tempfile.mkdtemp()
        try:
            plugin_path = os.path.join(temp, "test-plugin")
            with patch('sys.argv', ['cognia', 'new', 'Test Plugin', '-p', plugin_path]):
                main()
            
            assert os.path.exists(plugin_path)
        finally:
            shutil.rmtree(temp, ignore_errors=True)
    
    def test_main_manifest_validate(self):
        """Test manifest validate command"""
        temp = tempfile.mkdtemp()
        try:
            # Create valid manifest
            manifest = {
                "id": "test",
                "name": "Test",
                "version": "1.0.0",
                "description": "Test",
                "type": "python"
            }
            with open(os.path.join(temp, "plugin.json"), "w") as f:
                json.dump(manifest, f)
            
            with patch('sys.argv', ['cognia', 'manifest', '-p', temp, '--validate']):
                main()
        finally:
            shutil.rmtree(temp, ignore_errors=True)


class TestTemplates:
    """Tests for template strings"""
    
    def test_plugin_template_valid_python(self):
        """Test plugin template is valid Python"""
        filled = PLUGIN_TEMPLATE.format(
            name="Test",
            plugin_id="test",
            class_name="TestPlugin",
            description="Test description"
        )
        
        # Should compile without error
        compile(filled, '<string>', 'exec')
    
    def test_manifest_template_structure(self):
        """Test manifest template has required fields"""
        assert "id" in MANIFEST_TEMPLATE
        assert "name" in MANIFEST_TEMPLATE
        assert "version" in MANIFEST_TEMPLATE
        assert "type" in MANIFEST_TEMPLATE
        assert "pythonMain" in MANIFEST_TEMPLATE
    
    def test_readme_template_format(self):
        """Test README template formatting"""
        filled = README_TEMPLATE.format(
            name="Test Plugin",
            description="A test plugin"
        )
        
        assert "# Test Plugin" in filled
        assert "A test plugin" in filled
    
    def test_test_template_valid_python(self):
        """Test test template is valid Python"""
        filled = TEST_TEMPLATE.format(
            name="Test",
            plugin_id="test",
            class_name="TestPlugin"
        )
        
        # Should compile without error
        compile(filled, '<string>', 'exec')
    
    def test_pyproject_template_valid_toml(self):
        """Test pyproject template is valid TOML structure"""
        filled = PYPROJECT_TEMPLATE.format(
            plugin_id="test-plugin",
            description="Test description"
        )
        
        assert "[project]" in filled
        assert 'name = "test-plugin"' in filled
