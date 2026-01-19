'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  ArrowDownToLine,
  ArrowUpToLine,
  LayoutGrid,
  GalleryHorizontal,
  GalleryVertical,
} from 'lucide-react';

export interface AlignmentToolbarProps {
  onAlign: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  onDistribute: (direction: 'horizontal' | 'vertical') => void;
  onAutoArrange: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * AlignmentToolbar - Tools for aligning and distributing slide elements
 */
export function AlignmentToolbar({
  onAlign,
  onDistribute,
  onAutoArrange,
  onBringToFront,
  onSendToBack,
  disabled = false,
  className,
}: AlignmentToolbarProps) {
  const t = useTranslations('pptEditor');

  return (
    <div className={`flex items-center gap-1 ${className || ''}`}>
      {/* Horizontal Alignment */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onAlign('left')}
              disabled={disabled}
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('alignLeft')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onAlign('center')}
              disabled={disabled}
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('alignCenter')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onAlign('right')}
              disabled={disabled}
            >
              <AlignRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('alignRight')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Vertical Alignment */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onAlign('top')}
              disabled={disabled}
            >
              <AlignStartVertical className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('alignTop')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onAlign('middle')}
              disabled={disabled}
            >
              <AlignCenterVertical className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('alignMiddle')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onAlign('bottom')}
              disabled={disabled}
            >
              <AlignEndVertical className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('alignBottom')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Distribution */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDistribute('horizontal')}
              disabled={disabled}
            >
              <GalleryHorizontal className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('distributeHorizontal')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDistribute('vertical')}
              disabled={disabled}
            >
              <GalleryVertical className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('distributeVertical')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Auto Arrange */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onAutoArrange}
              disabled={disabled}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('autoArrange')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Z-Order */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onBringToFront}
              disabled={disabled}
            >
              <ArrowUpToLine className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('bringToFront')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onSendToBack}
              disabled={disabled}
            >
              <ArrowDownToLine className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('sendToBack')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

export default AlignmentToolbar;
