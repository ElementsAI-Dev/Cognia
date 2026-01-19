'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  ChevronLeft,
  ChevronRight,
  Minimize2,
  Play,
  Pause,
  LayoutGrid,
  FileText,
  Settings,
  Timer,
  Keyboard,
  X,
} from 'lucide-react';
import type { SlideshowSettings } from '../types';

interface SlideshowControlsProps {
  currentIndex: number;
  totalSlides: number;
  settings: SlideshowSettings;
  isPlaying: boolean;
  elapsedTime: number;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
  onTogglePlay: () => void;
  onToggleThumbnails: () => void;
  onToggleNotes: () => void;
  onSettingsChange: (settings: Partial<SlideshowSettings>) => void;
  onShowKeyboardHelp: () => void;
  className?: string;
}

export function SlideshowControls({
  currentIndex,
  totalSlides,
  settings,
  isPlaying,
  elapsedTime,
  onPrev,
  onNext,
  onExit,
  onTogglePlay,
  onToggleThumbnails,
  onToggleNotes,
  onSettingsChange,
  onShowKeyboardHelp,
  className,
}: SlideshowControlsProps) {
  const [isVisible, setIsVisible] = useState(true);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide controls after inactivity
  const resetHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    setIsVisible(true);
    hideTimeoutRef.current = setTimeout(() => setIsVisible(false), 3000);
  }, []);

  useEffect(() => {
    const handleMouseMove = () => resetHideTimeout();
    window.addEventListener('mousemove', handleMouseMove);
    // Initial timeout setup
    hideTimeoutRef.current = setTimeout(() => setIsVisible(false), 3000);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [resetHideTimeout]);

  // Format elapsed time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Progress percentage
  const progress = ((currentIndex + 1) / totalSlides) * 100;

  return (
    <div
      className={cn(
        'absolute inset-x-0 bottom-0 transition-all duration-300',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none',
        className
      )}
      onMouseEnter={() => setIsVisible(true)}
    >
      {/* Progress bar */}
      {settings.showProgress && (
        <div className="h-1 bg-white/20 mx-4 mb-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/80 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Controls bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-t from-black/60 to-transparent">
        {/* Left section */}
        <div className="flex items-center gap-2">
          {/* Timer */}
          {settings.showTimer && (
            <div className="flex items-center gap-1.5 text-white/80 text-sm bg-black/30 px-2 py-1 rounded">
              <Timer className="h-3.5 w-3.5" />
              <span className="font-mono">{formatTime(elapsedTime)}</span>
            </div>
          )}

          {/* Auto-play toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={onTogglePlay}
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {isPlaying ? '暂停自动播放' : '自动播放'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Center section - Navigation */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 disabled:opacity-30"
            onClick={onPrev}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>

          <span className="text-white font-medium min-w-[80px] text-center">
            {currentIndex + 1} / {totalSlides}
          </span>

          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 disabled:opacity-30"
            onClick={onNext}
            disabled={currentIndex === totalSlides - 1}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-1">
          {/* Thumbnail toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'text-white hover:bg-white/20',
                    settings.showThumbnails && 'bg-white/20'
                  )}
                  onClick={onToggleThumbnails}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">缩略图</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Notes toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'text-white hover:bg-white/20',
                    settings.showNotes && 'bg-white/20'
                  )}
                  onClick={onToggleNotes}
                >
                  <FileText className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">演讲者备注</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Keyboard shortcuts */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={onShowKeyboardHelp}
                >
                  <Keyboard className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">快捷键</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Settings popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" side="top" align="end">
              <div className="space-y-4">
                <h4 className="font-medium text-sm">播放设置</h4>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-play" className="text-sm">自动播放</Label>
                  <Switch
                    id="auto-play"
                    checked={settings.autoPlay}
                    onCheckedChange={(checked) => onSettingsChange({ autoPlay: checked })}
                  />
                </div>

                {settings.autoPlay && (
                  <div className="space-y-2">
                    <Label className="text-sm">播放间隔: {settings.autoPlayInterval}秒</Label>
                    <Slider
                      value={[settings.autoPlayInterval]}
                      onValueChange={([value]) => onSettingsChange({ autoPlayInterval: value })}
                      min={3}
                      max={30}
                      step={1}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Label htmlFor="show-timer" className="text-sm">显示计时器</Label>
                  <Switch
                    id="show-timer"
                    checked={settings.showTimer}
                    onCheckedChange={(checked) => onSettingsChange({ showTimer: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="show-progress" className="text-sm">显示进度条</Label>
                  <Switch
                    id="show-progress"
                    checked={settings.showProgress}
                    onCheckedChange={(checked) => onSettingsChange({ showProgress: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="transitions" className="text-sm">启用过渡动画</Label>
                  <Switch
                    id="transitions"
                    checked={settings.enableTransitions}
                    onCheckedChange={(checked) => onSettingsChange({ enableTransitions: checked })}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Exit button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={onExit}
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">退出演示 (Esc)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}

// Keyboard shortcuts help modal
interface KeyboardHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardHelpModal({ isOpen, onClose }: KeyboardHelpModalProps) {
  if (!isOpen) return null;

  const shortcuts = [
    { keys: ['←', '↑', 'PageUp'], action: '上一张幻灯片' },
    { keys: ['→', '↓', 'PageDown', 'Space'], action: '下一张幻灯片' },
    { keys: ['Home'], action: '第一张幻灯片' },
    { keys: ['End'], action: '最后一张幻灯片' },
    { keys: ['Esc'], action: '退出演示模式' },
    { keys: ['F'], action: '切换全屏' },
    { keys: ['T'], action: '显示/隐藏缩略图' },
    { keys: ['N'], action: '显示/隐藏备注' },
    { keys: ['P'], action: '开始/暂停自动播放' },
    { keys: ['?', 'H'], action: '显示快捷键帮助' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">键盘快捷键</h3>
          <Button
            variant="ghost"
            size="icon"
            className="text-white/60 hover:text-white hover:bg-white/10"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-3">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-white/80 text-sm">{shortcut.action}</span>
              <div className="flex gap-1">
                {shortcut.keys.map((key, keyIndex) => (
                  <kbd
                    key={keyIndex}
                    className="px-2 py-1 text-xs font-mono bg-white/10 text-white/90 rounded border border-white/20"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SlideshowControls;
