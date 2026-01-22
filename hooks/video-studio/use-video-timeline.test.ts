/**
 * Tests for useVideoTimeline hook
 */

import { renderHook, act } from '@testing-library/react';
import { useVideoTimeline } from './use-video-timeline';

describe('useVideoTimeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      expect(result.current.state.duration).toBe(60);
      expect(result.current.state.currentTime).toBe(0);
      expect(result.current.state.zoom).toBe(1);
      expect(result.current.state.scrollPosition).toBe(0);
      expect(result.current.state.markers).toHaveLength(0);
      expect(result.current.state.regions).toHaveLength(0);
      expect(result.current.state.inPoint).toBeNull();
      expect(result.current.state.outPoint).toBeNull();
      expect(result.current.state.snapEnabled).toBe(true);
      expect(result.current.state.isPlaying).toBe(false);
      expect(result.current.state.isDragging).toBe(false);
    });

    it('should initialize with custom options', () => {
      const { result } = renderHook(() =>
        useVideoTimeline({
          duration: 120,
          defaultZoom: 2,
          pixelsPerSecondBase: 50,
          snapThreshold: 20,
        })
      );

      expect(result.current.state.duration).toBe(120);
      expect(result.current.state.zoom).toBe(2);
    });
  });

  describe('playhead controls', () => {
    it('should set current time', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      act(() => {
        result.current.setCurrentTime(30);
      });

      expect(result.current.state.currentTime).toBe(30);
    });

    it('should clamp current time to valid range', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      act(() => {
        result.current.setCurrentTime(100);
      });

      expect(result.current.state.currentTime).toBe(60);

      act(() => {
        result.current.setCurrentTime(-10);
      });

      expect(result.current.state.currentTime).toBe(0);
    });

    it('should seek forward', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      act(() => {
        result.current.setCurrentTime(10);
      });

      act(() => {
        result.current.seekForward(5);
      });

      expect(result.current.state.currentTime).toBe(15);
    });

    it('should seek backward', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      act(() => {
        result.current.setCurrentTime(10);
      });

      act(() => {
        result.current.seekBackward(5);
      });

      expect(result.current.state.currentTime).toBe(5);
    });

    it('should seek to start', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      act(() => {
        result.current.setCurrentTime(30);
      });

      act(() => {
        result.current.seekToStart();
      });

      expect(result.current.state.currentTime).toBe(0);
    });

    it('should seek to end', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      act(() => {
        result.current.seekToEnd();
      });

      expect(result.current.state.currentTime).toBe(60);
    });

    it('should call onTimeChange callback', () => {
      const onTimeChange = jest.fn();
      const { result } = renderHook(() => useVideoTimeline({ duration: 60, onTimeChange }));

      act(() => {
        result.current.setCurrentTime(25);
      });

      expect(onTimeChange).toHaveBeenCalledWith(25);
    });
  });

  describe('playback controls', () => {
    it('should set playing state', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      act(() => {
        result.current.setPlaying(true);
      });

      expect(result.current.state.isPlaying).toBe(true);
    });

    it('should toggle playing state', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      act(() => {
        result.current.togglePlayback();
      });

      expect(result.current.state.isPlaying).toBe(true);

      act(() => {
        result.current.togglePlayback();
      });

      expect(result.current.state.isPlaying).toBe(false);
    });
  });

  describe('zoom controls', () => {
    it('should set zoom level', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      act(() => {
        result.current.setZoom(2);
      });

      expect(result.current.state.zoom).toBe(2);
    });

    it('should clamp zoom to valid range', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      act(() => {
        result.current.setZoom(100);
      });

      expect(result.current.state.zoom).toBe(10);

      act(() => {
        result.current.setZoom(0.01);
      });

      expect(result.current.state.zoom).toBe(0.1);
    });

    it('should zoom in', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      const initialZoom = result.current.state.zoom;

      act(() => {
        result.current.zoomIn();
      });

      expect(result.current.state.zoom).toBeGreaterThan(initialZoom);
    });

    it('should zoom out', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      act(() => {
        result.current.setZoom(2);
      });

      const zoomBefore = result.current.state.zoom;

      act(() => {
        result.current.zoomOut();
      });

      expect(result.current.state.zoom).toBeLessThan(zoomBefore);
    });

    it('should reset zoom', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      act(() => {
        result.current.setZoom(3);
      });

      act(() => {
        result.current.resetZoom();
      });

      expect(result.current.state.zoom).toBe(1);
    });

    it('should fit to view', () => {
      const { result } = renderHook(() =>
        useVideoTimeline({ duration: 60, pixelsPerSecondBase: 100 })
      );

      act(() => {
        result.current.fitToView(600); // Container width 600px, duration 60s
      });

      // At 100 px/s base, 60s = 6000px needed
      // To fit in 600px, zoom should be 0.1
      expect(result.current.state.zoom).toBe(0.1);
    });
  });

  describe('scroll controls', () => {
    it('should set scroll position', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      act(() => {
        result.current.setScrollPosition(100);
      });

      expect(result.current.state.scrollPosition).toBe(100);
    });

    it('should clamp scroll position to minimum 0', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      act(() => {
        result.current.setScrollPosition(-50);
      });

      expect(result.current.state.scrollPosition).toBe(0);
    });

    it('should scroll to time', () => {
      const { result } = renderHook(() =>
        useVideoTimeline({ duration: 60, pixelsPerSecondBase: 100 })
      );

      act(() => {
        result.current.scrollToTime(30, 600);
      });

      // At 100 px/s and zoom 1, 30s = 3000px
      // Centering in 600px container: 3000 - 300 = 2700
      expect(result.current.state.scrollPosition).toBe(2700);
    });
  });

  describe('markers', () => {
    it('should add a marker', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      act(() => {
        result.current.addMarker({
          time: 10,
          label: 'Test Marker',
          color: '#ff0000',
          type: 'marker',
        });
      });

      expect(result.current.state.markers).toHaveLength(1);
      expect(result.current.state.markers[0].time).toBe(10);
      expect(result.current.state.markers[0].label).toBe('Test Marker');
    });

    it('should remove a marker', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      let markerId: string;
      act(() => {
        markerId = result.current.addMarker({ time: 10, label: 'Test', type: 'marker' });
      });

      act(() => {
        result.current.removeMarker(markerId!);
      });

      expect(result.current.state.markers).toHaveLength(0);
    });

    it('should update a marker', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      let markerId: string;
      act(() => {
        markerId = result.current.addMarker({ time: 10, label: 'Original', type: 'marker' });
      });

      act(() => {
        result.current.updateMarker(markerId!, { label: 'Updated', time: 20 });
      });

      expect(result.current.state.markers[0].label).toBe('Updated');
      expect(result.current.state.markers[0].time).toBe(20);
    });

    it('should clear all markers', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      act(() => {
        result.current.addMarker({ time: 10, label: 'Marker 1', type: 'marker' });
        result.current.addMarker({ time: 20, label: 'Marker 2', type: 'marker' });
        result.current.addMarker({ time: 30, label: 'Marker 3', type: 'marker' });
      });

      expect(result.current.state.markers).toHaveLength(3);

      act(() => {
        result.current.clearMarkers();
      });

      expect(result.current.state.markers).toHaveLength(0);
    });

    it('should get marker at time', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      act(() => {
        result.current.addMarker({ time: 10, label: 'Test Marker', type: 'marker' });
      });

      const marker = result.current.getMarkerAtTime(10.05, 0.1);

      expect(marker).not.toBeNull();
      expect(marker?.label).toBe('Test Marker');
    });

    it('should return null when no marker at time', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      act(() => {
        result.current.addMarker({ time: 10, label: 'Test Marker', type: 'marker' });
      });

      const marker = result.current.getMarkerAtTime(20, 0.1);

      expect(marker).toBeNull();
    });

    it('should sort markers by time', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      act(() => {
        result.current.addMarker({ time: 30, label: 'Third', type: 'marker' });
        result.current.addMarker({ time: 10, label: 'First', type: 'marker' });
        result.current.addMarker({ time: 20, label: 'Second', type: 'marker' });
      });

      expect(result.current.state.markers[0].time).toBe(10);
      expect(result.current.state.markers[1].time).toBe(20);
      expect(result.current.state.markers[2].time).toBe(30);
    });

    it('should call onMarkerAdd callback', () => {
      const onMarkerAdd = jest.fn();
      const { result } = renderHook(() => useVideoTimeline({ duration: 60, onMarkerAdd }));

      act(() => {
        result.current.addMarker({ time: 10, label: 'Test', type: 'marker' });
      });

      expect(onMarkerAdd).toHaveBeenCalled();
    });
  });

  describe('regions', () => {
    it('should add a region', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      act(() => {
        result.current.addRegion({
          startTime: 10,
          endTime: 20,
          label: 'Test Region',
          color: '#00ff00',
        });
      });

      expect(result.current.state.regions).toHaveLength(1);
      expect(result.current.state.regions[0].startTime).toBe(10);
      expect(result.current.state.regions[0].endTime).toBe(20);
    });

    it('should remove a region', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      let regionId: string;
      act(() => {
        regionId = result.current.addRegion({ startTime: 10, endTime: 20 });
      });

      act(() => {
        result.current.removeRegion(regionId!);
      });

      expect(result.current.state.regions).toHaveLength(0);
    });

    it('should update a region', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      let regionId: string;
      act(() => {
        regionId = result.current.addRegion({ startTime: 10, endTime: 20 });
      });

      act(() => {
        result.current.updateRegion(regionId!, { startTime: 5, endTime: 25 });
      });

      expect(result.current.state.regions[0].startTime).toBe(5);
      expect(result.current.state.regions[0].endTime).toBe(25);
    });

    it('should clear all regions', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      act(() => {
        result.current.addRegion({ startTime: 0, endTime: 10 });
        result.current.addRegion({ startTime: 20, endTime: 30 });
      });

      act(() => {
        result.current.clearRegions();
      });

      expect(result.current.state.regions).toHaveLength(0);
    });
  });

  describe('in/out points', () => {
    it('should set in point', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      act(() => {
        result.current.setInPoint(10);
      });

      expect(result.current.state.inPoint).toBe(10);
    });

    it('should set out point', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      act(() => {
        result.current.setOutPoint(50);
      });

      expect(result.current.state.outPoint).toBe(50);
    });

    it('should clear in/out points', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      act(() => {
        result.current.setInPoint(10);
        result.current.setOutPoint(50);
      });

      act(() => {
        result.current.clearInOutPoints();
      });

      expect(result.current.state.inPoint).toBeNull();
      expect(result.current.state.outPoint).toBeNull();
    });

    it('should get selected duration', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      act(() => {
        result.current.setInPoint(10);
        result.current.setOutPoint(50);
      });

      const selectedDuration = result.current.getSelectedDuration();

      expect(selectedDuration).toBe(40);
    });

    it('should return null when in/out not set', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      const selectedDuration = result.current.getSelectedDuration();

      expect(selectedDuration).toBeNull();
    });
  });

  describe('snapping', () => {
    it('should toggle snap', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      expect(result.current.state.snapEnabled).toBe(true);

      act(() => {
        result.current.toggleSnap();
      });

      expect(result.current.state.snapEnabled).toBe(false);
    });

    it('should set snap enabled', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      act(() => {
        result.current.setSnapEnabled(false);
      });

      expect(result.current.state.snapEnabled).toBe(false);
    });

    it('should snap to marker', () => {
      const { result } = renderHook(() =>
        useVideoTimeline({ duration: 60, pixelsPerSecondBase: 100, snapThreshold: 10 })
      );

      act(() => {
        result.current.addMarker({ time: 10, label: 'Test', type: 'marker' });
      });

      const snapped = result.current.getSnappedTime(10.05);

      expect(snapped).toBe(10);
    });

    it('should return original time when snap disabled', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      act(() => {
        result.current.setSnapEnabled(false);
        result.current.addMarker({ time: 10, label: 'Test', type: 'marker' });
      });

      const snapped = result.current.getSnappedTime(10.05);

      expect(snapped).toBe(10.05);
    });

    it('should snap to start', () => {
      const { result } = renderHook(() =>
        useVideoTimeline({ duration: 60, pixelsPerSecondBase: 100, snapThreshold: 10 })
      );

      const snapped = result.current.getSnappedTime(0.05);

      expect(snapped).toBe(0);
    });

    it('should snap to end', () => {
      const { result } = renderHook(() =>
        useVideoTimeline({ duration: 60, pixelsPerSecondBase: 100, snapThreshold: 10 })
      );

      const snapped = result.current.getSnappedTime(59.95);

      expect(snapped).toBe(60);
    });
  });

  describe('coordinate conversion', () => {
    it('should convert time to pixels', () => {
      const { result } = renderHook(() =>
        useVideoTimeline({ duration: 60, pixelsPerSecondBase: 100 })
      );

      const pixels = result.current.timeToPixels(10);

      expect(pixels).toBe(1000);
    });

    it('should convert time to pixels with zoom', () => {
      const { result } = renderHook(() =>
        useVideoTimeline({ duration: 60, pixelsPerSecondBase: 100 })
      );

      act(() => {
        result.current.setZoom(2);
      });

      const pixels = result.current.timeToPixels(10);

      expect(pixels).toBe(2000);
    });

    it('should convert pixels to time', () => {
      const { result } = renderHook(() =>
        useVideoTimeline({ duration: 60, pixelsPerSecondBase: 100 })
      );

      const time = result.current.pixelsToTime(1000);

      expect(time).toBe(10);
    });

    it('should get visible time range', () => {
      const { result } = renderHook(() =>
        useVideoTimeline({ duration: 60, pixelsPerSecondBase: 100 })
      );

      act(() => {
        result.current.setScrollPosition(1000);
      });

      const range = result.current.getVisibleTimeRange(600);

      expect(range.start).toBe(10);
      expect(range.end).toBe(16);
    });
  });

  describe('time formatting', () => {
    it('should format time in full format', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      const formatted = result.current.formatTime(3661);

      expect(formatted).toBe('01:01:01');
    });

    it('should format time in short format', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      const formatted = result.current.formatTime(125, 'short');

      expect(formatted).toBe('2:05');
    });

    it('should format time with frames', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      const formatted = result.current.formatTime(10.5, 'frames');

      expect(formatted).toBe('00:00:10:15');
    });

    it('should parse time string', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      const parsed = result.current.parseTime('01:30:45');

      expect(parsed).toBe(5445);
    });

    it('should parse short time string', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      const parsed = result.current.parseTime('2:30');

      expect(parsed).toBe(150);
    });
  });

  describe('duration', () => {
    it('should set duration', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      act(() => {
        result.current.setDuration(120);
      });

      expect(result.current.state.duration).toBe(120);
    });

    it('should not allow negative duration', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      act(() => {
        result.current.setDuration(-10);
      });

      expect(result.current.state.duration).toBe(0);
    });
  });

  describe('dragging state', () => {
    it('should set dragging state', () => {
      const { result } = renderHook(() => useVideoTimeline({ duration: 60 }));

      act(() => {
        result.current.setDragging(true);
      });

      expect(result.current.state.isDragging).toBe(true);
    });
  });

  describe('pixelsPerSecond', () => {
    it('should calculate pixelsPerSecond based on zoom', () => {
      const { result } = renderHook(() =>
        useVideoTimeline({ duration: 60, pixelsPerSecondBase: 100 })
      );

      expect(result.current.state.pixelsPerSecond).toBe(100);

      act(() => {
        result.current.setZoom(2);
      });

      expect(result.current.state.pixelsPerSecond).toBe(200);
    });
  });
});
