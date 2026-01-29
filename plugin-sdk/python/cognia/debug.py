"""
Debug API for Cognia Plugin SDK

Provides development and debugging utilities for plugin development.
Includes tracing, breakpoints, performance monitoring, and logging.
"""

from abc import ABC, abstractmethod
from typing import Any, Callable, Dict, List, Optional
from dataclasses import dataclass

from .types import (
    DebugLogLevel,
    DebugLogEntry,
    TraceEntry,
    PerformanceMetrics,
    Breakpoint,
    DebugSession,
    SlowOperation,
)


class DebugAPI(ABC):
    """
    Debug API for plugin development.
    
    Provides development tools for debugging, performance monitoring,
    and troubleshooting plugins during development.
    
    Example:
        # Start a debug session
        context.debug.start_session()
        
        # Add a breakpoint
        context.debug.set_breakpoint('hook', 'on_agent_step')
        
        # Trace performance
        end_trace = context.debug.start_trace('my_operation')
        await do_something()
        end_trace()
        
        # Measure a function
        result = await context.debug.measure('fetch_data', fetch_data)
        
        # Get metrics
        metrics = context.debug.get_metrics()
        print('Total time:', metrics.total_time)
    """
    
    @abstractmethod
    def start_session(self) -> str:
        """
        Start a debug session.
        
        Returns:
            Session ID
        """
        pass
    
    @abstractmethod
    def end_session(self) -> None:
        """End the current debug session"""
        pass
    
    @abstractmethod
    def get_session(self) -> Optional[DebugSession]:
        """
        Get current debug session.
        
        Returns:
            Current session or None
        """
        pass
    
    @abstractmethod
    def is_active(self) -> bool:
        """
        Check if debug mode is active.
        
        Returns:
            Whether debug mode is active
        """
        pass
    
    @abstractmethod
    def set_breakpoint(self, bp_type: str, target: str, condition: Optional[str] = None) -> str:
        """
        Set a breakpoint.
        
        Args:
            bp_type: Breakpoint type ('hook', 'tool', 'event', 'custom')
            target: Target name
            condition: Optional condition expression
            
        Returns:
            Breakpoint ID
        """
        pass
    
    @abstractmethod
    def remove_breakpoint(self, breakpoint_id: str) -> None:
        """
        Remove a breakpoint.
        
        Args:
            breakpoint_id: Breakpoint ID to remove
        """
        pass
    
    @abstractmethod
    def toggle_breakpoint(self, breakpoint_id: str, enabled: bool) -> None:
        """
        Enable/disable a breakpoint.
        
        Args:
            breakpoint_id: Breakpoint ID
            enabled: Whether to enable or disable
        """
        pass
    
    @abstractmethod
    def get_breakpoints(self) -> List[Breakpoint]:
        """
        Get all breakpoints.
        
        Returns:
            Array of breakpoints
        """
        pass
    
    @abstractmethod
    def clear_breakpoints(self) -> None:
        """Clear all breakpoints"""
        pass
    
    @abstractmethod
    def start_trace(self, name: str, metadata: Optional[Dict[str, Any]] = None) -> Callable[[], None]:
        """
        Start a performance trace.
        
        Args:
            name: Trace name/label
            metadata: Optional metadata
            
        Returns:
            Function to end the trace
        """
        pass
    
    @abstractmethod
    async def measure(self, name: str, fn: Callable) -> Any:
        """
        Measure execution time of a function.
        
        Args:
            name: Measurement name
            fn: Function to measure
            
        Returns:
            Result of the function
        """
        pass
    
    @abstractmethod
    def get_metrics(self) -> PerformanceMetrics:
        """
        Get performance metrics.
        
        Returns:
            Performance metrics for this plugin
        """
        pass
    
    @abstractmethod
    def reset_metrics(self) -> None:
        """Reset performance metrics"""
        pass
    
    @abstractmethod
    def log(self, level: DebugLogLevel, message: str, data: Optional[Any] = None) -> None:
        """
        Log a debug message.
        
        Args:
            level: Log level
            message: Log message
            data: Optional additional data
        """
        pass
    
    @abstractmethod
    def get_logs(self, level: Optional[DebugLogLevel] = None, limit: Optional[int] = None) -> List[DebugLogEntry]:
        """
        Get captured logs.
        
        Args:
            level: Optional level filter
            limit: Maximum number of logs to return
            
        Returns:
            Array of log entries
        """
        pass
    
    @abstractmethod
    def clear_logs(self) -> None:
        """Clear captured logs"""
        pass
    
    @abstractmethod
    def on_slow_operation(self, threshold: float, handler: Callable[[SlowOperation], None]) -> Callable[[], None]:
        """
        Monitor for slow operations.
        
        Args:
            threshold: Duration threshold in ms
            handler: Handler called when slow operation is detected
            
        Returns:
            Unsubscribe function
        """
        pass
    
    @abstractmethod
    def capture_snapshot(self, label: str) -> Dict[str, Any]:
        """
        Capture a snapshot of current state.
        
        Args:
            label: Snapshot label
            
        Returns:
            Snapshot data with label, timestamp, metrics, and logs
        """
        pass
    
    @abstractmethod
    def export_data(self) -> str:
        """
        Export debug data for analysis.
        
        Returns:
            Debug data as JSON string
        """
        pass
    
    @abstractmethod
    def assert_condition(self, condition: bool, message: str) -> None:
        """
        Assert a condition (throws in debug mode).
        
        Args:
            condition: Condition to assert
            message: Error message if assertion fails
        """
        pass
    
    @abstractmethod
    def time(self, label: str) -> None:
        """
        Time a block of code with console.time-like API.
        
        Args:
            label: Timer label
        """
        pass
    
    @abstractmethod
    def time_end(self, label: str) -> None:
        """
        End a timer and log the duration.
        
        Args:
            label: Timer label
        """
        pass
    
    @abstractmethod
    def log_memory(self) -> None:
        """Log current memory usage"""
        pass


__all__ = [
    "DebugAPI",
]
