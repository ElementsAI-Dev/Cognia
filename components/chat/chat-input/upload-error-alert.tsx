'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface UploadErrorAlertProps {
  message: string;
  onDismiss: () => void;
  /** @deprecated Use internal i18n instead */
  dismissLabel?: string;
}

export function UploadErrorAlert({ message, onDismiss, dismissLabel }: UploadErrorAlertProps) {
  const t = useTranslations('upload');
  const label = dismissLabel || t('dismiss');
  return (
    <Alert variant="destructive" className="mb-3 animate-in fade-in-0 slide-in-from-top-2 duration-200">
      <AlertDescription className="flex items-center justify-between">
        <span>{message}</span>
        <Button
          onClick={onDismiss}
          variant="ghost"
          size="sm"
          className="ml-2 h-auto p-0 text-sm underline hover:no-underline transition-all"
        >
          {label}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
