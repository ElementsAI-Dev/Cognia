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
import type { SkillResource, SkillResourceType } from '@/types/skill';

const RESOURCE_TYPE_ICONS: Record<SkillResourceType, React.ReactNode> = {
  script: <FileCode className="h-4 w-4" />,
  reference: <FileText className="h-4 w-4" />,
  asset: <ImageIcon className="h-4 w-4" />,
};

const RESOURCE_TYPE_LABELS: Record<SkillResourceType, string> = {
  script: 'Script',
  reference: 'Reference',
  asset: 'Asset',
};

const RESOURCE_TYPE_DESCRIPTIONS: Record<SkillResourceType, string> = {
  script: 'Executable code files (Python, JavaScript, Shell scripts)',
  reference: 'Documentation, guides, and text-based reference materials',
  asset: 'Images, PDFs, data files, and other binary assets',
};

interface ResourceItemProps {
  resource: SkillResource;
  onEdit: () => void;
  onDelete: () => void;
  onPreview: () => void;
}

function ResourceItem({ resource, onEdit, onDelete, onPreview }: ResourceItemProps) {
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
                  {RESOURCE_TYPE_LABELS[resource.type]}
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
              <p><strong>Path:</strong> {resource.path}</p>
              {resource.mimeType && (
                <p><strong>Type:</strong> {resource.mimeType}</p>
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
                  Preview
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit2 className="h-3 w-3 mr-1" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={onDelete}>
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
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
          <DialogTitle>{editResource ? 'Edit Resource' : 'Add Resource'}</DialogTitle>
          <DialogDescription>
            Add a resource file to bundle with this skill
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Resource Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as SkillResourceType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RESOURCE_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      {RESOURCE_TYPE_ICONS[key as SkillResourceType]}
                      <div>
                        <div>{label}</div>
                        <div className="text-xs text-muted-foreground">
                          {RESOURCE_TYPE_DESCRIPTIONS[key as SkillResourceType]}
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
              <Label htmlFor="resource-name">Name</Label>
              <Input
                id="resource-name"
                placeholder={t('resourceNamePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resource-path">Path</Label>
              <Input
                id="resource-path"
                placeholder={t('resourcePathPlaceholder')}
                value={path}
                onChange={(e) => setPath(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Upload File (optional)</Label>
            <Input
              type="file"
              onChange={handleFileUpload}
              className="cursor-pointer"
            />
          </div>

          {type !== 'asset' && (
            <div className="space-y-2">
              <Label htmlFor="resource-content">Content</Label>
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
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name || !path}>
            {editResource ? 'Update' : 'Add'} Resource
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
            {resource.content || 'No content available'}
          </pre>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
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
            Download
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
    if (confirm('Are you sure you want to delete this resource?')) {
      onRemoveResource(path);
    }
  }, [onRemoveResource]);

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
          <h3 className="text-sm font-medium">Resources</h3>
          <p className="text-xs text-muted-foreground">
            Scripts, references, and assets bundled with this skill
          </p>
        </div>
        {!readOnly && (
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Resource
          </Button>
        )}
      </div>

      {resources.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No resources attached</p>
            <p className="text-xs">Add scripts, references, or assets to bundle with this skill</p>
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
                  <span className="text-sm font-medium">{RESOURCE_TYPE_LABELS[type]}s</span>
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
