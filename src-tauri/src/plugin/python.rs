//! Python Runtime using PyO3
//!
//! Provides embedded Python interpreter for running Python plugins.

use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Command;

use super::types::*;

/// Python Runtime - manages Python interpreter and plugin execution
pub struct PythonRuntime {
    /// Python executable path
    python_path: String,
    /// Loaded plugin modules
    loaded_plugins: HashMap<String, PythonPluginInstance>,
    /// Virtual environment path (if any)
    venv_path: Option<PathBuf>,
    /// Whether PyO3 runtime is available
    #[allow(dead_code)]
    pyo3_available: bool,
}

/// Instance of a loaded Python plugin
#[derive(Debug)]
struct PythonPluginInstance {
    /// Plugin ID
    #[allow(dead_code)]
    plugin_id: String,
    /// Plugin path
    plugin_path: String,
    /// Main module name
    main_module: String,
    /// Registered tools
    tools: Vec<PythonToolRegistration>,
    /// Registered hooks
    hooks: Vec<PythonHookRegistration>,
}

impl PythonRuntime {
    /// Create a new Python runtime
    pub fn new(python_path: Option<String>) -> PluginResult<Self> {
        // Find Python executable
        let python = python_path.unwrap_or_else(|| {
            // Try to find Python in PATH
            if cfg!(windows) {
                "python".to_string()
            } else {
                "python3".to_string()
            }
        });

        // Verify Python is available
        let output = Command::new(&python)
            .args(["--version"])
            .output();

        match output {
            Ok(output) if output.status.success() => {
                let version = String::from_utf8_lossy(&output.stdout);
                log::info!("Python runtime initialized: {}", version.trim());
            }
            _ => {
                log::warn!("Python not found at '{}', Python plugins will be disabled", python);
            }
        }

        Ok(Self {
            python_path: python,
            loaded_plugins: HashMap::new(),
            venv_path: None,
            pyo3_available: false, // Will be set to true when PyO3 is properly configured
        })
    }

    /// Install Python dependencies
    pub async fn install_dependencies(&mut self, dependencies: &[String]) -> PluginResult<()> {
        if dependencies.is_empty() {
            return Ok(());
        }

        log::info!("Installing Python dependencies: {:?}", dependencies);

        let mut cmd = Command::new(&self.python_path);
        cmd.args(["-m", "pip", "install", "--quiet"]);
        
        for dep in dependencies {
            cmd.arg(dep);
        }

        let output = cmd.output()?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(PluginError::Dependency(format!(
                "Failed to install dependencies: {}",
                stderr
            )));
        }

