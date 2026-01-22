'use client';

/**
 * MCP Server Dialog
 *
 * Dialog for adding/editing MCP server configurations
 */

import { useTranslations } from 'next-intl';
import { Plus, X } from 'lucide-react';
import { EnvVariablesForm } from './components';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMcpServerForm } from '@/hooks/mcp';
import type { McpServerState, McpConnectionType } from '@/types/mcp';

interface McpServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingServer: McpServerState | null;
  onClose: () => void;
}

export function McpServerDialog({
  open,
  onOpenChange,
  editingServer,
  onClose,
}: McpServerDialogProps) {
  const t = useTranslations('mcp');
  const tCommon = useTranslations('common');

  const {
    state,
    setName,
    setCommand,
    setConnectionType,
    setUrl,
    setEnabled,
    setAutoStart,
    setNewArg,
    setNewEnvKey,
    setNewEnvValue,
    addArg,
    removeArg,
    addEnv,
    removeEnv,
    toggleEnvVisibility,
    handleSave,
  } = useMcpServerForm({
    editingServer,
    onSuccess: onClose,
  });

  const {
    data: { name, command, args, env, connectionType, url, enabled, autoStart },
    newArg,
    newEnvKey,
    newEnvValue,
    showEnvValues,
    saving,
    isValid,
  } = state;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-150 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingServer ? t('editServer') : t('addServer')}</DialogTitle>
          <DialogDescription>{t('configureSettings')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Server Name */}
          <div className="space-y-2">
            <Label htmlFor="server-name">{t('serverName')}</Label>
            <Input
              id="server-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('serverNamePlaceholder')}
            />
          </div>

          {/* Connection Type */}
          <div className="space-y-2">
            <Label>{t('connectionType')}</Label>
            <Select
              value={connectionType}
              onValueChange={(value: McpConnectionType) => setConnectionType(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stdio">{t('stdio')}</SelectItem>
                <SelectItem value="sse">{t('sse')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {connectionType === 'stdio' ? (
            <>
              {/* Command */}
              <div className="space-y-2">
                <Label htmlFor="command">{t('command')}</Label>
                <Input
                  id="command"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder={t('commandPlaceholder')}
                />
              </div>

              {/* Arguments */}
              <div className="space-y-2">
                <Label>{t('arguments')}</Label>
                <div className="flex gap-2">
                  <Input
                    value={newArg}
                    onChange={(e) => setNewArg(e.target.value)}
                    placeholder={t('addArgument')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addArg();
                      }
                    }}
                  />
                  <Button variant="outline" size="icon" onClick={addArg} type="button">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {args.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {args.map((arg, index) => (
                      <Badge key={index} variant="secondary" className="pr-1">
                        <span className="font-mono text-xs">{arg}</span>
                        <button
                          onClick={() => removeArg(index)}
                          className="ml-1 hover:text-destructive"
                          type="button"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* SSE URL */
            <div className="space-y-2">
              <Label htmlFor="sse-url">{t('serverUrl')}</Label>
              <Input
                id="sse-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t('serverUrlPlaceholder')}
              />
            </div>
          )}

          {/* Environment Variables */}
          <EnvVariablesForm
            env={env}
            newEnvKey={newEnvKey}
            newEnvValue={newEnvValue}
            showEnvValues={showEnvValues}
            onNewEnvKeyChange={setNewEnvKey}
            onNewEnvValueChange={setNewEnvValue}
            onAddEnv={addEnv}
            onRemoveEnv={removeEnv}
            onToggleVisibility={toggleEnvVisibility}
          />

          {/* Options */}
          <div className="flex items-center justify-between pt-2">
            <div className="space-y-0.5">
              <Label htmlFor="enabled">{t('enabled')}</Label>
              <p className="text-xs text-muted-foreground">{t('enabledHint')}</p>
            </div>
            <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-start">{t('autoStart')}</Label>
              <p className="text-xs text-muted-foreground">{t('autoStartHint')}</p>
            </div>
            <Switch id="auto-start" checked={autoStart} onCheckedChange={setAutoStart} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!isValid || saving}>
            {saving ? tCommon('loading') : editingServer ? tCommon('save') : tCommon('add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
