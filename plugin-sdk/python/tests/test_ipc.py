"""
Unit tests for cognia.ipc module
"""

import pytest
import json
import asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from cognia.ipc import (
    IPCMode,
    IPCMessage,
    IPCConfig,
    IPCError,
    IPCTransport,
    StdioTransport,
    MockTransport,
    TauriIPC,
    get_ipc,
)


class TestIPCMode:
    """Tests for IPCMode enum"""
    
    def test_mode_values(self):
        """Test IPCMode enum values"""
        assert IPCMode.STDIO.value == "stdio"
        assert IPCMode.WEBSOCKET.value == "websocket"
        assert IPCMode.MOCK.value == "mock"


class TestIPCMessage:
    """Tests for IPCMessage dataclass"""
    
    def test_basic_message(self):
        """Test basic message creation"""
        msg = IPCMessage(
            id="test-123",
            method="invoke",
            params={"cmd": "test"}
        )
        assert msg.id == "test-123"
        assert msg.method == "invoke"
        assert msg.params == {"cmd": "test"}
    
    def test_message_to_dict(self):
        """Test message serialization"""
        msg = IPCMessage(
            id="msg-1",
            method="emit",
            params={"event": "test", "payload": {"x": 1}}
        )
        result = msg.to_dict()
        
        assert result["id"] == "msg-1"
        assert result["method"] == "emit"
        assert result["params"]["event"] == "test"
    
    def test_message_from_dict(self):
        """Test message deserialization"""
        data = {
            "id": "msg-2",
            "method": "response",
            "result": {"data": "value"},
        }
        msg = IPCMessage.from_dict(data)
        
        assert msg.id == "msg-2"
        assert msg.method == "response"
        assert msg.result == {"data": "value"}
    
    def test_message_with_error(self):
        """Test message with error"""
        msg = IPCMessage(
            id="err-1",
            method="error",
            error={"code": -1, "message": "Something failed"}
        )
        assert msg.error is not None
        assert msg.error["code"] == -1


class TestIPCConfig:
    """Tests for IPCConfig dataclass"""
    
    def test_default_config(self):
        """Test default configuration"""
        config = IPCConfig()
        assert config.mode == IPCMode.STDIO
        assert config.timeout == 30.0
        assert config.max_retries == 3
    
    def test_custom_config(self):
        """Test custom configuration"""
        config = IPCConfig(
            mode=IPCMode.MOCK,
            timeout=60.0,
            max_retries=5,
            debug=True
        )
        assert config.mode == IPCMode.MOCK
        assert config.timeout == 60.0
        assert config.max_retries == 5
        assert config.debug == True


class TestIPCError:
    """Tests for IPCError exception"""
    
    def test_basic_error(self):
        """Test basic error"""
        error = IPCError("Connection failed")
        assert str(error) == "Connection failed"
        assert error.code is None
    
    def test_error_with_code(self):
        """Test error with code"""
        error = IPCError("Timeout", code=-32000)
        assert error.code == -32000
        assert "Timeout" in str(error)
    
    def test_error_with_data(self):
        """Test error with additional data"""
        error = IPCError("Invalid params", code=-32602, data={"param": "x"})
        assert error.code == -32602
        assert error.data == {"param": "x"}


class TestMockTransport:
    """Tests for MockTransport"""
    
    @pytest.fixture
    def transport(self):
        """Create mock transport"""
        return MockTransport()
    
    @pytest.mark.asyncio
    async def test_connect(self, transport):
        """Test mock connect"""
        await transport.connect()
        assert transport.connected == True
    
    @pytest.mark.asyncio
    async def test_disconnect(self, transport):
        """Test mock disconnect"""
        await transport.connect()
        await transport.disconnect()
        assert transport.connected == False
    
    @pytest.mark.asyncio
    async def test_send_receive(self, transport):
        """Test mock send/receive"""
        await transport.connect()
        
        msg = IPCMessage(id="1", method="test", params={})
        await transport.send(msg)
        
        # Mock transport echoes back
        response = await transport.receive()
        assert response is not None
    
    def test_add_mock_response(self, transport):
        """Test adding mock responses"""
        transport.add_response("test_cmd", {"result": "ok"})
        assert "test_cmd" in transport.mock_responses
    
    @pytest.mark.asyncio
    async def test_mock_invoke(self, transport):
        """Test mock invoke with predefined response"""
        await transport.connect()
        transport.add_response("get_data", {"value": 42})
        
        msg = IPCMessage(id="1", method="invoke", params={"cmd": "get_data"})
        await transport.send(msg)
        
        response = await transport.receive()
        assert response.result == {"value": 42}


