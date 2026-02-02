'use client';

/**
 * useBackgroundEditor - Custom hook for background settings editor logic
 * 
 * Extracts common editorMode-dependent logic to reduce code duplication
 * in the BackgroundSettings component. Eliminates 20+ repeated
 * `editorMode === 'single'` checks by providing unified updater functions.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { nanoid } from 'nanoid';
import { useSettingsStore } from '@/stores';
import { DEFAULT_BACKGROUND_SETTINGS } from '@/lib/themes';
import type { BackgroundLayerSettings, BackgroundSettings } from '@/lib/themes';

export interface UseBackgroundEditorReturn {
  // Editor state
  editorMode: BackgroundSettings['mode'];
  isSingleMode: boolean;
  items: BackgroundLayerSettings[] | null;
  selectedItem: BackgroundLayerSettings | null;
  activeItemIndex: number;
  setActiveItemIndex: (index: number) => void;
  
  // Effective settings (merged for current mode)
  effectiveSettings: BackgroundSettings;
  
  // Generic updater
  updateSelectedItem: (updates: Partial<BackgroundLayerSettings>) => void;
  
  // Specific updaters (eliminate editorMode checks in component)
  updateFit: (value: BackgroundLayerSettings['fit']) => void;
  updatePosition: (value: BackgroundLayerSettings['position']) => void;
  updateOpacity: (value: number) => void;
  updateBlur: (value: number) => void;
  updateBrightness: (value: number) => void;
  updateSaturation: (value: number) => void;
  updateContrast: (value: number) => void;
  updateGrayscale: (value: number) => void;
  updateAttachment: (value: BackgroundLayerSettings['attachment']) => void;
  updateAnimation: (value: BackgroundLayerSettings['animation']) => void;
  updateAnimationSpeed: (value: number) => void;
  updateOverlayColor: (value: string) => void;
  updateOverlayOpacity: (value: number) => void;
  
  // Item management
  addItem: () => void;
  removeItem: (index: number) => void;
  
  // Store actions passthrough
  backgroundSettings: BackgroundSettings;
  setBackgroundSettings: ReturnType<typeof useSettingsStore.getState>['setBackgroundSettings'];
}

export function useBackgroundEditor(): UseBackgroundEditorReturn {
  const {
    backgroundSettings,
    setBackgroundSettings,
    setBackgroundFit,
    setBackgroundPosition,
    setBackgroundOpacity,
    setBackgroundBlur,
    setBackgroundOverlay,
    setBackgroundBrightness,
    setBackgroundSaturation,
    setBackgroundContrast,
    setBackgroundGrayscale,
    setBackgroundAttachment,
    setBackgroundAnimation,
    setBackgroundAnimationSpeed,
  } = useSettingsStore(
    useShallow((state) => ({
      backgroundSettings: state.backgroundSettings,
      setBackgroundSettings: state.setBackgroundSettings,
      setBackgroundFit: state.setBackgroundFit,
      setBackgroundPosition: state.setBackgroundPosition,
      setBackgroundOpacity: state.setBackgroundOpacity,
      setBackgroundBlur: state.setBackgroundBlur,
      setBackgroundOverlay: state.setBackgroundOverlay,
      setBackgroundBrightness: state.setBackgroundBrightness,
      setBackgroundSaturation: state.setBackgroundSaturation,
      setBackgroundContrast: state.setBackgroundContrast,
      setBackgroundGrayscale: state.setBackgroundGrayscale,
      setBackgroundAttachment: state.setBackgroundAttachment,
      setBackgroundAnimation: state.setBackgroundAnimation,
      setBackgroundAnimationSpeed: state.setBackgroundAnimationSpeed,
    }))
  );

  const [rawActiveItemIndex, setActiveItemIndex] = useState(0);

  const editorMode = backgroundSettings.mode;
  
  const items = useMemo(() => {
    if (editorMode === 'layers') return backgroundSettings.layers;
    if (editorMode === 'slideshow') return backgroundSettings.slideshow.slides;
    return null;
  }, [backgroundSettings.layers, backgroundSettings.slideshow.slides, editorMode]);

  // Compute bounded index to avoid out-of-bounds access
  const activeItemIndex = useMemo(() => {
    if (!items || items.length === 0) return 0;
    return Math.min(rawActiveItemIndex, items.length - 1);
  }, [items, rawActiveItemIndex]);

  const selectedItem = useMemo(() => {
    if (!items) return null;
    return items[activeItemIndex] ?? null;
  }, [activeItemIndex, items]);

  // Initialize slideshow with at least one slide
  useEffect(() => {
    if (editorMode !== 'slideshow') return;
    if (backgroundSettings.slideshow.slides.length > 0) return;
    setBackgroundSettings({
      slideshow: {
        ...backgroundSettings.slideshow,
        slides: [{ ...DEFAULT_BACKGROUND_SETTINGS.layers[0], id: 'slide-1' }],
      },
    });
  }, [backgroundSettings.slideshow, editorMode, setBackgroundSettings]);

  // Compute effective settings based on mode
  const effectiveSettings = useMemo(() => {
    if (editorMode === 'single') return backgroundSettings;
    if (!selectedItem) return backgroundSettings;

    return {
      ...backgroundSettings,
      source: selectedItem.source,
      imageUrl: selectedItem.imageUrl,
      localAssetId: selectedItem.localAssetId,
      presetId: selectedItem.presetId,
      fit: selectedItem.fit,
      position: selectedItem.position,
      opacity: selectedItem.opacity,
      blur: selectedItem.blur,
      overlayColor: selectedItem.overlayColor,
      overlayOpacity: selectedItem.overlayOpacity,
      brightness: selectedItem.brightness,
      saturation: selectedItem.saturation,
      attachment: selectedItem.attachment,
      animation: selectedItem.animation,
      animationSpeed: selectedItem.animationSpeed,
      contrast: selectedItem.contrast,
      grayscale: selectedItem.grayscale,
    };
  }, [backgroundSettings, editorMode, selectedItem]);

  // Update the selected item (handles single/layers/slideshow modes)
  const updateSelectedItem = useCallback((updates: Partial<BackgroundLayerSettings>) => {
    if (editorMode === 'single') {
      setBackgroundSettings(updates as Partial<BackgroundSettings>);
      return;
    }
    if (!items) return;
    const index = Math.min(activeItemIndex, items.length - 1);
    const nextItems = items.map((item, i) => (i === index ? { ...item, ...updates } : item));

    if (editorMode === 'layers') {
      setBackgroundSettings({ layers: nextItems });
      return;
    }
    setBackgroundSettings({ slideshow: { ...backgroundSettings.slideshow, slides: nextItems } });
  }, [activeItemIndex, backgroundSettings.slideshow, editorMode, items, setBackgroundSettings]);

  // Add a new layer/slide
  const addItem = useCallback(() => {
    if (!items) return;
    const prefix = editorMode === 'layers' ? 'layer' : 'slide';
    const newId = `${prefix}-${nanoid(8)}`;
    const newItem = { ...DEFAULT_BACKGROUND_SETTINGS.layers[0], id: newId };
    const nextItems = [...items, newItem];
    
    if (editorMode === 'layers') {
      setBackgroundSettings({ layers: nextItems });
    } else {
      setBackgroundSettings({ slideshow: { ...backgroundSettings.slideshow, slides: nextItems } });
    }
    setActiveItemIndex(nextItems.length - 1);
  }, [backgroundSettings.slideshow, editorMode, items, setBackgroundSettings]);

  // Remove a layer/slide
  const removeItem = useCallback((index: number) => {
    if (!items || items.length <= 1) return;
    const nextItems = items.filter((_, i) => i !== index);
    
    if (editorMode === 'layers') {
      setBackgroundSettings({ layers: nextItems });
    } else {
      setBackgroundSettings({ slideshow: { ...backgroundSettings.slideshow, slides: nextItems } });
    }
    setActiveItemIndex(Math.max(0, index - 1));
  }, [backgroundSettings.slideshow, editorMode, items, setBackgroundSettings]);

  // Helper to check if in single mode
  const isSingleMode = editorMode === 'single';

  // Specific updater functions - eliminate editorMode checks in component
  const updateFit = useCallback((value: BackgroundLayerSettings['fit']) => {
    if (isSingleMode) {
      setBackgroundFit(value);
    } else {
      updateSelectedItem({ fit: value });
    }
  }, [isSingleMode, setBackgroundFit, updateSelectedItem]);

  const updatePosition = useCallback((value: BackgroundLayerSettings['position']) => {
    if (isSingleMode) {
      setBackgroundPosition(value);
    } else {
      updateSelectedItem({ position: value });
    }
  }, [isSingleMode, setBackgroundPosition, updateSelectedItem]);

  const updateOpacity = useCallback((value: number) => {
    if (isSingleMode) {
      setBackgroundOpacity(value);
    } else {
      updateSelectedItem({ opacity: value });
    }
  }, [isSingleMode, setBackgroundOpacity, updateSelectedItem]);

  const updateBlur = useCallback((value: number) => {
    if (isSingleMode) {
      setBackgroundBlur(value);
    } else {
      updateSelectedItem({ blur: value });
    }
  }, [isSingleMode, setBackgroundBlur, updateSelectedItem]);

  const updateBrightness = useCallback((value: number) => {
    if (isSingleMode) {
      setBackgroundBrightness(value);
    } else {
      updateSelectedItem({ brightness: value });
    }
  }, [isSingleMode, setBackgroundBrightness, updateSelectedItem]);

  const updateSaturation = useCallback((value: number) => {
    if (isSingleMode) {
      setBackgroundSaturation(value);
    } else {
      updateSelectedItem({ saturation: value });
    }
  }, [isSingleMode, setBackgroundSaturation, updateSelectedItem]);

  const updateContrast = useCallback((value: number) => {
    if (isSingleMode) {
      setBackgroundContrast(value);
    } else {
      updateSelectedItem({ contrast: value });
    }
  }, [isSingleMode, setBackgroundContrast, updateSelectedItem]);

  const updateGrayscale = useCallback((value: number) => {
    if (isSingleMode) {
      setBackgroundGrayscale(value);
    } else {
      updateSelectedItem({ grayscale: value });
    }
  }, [isSingleMode, setBackgroundGrayscale, updateSelectedItem]);

  const updateAttachment = useCallback((value: BackgroundLayerSettings['attachment']) => {
    if (isSingleMode) {
      setBackgroundAttachment(value);
    } else {
      updateSelectedItem({ attachment: value });
    }
  }, [isSingleMode, setBackgroundAttachment, updateSelectedItem]);

  const updateAnimation = useCallback((value: BackgroundLayerSettings['animation']) => {
    if (isSingleMode) {
      setBackgroundAnimation(value);
    } else {
      updateSelectedItem({ animation: value });
    }
  }, [isSingleMode, setBackgroundAnimation, updateSelectedItem]);

  const updateAnimationSpeed = useCallback((value: number) => {
    if (isSingleMode) {
      setBackgroundAnimationSpeed(value);
    } else {
      updateSelectedItem({ animationSpeed: value });
    }
  }, [isSingleMode, setBackgroundAnimationSpeed, updateSelectedItem]);

  const updateOverlayColor = useCallback((value: string) => {
    if (isSingleMode) {
      setBackgroundOverlay(value, effectiveSettings.overlayOpacity);
    } else {
      updateSelectedItem({ overlayColor: value });
    }
  }, [effectiveSettings.overlayOpacity, isSingleMode, setBackgroundOverlay, updateSelectedItem]);

  const updateOverlayOpacity = useCallback((value: number) => {
    if (isSingleMode) {
      setBackgroundOverlay(effectiveSettings.overlayColor, value);
    } else {
      updateSelectedItem({ overlayOpacity: value });
    }
  }, [effectiveSettings.overlayColor, isSingleMode, setBackgroundOverlay, updateSelectedItem]);

  return {
    editorMode,
    isSingleMode,
    items,
    selectedItem,
    activeItemIndex,
    setActiveItemIndex,
    effectiveSettings,
    updateSelectedItem,
    updateFit,
    updatePosition,
    updateOpacity,
    updateBlur,
    updateBrightness,
    updateSaturation,
    updateContrast,
    updateGrayscale,
    updateAttachment,
    updateAnimation,
    updateAnimationSpeed,
    updateOverlayColor,
    updateOverlayOpacity,
    addItem,
    removeItem,
    backgroundSettings,
    setBackgroundSettings,
  };
}
