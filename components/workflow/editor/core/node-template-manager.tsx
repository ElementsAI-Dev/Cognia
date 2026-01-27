'use client';

/**
 * NodeTemplateManager - Manage and use node templates
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Trash2,
  Copy,
  FileCode,
  Bookmark,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkflowEditorStore } from '@/stores/workflow';
import { useShallow } from 'zustand/react/shallow';
import { NODE_TYPE_COLORS } from '@/types/workflow/workflow-editor';

interface NodeTemplatePanelProps {
  onAddTemplate?: (templateId: string) => void;
  className?: string;
}

export function NodeTemplatePanel({ onAddTemplate, className }: NodeTemplatePanelProps) {
  const t = useTranslations('workflowEditor');
  const tCommon = useTranslations('common');
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');

  const { nodeTemplates, deleteNodeTemplate, selectedNodes, saveNodeAsTemplate } = useWorkflowEditorStore(
    useShallow((state) => ({
      nodeTemplates: state.nodeTemplates,
      deleteNodeTemplate: state.deleteNodeTemplate,
      selectedNodes: state.selectedNodes,
      saveNodeAsTemplate: state.saveNodeAsTemplate,
    }))
  );

  const filteredTemplates = nodeTemplates.filter(
    (template) =>
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateTemplate = () => {
    if (newTemplateName.trim() && selectedNodes.length > 0) {
      // Save the first selected node as a template
      saveNodeAsTemplate(selectedNodes[0], newTemplateName.trim(), {
        description: newTemplateDescription.trim() || undefined,
      });
      setNewTemplateName('');
      setNewTemplateDescription('');
      setCreateDialogOpen(false);
    }
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Search and Create */}
      <div className="p-3 space-y-2 border-b shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchNodes')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={selectedNodes.length === 0}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              {t('saveAsTemplate')}
              {selectedNodes.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[10px]">
                  {selectedNodes.length}
                </Badge>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('createTemplate')}</DialogTitle>
              <DialogDescription>
                {t('templateDescriptionPlaceholder')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">{t('templateName')}</Label>
                <Input
                  id="template-name"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder={t('templateNamePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-description">{t('templateDescription')}</Label>
                <Textarea
                  id="template-description"
                  value={newTemplateDescription}
                  onChange={(e) => setNewTemplateDescription(e.target.value)}
                  placeholder={t('templateDescriptionPlaceholder')}
                  className="resize-none"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                {tCommon('cancel')}
              </Button>
              <Button onClick={handleCreateTemplate} disabled={!newTemplateName.trim()}>
                {t('createTemplate')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates List */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-1">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {searchQuery ? t('noResultsFound') : t('noTemplates')}
              </p>
              <p className="text-xs">
                {searchQuery
                  ? t('tryDifferentSearch')
                  : t('createFirstTemplate')}
              </p>
            </div>
          ) : (
            filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="group p-2.5 rounded-lg border hover:border-primary/50 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                    <FileCode className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {template.name}
                      </span>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {template.nodeType}
                      </Badge>
                    </div>
                    {template.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {template.description}
                      </p>
                    )}
                    {/* Node type color indicator */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: NODE_TYPE_COLORS[template.nodeType] || '#888',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-7 flex-1"
                    onClick={() => onAddTemplate?.(template.id)}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Use
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('deleteTemplate')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('confirmDeleteTemplate')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteNodeTemplate(template.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default NodeTemplatePanel;
