'use client';

/**
 * Sonner - Toast notifications using sonner library
 * Based on shadcn/ui sonner component
 * @see https://ui.shadcn.com/docs/components/sonner
 */

import { Toaster as Sonner, toast } from 'sonner';
import { useSettingsStore } from '@/stores/settings';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useSettingsStore((state) => state.theme);

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          success: 'group-[.toaster]:border-success/20 group-[.toaster]:bg-success/10',
          error: 'group-[.toaster]:border-destructive/20 group-[.toaster]:bg-destructive/10',
          warning: 'group-[.toaster]:border-warning/20 group-[.toaster]:bg-warning/10',
          info: 'group-[.toaster]:border-info/20 group-[.toaster]:bg-info/10',
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
