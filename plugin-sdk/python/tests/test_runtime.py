"""
Unit tests for cognia.runtime module
"""

import pytest
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from cognia.runtime import (
    RuntimeSessionAPI,
    RuntimeProjectAPI,
    RuntimeVectorAPI,
    RuntimeStorageAPI,
    RuntimeEventsAPI,
    RuntimeNetworkAPI,
    RuntimeFileSystemAPI,
    RuntimeShellAPI,
    RuntimePluginContext,
    create_runtime_context,
)
from cognia.ipc import TauriIPC, IPCConfig, IPCMode, MockTransport


class TestRuntimeSessionAPI:
    """Tests for RuntimeSessionAPI"""
    
    @pytest.fixture
    def mock_ipc(self):
        """Create mock IPC"""
        ipc = Mock(spec=TauriIPC)
        ipc.invoke = AsyncMock()
        return ipc
    
    @pytest.fixture
    def session_api(self, mock_ipc):
        """Create session API with mock IPC"""
        return RuntimeSessionAPI(mock_ipc)
    
    @pytest.mark.asyncio
    async def test_get_current_session(self, session_api, mock_ipc):
        """Test get current session"""
        mock_ipc.invoke.return_value = {
            "id": "session-1",
            "title": "Test Session",
            "createdAt": "2024-01-01T00:00:00Z"
        }
        
        result = await session_api.get_current_session()
        
        mock_ipc.invoke.assert_called_once_with("session_get_current", {})
        assert result["id"] == "session-1"
    
    @pytest.mark.asyncio
    async def test_list_sessions(self, session_api, mock_ipc):
        """Test list sessions"""
        mock_ipc.invoke.return_value = [
            {"id": "s1", "title": "Session 1"},
            {"id": "s2", "title": "Session 2"},
        ]
        
        result = await session_api.list_sessions(limit=10)
        
        mock_ipc.invoke.assert_called_once()
        assert len(result) == 2
    
    @pytest.mark.asyncio
    async def test_create_session(self, session_api, mock_ipc):
        """Test create session"""
        mock_ipc.invoke.return_value = {"id": "new-session", "title": "New"}
        
        result = await session_api.create_session(title="New Session")
        
        mock_ipc.invoke.assert_called_once()
        assert result["id"] == "new-session"
    
    @pytest.mark.asyncio
    async def test_get_messages(self, session_api, mock_ipc):
        """Test get messages"""
        mock_ipc.invoke.return_value = [
            {"id": "m1", "content": "Hello"},
            {"id": "m2", "content": "World"},
        ]
        
        result = await session_api.get_messages("session-1")
        
        mock_ipc.invoke.assert_called_once()
        assert len(result) == 2
    
    @pytest.mark.asyncio
    async def test_add_message(self, session_api, mock_ipc):
        """Test add message"""
        mock_ipc.invoke.return_value = {"id": "msg-1", "content": "Test"}
        
        result = await session_api.add_message("session-1", "Test message")
        
        mock_ipc.invoke.assert_called_once()


class TestRuntimeProjectAPI:
    """Tests for RuntimeProjectAPI"""
    
    @pytest.fixture
    def mock_ipc(self):
        """Create mock IPC"""
        ipc = Mock(spec=TauriIPC)
        ipc.invoke = AsyncMock()
        return ipc
    
    @pytest.fixture
    def project_api(self, mock_ipc):
        """Create project API with mock IPC"""
        return RuntimeProjectAPI(mock_ipc)
    
    @pytest.mark.asyncio
    async def test_get_current_project(self, project_api, mock_ipc):
        """Test get current project"""
        mock_ipc.invoke.return_value = {
            "id": "proj-1",
            "name": "My Project"
        }
        
        result = await project_api.get_current_project()
        
        mock_ipc.invoke.assert_called_once()
        assert result["name"] == "My Project"
    
    @pytest.mark.asyncio
    async def test_list_projects(self, project_api, mock_ipc):
        """Test list projects"""
        mock_ipc.invoke.return_value = [
            {"id": "p1", "name": "Project 1"},
            {"id": "p2", "name": "Project 2"},
        ]
        
        result = await project_api.list_projects()
        
        assert len(result) == 2
    
    @pytest.mark.asyncio
    async def test_create_project(self, project_api, mock_ipc):
        """Test create project"""
        mock_ipc.invoke.return_value = {"id": "new-proj", "name": "New"}
        
        result = await project_api.create_project(name="New Project")
        
        mock_ipc.invoke.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_add_knowledge_file(self, project_api, mock_ipc):
        """Test add knowledge file"""
        mock_ipc.invoke.return_value = {"success": True}
        
        result = await project_api.add_knowledge_file(
            "proj-1",
            path="/path/to/file.txt"
        )
        
        mock_ipc.invoke.assert_called_once()


