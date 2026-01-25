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
            'group toast group-[.toaster]:bg-background/95 group-[.toaster]:supports-[backdrop-filter]:bg-background/85 group-[.toaster]:backdrop-blur-md group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          success: 'group-[.toaster]:border-green-500/20 group-[.toaster]:bg-green-500/10',
          error: 'group-[.toaster]:border-red-500/20 group-[.toaster]:bg-red-500/10',
          warning: 'group-[.toaster]:border-yellow-500/20 group-[.toaster]:bg-yellow-500/10',
          info: 'group-[.toaster]:border-blue-500/20 group-[.toaster]:bg-blue-500/10',
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
