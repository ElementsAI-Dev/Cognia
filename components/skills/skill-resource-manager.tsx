'use client';

/**
 * Skill Resource Manager Component
 * 
 * Manages skill resources: scripts, references, and assets
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Plus,
  Trash2,
  FileCode,
  FileText,
  ImageIcon,
  Edit2,
  Eye,
  Download,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { SkillResource, SkillResourceType } from '@/types/system/skill';

const RESOURCE_TYPE_ICONS: Record<SkillResourceType, React.ReactNode> = {
  script: <FileCode className="h-4 w-4" />,
  reference: <FileText className="h-4 w-4" />,
  asset: <ImageIcon className="h-4 w-4" />,
};

const RESOURCE_TYPE_LABEL_KEYS: Record<SkillResourceType, string> = {
  script: 'script',
  reference: 'reference',
  asset: 'asset',
};

const RESOURCE_TYPE_DESC_KEYS: Record<SkillResourceType, string> = {
  script: 'scriptDesc',
  reference: 'referenceDesc',
  asset: 'assetDesc',
};

interface ResourceItemProps {
  resource: SkillResource;
  onEdit: () => void;
  onDelete: () => void;
  onPreview: () => void;
}

function ResourceItem({ resource, onEdit, onDelete, onPreview }: ResourceItemProps) {
  const t = useTranslations('skills');
  const [expanded, setExpanded] = useState(false);
  const hasContent = resource.content && resource.content.length > 0;

  return (
    <Card className="mb-2">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {RESOURCE_TYPE_ICONS[resource.type]}
                <span className="font-medium text-sm">{resource.name}</span>
                <Badge variant="outline" className="text-xs">
                  {t(RESOURCE_TYPE_LABEL_KEYS[resource.type])}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {resource.size !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(resource.size)}
                  </span>
                )}
                {expanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-3 px-3">
            <div className="text-xs text-muted-foreground mb-2">
              <p><strong>{t('path')}:</strong> {resource.path}</p>
              {resource.mimeType && (
                <p><strong>{t('type')}:</strong> {resource.mimeType}</p>
              )}
            </div>
            {hasContent && resource.type !== 'asset' && (
              <div className="bg-muted rounded p-2 mb-2 max-h-32 overflow-auto">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {resource.content?.slice(0, 500)}
                  {resource.content && resource.content.length > 500 && '...'}
                </pre>
              </div>
            )}
            <div className="flex gap-2">
              {hasContent && (
                <Button variant="outline" size="sm" onClick={onPreview}>
                  <Eye className="h-3 w-3 mr-1" />
                  {t('preview')}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit2 className="h-3 w-3 mr-1" />
                {t('edit')}
              </Button>
              <Button variant="outline" size="sm" onClick={onDelete}>
                <Trash2 className="h-3 w-3 mr-1" />
                {t('delete')}
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

interface AddResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (resource: Omit<SkillResource, 'size' | 'mimeType'>) => void;
  editResource?: SkillResource;
}

function AddResourceDialog({ open, onOpenChange, onAdd, editResource }: AddResourceDialogProps) {
  const t = useTranslations('skills');
  const [type, setType] = useState<SkillResourceType>(editResource?.type || 'reference');
  const [name, setName] = useState(editResource?.name || '');
  const [path, setPath] = useState(editResource?.path || '');
  const [content, setContent] = useState(editResource?.content || '');

  const handleSubmit = () => {
    if (!name || !path) return;
    
    onAdd({
      type,
      name,
      path: path.startsWith('/') ? path : `/${path}`,
      content: type !== 'asset' ? content : undefined,
    });
    
    // Reset form
    setType('reference');
    setName('');
    setPath('');
    setContent('');
    onOpenChange(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setName(file.name);
    setPath(`resources/${file.name}`);

    if (type !== 'asset') {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setContent(ev.target?.result as string || '');
      };
      reader.readAsText(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editResource ? t('editResource') : t('addResource')}</DialogTitle>
          <DialogDescription>
            {t('addResourcesHint')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('resourceType')}</Label>
            <Select value={type} onValueChange={(v) => setType(v as SkillResourceType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RESOURCE_TYPE_LABEL_KEYS).map(([key, labelKey]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      {RESOURCE_TYPE_ICONS[key as SkillResourceType]}
                      <div>
                        <div>{t(labelKey)}</div>
                        <div className="text-xs text-muted-foreground">
                          {t(RESOURCE_TYPE_DESC_KEYS[key as SkillResourceType])}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="resource-name">{t('name')}</Label>
              <Input
                id="resource-name"
                placeholder={t('resourceNamePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resource-path">{t('path')}</Label>
              <Input
                id="resource-path"
                placeholder={t('resourcePathPlaceholder')}
                value={path}
                onChange={(e) => setPath(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('uploadFile')}</Label>
            <Input
              type="file"
              onChange={handleFileUpload}
              className="cursor-pointer"
            />
          </div>

          {type !== 'asset' && (
            <div className="space-y-2">
              <Label htmlFor="resource-content">{t('content')}</Label>
              <Textarea
                id="resource-content"
                placeholder={t('resourceContentPlaceholder')}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!name || !path}>
            {editResource ? t('update') : t('add')} {t('resourceWord')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: SkillResource | null;
}

function PreviewDialog({ open, onOpenChange, resource }: PreviewDialogProps) {
  const t = useTranslations('skills');
  if (!resource) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {RESOURCE_TYPE_ICONS[resource.type]}
            {resource.name}
          </DialogTitle>
          <DialogDescription>
            {resource.path} • {formatFileSize(resource.size || 0)}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted rounded-lg p-4 overflow-auto max-h-[60vh]">
          <pre className="text-sm font-mono whitespace-pre-wrap">
            {resource.content || t('noContentAvailable')}
          </pre>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('close')}
          </Button>
          <Button
            onClick={() => {
              const blob = new Blob([resource.content || ''], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = resource.name;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            {t('download')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface SkillResourceManagerProps {
  resources: SkillResource[];
  onAddResource: (resource: Omit<SkillResource, 'size' | 'mimeType'>) => void;
  onUpdateResource?: (path: string, content: string) => void;
  onRemoveResource: (path: string) => void;
  readOnly?: boolean;
}

export function SkillResourceManager({
  resources,
  onAddResource,
  onUpdateResource: _onUpdateResource,
  onRemoveResource,
  readOnly = false,
}: SkillResourceManagerProps) {
  const t = useTranslations('skills');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editResource, setEditResource] = useState<SkillResource | undefined>();
  const [previewResource, setPreviewResource] = useState<SkillResource | null>(null);

  const groupedResources = resources.reduce((acc, resource) => {
    if (!acc[resource.type]) {
      acc[resource.type] = [];
    }
    acc[resource.type].push(resource);
    return acc;
  }, {} as Record<SkillResourceType, SkillResource[]>);

  const handleEdit = useCallback((resource: SkillResource) => {
    setEditResource(resource);
    setShowAddDialog(true);
  }, []);

  const handleDelete = useCallback((path: string) => {
    if (confirm(t('confirmDeleteResource'))) {
      onRemoveResource(path);
    }
  }, [onRemoveResource, t]);

  const handleAddOrUpdate = useCallback((resource: Omit<SkillResource, 'size' | 'mimeType'>) => {
    if (editResource) {
      // If editing, first remove old, then add new
      onRemoveResource(editResource.path);
    }
    onAddResource(resource);
    setEditResource(undefined);
  }, [editResource, onAddResource, onRemoveResource]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">{t('resources')}</h3>
          <p className="text-xs text-muted-foreground">
            {t('resourcesBundled')}
          </p>
        </div>
        {!readOnly && (
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {t('addResource')}
          </Button>
        )}
      </div>

      {resources.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('noResourcesAttached')}</p>
            <p className="text-xs">{t('addResourcesHint')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {(['script', 'reference', 'asset'] as SkillResourceType[]).map((type) => {
            const typeResources = groupedResources[type];
            if (!typeResources || typeResources.length === 0) return null;

            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-2">
                  {RESOURCE_TYPE_ICONS[type]}
                  <span className="text-sm font-medium">{t(RESOURCE_TYPE_LABEL_KEYS[type])}s</span>
                  <Badge variant="secondary" className="text-xs">
                    {typeResources.length}
                  </Badge>
                </div>
                {typeResources.map((resource) => (
                  <ResourceItem
                    key={resource.path}
                    resource={resource}
                    onEdit={() => handleEdit(resource)}
                    onDelete={() => handleDelete(resource.path)}
                    onPreview={() => setPreviewResource(resource)}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}

      <AddResourceDialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) setEditResource(undefined);
        }}
        onAdd={handleAddOrUpdate}
        editResource={editResource}
      />

      <PreviewDialog
        open={!!previewResource}
        onOpenChange={(open) => !open && setPreviewResource(null)}
        resource={previewResource}
      />
    </div>
  );
}

export default SkillResourceManager;