class TestRuntimeVectorAPI:
    """Tests for RuntimeVectorAPI"""
    
    @pytest.fixture
    def mock_ipc(self):
        """Create mock IPC"""
        ipc = Mock(spec=TauriIPC)
        ipc.invoke = AsyncMock()
        return ipc
    
    @pytest.fixture
    def vector_api(self, mock_ipc):
        """Create vector API with mock IPC"""
        return RuntimeVectorAPI(mock_ipc)
    
    @pytest.mark.asyncio
    async def test_add_documents(self, vector_api, mock_ipc):
        """Test add documents"""
        mock_ipc.invoke.return_value = {"added": 2}
        
        result = await vector_api.add_documents(
            "collection",
            [{"content": "doc1"}, {"content": "doc2"}]
        )
        
        mock_ipc.invoke.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_search(self, vector_api, mock_ipc):
        """Test vector search"""
        mock_ipc.invoke.return_value = [
            {"content": "result1", "score": 0.95},
            {"content": "result2", "score": 0.85},
        ]
        
        result = await vector_api.search("collection", "query")
        
        mock_ipc.invoke.assert_called_once()
        assert len(result) == 2
    
    @pytest.mark.asyncio
    async def test_embed(self, vector_api, mock_ipc):
        """Test embed text"""
        mock_ipc.invoke.return_value = [0.1, 0.2, 0.3, 0.4]
        
        result = await vector_api.embed("text to embed")
        
        mock_ipc.invoke.assert_called_once()
        assert len(result) == 4
    
    @pytest.mark.asyncio
    async def test_delete_documents(self, vector_api, mock_ipc):
        """Test delete documents"""
        mock_ipc.invoke.return_value = {"deleted": 3}
        
        result = await vector_api.delete_documents(
            "collection",
            ids=["doc1", "doc2", "doc3"]
        )
        
        mock_ipc.invoke.assert_called_once()


class TestRuntimeStorageAPI:
    """Tests for RuntimeStorageAPI"""
    
    @pytest.fixture
    def mock_ipc(self):
        """Create mock IPC"""
        ipc = Mock(spec=TauriIPC)
        ipc.invoke = AsyncMock()
        return ipc
    
    @pytest.fixture
    def storage_api(self, mock_ipc):
        """Create storage API with mock IPC"""
        return RuntimeStorageAPI(mock_ipc, plugin_id="test-plugin")
    
    @pytest.mark.asyncio
    async def test_get(self, storage_api, mock_ipc):
        """Test storage get"""
        mock_ipc.invoke.return_value = {"value": "stored_data"}
        
        result = await storage_api.get("my_key")
        
        mock_ipc.invoke.assert_called_once()
        assert result == {"value": "stored_data"}
    
    @pytest.mark.asyncio
    async def test_set(self, storage_api, mock_ipc):
        """Test storage set"""
        mock_ipc.invoke.return_value = {"success": True}
        
        await storage_api.set("my_key", {"data": "value"})
        
        mock_ipc.invoke.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_delete(self, storage_api, mock_ipc):
        """Test storage delete"""
        mock_ipc.invoke.return_value = {"success": True}
        
        await storage_api.delete("my_key")
        
        mock_ipc.invoke.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_list_keys(self, storage_api, mock_ipc):
        """Test list keys"""
        mock_ipc.invoke.return_value = ["key1", "key2", "key3"]
        
        result = await storage_api.list_keys()
        
        assert len(result) == 3


