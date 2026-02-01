'use client';

import { AlertTriangle, Info, Shield, ShieldAlert, ShieldCheck, Terminal } from 'lucide-react';
import { useState } from 'react';

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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { TaskConfirmationRequest } from '@/types/scheduler';
import { RISK_LEVEL_INFO } from '@/types/scheduler';

export interface TaskConfirmationDialogProps {
  confirmation: TaskConfirmationRequest | null;
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function TaskConfirmationDialog({
  confirmation,
  open,
  onConfirm,
  onCancel,
  loading = false,
}: TaskConfirmationDialogProps) {
  const [understood, setUnderstood] = useState(false);

  if (!confirmation) return null;

  const riskInfo = RISK_LEVEL_INFO[confirmation.risk_level];
  const isCritical = confirmation.risk_level === 'critical';
  const isHighRisk = confirmation.risk_level === 'high' || isCritical;

  const getOperationLabel = () => {
    switch (confirmation.operation) {
      case 'create':
        return { en: 'Create Task', zh: '创建任务' };
      case 'update':
        return { en: 'Update Task', zh: '更新任务' };
      case 'delete':
        return { en: 'Delete Task', zh: '删除任务' };
      case 'enable':
        return { en: 'Enable Task', zh: '启用任务' };
      case 'run_now':
        return { en: 'Run Task Now', zh: '立即运行任务' };
      default:
        return { en: 'Task Operation', zh: '任务操作' };
    }
  };

  const operationLabel = getOperationLabel();

  const getRiskIcon = () => {
    switch (confirmation.risk_level) {
      case 'low':
        return <ShieldCheck className="h-5 w-5 text-green-500" />;
      case 'medium':
        return <Shield className="h-5 w-5 text-yellow-500" />;
      case 'high':
        return <ShieldAlert className="h-5 w-5 text-orange-500" />;
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {getRiskIcon()}
            <span>
              {operationLabel.zh} / {operationLabel.en}
            </span>
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {/* Task name */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">{confirmation.details.task_name}</span>
                <Badge variant={isCritical ? 'destructive' : isHighRisk ? 'secondary' : 'outline'}>
                  {riskInfo.labelZh} / {riskInfo.label}
                </Badge>
              </div>

              {/* Action summary */}
              {confirmation.details.action_summary && (
                <div className="space-y-1">
                  <span className="text-muted-foreground text-xs">操作 / Action</span>
                  <p className="text-sm">{confirmation.details.action_summary}</p>
                </div>
              )}

              {/* Trigger summary */}
              {confirmation.details.trigger_summary && (
                <div className="space-y-1">
                  <span className="text-muted-foreground text-xs">触发器 / Trigger</span>
                  <p className="text-sm">{confirmation.details.trigger_summary}</p>
                </div>
              )}

              {/* Script preview */}
              {confirmation.details.script_preview && (
                <div className="space-y-1">
                  <span className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Terminal className="h-3 w-3" />
                    脚本预览 / Script Preview
                  </span>
                  <ScrollArea className="h-24 rounded-md border">
                    <pre className="bg-muted p-2 font-mono text-xs">
                      {confirmation.details.script_preview}
                    </pre>
                  </ScrollArea>
                </div>
              )}

              {/* Warnings */}
              {confirmation.warnings.length > 0 && (
                <div className="space-y-2">
                  <span className="text-muted-foreground text-xs">警告 / Warnings</span>
                  <ul className="space-y-1">
                    {confirmation.warnings.map((warning, i) => (
                      <li
                        key={i}
                        className={cn(
                          'flex items-start gap-2 rounded-md p-2 text-xs',
                          isHighRisk ? 'bg-destructive/10' : 'bg-yellow-500/10'
                        )}
                      >
                        <AlertTriangle
                          className={cn(
                            'mt-0.5 h-3 w-3 flex-shrink-0',
                            isHighRisk ? 'text-destructive' : 'text-yellow-500'
                          )}
                        />
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Admin requirement */}
              {confirmation.requires_admin && (
                <div className="bg-destructive/10 flex items-center gap-2 rounded-md p-2">
                  <ShieldAlert className="text-destructive h-4 w-4" />
                  <span className="text-xs">
                    需要管理员权限 / Administrator privileges required
                  </span>
                </div>
              )}

              {/* Confirmation checkbox for critical operations */}
              {isCritical && (
                <label className="flex cursor-pointer items-center gap-2 rounded-md border p-3">
                  <input
                    type="checkbox"
                    checked={understood}
                    onChange={(e) => setUnderstood(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span className="text-xs">
                    我理解此操作的风险并确认继续 / I understand the risks and confirm to proceed
                  </span>
                </label>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>取消 / Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant={isHighRisk ? 'destructive' : 'default'}
              onClick={onConfirm}
              disabled={loading || (isCritical && !understood)}
            >
              {loading ? '处理中... / Processing...' : '确认 / Confirm'}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export interface AdminElevationDialogProps {
  open: boolean;
  onRequestElevation: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function AdminElevationDialog({
  open,
  onRequestElevation,
  onCancel,
  loading = false,
}: AdminElevationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-orange-500" />
            需要管理员权限 / Administrator Privileges Required
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                此操作需要管理员权限。请以管理员身份重新启动应用程序，或点击下方按钮请求权限提升。
              </p>
              <p className="text-muted-foreground text-sm">
                This operation requires administrator privileges. Please restart the application as
                administrator, or click the button below to request elevation.
              </p>

              <div className="bg-muted space-y-2 rounded-lg p-3">
                <p className="text-xs font-medium">Windows:</p>
                <p className="text-muted-foreground text-xs">
                  右键点击 Cognia 图标 → 以管理员身份运行
                </p>
                <p className="text-muted-foreground text-xs">
                  Right-click Cognia icon → Run as administrator
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>取消 / Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button onClick={onRequestElevation} disabled={loading} variant="default">
              {loading ? '请求中... / Requesting...' : '请求权限 / Request Elevation'}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