        Ok(())
    }

    /// Load a Python plugin
    pub async fn load_plugin(
        &mut self,
        plugin_id: &str,
        plugin_path: &str,
        main_module: &str,
    ) -> PluginResult<()> {
        log::info!("Loading Python plugin: {} from {}", plugin_id, plugin_path);

        // Check if already loaded
        if self.loaded_plugins.contains_key(plugin_id) {
            return Err(PluginError::AlreadyExists(plugin_id.to_string()));
        }

        // Verify the plugin path exists
        let path = PathBuf::from(plugin_path);
        if !path.exists() {
            return Err(PluginError::NotFound(format!(
                "Plugin path does not exist: {}",
                plugin_path
            )));
        }

        // Verify main module exists
        let module_path = path.join(main_module);
        if !module_path.exists() && !module_path.with_extension("py").exists() {
            return Err(PluginError::NotFound(format!(
                "Main module not found: {}",
                main_module
            )));
        }

        // Create plugin instance
        let instance = PythonPluginInstance {
            plugin_id: plugin_id.to_string(),
            plugin_path: plugin_path.to_string(),
            main_module: main_module.to_string(),
            tools: Vec::new(),
            hooks: Vec::new(),
        };

        // Store the loaded plugin
        self.loaded_plugins.insert(plugin_id.to_string(), instance);

        // Initialize the plugin using subprocess
        self.initialize_plugin(plugin_id).await?;

        Ok(())
    }

    /// Initialize a loaded plugin
    async fn initialize_plugin(&mut self, plugin_id: &str) -> PluginResult<()> {
        let instance = self.loaded_plugins.get(plugin_id)
            .ok_or_else(|| PluginError::NotFound(plugin_id.to_string()))?;

        // Create initialization script
        let init_script = format!(
            r#"
import sys
import json

# Add plugin path to sys.path
sys.path.insert(0, r'{}')

# Import the plugin module
try:
    import {} as plugin_module
    
    # Get plugin class if exists
    plugin_class = None
    for name in dir(plugin_module):
        obj = getattr(plugin_module, name)
        if isinstance(obj, type) and hasattr(obj, 'name') and hasattr(obj, 'version'):
            plugin_class = obj
            break
    
    result = {{
        'success': True,
        'has_class': plugin_class is not None,
        'tools': [],
        'hooks': []
    }}
    
    # Extract tools if plugin class exists
    if plugin_class:
        instance = plugin_class()
        for name in dir(instance):
            method = getattr(instance, name)
            if hasattr(method, '_tool_metadata'):
                meta = method._tool_metadata
                result['tools'].append({{
                    'name': meta.get('name', name),
                    'description': meta.get('description', ''),
                    'parameters': meta.get('parameters', {{}})
                }})
            if hasattr(method, '_hook_metadata'):
                meta = method._hook_metadata
                result['hooks'].append({{
                    'hookName': meta.get('hook_name', ''),
                    'functionName': name,
                    'async': meta.get('is_async', False)
                }})
    
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({{'success': False, 'error': str(e)}}))
"#,
            instance.plugin_path.replace('\\', "\\\\"),
            instance.main_module.replace(".py", "")
        );

        // Run initialization script
        let output = Command::new(&self.python_path)
            .args(["-c", &init_script])
            .output()?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(PluginError::Python(format!(
                "Failed to initialize plugin: {}",
                stderr
            )));
        }

        // Parse result
        let stdout = String::from_utf8_lossy(&output.stdout);
        let result: serde_json::Value = serde_json::from_str(stdout.trim())
            .map_err(|e| PluginError::Python(format!("Failed to parse init result: {}", e)))?;

        if !result["success"].as_bool().unwrap_or(false) {
            let error = result["error"].as_str().unwrap_or("Unknown error");
            return Err(PluginError::Python(error.to_string()));
        }

        // Update plugin instance with discovered tools and hooks
        if let Some(instance) = self.loaded_plugins.get_mut(plugin_id) {
            if let Some(tools) = result["tools"].as_array() {
                for tool in tools {
                    instance.tools.push(PythonToolRegistration {
                        name: tool["name"].as_str().unwrap_or("").to_string(),
                        description: tool["description"].as_str().unwrap_or("").to_string(),
                        parameters: tool["parameters"].clone(),
                        requires_approval: None,
                    });
                }
            }

            if let Some(hooks) = result["hooks"].as_array() {
                for hook in hooks {
                    instance.hooks.push(PythonHookRegistration {
                        hook_name: hook["hookName"].as_str().unwrap_or("").to_string(),
                        function_name: hook["functionName"].as_str().unwrap_or("").to_string(),
                        is_async: hook["async"].as_bool(),
                    });
                }
            }
        }

        log::info!("Python plugin {} initialized successfully", plugin_id);
        Ok(())
    }

    /// Get tools from a loaded plugin
    pub async fn get_plugin_tools(&self, plugin_id: &str) -> PluginResult<Vec<PythonToolRegistration>> {
        let instance = self.loaded_plugins.get(plugin_id)
            .ok_or_else(|| PluginError::NotFound(plugin_id.to_string()))?;

        Ok(instance.tools.clone())
    }

    /// Call a tool on a plugin
    pub async fn call_tool(
        &self,
        plugin_id: &str,
        tool_name: &str,
        args: serde_json::Value,
    ) -> PluginResult<serde_json::Value> {
        let instance = self.loaded_plugins.get(plugin_id)
            .ok_or_else(|| PluginError::NotFound(plugin_id.to_string()))?;

        let args_json = serde_json::to_string(&args)?;

        let call_script = format!(
            r#"
import sys
import json

sys.path.insert(0, r'{}')

try:
    import {} as plugin_module
    
    # Find plugin class
    plugin_class = None
    for name in dir(plugin_module):
        obj = getattr(plugin_module, name)
        if isinstance(obj, type) and hasattr(obj, 'name'):
            plugin_class = obj
            break
    
    if plugin_class is None:
        raise Exception('Plugin class not found')
    
    instance = plugin_class()
    
    # Find and call the tool
    args = json.loads(r'''{}''')
    
    tool_method = None
    for name in dir(instance):
        method = getattr(instance, name)
        if hasattr(method, '_tool_metadata'):
            if method._tool_metadata.get('name') == '{}':
                tool_method = method
                break
    
    if tool_method is None:
        raise Exception('Tool not found: {}')
    
    # Call the tool
    import asyncio
    if asyncio.iscoroutinefunction(tool_method):
        result = asyncio.run(tool_method(**args))
    else:
        result = tool_method(**args)
    
    print(json.dumps({{'success': True, 'result': result}}))
except Exception as e:
    import traceback
    print(json.dumps({{'success': False, 'error': str(e), 'traceback': traceback.format_exc()}}))
"#,
            instance.plugin_path.replace('\\', "\\\\"),
            instance.main_module.replace(".py", ""),
            args_json.replace('\\', "\\\\").replace("'", "\\'"),
            tool_name,
            tool_name
        );

        let output = Command::new(&self.python_path)
            .args(["-c", &call_script])
            .output()?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let result: serde_json::Value = serde_json::from_str(stdout.trim())
            .map_err(|e| PluginError::Python(format!("Failed to parse result: {}", e)))?;

        if !result["success"].as_bool().unwrap_or(false) {
            let error = result["error"].as_str().unwrap_or("Unknown error");
            return Err(PluginError::Python(error.to_string()));
        }

        Ok(result["result"].clone())
    }

    /// Call a function on a plugin
    pub async fn call_function(
        &self,
        plugin_id: &str,
        function_name: &str,
        args: Vec<serde_json::Value>,
    ) -> PluginResult<serde_json::Value> {
        let instance = self.loaded_plugins.get(plugin_id)
            .ok_or_else(|| PluginError::NotFound(plugin_id.to_string()))?;

        let args_json = serde_json::to_string(&args)?;

        let call_script = format!(
            r#"
import sys
import json

sys.path.insert(0, r'{}')

try:
    import {} as plugin_module
    
    args = json.loads(r'''{}''')
    
    # Try to find function in module
    if hasattr(plugin_module, '{}'):
        func = getattr(plugin_module, '{}')
        import asyncio
        if asyncio.iscoroutinefunction(func):
            result = asyncio.run(func(*args))
        else:
            result = func(*args)
        print(json.dumps({{'success': True, 'result': result}}))
    else:
        raise Exception('Function not found: {}')
except Exception as e:
    print(json.dumps({{'success': False, 'error': str(e)}}))
"#,
            instance.plugin_path.replace('\\', "\\\\"),
            instance.main_module.replace(".py", ""),
            args_json.replace('\\', "\\\\").replace("'", "\\'"),
            function_name,
            function_name,
            function_name
        );

        let output = Command::new(&self.python_path)
            .args(["-c", &call_script])
            .output()?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let result: serde_json::Value = serde_json::from_str(stdout.trim())
            .map_err(|e| PluginError::Python(format!("Failed to parse result: {}", e)))?;

        if !result["success"].as_bool().unwrap_or(false) {
            let error = result["error"].as_str().unwrap_or("Unknown error");
            return Err(PluginError::Python(error.to_string()));
        }

        Ok(result["result"].clone())
    }

    /// Evaluate Python code in plugin context
    pub async fn eval_code(
        &self,
        plugin_id: &str,
        code: &str,
        locals: serde_json::Value,
    ) -> PluginResult<serde_json::Value> {
        let instance = self.loaded_plugins.get(plugin_id)
            .ok_or_else(|| PluginError::NotFound(plugin_id.to_string()))?;

        let locals_json = serde_json::to_string(&locals)?;
        let escaped_code = code.replace('\\', "\\\\").replace("'", "\\'").replace('\n', "\\n");

        let eval_script = format!(
            r#"
import sys
import json

sys.path.insert(0, r'{}')

try:
    import {} as plugin_module
    
    local_vars = json.loads(r'''{}''')
    local_vars['plugin'] = plugin_module
    
    code = r'''{}'''
    result = eval(code, {{'__builtins__': __builtins__}}, local_vars)
    
    # Try to serialize result
    try:
        json_result = json.dumps(result)
        print(json.dumps({{'success': True, 'result': json.loads(json_result)}}))
    except:
        print(json.dumps({{'success': True, 'result': str(result)}}))
except Exception as e:
    print(json.dumps({{'success': False, 'error': str(e)}}))
"#,
            instance.plugin_path.replace('\\', "\\\\"),
            instance.main_module.replace(".py", ""),
            locals_json.replace('\\', "\\\\").replace("'", "\\'"),
            escaped_code
        );

        let output = Command::new(&self.python_path)
            .args(["-c", &eval_script])
            .output()?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let result: serde_json::Value = serde_json::from_str(stdout.trim())
            .map_err(|e| PluginError::Python(format!("Failed to parse result: {}", e)))?;

        if !result["success"].as_bool().unwrap_or(false) {
            let error = result["error"].as_str().unwrap_or("Unknown error");
            return Err(PluginError::Python(error.to_string()));
        }

        Ok(result["result"].clone())
    }

    /// Unload a plugin
    pub fn unload_plugin(&mut self, plugin_id: &str) -> PluginResult<()> {
        if self.loaded_plugins.remove(plugin_id).is_none() {
            return Err(PluginError::NotFound(plugin_id.to_string()));
        }
        Ok(())
    }

    /// Check if a plugin is loaded
    pub fn is_loaded(&self, plugin_id: &str) -> bool {
        self.loaded_plugins.contains_key(plugin_id)
    }
}
