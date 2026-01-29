"""
IPC Communication Layer for Cognia Plugin SDK

Provides communication between Python plugins and the Tauri backend.
Supports both subprocess-based IPC and potential future WebSocket/stdio modes.
"""

import asyncio
import json
import os
import sys
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, TypeVar, Union
from enum import Enum
import logging

logger = logging.getLogger(__name__)

T = TypeVar('T')


class IPCMode(Enum):
    """IPC communication mode"""
    SUBPROCESS = "subprocess"  # Default: communicate via subprocess stdio
    WEBSOCKET = "websocket"    # WebSocket connection to Tauri
    STDIO = "stdio"            # Direct stdio communication


@dataclass
class IPCMessage:
    """IPC message structure"""
    id: str
    type: str  # 'invoke', 'event', 'response', 'error'
    command: Optional[str] = None
    args: Optional[Dict[str, Any]] = None
    payload: Optional[Any] = None
    error: Optional[str] = None


@dataclass
class IPCConfig:
    """IPC configuration"""
    mode: IPCMode = IPCMode.SUBPROCESS
    host: str = "localhost"
    port: int = 0  # 0 = auto-assign
    timeout: float = 30.0
    retry_count: int = 3
    retry_delay: float = 1.0


class IPCTransport(ABC):
    """Abstract IPC transport layer"""
    
    @abstractmethod
    async def connect(self) -> None:
        """Establish connection"""
        pass
    
    @abstractmethod
    async def disconnect(self) -> None:
        """Close connection"""
        pass
    
    @abstractmethod
    async def send(self, message: IPCMessage) -> None:
        """Send a message"""
        pass
    
    @abstractmethod
    async def receive(self) -> IPCMessage:
        """Receive a message"""
        pass
    
    @abstractmethod
    def is_connected(self) -> bool:
        """Check if connected"""
        pass


class StdioTransport(IPCTransport):
    """Standard IO transport for subprocess communication"""
    
    def __init__(self):
        self._connected = False
        self._pending_responses: Dict[str, asyncio.Future] = {}
        self._event_handlers: Dict[str, List[Callable]] = {}
        self._reader_task: Optional[asyncio.Task] = None
    
    async def connect(self) -> None:
        """Initialize stdio communication"""
        self._connected = True
        # Start background reader
        self._reader_task = asyncio.create_task(self._read_loop())
    
    async def disconnect(self) -> None:
        """Close stdio communication"""
        self._connected = False
        if self._reader_task:
            self._reader_task.cancel()
            try:
                await self._reader_task
            except asyncio.CancelledError:
                pass
    
    async def send(self, message: IPCMessage) -> None:
        """Send message via stdout"""
        if not self._connected:
            raise RuntimeError("Transport not connected")
        
        msg_dict = {
            "id": message.id,
            "type": message.type,
        }
        if message.command:
            msg_dict["command"] = message.command
        if message.args:
            msg_dict["args"] = message.args
        if message.payload is not None:
            msg_dict["payload"] = message.payload
        if message.error:
            msg_dict["error"] = message.error
        
        line = json.dumps(msg_dict)
        # Write to stdout with newline
        sys.stdout.write(f"__COGNIA_IPC__{line}__END__\n")
        sys.stdout.flush()
    
    async def receive(self) -> IPCMessage:
        """Receive message from stdin"""
        if not self._connected:
            raise RuntimeError("Transport not connected")
        
        # Read line from stdin
        loop = asyncio.get_event_loop()
        line = await loop.run_in_executor(None, sys.stdin.readline)
        
        if not line:
            raise EOFError("stdin closed")
        
        return self._parse_message(line.strip())
    
    def _parse_message(self, line: str) -> IPCMessage:
        """Parse IPC message from line"""
        # Check for IPC marker
        if line.startswith("__COGNIA_IPC__") and line.endswith("__END__"):
            json_str = line[14:-7]  # Remove markers
            data = json.loads(json_str)
        else:
            data = json.loads(line)
        
        return IPCMessage(
            id=data.get("id", ""),
            type=data.get("type", ""),
            command=data.get("command"),
            args=data.get("args"),
            payload=data.get("payload"),
            error=data.get("error"),
        )
    
    async def _read_loop(self) -> None:
        """Background loop to read incoming messages"""
        while self._connected:
            try:
                message = await self.receive()
                await self._handle_message(message)
            except EOFError:
                break
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse IPC message: {e}")
            except Exception as e:
                logger.error(f"Error in IPC read loop: {e}")
    
    async def _handle_message(self, message: IPCMessage) -> None:
        """Handle incoming message"""
        if message.type == "response" or message.type == "error":
            # Response to a pending invoke
            future = self._pending_responses.pop(message.id, None)
            if future:
                if message.type == "error":
                    future.set_exception(IPCError(message.error or "Unknown error"))
                else:
                    future.set_result(message.payload)
        elif message.type == "event":
            # Event from backend
            handlers = self._event_handlers.get(message.command or "", [])
            for handler in handlers:
                try:
                    result = handler(message.payload)
                    if asyncio.iscoroutine(result):
                        await result
                except Exception as e:
                    logger.error(f"Error in event handler: {e}")
    
    def is_connected(self) -> bool:
        return self._connected
    
    def register_pending(self, msg_id: str) -> asyncio.Future:
        """Register a pending response"""
        future = asyncio.get_event_loop().create_future()
        self._pending_responses[msg_id] = future
        return future
    
    def add_event_handler(self, event: str, handler: Callable) -> Callable[[], None]:
        """Add event handler, returns unsubscribe function"""
        if event not in self._event_handlers:
            self._event_handlers[event] = []
        self._event_handlers[event].append(handler)
        
        def unsubscribe():
            if event in self._event_handlers:
                try:
                    self._event_handlers[event].remove(handler)
                except ValueError:
                    pass
        
        return unsubscribe


