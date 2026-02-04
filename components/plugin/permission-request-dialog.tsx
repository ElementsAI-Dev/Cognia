'use client';

/**
 * Plugin Permission Request Dialog
 *
 * Shows permission requests originating from plugins and resolves them.
 */

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  resolvePluginPermission,
  requestPluginPermission,
  subscribePermissionRequests,
  type PluginPermissionRequest,
} from '@/lib/plugin/security/permission-requests';
import { getPermissionGuard, PERMISSION_DESCRIPTIONS } from '@/lib/plugin/security/permission-guard';

function formatPermission(permission: string): string {
  const description = (PERMISSION_DESCRIPTIONS as Record<string, string | undefined>)[permission];
  return description || permission;
}

export function PluginPermissionRequestDialog() {
  const t = useTranslations('pluginPermissionRequest');
  const guard = useMemo(() => getPermissionGuard(), []);
  const [request, setRequest] = useState<PluginPermissionRequest | null>(null);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    guard.setRequestHandler(async (pending) => {
      return requestPluginPermission({
        pluginId: pending.pluginId,
        permission: pending.permission,
        reason: pending.reason,
        kind: 'manifest',
      });
    });

    return () => {
      guard.setRequestHandler(async () => false);
    };
  }, [guard]);

  useEffect(() => {
    return subscribePermissionRequests((state) => {
      setRequest(state.current);
      setQueueCount(state.queue.length);
    });
  }, []);

  if (!request) {
    return null;
  }

  const handleAllow = () => {
    resolvePluginPermission(request.id, true);
  };

  const handleDeny = () => {
    resolvePluginPermission(request.id, false);
  };

  return (
    <Dialog open={true} onOpenChange={() => undefined}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <div className="text-xs uppercase text-muted-foreground">{t('pluginLabel')}</div>
            <div className="font-mono text-sm">{request.pluginId}</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase text-muted-foreground">{t('permissionLabel')}</div>
              <Badge variant="outline" className="text-xs">
                {request.kind === 'api' ? t('kindApi') : t('kindManifest')}
              </Badge>
            </div>
            <div className="text-sm">{formatPermission(request.permission)}</div>
            <div className="text-xs text-muted-foreground">{request.permission}</div>
          </div>

          {request.reason ? (
            <div className="space-y-1">
              <div className="text-xs uppercase text-muted-foreground">{t('reasonLabel')}</div>
              <div className="text-sm text-muted-foreground">{request.reason}</div>
            </div>
          ) : null}

          {queueCount > 0 ? (
            <div className="text-xs text-muted-foreground">
              {t('queueNotice', { count: queueCount })}
            </div>
          ) : null}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={handleDeny}>
            {t('deny')}
          </Button>
          <Button onClick={handleAllow}>{t('allow')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
