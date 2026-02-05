'use client';

/**
 * EnvVarsPanel - Environment Variables management panel
 *
 * Features:
 * - List all environment variables with category grouping
 * - Search and filter by category
 * - Add/Edit/Delete variables
 * - Import/Export .env files
 * - Secret value masking
 */

import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  Search,
  Filter,
  Key,
  Database,
  Settings,
  MoreHorizontal,
  Upload,
  Download,
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertCircle,
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
import {
  Empty,
  EmptyMedia,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import { LoadingSpinner } from '@/components/ui/loading-states';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useEnvVars } from '@/hooks/system/use-env-vars';
import type { EnvVariable, EnvVarCategory } from '@/types/system/environment';

const CATEGORY_INFO: Record<EnvVarCategory, { icon: typeof Key; label: string; color: string }> = {
  api_keys: { icon: Key, label: 'API Keys', color: 'text-amber-500' },
  database: { icon: Database, label: 'Database', color: 'text-blue-500' },
  config: { icon: Settings, label: 'Config', color: 'text-green-500' },
  other: { icon: MoreHorizontal, label: 'Other', color: 'text-muted-foreground' },
};

interface EnvVarCardProps {
  envVar: EnvVariable;
  onEdit: () => void;
  onDelete: () => void;
}

function EnvVarCard({ envVar, onEdit, onDelete }: EnvVarCardProps) {
  const t = useTranslations('envVars');
  const [showValue, setShowValue] = useState(false);
  const [copied, setCopied] = useState(false);

  const categoryInfo = CATEGORY_INFO[envVar.category];
  const CategoryIcon = categoryInfo.icon;

  const handleCopy = () => {
    navigator.clipboard.writeText(envVar.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayValue = envVar.isSecret && !showValue
    ? '••••••••••••'
    : envVar.value;

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
      data-testid="env-var-card"
    >
      <div className={`p-2 rounded-md bg-muted ${categoryInfo.color}`}>
        <CategoryIcon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium truncate">{envVar.key}</span>
          {envVar.isSecret && (
            <Badge variant="outline" className="text-[10px] h-4">
              {t('secret')}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="font-mono text-xs text-muted-foreground truncate max-w-[300px]">
            {displayValue}
          </span>
          {envVar.isSecret && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
              onClick={() => setShowValue(!showValue)}
            >
              {showValue ? (
                <EyeOff className="h-3 w-3" />
              ) : (
                <Eye className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{copied ? t('copied') : t('copyValue')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onEdit}>
                <Settings className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('edit')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('delete')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

interface AddEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  envVar: EnvVariable | null;
  onSubmit: (key: string, value: string, category: EnvVarCategory, isSecret: boolean) => Promise<void>;
  isLoading: boolean;
}

function AddEditDialog({ open, onOpenChange, envVar, onSubmit, isLoading }: AddEditDialogProps) {
  const t = useTranslations('envVars');
  const [key, setKey] = useState(envVar?.key ?? '');
  const [value, setValue] = useState(envVar?.value ?? '');
  const [category, setCategory] = useState<EnvVarCategory>(envVar?.category ?? 'other');
  const [isSecret, setIsSecret] = useState(envVar?.isSecret ?? false);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Reset form when opening
      setKey(envVar?.key ?? '');
      setValue(envVar?.value ?? '');
      setCategory(envVar?.category ?? 'other');
      setIsSecret(envVar?.isSecret ?? false);
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async () => {
    await onSubmit(key, value, category, isSecret);
    onOpenChange(false);
  };

  const isEdit = envVar !== null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('editVariable') : t('addVariable')}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t('editVariableDesc') : t('addVariableDesc')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="key">{t('variableName')}</Label>
            <Input
              id="key"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
              placeholder="MY_VARIABLE"
              className="font-mono"
              disabled={isEdit}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="value">{t('variableValue')}</Label>
            <Input
              id="value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t('valuePlaceholder')}
              type={isSecret ? 'password' : 'text'}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">{t('category')}</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as EnvVarCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_INFO).map(([cat, info]) => {
                  const Icon = info.icon;
                  return (
                    <SelectItem key={cat} value={cat}>
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${info.color}`} />
                        {info.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isSecret"
              checked={isSecret}
              onCheckedChange={(checked) => setIsSecret(checked === true)}
            />
            <Label htmlFor="isSecret" className="text-sm font-normal">
              {t('markAsSecret')}
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!key || !value || isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? t('save') : t('add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ImportExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (content: string, overwrite: boolean) => Promise<void>;
  onExport: () => Promise<string>;
  isLoading: boolean;
}

function ImportExportDialog({ open, onOpenChange, onImport, onExport, isLoading }: ImportExportDialogProps) {
  const t = useTranslations('envVars');
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [importContent, setImportContent] = useState('');
  const [exportContent, setExportContent] = useState('');
  const [overwrite, setOverwrite] = useState(false);

  const handleImport = async () => {
    await onImport(importContent, overwrite);
    setImportContent('');
    onOpenChange(false);
  };

  const handleExport = async () => {
    const content = await onExport();
    setExportContent(content);
  };

  const handleCopyExport = () => {
    navigator.clipboard.writeText(exportContent);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('importExport')}</DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'import' | 'export')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import" className="gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              {t('import')}
            </TabsTrigger>
            <TabsTrigger value="export" className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              {t('export')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="import" className="space-y-3">
            <Textarea
              value={importContent}
              onChange={(e) => setImportContent(e.target.value)}
              placeholder={t('pasteEnvFile')}
              className="h-[200px] font-mono text-xs"
            />
            <div className="flex items-center space-x-2">
              <Checkbox
                id="overwrite"
                checked={overwrite}
                onCheckedChange={(checked) => setOverwrite(checked === true)}
              />
              <Label htmlFor="overwrite" className="text-sm font-normal">
                {t('overwriteExisting')}
              </Label>
            </div>
            <Button onClick={handleImport} disabled={!importContent || isLoading} className="w-full">
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {t('importVariables')}
            </Button>
          </TabsContent>
          <TabsContent value="export" className="space-y-3">
            <Button onClick={handleExport} disabled={isLoading} className="w-full">
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {t('generateEnvFile')}
            </Button>
            {exportContent && (
              <>
                <Textarea
                  value={exportContent}
                  readOnly
                  className="h-[200px] font-mono text-xs"
                />
                <Button variant="outline" onClick={handleCopyExport} className="w-full">
                  <Copy className="h-4 w-4 mr-2" />
                  {t('copyToClipboard')}
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EnvVarsPanel() {
  const t = useTranslations('envVars');
  const {
    filteredEnvVars,
    isLoading,
    error,
    isAvailable,
    searchQuery,
    categoryFilter,
    refreshEnvVars,
    addEnvVar,
    updateEnvVar,
    removeEnvVar,
    importFromFile,
    exportToFile,
    setSearchQuery,
    setCategoryFilter,
    clearFilters,
    clearError,
  } = useEnvVars();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [editingEnvVar, setEditingEnvVar] = useState<EnvVariable | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (isAvailable && !initializedRef.current) {
      initializedRef.current = true;
      refreshEnvVars();
    }
  }, [isAvailable, refreshEnvVars]);

  const handleAddOrEdit = async (
    key: string,
    value: string,
    category: EnvVarCategory,
    isSecret: boolean
  ) => {
    setIsSubmitting(true);
    try {
      if (editingEnvVar) {
        await updateEnvVar(key, value, category, isSecret);
      } else {
        await addEnvVar(key, value, category, isSecret);
      }
      setEditingEnvVar(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (key: string) => {
    await removeEnvVar(key);
    setConfirmDelete(null);
  };

  const handleImport = async (content: string, overwrite: boolean) => {
    setIsSubmitting(true);
    try {
      await importFromFile(content, { overwrite, autoDetectCategory: true, markSecrets: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = async () => {
    return exportToFile();
  };

  // Group env vars by category
  const groupedEnvVars = filteredEnvVars.reduce(
    (acc, envVar) => {
      if (!acc[envVar.category]) {
        acc[envVar.category] = [];
      }
      acc[envVar.category].push(envVar);
      return acc;
    },
    {} as Record<EnvVarCategory, EnvVariable[]>
  );

  if (!isAvailable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>{t('notAvailable')}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Key className="h-5 w-5" />
              {t('title')}
            </CardTitle>
            <CardDescription className="mt-1">{t('description')}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setShowImportExport(true)}
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              {t('importExport')}
            </Button>
            <Button size="sm" className="h-8" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              {t('add')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              {error}
              <Button variant="ghost" size="sm" onClick={clearError}>
                {t('dismiss')}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Search and Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                {t('filter')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setCategoryFilter('all')}>
                <MoreHorizontal className="h-3.5 w-3.5 mr-2" />
                {t('allCategories')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {Object.entries(CATEGORY_INFO).map(([cat, info]) => {
                const Icon = info.icon;
                return (
                  <DropdownMenuItem
                    key={cat}
                    onClick={() => setCategoryFilter(cat as EnvVarCategory)}
                  >
                    <Icon className={`h-3.5 w-3.5 mr-2 ${info.color}`} />
                    {info.label}
                  </DropdownMenuItem>
                );
              })}
              {categoryFilter !== 'all' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={clearFilters}>
                    <X className="h-3.5 w-3.5 mr-2" />
                    {t('clearFilters')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => refreshEnvVars()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Category filter badge */}
        {categoryFilter !== 'all' && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              {CATEGORY_INFO[categoryFilter].label}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1"
                onClick={() => setCategoryFilter('all')}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          </div>
        )}

        {/* Environment Variables List */}
        <ScrollArea className="h-[400px]">
          {isLoading && filteredEnvVars.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredEnvVars.length === 0 ? (
            <Empty className="border-dashed">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Key className="h-5 w-5" />
                </EmptyMedia>
                <EmptyTitle>{t('noVariablesTitle')}</EmptyTitle>
                <EmptyDescription>{t('noVariables')}</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddDialog(true)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  {t('addFirst')}
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedEnvVars).map(([category, vars]) => {
                const info = CATEGORY_INFO[category as EnvVarCategory];
                const Icon = info.icon;
                return (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`h-4 w-4 ${info.color}`} />
                      <span className="text-sm font-medium">{info.label}</span>
                      <Badge variant="secondary" className="text-[10px] h-4">
                        {vars.length}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {vars.map((envVar) => (
                        <EnvVarCard
                          key={envVar.key}
                          envVar={envVar}
                          onEdit={() => {
                            setEditingEnvVar(envVar);
                            setShowAddDialog(true);
                          }}
                          onDelete={() => setConfirmDelete(envVar.key)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {/* Add/Edit Dialog */}
      <AddEditDialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) setEditingEnvVar(null);
        }}
        envVar={editingEnvVar}
        onSubmit={handleAddOrEdit}
        isLoading={isSubmitting}
      />

      {/* Import/Export Dialog */}
      <ImportExportDialog
        open={showImportExport}
        onOpenChange={setShowImportExport}
        onImport={handleImport}
        onExport={handleExport}
        isLoading={isSubmitting}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmDeleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('confirmDeleteDesc', { key: confirmDelete ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
            >
              {t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
