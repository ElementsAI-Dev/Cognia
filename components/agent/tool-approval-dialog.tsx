'use client';

/**
 * ToolApprovalDialog - Request user approval before executing tools
 */

import { useState } from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CodeBlock } from '@/components/ai-elements/code-block';

export interface ToolApprovalRequest {
  id: string;
  toolName: string;
  toolDescription: string;
  args: Record<string, unknown>;
  riskLevel: 'low' | 'medium' | 'high';
}

interface ToolApprovalDialogProps {
  request: ToolApprovalRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (id: string, alwaysAllow?: boolean) => void;
  onDeny: (id: string) => void;
}

const riskConfig = {
  low: {
    icon: ShieldCheck,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Low Risk',
  },
  medium: {
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    label: 'Medium Risk',
  },
  high: {
    icon: ShieldAlert,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'High Risk',
  },
};

export function ToolApprovalDialog({
  request,
  open,
  onOpenChange,
  onApprove,
  onDeny,
}: ToolApprovalDialogProps) {
  const t = useTranslations('tools');
  const _tc = useTranslations('common');
  const [alwaysAllow, setAlwaysAllow] = useState(false);

  if (!request) return null;

  const risk = riskConfig[request.riskLevel];
  const RiskIcon = risk.icon;

  const handleApprove = () => {
    onApprove(request.id, alwaysAllow);
    setAlwaysAllow(false);
  };

  const handleDeny = () => {
    onDeny(request.id);
    setAlwaysAllow(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            {t('approvalRequired')}
          </DialogTitle>
          <DialogDescription>
            {t('approvalDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Tool Info */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{request.toolName}</span>
              <Badge
                variant="outline"
                className={`${risk.color} ${risk.bgColor} border-0`}
              >
                <RiskIcon className="h-3 w-3 mr-1" />
                {risk.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {request.toolDescription}
            </p>
          </div>

          {/* Parameters */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">{t('parameters')}</h4>
            <div className="rounded-md bg-muted/50">
              <CodeBlock
                code={JSON.stringify(request.args, null, 2)}
                language="json"
              />
            </div>
          </div>

          {/* Always Allow Checkbox */}
          {request.riskLevel === 'low' && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="always-allow"
                checked={alwaysAllow}
                onCheckedChange={(checked) => setAlwaysAllow(checked === true)}
              />
              <label
                htmlFor="always-allow"
                className="text-sm text-muted-foreground cursor-pointer"
              >
                {t('alwaysAllowTool')}
              </label>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleDeny}>
            <XCircle className="h-4 w-4 mr-2" />
            {t('deny')}
          </Button>
          <Button onClick={handleApprove}>
            <CheckCircle className="h-4 w-4 mr-2" />
            {t('approve')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ToolApprovalDialog;
