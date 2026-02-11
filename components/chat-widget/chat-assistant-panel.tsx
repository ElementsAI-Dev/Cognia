'use client';

/**
 * Chat Assistant Panel
 * An embedded chat panel that slides in when the FAB is clicked
 * Supports adaptive positioning based on screen space
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { isTauri } from '@/lib/native/utils';
import { useChatWidget } from '@/hooks/chat';
import { useChatWidgetStore } from '@/stores/chat';
import { ChatWidgetHeader } from './chat-widget-header';
import { ChatWidgetMessages } from './chat-widget-messages';
import { ChatWidgetInput } from './chat-widget-input';
import { ChatWidgetSettings } from './chat-widget-settings';
import { ChatWidgetSuggestions } from './chat-widget-suggestions';
import { exportChatMessages } from '@/lib/chat-widget/constants';
import type { FabPosition, PanelExpandDirection } from '@/hooks/chat';

interface ChatAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  fabPosition: FabPosition;
  expandDirection?: PanelExpandDirection;
  width?: number;
  height?: number;
  className?: string;
}

// Calculate panel position based on FAB position and expand direction
function getPanelStyles(
  fabPosition: FabPosition,
  expandDirection: PanelExpandDirection,
  width: number,
  height: number
): React.CSSProperties {
  const fabOffset = 24; // 6 * 4 = 24px (same as FAB's position offset)
  const fabSize = 56; // 14 * 4 = 56px (FAB size)
  const gap = 16; // Gap between FAB and panel

  const styles: React.CSSProperties = {
    width,
    height,
    position: 'fixed',
  };

  // Horizontal position
  if (fabPosition.includes('right')) {
    styles.right = fabOffset;
  } else {
    styles.left = fabOffset;
  }

  // Vertical position based on expand direction
  if (fabPosition.includes('bottom')) {
    if (expandDirection === 'up') {
      styles.bottom = fabOffset + fabSize + gap;
    } else {
      styles.bottom = fabOffset;
    }
  } else {
    if (expandDirection === 'down') {
      styles.top = fabOffset + fabSize + gap;
    } else {
      styles.top = fabOffset;
    }
  }

  return styles;
}

// Animation variants based on expand direction and FAB position
function getAnimationVariants(fabPosition: FabPosition, expandDirection: PanelExpandDirection) {
  const isRight = fabPosition.includes('right');
  const isBottom = fabPosition.includes('bottom');

  // Origin point for scale animation
  let originX = isRight ? '100%' : '0%';
  let originY = isBottom ? '100%' : '0%';

  // Initial offset for slide animation
  let initialX = 0;
  let initialY = 0;

  if (expandDirection === 'up') {
    initialY = 20;
    originY = '100%';
  } else if (expandDirection === 'down') {
    initialY = -20;
    originY = '0%';
  } else if (expandDirection === 'left') {
    initialX = 20;
    originX = '100%';
  } else if (expandDirection === 'right') {
    initialX = -20;
    originX = '0%';
  }

  return {
    initial: {
      opacity: 0,
      scale: 0.9,
      x: initialX,
      y: initialY,
    },
    animate: {
      opacity: 1,
      scale: 1,
      x: 0,
      y: 0,
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      x: initialX,
      y: initialY,
    },
    style: {
      transformOrigin: `${originX} ${originY}`,
    },
  };
}

export function ChatAssistantPanel({
  isOpen,
  onClose,
  fabPosition,
  expandDirection = 'up',
  width = 400,
  height = 560,
  className,
}: ChatAssistantPanelProps) {
  const t = useTranslations('chatWidget');
  const containerRef = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const resetConfig = useChatWidgetStore((state) => state.resetConfig);
  const setFeedback = useChatWidgetStore((state) => state.setFeedback);
  const editMessage = useChatWidgetStore((state) => state.editMessage);

  const {
    isLoading,
    error,
    messages,
    inputValue,
    config,
    inputRef,
    setInputValue,
    handleSubmit,
    handleKeyDown,
    clearMessages,
    newSession,
    updateConfig,
    setPinned,
    stop,
    regenerate,
    openMainWindow,
  } = useChatWidget({
    onHide: onClose,
  });

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't close if clicking on FAB or panel
      if (containerRef.current?.contains(target) || target.closest('[data-chat-fab]')) {
        return;
      }
      onClose();
    };

    // Delay adding listener to prevent immediate close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Handle window dragging (Tauri only)
  useEffect(() => {
    if (typeof window === 'undefined' || !isTauri()) return;

    const handleMouseDown = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (e.button !== 0) return;

      if (target.closest('[data-no-drag],button,a,input,select,textarea,[role="button"]')) {
        return;
      }

      // Only start dragging if clicking on the header drag area
      if (target.closest('[data-tauri-drag-region]')) {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const appWindow = getCurrentWindow();
        await appWindow.startDragging();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && config.autoFocus) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen, config.autoFocus, inputRef]);

  const panelStyles = getPanelStyles(fabPosition, expandDirection, width, height);
  const variants = getAnimationVariants(fabPosition, expandDirection);

  return (
    <motion.div
      ref={containerRef}
      className={cn(
        'z-50 flex flex-col overflow-hidden',
        'bg-background/95 backdrop-blur-xl',
        'border border-border/50 rounded-2xl',
        'shadow-2xl shadow-black/10 dark:shadow-black/30',
        className
      )}
      style={{ ...panelStyles, ...variants.style }}
      initial={variants.initial}
      animate={variants.animate}
      exit={variants.exit}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
      }}
    >
      {/* Header */}
      <ChatWidgetHeader
        config={config}
        messages={messages}
        onClose={onClose}
        onNewSession={newSession}
        onClearMessages={clearMessages}
        onTogglePin={() => setPinned(!config.pinned)}
        onSettings={() => setSettingsOpen(true)}
        onExpandToFull={() => openMainWindow(true)}
        onProviderChange={(provider) => updateConfig({ provider })}
        onModelChange={(model) => updateConfig({ model })}
        onExport={() => exportChatMessages(messages, t)}
      />

      {/* Messages area */}
      <ChatWidgetMessages
        messages={messages}
        isLoading={isLoading}
        error={error}
        showTimestamps={config.showTimestamps}
        onRegenerate={regenerate}
        onFeedback={(messageId, feedback) => setFeedback(messageId, feedback)}
        onEdit={(messageId, newContent) => {
          editMessage(messageId, newContent);
          handleSubmit();
        }}
        onContinue={() => {
          setInputValue(t('continueGeneration'));
          handleSubmit();
        }}
      />

      {/* Quick suggestions - show when empty */}
      {messages.length === 0 && !isLoading && (
        <ChatWidgetSuggestions
          onSelect={(prompt) => {
            setInputValue(prompt);
            inputRef.current?.focus();
          }}
        />
      )}

      {/* Input area */}
      <ChatWidgetInput
        ref={inputRef}
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        onStop={stop}
        isLoading={isLoading}
        disabled={isLoading}
      />

      {/* Settings panel */}
      <ChatWidgetSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        config={config}
        onUpdateConfig={updateConfig}
        onResetConfig={resetConfig}
      />
    </motion.div>
  );
}

export default ChatAssistantPanel;
