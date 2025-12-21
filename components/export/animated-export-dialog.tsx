'use client';

/**
 * AnimatedExportDialog - Preview and export animated chat replay
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  Sun,
  Moon,
  Monitor,
  Loader2,
  Settings2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { messageRepository } from '@/lib/db';
import {
  exportToAnimatedHTML,
  downloadFile,
  generateFilename,
  type AnimatedExportOptions,
} from '@/lib/export';
import type { Session, UIMessage } from '@/types';

interface AnimatedExportDialogProps {
  session: Session;
  trigger?: React.ReactNode;
}

type ThemeOption = 'light' | 'dark' | 'system';

export function AnimatedExportDialog({ session, trigger }: AnimatedExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Preview state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [displayedContent, setDisplayedContent] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const typingRef = useRef<NodeJS.Timeout | null>(null);

  // Options
  const [theme, setTheme] = useState<ThemeOption>('system');
  const [typingSpeed, setTypingSpeed] = useState(50);
  const [messageDelay, setMessageDelay] = useState(500);
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [autoPlay, setAutoPlay] = useState(false);

  // Load messages when dialog opens
  useEffect(() => {
    if (open && messages.length === 0) {
      setIsLoading(true);
      messageRepository
        .getBySessionId(session.id)
        .then(setMessages)
        .finally(() => setIsLoading(false));
    }
  }, [open, session.id, messages.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) clearTimeout(animationRef.current);
      if (typingRef.current) clearInterval(typingRef.current);
    };
  }, []);

  // Preview animation logic
  const playMessageAtIndex = useCallback((index: number, messagesArr: UIMessage[]) => {
    if (index >= messagesArr.length) {
      setIsPlaying(false);
      return;
    }

    setCurrentMessageIndex(index);
    const msg = messagesArr[index];

    if (msg.role === 'assistant') {
      // Animate typing
      let charIndex = 0;
      setDisplayedContent('');

      typingRef.current = setInterval(() => {
        if (charIndex < msg.content.length) {
          setDisplayedContent(msg.content.slice(0, charIndex + 1));
          charIndex++;
        } else {
          if (typingRef.current) clearInterval(typingRef.current);
          // Move to next message after delay
          animationRef.current = setTimeout(() => {
            playMessageAtIndex(index + 1, messagesArr);
          }, messageDelay);
        }
      }, 1000 / typingSpeed);
    } else {
      // User message - show instantly
      setDisplayedContent(msg.content);
      animationRef.current = setTimeout(() => {
        playMessageAtIndex(index + 1, messagesArr);
      }, messageDelay);
    }

    // Scroll to bottom
    if (previewRef.current) {
      previewRef.current.scrollTop = previewRef.current.scrollHeight;
    }
  }, [typingSpeed, messageDelay]);

  const startPreview = useCallback(() => {
    if (messages.length === 0) return;
    setIsPlaying(true);
    playMessageAtIndex(0, messages);
  }, [messages, playMessageAtIndex]);

  const pausePreview = useCallback(() => {
    setIsPlaying(false);
    if (animationRef.current) clearTimeout(animationRef.current);
    if (typingRef.current) clearInterval(typingRef.current);
  }, []);

  const resetPreview = useCallback(() => {
    pausePreview();
    setCurrentMessageIndex(0);
    setDisplayedContent('');
  }, [pausePreview]);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const options: AnimatedExportOptions = {
        theme,
        typingSpeed,
        messageDelay,
        showTimestamps,
        showControls,
        autoPlay,
      };

      const htmlContent = exportToAnimatedHTML({
        session,
        messages,
        exportedAt: new Date(),
        options,
      });

      const filename = generateFilename(session.title, 'html');
      downloadFile(htmlContent, filename, 'text/html');
      setOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const getThemeStyles = () => {
    const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    return {
      bg: isDark ? '#1a1a1a' : '#ffffff',
      bgSecondary: isDark ? '#2d2d2d' : '#f5f5f5',
      bgUser: isDark ? '#1e3a5f' : '#e3f2fd',
      bgAssistant: isDark ? '#2d2d2d' : '#f5f5f5',
      text: isDark ? '#e0e0e0' : '#212121',
      textSecondary: isDark ? '#9e9e9e' : '#757575',
      border: isDark ? '#404040' : '#e0e0e0',
    };
  };

  const styles = getThemeStyles();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Play className="h-4 w-4 mr-2" />
            Animated Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Animated Chat Export</DialogTitle>
          <DialogDescription>
            Preview and export an animated replay of your conversation
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="preview" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="settings">
              <Settings2 className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Preview Controls */}
                <div className="flex items-center gap-2 mb-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={isPlaying ? pausePreview : startPreview}
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button variant="outline" size="icon" onClick={resetPreview}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground ml-2">
                    {currentMessageIndex} / {messages.length} messages
                  </span>

                  {/* Theme Toggle */}
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      variant={theme === 'light' ? 'default' : 'outline'}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setTheme('light')}
                    >
                      <Sun className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={theme === 'system' ? 'default' : 'outline'}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setTheme('system')}
                    >
                      <Monitor className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={theme === 'dark' ? 'default' : 'outline'}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setTheme('dark')}
                    >
                      <Moon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Preview Area */}
                <div
                  ref={previewRef}
                  className="rounded-lg border overflow-hidden"
                  style={{
                    background: styles.bg,
                    height: '400px',
                  }}
                >
                  <ScrollArea className="h-full">
                    <div className="p-4 space-y-4">
                      {/* Show all messages up to current index */}
                      {messages.slice(0, currentMessageIndex).map((msg) => (
                        <MessagePreview
                          key={msg.id}
                          message={msg}
                          styles={styles}
                          showTimestamp={showTimestamps}
                          isComplete
                        />
                      ))}

                      {/* Current message being typed */}
                      {currentMessageIndex < messages.length && (
                        <MessagePreview
                          message={messages[currentMessageIndex]}
                          styles={styles}
                          showTimestamp={showTimestamps}
                          displayContent={displayedContent}
                          isTyping={isPlaying && messages[currentMessageIndex].role === 'assistant'}
                        />
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="settings" className="mt-4 space-y-6">
            {/* Animation Settings */}
            <div className="space-y-4">
              <h4 className="font-medium">Animation</h4>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Typing Speed</Label>
                  <span className="text-sm text-muted-foreground">{typingSpeed} char/s</span>
                </div>
                <Slider
                  value={[typingSpeed]}
                  onValueChange={([v]) => setTypingSpeed(v)}
                  min={10}
                  max={200}
                  step={10}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Message Delay</Label>
                  <span className="text-sm text-muted-foreground">{messageDelay}ms</span>
                </div>
                <Slider
                  value={[messageDelay]}
                  onValueChange={([v]) => setMessageDelay(v)}
                  min={100}
                  max={2000}
                  step={100}
                />
              </div>
            </div>

            {/* Display Settings */}
            <div className="space-y-4">
              <h4 className="font-medium">Display</h4>

              <div className="space-y-2">
                <Label>Theme</Label>
                <Select value={theme} onValueChange={(v) => setTheme(v as ThemeOption)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="show-timestamps">Show Timestamps</Label>
                <Switch
                  id="show-timestamps"
                  checked={showTimestamps}
                  onCheckedChange={setShowTimestamps}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="show-controls">Show Playback Controls</Label>
                <Switch
                  id="show-controls"
                  checked={showControls}
                  onCheckedChange={setShowControls}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="auto-play">Auto-play on Load</Label>
                <Switch
                  id="auto-play"
                  checked={autoPlay}
                  onCheckedChange={setAutoPlay}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Export Button */}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting || isLoading}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export HTML
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Theme styles type
interface ThemeStyles {
  bg: string;
  bgSecondary: string;
  bgUser: string;
  bgAssistant: string;
  text: string;
  textSecondary: string;
  border: string;
}

// Message preview component
interface MessagePreviewProps {
  message: UIMessage;
  styles: ThemeStyles;
  showTimestamp?: boolean;
  displayContent?: string;
  isTyping?: boolean;
  isComplete?: boolean;
}

function MessagePreview({
  message,
  styles,
  showTimestamp,
  displayContent,
  isTyping,
  isComplete,
}: MessagePreviewProps) {
  const content = isComplete ? message.content : (displayContent ?? message.content);
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex flex-col gap-2 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300',
        isUser ? 'ml-auto' : 'mr-auto'
      )}
    >
      <div className="flex items-center gap-2 text-xs" style={{ color: styles.textSecondary }}>
        <span className="font-semibold" style={{ color: styles.text }}>
          {isUser ? 'You' : 'Assistant'}
        </span>
        {showTimestamp && (
          <span>{message.createdAt.toLocaleTimeString()}</span>
        )}
      </div>
      <div
        className={cn(
          'px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap',
          isUser ? 'rounded-br-sm' : 'rounded-bl-sm'
        )}
        style={{
          background: isUser ? styles.bgUser : styles.bgAssistant,
          color: styles.text,
        }}
      >
        {content}
        {isTyping && (
          <span
            className="inline-block w-0.5 h-4 ml-0.5 animate-pulse"
            style={{ background: '#2196f3', verticalAlign: 'text-bottom' }}
          />
        )}
      </div>
    </div>
  );
}

export default AnimatedExportDialog;
