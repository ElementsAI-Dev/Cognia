'use client';

/**
 * CollectionCard - Displays a plugin collection
 */

import React from 'react';
import { ChevronRight, Box } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PluginCollection } from './marketplace-types';

interface CollectionCardProps {
  collection: PluginCollection;
  onClick?: () => void;
}

export function CollectionCard({ collection, onClick }: CollectionCardProps) {
  const Icon = collection.icon;

  return (
    <Card 
      className="group relative overflow-hidden border hover:border-primary/50 transition-all duration-300 hover:shadow-lg min-w-[260px] sm:min-w-[300px] cursor-pointer"
      onClick={onClick}
    >
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity', collection.gradient)} />
      <CardContent className="relative p-3 sm:p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className={cn('p-2 sm:p-2.5 rounded-xl bg-gradient-to-br', collection.gradient)}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{collection.name}</h4>
            <p className="text-xs text-muted-foreground line-clamp-1">{collection.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {collection.pluginIds.slice(0, 3).map((pluginId, idx) => (
              <div
                key={pluginId}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-muted border-2 border-background flex items-center justify-center transition-transform group-hover:scale-105"
                style={{ zIndex: 3 - idx }}
              >
                <Box className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            {collection.pluginIds.length} plugins
          </span>
          <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            View <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default CollectionCard;
