'use client';

/**
 * Toaster - Global toast notification system
 * Based on shadcn/ui toast pattern
 */

import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToasterProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

// Global toast state
let toastListeners: ((toasts: Toast[]) => void)[] = [];
let toasts: Toast[] = [];

function notifyListeners() {
  toastListeners.forEach((listener) => listener([...toasts]));
}

export function toast(options: Omit<Toast, 'id'>) {
  const id = Math.random().toString(36).substring(2, 9);
  const newToast: Toast = {
    id,
    duration: 5000,
    ...options,
  };

  toasts = [...toasts, newToast];
  notifyListeners();

  // Auto dismiss
  if (newToast.duration && newToast.duration > 0) {
    setTimeout(() => {
      dismissToast(id);
    }, newToast.duration);
  }

  return id;
}

export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  notifyListeners();
}

export function dismissAllToasts() {
  toasts = [];
  notifyListeners();
}

// Convenience methods
toast.success = (title: string, description?: string) =>
  toast({ type: 'success', title, description });

toast.error = (title: string, description?: string) =>
  toast({ type: 'error', title, description, duration: 8000 });

toast.warning = (title: string, description?: string) =>
  toast({ type: 'warning', title, description });

toast.info = (title: string, description?: string) =>
  toast({ type: 'info', title, description });

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-green-500" />,
  error: <AlertCircle className="h-5 w-5 text-red-500" />,
  warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
  info: <Info className="h-5 w-5 text-blue-500" />,
};

const toastStyles: Record<ToastType, string> = {
  success: 'border-green-500/20 bg-green-500/10',
  error: 'border-red-500/20 bg-red-500/10',
  warning: 'border-yellow-500/20 bg-yellow-500/10',
  info: 'border-blue-500/20 bg-blue-500/10',
};

export function Toaster({ position = 'bottom-right' }: ToasterProps) {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (newToasts: Toast[]) => setCurrentToasts(newToasts);
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener);
    };
  }, []);

  const positionClasses: Record<string, string> = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  };

  if (currentToasts.length === 0) return null;

  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col gap-2 w-full max-w-sm',
        positionClasses[position]
      )}
    >
      {currentToasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'flex items-start gap-3 rounded-lg border p-4 shadow-lg bg-background/95 supports-[backdrop-filter]:bg-background/85 backdrop-blur-md',
            'animate-in slide-in-from-right-full fade-in-0 duration-300',
            toastStyles[t.type]
          )}
        >
          <div className="shrink-0">{icons[t.type]}</div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{t.title}</p>
            {t.description && (
              <p className="text-sm text-muted-foreground mt-1">{t.description}</p>
            )}
          </div>
          <button
            onClick={() => dismissToast(t.id)}
            className="shrink-0 rounded-md p-1 hover:bg-foreground/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default Toaster;
