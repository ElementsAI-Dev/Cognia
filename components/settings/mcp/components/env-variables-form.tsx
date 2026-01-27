'use client';

/**
 * Environment Variables Form Component
 * Reusable form for managing environment variables
 */

import { useTranslations } from 'next-intl';
import { Plus, X, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EnvVariablesFormProps {
  env: Record<string, string>;
  newEnvKey: string;
  newEnvValue: string;
  showEnvValues: Record<string, boolean>;
  onNewEnvKeyChange: (key: string) => void;
  onNewEnvValueChange: (value: string) => void;
  onAddEnv: () => void;
  onRemoveEnv: (key: string) => void;
  onToggleVisibility: (key: string) => void;
}

export function EnvVariablesForm({
  env,
  newEnvKey,
  newEnvValue,
  showEnvValues,
  onNewEnvKeyChange,
  onNewEnvValueChange,
  onAddEnv,
  onRemoveEnv,
  onToggleVisibility,
}: EnvVariablesFormProps) {
  const t = useTranslations('mcp');

  return (
    <div className="space-y-2">
      <Label>{t('envVariables')}</Label>
      <div className="flex gap-2">
        <Input
          value={newEnvKey}
          onChange={(e) => onNewEnvKeyChange(e.target.value)}
          placeholder={t('envKeyPlaceholder')}
          className="w-1/3 font-mono"
        />
        <Input
          value={newEnvValue}
          onChange={(e) => onNewEnvValueChange(e.target.value)}
          placeholder={t('envValuePlaceholder')}
          type="password"
          className="flex-1"
        />
        <Button
          variant="outline"
          size="icon"
          onClick={onAddEnv}
          type="button"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {Object.entries(env).length > 0 && (
        <div className="space-y-2 mt-2">
          {Object.entries(env).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2 text-sm">
              <code className="bg-muted px-2 py-1 rounded text-xs">
                {key}
              </code>
              <span>=</span>
              <code className="bg-muted px-2 py-1 rounded flex-1 truncate text-xs">
                {showEnvValues[key] ? value : '••••••••'}
              </code>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onToggleVisibility(key)}
                    type="button"
                  >
                    {showEnvValues[key] ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {showEnvValues[key] ? t('hidePassword') : t('showPassword')}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => onRemoveEnv(key)}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('removeEnvVar')}</TooltipContent>
              </Tooltip>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
