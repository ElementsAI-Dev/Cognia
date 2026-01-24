import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslations } from 'next-intl';
import * as LucideIcons from 'lucide-react';

// curated list of icons suitable for chats/agents
const ICON_NAMES = [
  'MessageSquare',
  'Bot',
  'Zap',
  'Code',
  'Terminal',
  'Cpu',
  'Database',
  'Cloud',
  'Server',
  'Globe',
  'Search',
  'Book',
  'Bookmark',
  'Briefcase',
  'Calculator',
  'Calendar',
  'Camera',
  'Circle',
  'Clipboard',
  'Clock',
  'Compass',
  'CreditCard',
  'DollarSign',
  'Download',
  'Edit',
  'Eye',
  'File',
  'FileText',
  'Film',
  'Filter',
  'Flag',
  'Folder',
  'Gift',
  'Heart',
  'Home',
  'Image',
  'Inbox',
  'Info',
  'Key',
  'Layers',
  'Layout',
  'LifeBuoy',
  'Link',
  'List',
  'Lock',
  'Mail',
  'Map',
  'Menu',
  'Mic',
  'Monitor',
  'Moon',
  'Music',
  'Package',
  'Paperclip',
  'Pen',
  'Phone',
  'PieChart',
  'Play',
  'Plus',
  'Power',
  'Printer',
  'Radio',
  'RefreshCw',
  'Save',
  'Scissors',
  'Send',
  'Settings',
  'Share',
  'Shield',
  'ShoppingBag',
  'ShoppingCart',
  'Shuffle',
  'Smartphone',
  'Smile',
  'Speaker',
  'Star',
  'Sun',
  'Table',
  'Tag',
  'Target',
  'Thermometer',
  'ThumbsUp',
  'ToggleLeft',
  'Tool',
  'Trash',
  'Trash2',
  'TrendingUp',
  'Truck',
  'Tv',
  'Umbrella',
  'Unlock',
  'Upload',
  'User',
  'Users',
  'Video',
  'Voicemail',
  'Volume',
  'Volume2',
  'Watch',
  'Wifi',
  'Wind',
  'X',
  'ZoomIn',
  'ZoomOut',
  'Workflow',
  'Sparkles',
  'Brain',
  'Rocket',
  'Lightbulb',
  'GraduationCap',
  'FlaskConical',
  'GanttChart',
  'Gamepad2',
];

interface SidebarIconPickerProps {
  onSelect: (icon: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function SidebarIconPicker({
  onSelect,
  open,
  onOpenChange,
  trigger,
}: SidebarIconPickerProps) {
  const [search, setSearch] = useState('');
  const t = useTranslations('sidebar');

  const filteredIcons = ICON_NAMES.filter((name) =>
    name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>{t('selectIcon') || 'Select Icon'}</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Input
            placeholder={t('searchIcons') || 'Search icons...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4"
          />
          <ScrollArea className="h-75 pr-4">
            <div className="grid grid-cols-6 gap-2">
              {filteredIcons.map((name) => {
                const Icon = LucideIcons[name as keyof typeof LucideIcons] as React.ElementType;
                if (!Icon) return null;
                return (
                  <Button
                    key={name}
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 p-2 hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => {
                      onSelect(`lucide:${name}`);
                      onOpenChange(false);
                    }}
                    title={name}
                  >
                    <Icon className="h-6 w-6" />
                  </Button>
                );
              })}
            </div>
            {filteredIcons.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {t('noIconsFound') || 'No icons found'}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
