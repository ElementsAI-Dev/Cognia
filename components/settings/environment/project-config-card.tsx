'use client';

/**
 * ProjectConfigCard - Project environment configuration card
 * Extracted from components/settings/system/project-env-config.tsx
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  FolderOpen,
  Plus,
  Trash2,
  Terminal,
  Package,
  Variable,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ProjectEnvConfig, VirtualEnvInfo } from '@/types/system/environment';
import { EnvVarRow } from './env-var-row';

export interface ProjectConfigCardProps {
  config: ProjectEnvConfig;
  environments: VirtualEnvInfo[];
  onUpdate: (updates: Partial<ProjectEnvConfig>) => void;
  onDelete: () => void;
}

export function ProjectConfigCard({
  config,
  environments,
  onUpdate,
  onDelete,
}: ProjectConfigCardProps) {
  const t = useTranslations('projectEnv');
  const [showEnvVarDialog, setShowEnvVarDialog] = useState(false);
  const [newVarName, setNewVarName] = useState('');
  const [newVarValue, setNewVarValue] = useState('');

  const linkedEnv = environments.find((e) => e.id === config.virtualEnvId);

  const handleAddEnvVar = () => {
    if (newVarName && newVarValue) {
      onUpdate({
        envVars: {
          ...config.envVars,
          [newVarName]: newVarValue,
        },
      });
      setNewVarName('');
      setNewVarValue('');
      setShowEnvVarDialog(false);
    }
  };

  const handleUpdateEnvVar = (name: string, value: string) => {
    onUpdate({
      envVars: {
        ...config.envVars,
        [name]: value,
      },
    });
  };

  const handleDeleteEnvVar = (name: string) => {
    const { [name]: _, ...rest } = config.envVars;
    onUpdate({ envVars: rest });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">{config.projectName}</CardTitle>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('deleteProject')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription className="text-[10px] truncate">
          {config.projectPath}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Accordion type="single" collapsible className="w-full">
          {/* Environment Settings */}
          <AccordionItem value="environment">
            <AccordionTrigger className="text-xs py-2">
              <div className="flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5" />
                {t('environmentSettings')}
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              {/* Virtual Environment */}
              <div className="space-y-1.5">
                <Label className="text-[10px]">{t('virtualEnvironment')}</Label>
                <Select
                  value={config.virtualEnvId || ''}
                  onValueChange={(value) =>
                    onUpdate({
                      virtualEnvId: value || null,
                      virtualEnvPath: environments.find((e) => e.id === value)?.path || null,
                    })
                  }
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder={t('selectEnvironment')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t('none')}</SelectItem>
                    {environments.map((env) => (
                      <SelectItem key={env.id} value={env.id}>
                        <div className="flex items-center gap-2">
                          <Package className="h-3 w-3" />
                          <span>{env.name}</span>
                          {env.pythonVersion && (
                            <Badge variant="outline" className="text-[9px] ml-1">
                              {env.pythonVersion}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {linkedEnv && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {linkedEnv.path}
                  </p>
                )}
              </div>

              {/* Auto Activate */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-[10px]">{t('autoActivate')}</Label>
                  <p className="text-[9px] text-muted-foreground">
                    {t('autoActivateDesc')}
                  </p>
                </div>
                <Switch
                  checked={config.autoActivate}
                  onCheckedChange={(checked) => onUpdate({ autoActivate: checked })}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Environment Variables */}
          <AccordionItem value="envvars">
            <AccordionTrigger className="text-xs py-2">
              <div className="flex items-center gap-2">
                <Variable className="h-3.5 w-3.5" />
                {t('environmentVariables')}
                <Badge variant="secondary" className="text-[9px] ml-1">
                  {Object.keys(config.envVars).length}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              {Object.keys(config.envVars).length > 0 ? (
                <ScrollArea className="h-[150px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px] h-7">{t('name')}</TableHead>
                        <TableHead className="text-[10px] h-7">{t('value')}</TableHead>
                        <TableHead className="text-[10px] h-7 w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(config.envVars).map(([name, value]) => (
                        <EnvVarRow
                          key={name}
                          name={name}
                          value={value}
                          onUpdate={handleUpdateEnvVar}
                          onDelete={() => handleDeleteEnvVar(name)}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <p className="text-[10px] text-muted-foreground text-center py-4">
                  {t('noEnvVars')}
                </p>
              )}
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-2 h-7 text-xs"
                onClick={() => setShowEnvVarDialog(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                {t('addVariable')}
              </Button>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Add Env Var Dialog */}
        <Dialog open={showEnvVarDialog} onOpenChange={setShowEnvVarDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-sm">{t('addEnvVariable')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">{t('variableName')}</Label>
                <Input
                  value={newVarName}
                  onChange={(e) => setNewVarName(e.target.value.toUpperCase())}
                  placeholder="MY_VARIABLE"
                  className="h-8 text-sm font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('variableValue')}</Label>
                <Input
                  value={newVarValue}
                  onChange={(e) => setNewVarValue(e.target.value)}
                  placeholder="value"
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setShowEnvVarDialog(false)}>
                {t('cancel')}
              </Button>
              <Button size="sm" onClick={handleAddEnvVar} disabled={!newVarName || !newVarValue}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                {t('add')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default ProjectConfigCard;
