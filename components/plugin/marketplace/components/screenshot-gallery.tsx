'use client';

/**
 * ScreenshotGallery - Horizontal scrolling screenshot preview for plugin detail
 */

import React, { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTranslations } from 'next-intl';

interface ScreenshotGalleryProps {
  screenshots: string[];
  pluginName: string;
}

export function ScreenshotGallery({ screenshots, pluginName }: ScreenshotGalleryProps) {
  const t = useTranslations('pluginDetail');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!screenshots || screenshots.length === 0) return null;

  return (
    <div>
      <h3 className="font-semibold mb-2">{t('overview.screenshots')}</h3>
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-2">
          {screenshots.map((src, idx) => (
            <div
              key={idx}
              className="relative group shrink-0 rounded-lg overflow-hidden border hover:border-primary/50 transition-all cursor-pointer"
              onClick={() => setSelectedIndex(idx)}
            >
              <Image
                src={src}
                alt={`${pluginName} screenshot ${idx + 1}`}
                width={300}
                height={180}
                className="w-[240px] h-[150px] sm:w-[300px] sm:h-[180px] object-cover"
                unoptimized
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <Maximize2 className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
              </div>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Fullscreen preview dialog */}
      <Dialog open={selectedIndex !== null} onOpenChange={() => setSelectedIndex(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>{pluginName} - {t('overview.screenshots')}</DialogTitle>
          </DialogHeader>
          {selectedIndex !== null && (
            <div className="relative">
              <Image
                src={screenshots[selectedIndex]}
                alt={`${pluginName} screenshot ${selectedIndex + 1}`}
                width={1200}
                height={800}
                className="w-full h-auto max-h-[80vh] object-contain"
                unoptimized
              />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white hover:bg-white/20"
                  disabled={selectedIndex === 0}
                  onClick={() => setSelectedIndex((prev) => (prev !== null ? prev - 1 : null))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-white min-w-[40px] text-center">
                  {selectedIndex + 1} / {screenshots.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white hover:bg-white/20"
                  disabled={selectedIndex === screenshots.length - 1}
                  onClick={() => setSelectedIndex((prev) => (prev !== null ? prev + 1 : null))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ScreenshotGallery;
