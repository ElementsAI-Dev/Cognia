'use client';

/**
 * KnowledgeBase - manage project knowledge files
 */

import { useTranslations } from 'next-intl';
import {
  FileText,
  Upload,
  Trash2,
  Plus,
  Search,
  Download,
  Eye,
  Loader2,
  ExternalLink,
  CheckSquare,
  Square,
  Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { EmptyState } from '@/components/layout/feedback/empty-state';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { FILE_TYPE_ICONS, FILE_TYPE_COLORS } from '@/lib/project/knowledge-base-utils';
import { formatFileSize } from '@/lib/project/utils';
import { useKnowledgeBase } from '@/hooks/projects/use-knowledge-base';

interface KnowledgeBaseProps {
  projectId: string;
}

export function KnowledgeBase({ projectId }: KnowledgeBaseProps) {
  const t = useTranslations('knowledgeBase');
  const tCommon = useTranslations('common');

  const {
    project,
    searchQuery,
    setSearchQuery,
    filteredFiles,
    isDesktop,
    isDragging,
    isUploading,
    uploadError,
    setUploadError,
    selectedFiles,
    showAddDialog,
    setShowAddDialog,
    showBatchDeleteDialog,
    setShowBatchDeleteDialog,
    deleteFileId,
    setDeleteFileId,
    viewingFile,
    setViewingFile,
    isEditing,
    editContent,
    setEditContent,
    highlightedHtml,
    newFileName,
    setNewFileName,
    newFileContent,
    setNewFileContent,
    fileInputRef,
    dropZoneRef,
    handleFileUpload,
    handleOpenFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleAddManual,
    handleDelete,
    handleBatchDelete,
    handleDownload,
    toggleFileSelection,
    toggleSelectAll,
    startEditing,
    cancelEditing,
    saveEdit,
    closeViewer,
  } = useKnowledgeBase({ projectId });

  if (!project) return null;

  return (
    <div
      ref={dropZoneRef}
      className={cn(
        'space-y-4 relative rounded-lg transition-colors',
        isDragging && 'ring-2 ring-primary ring-dashed bg-primary/5'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-primary/5 border-2 border-dashed border-primary pointer-events-none">
          <div className="text-center">
            <Upload className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-sm font-medium text-primary">{t('dropFilesHere') || 'Drop files here'}</p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t('title')}</h3>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.md,.json,.js,.ts,.tsx,.jsx,.py,.rs,.go,.java,.cpp,.c,.h,.pdf,.docx,.doc,.xlsx,.xls,.csv,.tsv,.html,.htm,.xml,.yaml,.yml,.css,.scss"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {isUploading ? t('processing') : t('upload')}
          </Button>
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {tCommon('add')}
          </Button>
        </div>
      </div>

      {/* Upload error message */}
      {uploadError && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            <span>{uploadError}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUploadError(null)}
            >
              {t('dismiss')}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {project.knowledgeBase.length > 0 && (
        <div className="flex items-center gap-2">
          <InputGroup className="flex-1">
            <InputGroupAddon align="inline-start">
              <Search className="h-4 w-4" />
            </InputGroupAddon>
            <InputGroupInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
            />
          </InputGroup>
          {filteredFiles.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSelectAll}
                className="gap-1"
              >
                {selectedFiles.size === filteredFiles.length ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                {selectedFiles.size > 0 ? t('selectedCount', { count: selectedFiles.size }) : t('selectAll')}
              </Button>
              {selectedFiles.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowBatchDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {t('deleteSelected')}
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {filteredFiles.length > 0 ? (
        <div className="space-y-2">
          {filteredFiles.map((file) => {
            const IconComponent = FILE_TYPE_ICONS[file.type] || FileText;
            const isSelected = selectedFiles.has(file.id);
            return (
              <div
                key={file.id}
                className={cn(
                  "flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50 cursor-pointer transition-colors",
                  isSelected && "border-primary bg-primary/5"
                )}
                onClick={() => toggleFileSelection(file.id)}
              >
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFileSelection(file.id);
                    }}
                  >
                    {isSelected ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </Button>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <IconComponent className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge
                        variant="secondary"
                        className={cn('text-xs', FILE_TYPE_COLORS[file.type])}
                      >
                        {file.type}
                      </Badge>
                      <span>{formatFileSize(file.size)}</span>
                      <span>
                        {file.updatedAt.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingFile(file);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('view')}</TooltipContent>
                  </Tooltip>
                  {isDesktop && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenFile(file);
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t('openWithDefault')}</TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(file);
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('download')}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteFileId(file.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('deleteFile')}</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title={searchQuery ? t('noResults') : t('noFiles')}
          description={searchQuery ? t('tryDifferent') : t('uploadHint')}
        />
      )}

      {/* Add File Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addFile')}</DialogTitle>
            <DialogDescription>
              {t('addFileDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="filename">{t('fileName')}</Label>
              <Input
                id="filename"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder={t('fileNamePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">{t('content')}</Label>
              <Textarea
                id="content"
                value={newFileContent}
                onChange={(e) => setNewFileContent(e.target.value)}
                placeholder={t('contentPlaceholder')}
                rows={10}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handleAddManual}
              disabled={!newFileName.trim() || !newFileContent.trim()}
            >
              {t('addFile')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View/Edit File Dialog */}
      <Dialog
        open={!!viewingFile}
        onOpenChange={() => closeViewer()}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewingFile?.name}
              {isEditing && (
                <Badge variant="secondary" className="text-xs">
                  {t('editing') || 'Editing'}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {viewingFile && (
                <span className="flex items-center gap-2">
                  <Badge variant="secondary">{viewingFile.type}</Badge>
                  <span>{formatFileSize(viewingFile.size)}</span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {isEditing ? (
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
                rows={20}
              />
            ) : highlightedHtml ? (
              <div
                className="rounded-lg text-sm [&_pre]:p-4 [&_pre]:overflow-x-auto [&_code]:font-mono"
                dangerouslySetInnerHTML={{ __html: highlightedHtml }}
              />
            ) : (
              <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm font-mono">
                {viewingFile?.content}
              </pre>
            )}
          </ScrollArea>
          <DialogFooter>
            {isEditing ? (
              <>
                <Button variant="outline" onClick={cancelEditing}>
                  {tCommon('cancel')}
                </Button>
                <Button
                  onClick={saveEdit}
                  disabled={!editContent.trim()}
                >
                  {tCommon('save') || 'Save'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={closeViewer}>
                  {tCommon('close')}
                </Button>
                {viewingFile && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => startEditing(viewingFile)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      {tCommon('edit') || 'Edit'}
                    </Button>
                    <Button onClick={() => handleDownload(viewingFile)}>
                      <Download className="mr-2 h-4 w-4" />
                      {t('download')}
                    </Button>
                  </>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteFileId} onOpenChange={() => setDeleteFileId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteFile')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tCommon('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Delete Confirmation */}
      <AlertDialog open={showBatchDeleteDialog} onOpenChange={setShowBatchDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteMultipleFiles')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteMultipleConfirm', { count: selectedFiles.size })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('deleteAll', { count: selectedFiles.size })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default KnowledgeBase;