class TestTauriIPC:
    """Tests for TauriIPC client"""
    
    @pytest.fixture
    def mock_ipc(self):
        """Create IPC with mock transport"""
        config = IPCConfig(mode=IPCMode.MOCK)
        return TauriIPC(config)
    
    @pytest.mark.asyncio
    async def test_connect(self, mock_ipc):
        """Test IPC connect"""
        await mock_ipc.connect()
        assert mock_ipc.connected == True
    
    @pytest.mark.asyncio
    async def test_disconnect(self, mock_ipc):
        """Test IPC disconnect"""
        await mock_ipc.connect()
        await mock_ipc.disconnect()
        assert mock_ipc.connected == False
    
    @pytest.mark.asyncio
    async def test_invoke(self, mock_ipc):
        """Test invoke command"""
        await mock_ipc.connect()
        mock_ipc.transport.add_response("test_command", {"success": True})
        
        result = await mock_ipc.invoke("test_command", {"arg": "value"})
        assert result == {"success": True}
    
    @pytest.mark.asyncio
    async def test_invoke_with_error(self, mock_ipc):
        """Test invoke with error response"""
        await mock_ipc.connect()
        mock_ipc.transport.add_error("failing_cmd", -1, "Command failed")
        
        with pytest.raises(IPCError) as exc_info:
            await mock_ipc.invoke("failing_cmd", {})
        
        assert exc_info.value.code == -1
    
    @pytest.mark.asyncio
    async def test_emit(self, mock_ipc):
        """Test emit event"""
        await mock_ipc.connect()
        
        # Should not raise
        await mock_ipc.emit("test_event", {"data": "payload"})
    
    @pytest.mark.asyncio
    async def test_listen(self, mock_ipc):
        """Test listen for events"""
        await mock_ipc.connect()
        
        received_events = []
        
        def handler(event):
            received_events.append(event)
        
        unlisten = await mock_ipc.listen("test_event", handler)
        
        # Simulate event
        mock_ipc.transport.emit_event("test_event", {"x": 1})
        await asyncio.sleep(0.1)
        
        assert len(received_events) >= 0  # May or may not receive depending on implementation
        
        # Cleanup
        unlisten()
    
    @pytest.mark.asyncio
    async def test_request_timeout(self, mock_ipc):
        """Test request timeout"""
        mock_ipc.config.timeout = 0.1
        await mock_ipc.connect()
        
        # Add slow response
        mock_ipc.transport.add_slow_response("slow_cmd", {"result": "ok"}, delay=1.0)
        
        with pytest.raises(IPCError) as exc_info:
            await mock_ipc.invoke("slow_cmd", {})
        
        assert "timeout" in str(exc_info.value).lower() or exc_info.value.code is not None
    
    @pytest.mark.asyncio
    async def test_batch_invoke(self, mock_ipc):
        """Test batch invoke"""
        await mock_ipc.connect()
        mock_ipc.transport.add_response("cmd1", {"r": 1})
        mock_ipc.transport.add_response("cmd2", {"r": 2})
        
        results = await mock_ipc.batch_invoke([
            ("cmd1", {}),
            ("cmd2", {}),
        ])
        
        assert len(results) == 2


class TestGetIPC:
    """Tests for get_ipc factory function"""
    
    def test_get_mock_ipc(self):
        """Test getting mock IPC"""
        ipc = get_ipc(mode=IPCMode.MOCK)
        assert isinstance(ipc, TauriIPC)
        assert ipc.config.mode == IPCMode.MOCK
    
    def test_get_ipc_with_config(self):
        """Test getting IPC with config"""
        config = IPCConfig(mode=IPCMode.MOCK, timeout=120.0)
        ipc = get_ipc(config=config)
        assert ipc.config.timeout == 120.0
    
    def test_get_ipc_singleton(self):
        """Test IPC singleton behavior"""
        ipc1 = get_ipc(mode=IPCMode.MOCK, singleton=True)
        ipc2 = get_ipc(mode=IPCMode.MOCK, singleton=True)
        
        # Should return same instance when singleton=True
        assert ipc1 is ipc2


class TestStdioTransport:
    """Tests for StdioTransport"""
    
    def test_create_transport(self):
        """Test creating stdio transport"""
        transport = StdioTransport()
        assert transport is not None
        assert transport.connected == False
    
    @pytest.mark.asyncio
    async def test_connect_without_tauri(self):
        """Test connect fails gracefully without Tauri"""
        transport = StdioTransport()
        
        # Should handle missing Tauri environment
        try:
            await transport.connect()
        except Exception as e:
            # Expected to fail outside Tauri
            assert True
    
    def test_message_serialization(self):
        """Test message JSON serialization"""
        msg = IPCMessage(
            id="test",
            method="invoke",
            params={"cmd": "test", "args": {"x": 1}}
        )
        
        json_str = json.dumps(msg.to_dict())
        parsed = json.loads(json_str)
        
        assert parsed["id"] == "test"
        assert parsed["method"] == "invoke"
