'use client';

/**
 * McpPrivacyDialog - Privacy warning dialog for MCP prompt optimization
 *
 * Warns users that their prompt content will be sent to an external
 * MCP server (ace-tool) for optimization, and requires explicit consent.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ShieldAlert, ExternalLink } from 'lucide-react';

interface McpPrivacyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: (dontAskAgain: boolean) => void;
  onDecline: () => void;
  serverName?: string;
}

export function McpPrivacyDialog({
  open,
  onOpenChange,
  onAccept,
  onDecline,
  serverName,
}: McpPrivacyDialogProps) {
  const t = useTranslations('promptOptimizer.mcpPrivacy');
  const [dontAskAgain, setDontAskAgain] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="h-5 w-5" />
            {t('title')}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>{t('description')}</p>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  {t('warning')}
                </p>
                <ul className="mt-2 space-y-1 text-sm text-amber-700 dark:text-amber-400">
                  <li className="flex items-start gap-1.5">
                    <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {t('dataSent')}
                  </li>
                  <li className="flex items-start gap-1.5">
                    <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {t('serverInfo', { server: serverName || 'ace-tool' })}
                  </li>
                  <li className="flex items-start gap-1.5">
                    <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {t('noGuarantee')}
                  </li>
                </ul>
              </div>

              <p className="text-xs text-muted-foreground">
                {t('recommendation')}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex items-center gap-2 py-2">
          <Checkbox
            id="mcp-privacy-dont-ask"
            checked={dontAskAgain}
            onCheckedChange={(checked) => setDontAskAgain(checked === true)}
          />
          <Label htmlFor="mcp-privacy-dont-ask" className="text-sm cursor-pointer">
            {t('dontAskAgain')}
          </Label>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDecline}>
            {t('decline')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onAccept(dontAskAgain)}
            className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700"
          >
            {t('accept')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default McpPrivacyDialog;
