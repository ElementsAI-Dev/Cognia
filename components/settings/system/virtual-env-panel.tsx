'use client';

/**
 * VirtualEnvPanel - Virtual environment management panel
 *
 * Features:
 * - List all virtual environments
 * - Create new environments
 * - Delete environments
 * - View/install packages
 * - Python version management
 */

import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  Plus,
  Trash2,
  RefreshCw,
  Package,
  Loader2,
  Terminal,
  Sparkles,
  Search,
  Filter,
  Copy,
  CheckSquare,
  Square,
  ArrowUpCircle,
  X,
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
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useVirtualEnv } from '@/hooks/sandbox';
import type { VirtualEnvInfo, VirtualEnvType, PackageInfo } from '@/types/system/environment';
import { ENV_PRESETS, type EnvPresetTemplate } from '@/types/system/environment';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EnvCard, RequirementsDialog } from '@/components/settings/environment';

interface CreateEnvDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (options: {
    name: string;
    type: VirtualEnvType;
    pythonVersion?: string;
    packages?: string[];
  }) => Promise<void>;
  availablePythonVersions: string[];
  isCreating: boolean;
}

function CreateEnvDialog({
  open,
  onOpenChange,
  onSubmit,
  availablePythonVersions,
  isCreating,
}: CreateEnvDialogProps) {
  const t = useTranslations('virtualEnv');
  const [name, setName] = useState('');
  const [type, setType] = useState<VirtualEnvType>('uv');
  const [pythonVersion, setPythonVersion] = useState('');
  const [packages, setPackages] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const handlePresetSelect = (preset: EnvPresetTemplate) => {
    setSelectedPreset(preset.id);
    setName(preset.id);
    if (preset.pythonVersion) {
      setPythonVersion(preset.pythonVersion);
    }
    if (preset.packages?.python) {
      setPackages(preset.packages.python.join(', '));
    }
  };

  const handleSubmit = async () => {
    const packageList = packages
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    await onSubmit({
      name,
      type,
      pythonVersion: pythonVersion || undefined,
      packages: packageList.length > 0 ? packageList : undefined,
    });

    // Reset form
    setName('');
    setPythonVersion('');
    setPackages('');
    setSelectedPreset(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {t('createEnvironment')}
          </DialogTitle>
          <DialogDescription>{t('createEnvironmentDesc')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Presets */}
          <div className="space-y-2">
            <Label className="text-xs">{t('presets')}</Label>
            <div className="grid grid-cols-3 gap-2">
              {ENV_PRESETS.filter((p) => p.type === 'python' || p.type === 'data-science').map((preset) => (
                <Button
                  key={preset.id}
                  variant={selectedPreset === preset.id ? 'default' : 'outline'}
                  size="sm"
                  className="h-auto py-2 flex-col gap-1"
                  onClick={() => handlePresetSelect(preset)}
                >
                  <span className="text-lg">{preset.icon}</span>
                  <span className="text-[10px]">{preset.name}</span>
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="env-name" className="text-xs">{t('environmentName')}</Label>
            <Input
              id="env-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-project-env"
              className="h-8 text-sm"
            />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t('environmentType')}</Label>
            <Select value={type} onValueChange={(v) => setType(v as VirtualEnvType)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="uv">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-yellow-500" />
                    <span>{t('envTypes.uvFastest')}</span>
                  </div>
                </SelectItem>
                <SelectItem value="venv">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-3.5 w-3.5 text-blue-500" />
                    <span>{t('envTypes.venvStandard')}</span>
                  </div>
                </SelectItem>
                <SelectItem value="conda">
                  <div className="flex items-center gap-2">
                    <Package className="h-3.5 w-3.5 text-green-500" />
                    <span>{t('envTypes.conda')}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Python Version */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t('pythonVersion')}</Label>
            <Select value={pythonVersion} onValueChange={setPythonVersion}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder={t('selectPythonVersion')} />
              </SelectTrigger>
              <SelectContent>
                {availablePythonVersions.map((version) => (
                  <SelectItem key={version} value={version}>
                    Python {version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Initial Packages */}
          <div className="space-y-1.5">
            <Label htmlFor="packages" className="text-xs">{t('initialPackages')}</Label>
            <Input
              id="packages"
              value={packages}
              onChange={(e) => setPackages(e.target.value)}
              placeholder="numpy, pandas, requests"
              className="h-8 text-sm"
            />
            <p className="text-[10px] text-muted-foreground">{t('packagesHint')}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!name || isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('creating')}
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                {t('create')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PackagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  envName: string;
  envPath: string;
  packages: PackageInfo[];
  isLoading: boolean;
  onInstall: (packages: string[]) => Promise<void>;
  onUninstall: (packages: string[]) => Promise<void>;
  onUpgradeAll: () => Promise<void>;
  isInstalling: boolean;
}

function PackagesDialog({
  open,
  onOpenChange,
  envName,
  packages,
  isLoading,
  onInstall,
  onUninstall,
  onUpgradeAll,
  isInstalling,
}: PackagesDialogProps) {
  const t = useTranslations('virtualEnv');
  const [newPackages, setNewPackages] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);

  const filteredPackages = packages.filter((pkg) =>
    pkg.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInstall = async () => {
    const packageList = newPackages
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (packageList.length > 0) {
      await onInstall(packageList);
      setNewPackages('');
    }
  };

  const handleUninstallSelected = async () => {
    if (selectedPackages.length > 0) {
      await onUninstall(selectedPackages);
      setSelectedPackages([]);
    }
  };

  const togglePackageSelection = (name: string) => {
    setSelectedPackages((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('packagesIn', { name: envName })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Install new packages */}
          <div className="flex gap-2">
            <Input
              value={newPackages}
              onChange={(e) => setNewPackages(e.target.value)}
              placeholder={t('enterPackages')}
              className="h-8 text-sm flex-1"
            />
            <Button
              size="sm"
              onClick={handleInstall}
              disabled={!newPackages || isInstalling}
            >
              {isInstalling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Search and actions */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchPackages')}
                className="h-8 text-sm pl-7"
              />
            </div>
            {selectedPackages.length > 0 && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleUninstallSelected}
                disabled={isInstalling}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                {selectedPackages.length}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={onUpgradeAll}
              disabled={isInstalling || packages.length === 0}
            >
              <ArrowUpCircle className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Package list */}
          <ScrollArea className="h-[300px] border rounded-md">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredPackages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                {searchQuery ? t('noMatchingPackages') : t('noPackages')}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredPackages.map((pkg) => (
                  <div
                    key={pkg.name}
                    className={`flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer ${selectedPackages.includes(pkg.name) ? 'bg-primary/10' : ''}`}
                    onClick={() => togglePackageSelection(pkg.name)}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedPackages.includes(pkg.name)}
                        onCheckedChange={() => togglePackageSelection(pkg.name)}
                        className="h-3.5 w-3.5"
                      />
                      <span className="text-sm font-mono">{pkg.name}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {pkg.version}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Requirements Import/Export Dialog
// Clone Dialog
interface CloneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceEnv: VirtualEnvInfo | null;
  onClone: (newName: string) => Promise<void>;
  isCreating: boolean;
}

function CloneDialog({ open, onOpenChange, sourceEnv, onClone, isCreating }: CloneDialogProps) {
  const t = useTranslations('virtualEnv');
  const [newName, setNewName] = useState('');

  const handleClone = async () => {
    if (newName) {
      await onClone(newName);
      setNewName('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            {t('cloneEnvironment')}
          </DialogTitle>
          <DialogDescription>
            {t('cloneEnvironmentDesc', { name: sourceEnv?.name || '' })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="clone-name" className="text-xs">{t('newEnvironmentName')}</Label>
            <Input
              id="clone-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={`${sourceEnv?.name}-copy`}
              className="h-8 text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            {t('cancel')}
          </Button>
          <Button onClick={handleClone} disabled={!newName || isCreating}>
            {isCreating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            {t('clone')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function VirtualEnvPanel() {
  const t = useTranslations('virtualEnv');
  const {
    environments,
    filteredEnvironments,
    activeEnvId,
    progress,
    isCreating,
    isInstalling,
    isDeleting,
    isExporting,
    isLoading,
    error,
    isAvailable,
    availablePythonVersions,
    selectedEnvPackages,
    filterOptions,
    selectedEnvIds,
    refreshEnvironments,
    createEnvironment,
    deleteEnvironment,
    deleteEnvironments,
    activateEnvironment,
    cloneEnvironment,
    loadPackages,
    installPackages,
    uninstallPackages,
    upgradeAllPackages,
    exportRequirements,
    importRequirements,
    refreshPythonVersions,
    setFilter,
    clearFilters,
    toggleEnvSelection,
    selectAllEnvs,
    deselectAllEnvs,
    clearError,
  } = useVirtualEnv();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPackagesDialog, setShowPackagesDialog] = useState(false);
  const [showRequirementsDialog, setShowRequirementsDialog] = useState(false);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [selectedEnvForPackages, setSelectedEnvForPackages] = useState<VirtualEnvInfo | null>(null);
  const [selectedEnvForClone, setSelectedEnvForClone] = useState<VirtualEnvInfo | null>(null);
  const [requirementsDefaultTab, setRequirementsDefaultTab] = useState<'export' | 'import'>('export');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const initializedRef = useRef(false);

  // Update search filter
  useEffect(() => {
    setFilter({ search: searchQuery });
  }, [searchQuery, setFilter]);

  // Initial load
  useEffect(() => {
    if (isAvailable && !initializedRef.current) {
      initializedRef.current = true;
      refreshEnvironments();
      refreshPythonVersions();
    }
  }, [isAvailable, refreshEnvironments, refreshPythonVersions]);

  const handleCreate = async (options: {
    name: string;
    type: VirtualEnvType;
    pythonVersion?: string;
    packages?: string[];
  }) => {
    await createEnvironment(options);
    setShowCreateDialog(false);
  };

  const handleDelete = async (id: string) => {
    await deleteEnvironment(id);
    setConfirmDelete(null);
  };

  const handleViewPackages = async (env: VirtualEnvInfo) => {
    setSelectedEnvForPackages(env);
    setShowPackagesDialog(true);
    await loadPackages(env.path);
  };

  const handleInstallPackages = async (packages: string[]) => {
    if (selectedEnvForPackages) {
      await installPackages(selectedEnvForPackages.path, packages);
    }
  };

  const handleUninstallPackages = async (packages: string[]) => {
    if (selectedEnvForPackages) {
      await uninstallPackages(selectedEnvForPackages.path, packages);
    }
  };

  const handleUpgradeAll = async () => {
    if (selectedEnvForPackages) {
      await upgradeAllPackages(selectedEnvForPackages.path);
    }
  };

  const handleClone = (env: VirtualEnvInfo) => {
    setSelectedEnvForClone(env);
    setShowCloneDialog(true);
  };

  const handleCloneSubmit = async (newName: string) => {
    if (selectedEnvForClone) {
      await cloneEnvironment(selectedEnvForClone.id, newName);
    }
  };

  const handleExportRequirements = (env: VirtualEnvInfo) => {
    setSelectedEnvForPackages(env);
    setRequirementsDefaultTab('export');
    setShowRequirementsDialog(true);
  };

  const handleImportRequirements = (env: VirtualEnvInfo) => {
    setSelectedEnvForPackages(env);
    setRequirementsDefaultTab('import');
    setShowRequirementsDialog(true);
  };

  const handleBatchDelete = async () => {
    await deleteEnvironments(selectedEnvIds);
    setConfirmBatchDelete(false);
  };

  if (!isAvailable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Terminal className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription className="text-xs">{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Package className="h-10 w-10 mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">{t('notAvailable')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Terminal className="h-5 w-5" />
                {t('title')}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                {t('description')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {selectedEnvIds.length > 0 && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setConfirmBatchDelete(true)}
                  disabled={isDeleting}
                  className="gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {selectedEnvIds.length}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={refreshEnvironments}
                disabled={isLoading}
                className="gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                {t('refresh')}
              </Button>
              <Button
                size="sm"
                onClick={() => setShowCreateDialog(true)}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                {t('new')}
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Search and Filter Bar */}
        <CardContent className="pt-0 pb-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchEnvironments')}
                className="h-8 text-sm pl-8"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5">
                  <Filter className="h-3.5 w-3.5" />
                  {t('filter')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setFilter({ types: ['uv'] })}>
                  <Sparkles className="h-3.5 w-3.5 mr-2 text-yellow-500" />
                  {t('filterUv')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter({ types: ['venv'] })}>
                  <Terminal className="h-3.5 w-3.5 mr-2 text-blue-500" />
                  {t('filterVenv')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter({ types: ['conda'] })}>
                  <Package className="h-3.5 w-3.5 mr-2 text-green-500" />
                  {t('filterConda')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={clearFilters}>
                  <X className="h-3.5 w-3.5 mr-2" />
                  {t('clearFilters')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {environments.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={selectedEnvIds.length === environments.length ? deselectAllEnvs : selectAllEnvs}
              >
                {selectedEnvIds.length === environments.length ? (
                  <CheckSquare className="h-3.5 w-3.5" />
                ) : (
                  <Square className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            <span className="text-sm">{error}</span>
            <Button size="sm" variant="outline" onClick={clearError}>
              {t('dismiss')}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Progress */}
      {progress && progress.stage !== 'done' && progress.stage !== 'error' && (
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="py-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span>{progress.message}</span>
            </div>
            <Progress value={progress.progress} className="h-1.5" />
          </CardContent>
        </Card>
      )}

      {/* Environment List */}
      <div className="space-y-2">
        {isLoading && environments.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : filteredEnvironments.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="flex flex-col items-center justify-center text-center">
                <Terminal className="h-10 w-10 mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery || filterOptions.types?.length ? t('noMatchingEnvironments') : t('noEnvironments')}
                </p>
                {!searchQuery && !filterOptions.types?.length && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => setShowCreateDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('createFirst')}
                  </Button>
                )}
                {(searchQuery || filterOptions.types?.length) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => { setSearchQuery(''); clearFilters(); }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    {t('clearFilters')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2">
            {filteredEnvironments.map((env) => (
              <EnvCard
                key={env.id}
                env={env}
                isActive={env.id === activeEnvId}
                isSelected={selectedEnvIds.includes(env.id)}
                latestPythonVersion={availablePythonVersions[0] ?? null}
                onActivate={() => activateEnvironment(env.id)}
                onDelete={() => setConfirmDelete(env.id)}
                onViewPackages={() => handleViewPackages(env)}
                onClone={() => handleClone(env)}
                onExport={() => handleExportRequirements(env)}
                onImport={() => handleImportRequirements(env)}
                onSelect={() => toggleEnvSelection(env.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <CreateEnvDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreate}
        availablePythonVersions={availablePythonVersions}
        isCreating={isCreating}
      />

      {/* Packages Dialog */}
      {selectedEnvForPackages && (
        <PackagesDialog
          open={showPackagesDialog}
          onOpenChange={setShowPackagesDialog}
          envName={selectedEnvForPackages.name}
          envPath={selectedEnvForPackages.path}
          packages={selectedEnvPackages}
          isLoading={isLoading}
          onInstall={handleInstallPackages}
          onUninstall={handleUninstallPackages}
          onUpgradeAll={handleUpgradeAll}
          isInstalling={isInstalling}
        />
      )}

      {/* Requirements Dialog */}
      {selectedEnvForPackages && (
        <RequirementsDialog
          open={showRequirementsDialog}
          onOpenChange={setShowRequirementsDialog}
          envPath={selectedEnvForPackages.path}
          defaultTab={requirementsDefaultTab}
          onExport={() => exportRequirements(selectedEnvForPackages.path)}
          onImport={(content) => importRequirements(selectedEnvForPackages.path, content)}
          isExporting={isExporting}
          isInstalling={isInstalling}
        />
      )}

      {/* Clone Dialog */}
      <CloneDialog
        open={showCloneDialog}
        onOpenChange={setShowCloneDialog}
        sourceEnv={selectedEnvForClone}
        onClone={handleCloneSubmit}
        isCreating={isCreating}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmDeleteTitle')}</DialogTitle>
            <DialogDescription>{t('confirmDeleteDesc')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={isDeleting}>
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Delete Confirmation */}
      <Dialog open={confirmBatchDelete} onOpenChange={setConfirmBatchDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmBatchDeleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('confirmBatchDeleteDesc', { count: selectedEnvIds.length })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmBatchDelete(false)} disabled={isDeleting}>
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleBatchDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {t('deleteAll')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default VirtualEnvPanel;