class MockTransport(IPCTransport):
    """Mock transport for testing without Tauri backend"""
    
    def __init__(self):
        self._connected = False
        self._mock_responses: Dict[str, Any] = {}
    
    async def connect(self) -> None:
        self._connected = True
    
    async def disconnect(self) -> None:
        self._connected = False
    
    async def send(self, message: IPCMessage) -> None:
        pass
    
    async def receive(self) -> IPCMessage:
        await asyncio.sleep(0.1)
        return IPCMessage(id="mock", type="response", payload=None)
    
    def is_connected(self) -> bool:
        return self._connected
    
    def set_mock_response(self, command: str, response: Any) -> None:
        """Set mock response for a command"""
        self._mock_responses[command] = response
    
    def get_mock_response(self, command: str) -> Any:
        """Get mock response for a command"""
        return self._mock_responses.get(command)


class IPCError(Exception):
    """IPC communication error"""
    pass


class TauriIPC:
    """
    IPC client for communication with Tauri backend.
    
    Provides invoke/emit/listen pattern matching Tauri's IPC API.
    """
    
    _instance: Optional['TauriIPC'] = None
    _msg_counter: int = 0
    
    def __init__(self, config: Optional[IPCConfig] = None):
        self.config = config or IPCConfig()
        self._transport: Optional[IPCTransport] = None
        self._connected = False
        self._event_handlers: Dict[str, List[Callable]] = {}
    
    @classmethod
    def get_instance(cls, config: Optional[IPCConfig] = None) -> 'TauriIPC':
        """Get singleton instance"""
        if cls._instance is None:
            cls._instance = cls(config)
        return cls._instance
    
    @classmethod
    def reset_instance(cls) -> None:
        """Reset singleton (for testing)"""
        cls._instance = None
    
    def _generate_id(self) -> str:
        """Generate unique message ID"""
        TauriIPC._msg_counter += 1
        return f"msg_{TauriIPC._msg_counter}_{id(self)}"
    
    async def connect(self) -> None:
        """Connect to Tauri backend"""
        if self._connected:
            return
        
        # Create transport based on mode
        if self.config.mode == IPCMode.STDIO:
            self._transport = StdioTransport()
        else:
            # Default to mock for now (subprocess mode will be handled by Tauri)
            self._transport = MockTransport()
        
        await self._transport.connect()
        self._connected = True
        logger.info(f"IPC connected in {self.config.mode.value} mode")
    
    async def disconnect(self) -> None:
        """Disconnect from Tauri backend"""
        if self._transport:
            await self._transport.disconnect()
        self._connected = False
        logger.info("IPC disconnected")
    
    async def invoke(self, command: str, args: Optional[Dict[str, Any]] = None) -> Any:
        """
        Invoke a Tauri command.
        
        Args:
            command: Command name (e.g., 'session_get_current')
            args: Command arguments
            
        Returns:
            Command result
            
        Raises:
            IPCError: If command fails
        """
        if not self._connected:
            await self.connect()
        
        if not self._transport:
            raise IPCError("Transport not initialized")
        
        msg_id = self._generate_id()
        message = IPCMessage(
            id=msg_id,
            type="invoke",
            command=command,
            args=args or {},
        )
        
        # For stdio transport, register pending response
        if isinstance(self._transport, StdioTransport):
            future = self._transport.register_pending(msg_id)
            await self._transport.send(message)
            
            try:
                result = await asyncio.wait_for(future, timeout=self.config.timeout)
                return result
            except asyncio.TimeoutError:
                raise IPCError(f"Command '{command}' timed out")
        
        # For mock transport, return mock response
        if isinstance(self._transport, MockTransport):
            return self._transport.get_mock_response(command)
        
        await self._transport.send(message)
        response = await self._transport.receive()
        
        if response.type == "error":
            raise IPCError(response.error or "Unknown error")
        
        return response.payload
    
    async def emit(self, event: str, payload: Optional[Any] = None) -> None:
        """
        Emit an event to Tauri backend.
        
        Args:
            event: Event name
            payload: Event payload
        """
        if not self._connected:
            await self.connect()
        
        if not self._transport:
            raise IPCError("Transport not initialized")
        
        message = IPCMessage(
            id=self._generate_id(),
            type="event",
            command=event,
            payload=payload,
        )
        
        await self._transport.send(message)
    
    def listen(self, event: str, handler: Callable[[Any], None]) -> Callable[[], None]:
        """
        Listen for events from Tauri backend.
        
        Args:
            event: Event name
            handler: Event handler function
            
        Returns:
            Unsubscribe function
        """
        if event not in self._event_handlers:
            self._event_handlers[event] = []
        self._event_handlers[event].append(handler)
        
        # Also register with transport if it supports it
        if isinstance(self._transport, StdioTransport):
            return self._transport.add_event_handler(event, handler)
        
        def unsubscribe():
            if event in self._event_handlers:
                try:
                    self._event_handlers[event].remove(handler)
                except ValueError:
                    pass
        
        return unsubscribe
    
    def once(self, event: str, handler: Callable[[Any], None]) -> Callable[[], None]:
        """
        Listen for a single event.
        
        Args:
            event: Event name
            handler: Event handler function
            
        Returns:
            Unsubscribe function
        """
        unsubscribe: Optional[Callable[[], None]] = None
        
        def wrapper(payload: Any) -> None:
            if unsubscribe:
                unsubscribe()
            handler(payload)
        
        unsubscribe = self.listen(event, wrapper)
        return unsubscribe
    
    @property
    def is_connected(self) -> bool:
        """Check if connected"""
        return self._connected


# Convenience function to get IPC instance
def get_ipc(config: Optional[IPCConfig] = None) -> TauriIPC:
    """Get the IPC singleton instance"""
    return TauriIPC.get_instance(config)


__all__ = [
    "IPCMode",
    "IPCMessage",
    "IPCConfig",
    "IPCTransport",
    "StdioTransport",
    "MockTransport",
    "IPCError",
    "TauriIPC",
    "get_ipc",
]
