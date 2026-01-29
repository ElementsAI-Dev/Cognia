"""
Performance Profiler API for Cognia Plugin SDK

Provides performance monitoring and profiling utilities for plugins.
Includes detailed metrics, tracing, and performance analysis tools.
"""

from abc import ABC, abstractmethod
from typing import Any, Callable, Dict, List, Optional

from .types import (
    PerformanceSample,
    MemoryUsage,
    PerformanceBucket,
    PerformanceReport,
    SlowOperationEntry,
    ProfilerConfig,
)


class ProfilerAPI(ABC):
    """
    Performance Profiler API for plugins.
    
    Provides performance monitoring, tracing, and analysis tools
    for understanding and optimizing plugin performance.
    
    Example:
        # Start profiling
        context.profiler.start()
        
        # Profile a function
        result = await context.profiler.profile('fetch_data', fetch_data)
        
        # Get metrics
        report = context.profiler.generate_report()
        bucket = next((b for b in report.buckets if b.name == 'fetch_data'), None)
        if bucket:
            print('Average fetch time:', bucket.avg_duration)
        
        # Monitor slow operations
        context.profiler.on_slow_operation(lambda op: 
            print(f'Slow: {op.name} took {op.duration}ms')
        )
    """
    
    @abstractmethod
    def start(self) -> None:
        """Start profiling session"""
        pass
    
    @abstractmethod
    def stop(self) -> None:
        """Stop profiling session"""
        pass
    
    @abstractmethod
    def is_active(self) -> bool:
        """Check if profiler is active"""
        pass
    
    @abstractmethod
    def configure(self, config: ProfilerConfig) -> None:
        """
        Configure profiler.
        
        Args:
            config: Configuration to update
        """
        pass
    
    @abstractmethod
    def get_config(self) -> ProfilerConfig:
        """Get current configuration"""
        pass
    
    @abstractmethod
    async def profile(self, name: str, fn: Callable, metadata: Optional[Dict[str, Any]] = None) -> Any:
        """
        Profile a function execution.
        
        Args:
            name: Profile name
            fn: Function to profile
            metadata: Optional metadata
            
        Returns:
            Function result
        """
        pass
    
    @abstractmethod
    def start_timing(self, name: str) -> Callable[[], PerformanceSample]:
        """
        Start a manual timing.
        
        Args:
            name: Timer name
            
        Returns:
            Function to stop timing and return sample
        """
        pass
    
    @abstractmethod
    def record_sample(self, sample: PerformanceSample) -> None:
        """
        Record a performance sample manually.
        
        Args:
            sample: Sample data
        """
        pass
    
    @abstractmethod
    def get_samples(self, name: Optional[str] = None, limit: Optional[int] = None) -> List[PerformanceSample]:
        """
        Get all recorded samples.
        
        Args:
            name: Optional filter by name
            limit: Maximum samples to return
        """
        pass
    
    @abstractmethod
    def clear_samples(self) -> None:
        """Clear all recorded samples"""
        pass
    
    @abstractmethod
    def get_metrics(self, name: str) -> Optional[PerformanceBucket]:
        """
        Get aggregated metrics for a name.
        
        Args:
            name: Metric name
        """
        pass
    
    @abstractmethod
    def get_all_metrics(self) -> List[PerformanceBucket]:
        """Get all aggregated metrics"""
        pass
    
    @abstractmethod
    def generate_report(self) -> PerformanceReport:
        """Generate a performance report"""
        pass
    
    @abstractmethod
    def export_report(self) -> str:
        """Export report as JSON"""
        pass
    
    @abstractmethod
    def get_memory_usage(self) -> Optional[MemoryUsage]:
        """Get current memory usage"""
        pass
    
    @abstractmethod
    def take_memory_snapshot(self) -> None:
        """Take a memory snapshot"""
        pass
    
    @abstractmethod
    def get_memory_snapshots(self) -> List[Dict[str, Any]]:
        """Get memory snapshots"""
        pass
    
    @abstractmethod
    def on_slow_operation(self, handler: Callable[[SlowOperationEntry], None]) -> Callable[[], None]:
        """
        Monitor for slow operations.
        
        Args:
            handler: Handler called when slow operation detected
            
        Returns:
            Unsubscribe function
        """
        pass
    
    @abstractmethod
    def set_slow_threshold(self, threshold: float) -> None:
        """
        Set slow operation threshold.
        
        Args:
            threshold: Threshold in milliseconds
        """
        pass
    
    @abstractmethod
    def get_slow_operations(self) -> List[SlowOperationEntry]:
        """Get slow operations"""
        pass
    
    @abstractmethod
    def mark(self, name: str, detail: Optional[Any] = None) -> None:
        """
        Mark a performance timeline event.
        
        Args:
            name: Event name
            detail: Optional detail data
        """
        pass
    
    @abstractmethod
    def measure_between(self, name: str, start_mark: str, end_mark: str) -> Optional[float]:
        """
        Measure between two marks.
        
        Args:
            name: Measurement name
            start_mark: Start mark name
            end_mark: End mark name
            
        Returns:
            Duration in milliseconds or None
        """
        pass


__all__ = [
    "ProfilerAPI",
]
