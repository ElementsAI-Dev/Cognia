'use client';

/**
 * MCP Install Wizard
 *
 * Quick installation wizard for common MCP servers
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Check, AlertCircle, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMcpStore } from '@/stores/mcp-store';
import { MCP_SERVER_TEMPLATES, createDefaultServerConfig } from '@/types/mcp';

interface McpInstallWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type WizardStep = 'select' | 'configure' | 'installing' | 'done';

export function McpInstallWizard({ open, onOpenChange }: McpInstallWizardProps) {
  const t = useTranslations('mcpInstall');
  const tCommon = useTranslations('common');
  const { addServer, connectServer } = useMcpStore();

  const [step, setStep] = useState<WizardStep>('select');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [envValues, setEnvValues] = useState<Record<string, string>>({});
  const [customArgs, setCustomArgs] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [installSuccess, setInstallSuccess] = useState(false);

  const template = selectedTemplate
    ? MCP_SERVER_TEMPLATES.find((t) => t.id === selectedTemplate)
    : null;

  const resetWizard = () => {
    setStep('select');
    setSelectedTemplate(null);
    setEnvValues({});
    setCustomArgs('');
    setError(null);
    setInstallSuccess(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(resetWizard, 200);
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const tmpl = MCP_SERVER_TEMPLATES.find((t) => t.id === templateId);
    if (tmpl?.envKeys) {
      const initialEnv: Record<string, string> = {};
      tmpl.envKeys.forEach((key) => {
        initialEnv[key] = '';
      });
      setEnvValues(initialEnv);
    }
    setStep('configure');
  };

  const handleInstall = async () => {
    if (!template) return;

    setStep('installing');
    setError(null);

    try {
      // Build the config
      const config = createDefaultServerConfig();
      config.name = template.name;
      config.command = template.command;
      config.args = [...template.args];

      // Add custom args if provided
      if (customArgs.trim()) {
        config.args.push(...customArgs.trim().split(/\s+/));
      }

      // Add environment variables
      Object.entries(envValues).forEach(([key, value]) => {
        if (value.trim()) {
          config.env[key] = value.trim();
        }
      });

      // Add the server
      await addServer(template.id, config);

      // Try to connect
      try {
        await connectServer(template.id);
      } catch {
        // Connection failure is not fatal, server is still added
        console.warn('Initial connection failed, server added but not connected');
      }

      setInstallSuccess(true);
      setStep('done');
    } catch (err) {
      setError(String(err));
      setStep('configure');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            {step === 'select' && t('quickInstall')}
            {step === 'configure' && t('configure', { name: template?.name })}
            {step === 'installing' && t('installing')}
            {step === 'done' && t('installComplete')}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' && t('quickInstallDesc')}
            {step === 'configure' && t('configureDesc')}
            {step === 'installing' && t('settingUp')}
            {step === 'done' && t('addedSuccessfully')}
          </DialogDescription>
        </DialogHeader>

        {/* Step: Select Template */}
        {step === 'select' && (
          <ScrollArea className="h-[400px] pr-4">
            <div className="grid gap-3">
              {MCP_SERVER_TEMPLATES.map((tmpl) => (
                <Card
                  key={tmpl.id}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handleSelectTemplate(tmpl.id)}
                >
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      {tmpl.name}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {tmpl.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Step: Configure */}
        {step === 'configure' && template && (
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>{t('command')}</Label>
              <code className="block bg-muted p-2 rounded text-sm">
                {template.command} {template.args.join(' ')}
              </code>
            </div>

            {/* Environment Variables */}
            {template.envKeys && template.envKeys.length > 0 && (
              <div className="space-y-3">
                <Label>{t('requiredEnvVars')}</Label>
                {template.envKeys.map((key) => (
                  <div key={key} className="space-y-1">
                    <Label htmlFor={key} className="text-xs font-mono">
                      {key}
                    </Label>
                    <Input
                      id={key}
                      type="password"
                      value={envValues[key] || ''}
                      onChange={(e) =>
                        setEnvValues({ ...envValues, [key]: e.target.value })
                      }
                      placeholder={t('enterEnvVar', { key })}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Custom Arguments */}
            <div className="space-y-2">
              <Label htmlFor="custom-args">{t('additionalArgs')}</Label>
              <Input
                id="custom-args"
                value={customArgs}
                onChange={(e) => setCustomArgs(e.target.value)}
                placeholder={t('additionalArgsPlaceholder')}
              />
              <p className="text-xs text-muted-foreground">
                {t('additionalArgsHint')}
              </p>
            </div>
          </div>
        )}

        {/* Step: Installing */}
        {step === 'installing' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">
              {t('settingUpServer', { name: template?.name })}
            </p>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
              <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm font-medium mb-2">
              {t('serverAdded', { name: template?.name })}
            </p>
            <p className="text-xs text-muted-foreground text-center">
              {t('serverReady')}
              {installSuccess && ` ${t('autoConnected')}`}
            </p>
          </div>
        )}

        <DialogFooter>
          {step === 'select' && (
            <Button variant="outline" onClick={handleClose}>
              {tCommon('cancel')}
            </Button>
          )}
          {step === 'configure' && (
            <>
              <Button variant="outline" onClick={() => setStep('select')}>
                {tCommon('back')}
              </Button>
              <Button onClick={handleInstall}>{t('install')}</Button>
            </>
          )}
          {step === 'done' && <Button onClick={handleClose}>{t('done')}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