class TestRuntimeEventsAPI:
    """Tests for RuntimeEventsAPI"""
    
    @pytest.fixture
    def mock_ipc(self):
        """Create mock IPC"""
        ipc = Mock(spec=TauriIPC)
        ipc.emit = AsyncMock()
        ipc.listen = AsyncMock(return_value=lambda: None)
        return ipc
    
    @pytest.fixture
    def events_api(self, mock_ipc):
        """Create events API with mock IPC"""
        return RuntimeEventsAPI(mock_ipc)
    
    @pytest.mark.asyncio
    async def test_emit(self, events_api, mock_ipc):
        """Test emit event"""
        await events_api.emit("my_event", {"data": "value"})
        
        mock_ipc.emit.assert_called_once_with("my_event", {"data": "value"})
    
    @pytest.mark.asyncio
    async def test_on(self, events_api, mock_ipc):
        """Test register event listener"""
        handler = Mock()
        
        unlisten = await events_api.on("my_event", handler)
        
        mock_ipc.listen.assert_called_once()
        assert callable(unlisten)
    
    @pytest.mark.asyncio
    async def test_off(self, events_api, mock_ipc):
        """Test unregister event listener"""
        handler = Mock()
        await events_api.on("my_event", handler)
        
        await events_api.off("my_event", handler)
        # Should not raise


class TestRuntimeNetworkAPI:
    """Tests for RuntimeNetworkAPI"""
    
    @pytest.fixture
    def mock_ipc(self):
        """Create mock IPC"""
        ipc = Mock(spec=TauriIPC)
        ipc.invoke = AsyncMock()
        return ipc
    
    @pytest.fixture
    def network_api(self, mock_ipc):
        """Create network API with mock IPC"""
        return RuntimeNetworkAPI(mock_ipc)
    
    @pytest.mark.asyncio
    async def test_get(self, network_api, mock_ipc):
        """Test HTTP GET"""
        mock_ipc.invoke.return_value = {
            "status": 200,
            "data": {"result": "ok"},
            "headers": {}
        }
        
        result = await network_api.get("https://api.example.com/data")
        
        mock_ipc.invoke.assert_called_once()
        assert result["status"] == 200
    
    @pytest.mark.asyncio
    async def test_post(self, network_api, mock_ipc):
        """Test HTTP POST"""
        mock_ipc.invoke.return_value = {
            "status": 201,
            "data": {"id": "new-item"}
        }
        
        result = await network_api.post(
            "https://api.example.com/items",
            body={"name": "Test"}
        )
        
        mock_ipc.invoke.assert_called_once()
        assert result["status"] == 201
    
    @pytest.mark.asyncio
    async def test_request_with_headers(self, network_api, mock_ipc):
        """Test request with custom headers"""
        mock_ipc.invoke.return_value = {"status": 200}
        
        await network_api.get(
            "https://api.example.com/protected",
            headers={"Authorization": "Bearer token"}
        )
        
        call_args = mock_ipc.invoke.call_args
        assert "headers" in call_args[0][1]


class TestRuntimeFileSystemAPI:
    """Tests for RuntimeFileSystemAPI"""
    
    @pytest.fixture
    def mock_ipc(self):
        """Create mock IPC"""
        ipc = Mock(spec=TauriIPC)
        ipc.invoke = AsyncMock()
        return ipc
    
    @pytest.fixture
    def fs_api(self, mock_ipc):
        """Create filesystem API with mock IPC"""
        return RuntimeFileSystemAPI(mock_ipc)
    
    @pytest.mark.asyncio
    async def test_read_file(self, fs_api, mock_ipc):
        """Test read file"""
        mock_ipc.invoke.return_value = "file contents"
        
        result = await fs_api.read_file("/path/to/file.txt")
        
        mock_ipc.invoke.assert_called_once()
        assert result == "file contents"
    
    @pytest.mark.asyncio
    async def test_write_file(self, fs_api, mock_ipc):
        """Test write file"""
        mock_ipc.invoke.return_value = {"success": True}
        
        await fs_api.write_file("/path/to/file.txt", "new contents")
        
        mock_ipc.invoke.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_list_directory(self, fs_api, mock_ipc):
        """Test list directory"""
        mock_ipc.invoke.return_value = [
            {"name": "file1.txt", "isFile": True},
            {"name": "subdir", "isFile": False},
        ]
        
        result = await fs_api.list_directory("/path/to/dir")
        
        assert len(result) == 2
    
    @pytest.mark.asyncio
    async def test_exists(self, fs_api, mock_ipc):
        """Test file exists"""
        mock_ipc.invoke.return_value = True
        
        result = await fs_api.exists("/path/to/file.txt")
        
        assert result == True


