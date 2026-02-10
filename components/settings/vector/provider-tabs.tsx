'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { VectorDBProvider } from '@/stores/data';

export interface ProviderTabOption {
  value: VectorDBProvider;
  label: string;
  disabled?: boolean;
}

export function ProviderTabs({
  value,
  onValueChange,
  options,
  className,
}: {
  value: VectorDBProvider;
  onValueChange: (value: VectorDBProvider) => void;
  options: ProviderTabOption[];
  className?: string;
}) {
  return (
    <Tabs
      value={value}
      onValueChange={(v) => onValueChange(v as VectorDBProvider)}
      className={cn('w-full', className)}
    >
      <TabsList className="w-full h-auto bg-transparent border border-border rounded-lg p-1 gap-1 flex flex-wrap">
        {options.map((opt) => (
          <TabsTrigger
            key={opt.value}
            value={opt.value}
            disabled={opt.disabled}
            className={cn(
              'flex-1 min-w-[80px] h-8 rounded-md border border-transparent text-xs sm:text-sm',
              'data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:border-foreground',
              'data-[state=inactive]:bg-background data-[state=inactive]:text-muted-foreground',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {opt.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
