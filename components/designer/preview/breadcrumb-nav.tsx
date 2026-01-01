'use client';

/**
 * BreadcrumbNav - Hierarchical navigation for selected element
 * Shows the element path from root to selected element
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useDesignerStore } from '@/stores/designer-store';
import type { DesignerElement } from '@/types/designer';

interface BreadcrumbNavProps {
  className?: string;
  maxItems?: number;
}

interface BreadcrumbItem {
  id: string;
  tagName: string;
  className?: string;
  index?: number;
}

export function BreadcrumbNav({ className, maxItems = 5 }: BreadcrumbNavProps) {
  const t = useTranslations('designer');
  
  const selectedElementId = useDesignerStore((state) => state.selectedElementId);
  const elementTree = useDesignerStore((state) => state.elementTree);
  const selectElement = useDesignerStore((state) => state.selectElement);

  // Build path from root to selected element
  const breadcrumbPath = useMemo((): BreadcrumbItem[] => {
    if (!selectedElementId || !elementTree) return [];

    const path: BreadcrumbItem[] = [];
    
    // Find element and build path
    function findPath(element: DesignerElement, targetId: string): boolean {
      if (element.id === targetId) {
        path.push({
          id: element.id,
          tagName: element.tagName,
          className: element.className?.split(' ')[0],
        });
        return true;
      }

      for (let i = 0; i < element.children.length; i++) {
        if (findPath(element.children[i], targetId)) {
          path.unshift({
            id: element.id,
            tagName: element.tagName,
            className: element.className?.split(' ')[0],
            index: i,
          });
          return true;
        }
      }

      return false;
    }

    findPath(elementTree, selectedElementId);
    return path;
  }, [selectedElementId, elementTree]);

  // Truncate path if too long
  const displayPath = useMemo(() => {
    if (breadcrumbPath.length <= maxItems) return breadcrumbPath;
    
    const first = breadcrumbPath[0];
    const last = breadcrumbPath.slice(-Math.floor(maxItems / 2));
    return [first, { id: 'ellipsis', tagName: '...', className: undefined }, ...last];
  }, [breadcrumbPath, maxItems]);

  if (displayPath.length === 0) {
    return (
      <div className={cn('flex items-center gap-1 text-xs text-muted-foreground', className)}>
        <Home className="h-3.5 w-3.5" />
        <span>{t('noSelection') || 'No element selected'}</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <nav
        className={cn('flex items-center gap-0.5 text-xs overflow-x-auto', className)}
        aria-label="Element path"
      >
        {displayPath.map((item, index) => (
          <div key={item.id} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground/50 mx-0.5 shrink-0" />
            )}
            
            {item.id === 'ellipsis' ? (
              <span className="text-muted-foreground px-1">...</span>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-6 px-1.5 text-xs font-mono',
                      item.id === selectedElementId && 'bg-primary/10 text-primary'
                    )}
                    onClick={() => selectElement(item.id)}
                  >
                    <span className="text-muted-foreground">&lt;</span>
                    {item.tagName}
                    {item.className && (
                      <span className="text-primary/70 ml-0.5">.{item.className}</span>
                    )}
                    <span className="text-muted-foreground">&gt;</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <div className="text-xs">
                    <div className="font-mono">{item.tagName}</div>
                    {item.className && (
                      <div className="text-muted-foreground">class: {item.className}</div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        ))}
      </nav>
    </TooltipProvider>
  );
}

export default BreadcrumbNav;