class TestRuntimeShellAPI:
    """Tests for RuntimeShellAPI"""
    
    @pytest.fixture
    def mock_ipc(self):
        """Create mock IPC"""
        ipc = Mock(spec=TauriIPC)
        ipc.invoke = AsyncMock()
        return ipc
    
    @pytest.fixture
    def shell_api(self, mock_ipc):
        """Create shell API with mock IPC"""
        return RuntimeShellAPI(mock_ipc)
    
    @pytest.mark.asyncio
    async def test_execute(self, shell_api, mock_ipc):
        """Test execute command"""
        mock_ipc.invoke.return_value = {
            "code": 0,
            "stdout": "output",
            "stderr": ""
        }
        
        result = await shell_api.execute("echo hello")
        
        mock_ipc.invoke.assert_called_once()
        assert result["code"] == 0
    
    @pytest.mark.asyncio
    async def test_execute_with_cwd(self, shell_api, mock_ipc):
        """Test execute with working directory"""
        mock_ipc.invoke.return_value = {"code": 0}
        
        await shell_api.execute("ls", cwd="/home/user")
        
        call_args = mock_ipc.invoke.call_args
        assert call_args[0][1]["cwd"] == "/home/user"
    
    @pytest.mark.asyncio
    async def test_execute_with_env(self, shell_api, mock_ipc):
        """Test execute with environment variables"""
        mock_ipc.invoke.return_value = {"code": 0}
        
        await shell_api.execute("printenv", env={"MY_VAR": "value"})
        
        call_args = mock_ipc.invoke.call_args
        assert "env" in call_args[0][1]


class TestRuntimePluginContext:
    """Tests for RuntimePluginContext"""
    
    @pytest.fixture
    def mock_ipc(self):
        """Create mock IPC"""
        config = IPCConfig(mode=IPCMode.MOCK)
        ipc = TauriIPC(config)
        ipc.invoke = AsyncMock(return_value={})
        ipc.emit = AsyncMock()
        ipc.listen = AsyncMock(return_value=lambda: None)
        return ipc
    
    @pytest.fixture
    def context(self, mock_ipc):
        """Create runtime plugin context"""
        return RuntimePluginContext(
            plugin_id="test-plugin",
            plugin_path="/path/to/plugin",
            ipc=mock_ipc
        )
    
    def test_context_properties(self, context):
        """Test context properties"""
        assert context.plugin_id == "test-plugin"
        assert context.plugin_path == "/path/to/plugin"
    
    def test_context_has_apis(self, context):
        """Test context has all APIs"""
        assert context.session is not None
        assert context.project is not None
        assert context.vector is not None
        assert context.storage is not None
        assert context.events is not None
        assert context.network is not None
        assert context.fs is not None
        assert context.shell is not None
    
    def test_context_logger(self, context):
        """Test context logger"""
        assert context.logger is not None
        # Should not raise
        context.logger.log_info("Test message")
        context.logger.log_debug("Debug message")
        context.logger.log_warn("Warning message")
        context.logger.log_error("Error message")


class TestCreateRuntimeContext:
    """Tests for create_runtime_context factory"""
    
    def test_create_context(self):
        """Test creating runtime context"""
        context = create_runtime_context(
            plugin_id="my-plugin",
            plugin_path="/plugins/my-plugin",
            mode=IPCMode.MOCK
        )
        
        assert context is not None
        assert context.plugin_id == "my-plugin"
    
    def test_create_context_with_config(self):
        """Test creating context with custom config"""
        context = create_runtime_context(
            plugin_id="my-plugin",
            plugin_path="/plugins/my-plugin",
            config={"setting": "value"},
            mode=IPCMode.MOCK
        )
        
        assert context.config == {"setting": "value"}
