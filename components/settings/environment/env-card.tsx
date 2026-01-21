'use client';

/**
 * EnvCard - Virtual environment card component
 * Extracted from components/settings/system/virtual-env-panel.tsx
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  FolderOpen,
  Trash2,
  Package,
  Play,
  ChevronDown,
  ChevronRight,
  Terminal,
  HardDrive,
  Clock,
  Sparkles,
  Download,
  Copy,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import type { VirtualEnvInfo, VirtualEnvType } from '@/types/system/environment';

export interface EnvCardProps {
  env: VirtualEnvInfo;
  isActive: boolean;
  isSelected: boolean;
  onActivate: () => void;
  onDelete: () => void;
  onViewPackages: () => void;
  onClone: () => void;
  onExport: () => void;
  onSelect: () => void;
}

export function EnvCard({ env, isActive, isSelected, onActivate, onDelete, onViewPackages, onClone, onExport, onSelect }: EnvCardProps) {
  const t = useTranslations('virtualEnv');
  const [isExpanded, setIsExpanded] = useState(false);

  const getTypeIcon = (type: VirtualEnvType) => {
    switch (type) {
      case 'uv':
        return <Sparkles className="h-3.5 w-3.5 text-yellow-500" />;
      case 'conda':
        return <Package className="h-3.5 w-3.5 text-green-500" />;
      default:
        return <Terminal className="h-3.5 w-3.5 text-blue-500" />;
    }
  };

  return (
    <Card className={`transition-all ${isActive ? 'border-green-500 bg-green-50/30 dark:bg-green-950/20' : ''} ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Checkbox
                checked={isSelected}
                onCheckedChange={onSelect}
                className="h-4 w-4"
              />
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              {getTypeIcon(env.type)}
              <span className="font-medium text-sm truncate">{env.name}</span>
              {isActive && (
                <Badge variant="outline" className="text-[10px] bg-green-100 text-green-700 border-green-300">
                  {t('active')}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {!isActive && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={onActivate}
                      >
                        <Play className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('activate')}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={onViewPackages}
                    >
                      <Package className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('viewPackages')}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onClone}>
                    <Copy className="h-3.5 w-3.5 mr-2" />
                    {t('clone')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onExport}>
                    <Download className="h-3.5 w-3.5 mr-2" />
                    {t('exportRequirements')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDelete} className="text-destructive">
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    {t('delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0 px-4 pb-3 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Terminal className="h-3 w-3" />
                <span>Python {env.pythonVersion || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Package className="h-3 w-3" />
                <span>{env.packages} {t('packagesCount')}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <HardDrive className="h-3 w-3" />
                <span>{env.size || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{new Date(env.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground truncate">
              <FolderOpen className="h-3 w-3 inline mr-1" />
              {env.path}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default EnvCard;
