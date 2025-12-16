'use client';

/**
 * KnowledgeBase - manage project knowledge files
 */

import { useState, useRef } from 'react';
import {
  FileText,
  Code,
  File,
  Upload,
  Trash2,
  Plus,
  Search,
  Download,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useProjectStore } from '@/stores';
import type { KnowledgeFile } from '@/types';
import { cn } from '@/lib/utils';

interface KnowledgeBaseProps {
  projectId: string;
}

const fileTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  text: FileText,
  pdf: File,
  code: Code,
  markdown: FileText,
  json: Code,
};

const fileTypeColors: Record<string, string> = {
  text: 'bg-gray-100 text-gray-800',
  pdf: 'bg-red-100 text-red-800',
  code: 'bg-blue-100 text-blue-800',
  markdown: 'bg-purple-100 text-purple-800',
  json: 'bg-green-100 text-green-800',
};

function detectFileType(filename: string, content: string): KnowledgeFile['type'] {
  const ext = filename.split('.').pop()?.toLowerCase();

  if (ext === 'md' || ext === 'markdown') return 'markdown';
  if (ext === 'json') return 'json';
  if (ext === 'pdf') return 'pdf';
  if (['js', 'ts', 'tsx', 'jsx', 'py', 'rs', 'go', 'java', 'cpp', 'c', 'h'].includes(ext || '')) {
    return 'code';
  }

  // Try to detect from content
  if (content.startsWith('{') || content.startsWith('[')) return 'json';
  if (content.includes('```') || content.startsWith('#')) return 'markdown';

  return 'text';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function KnowledgeBase({ projectId }: KnowledgeBaseProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [viewingFile, setViewingFile] = useState<KnowledgeFile | null>(null);
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const project = useProjectStore((state) => state.getProject(projectId));
  const addKnowledgeFile = useProjectStore((state) => state.addKnowledgeFile);
  const removeKnowledgeFile = useProjectStore((state) => state.removeKnowledgeFile);

  if (!project) return null;

  const filteredFiles = searchQuery
    ? project.knowledgeBase.filter(
        (f) =>
          f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : project.knowledgeBase;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        addKnowledgeFile(projectId, {
          name: file.name,
          type: detectFileType(file.name, content),
          content,
          size: content.length,
        });
      };
      reader.readAsText(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddManual = () => {
    if (!newFileName.trim() || !newFileContent.trim()) return;

    addKnowledgeFile(projectId, {
      name: newFileName.trim(),
      type: detectFileType(newFileName, newFileContent),
      content: newFileContent,
      size: newFileContent.length,
    });

    setNewFileName('');
    setNewFileContent('');
    setShowAddDialog(false);
  };

  const handleDelete = () => {
    if (deleteFileId) {
      removeKnowledgeFile(projectId, deleteFileId);
      setDeleteFileId(null);
    }
  };

  const handleDownload = (file: KnowledgeFile) => {
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Knowledge Base</h3>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.md,.json,.js,.ts,.tsx,.jsx,.py,.rs,.go,.java,.cpp,.c,.h"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      {project.knowledgeBase.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="pl-10"
          />
        </div>
      )}

      {filteredFiles.length > 0 ? (
        <div className="space-y-2">
          {filteredFiles.map((file) => {
            const IconComponent = fileTypeIcons[file.type] || FileText;
            return (
              <div
                key={file.id}
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <IconComponent className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge
                        variant="secondary"
                        className={cn('text-xs', fileTypeColors[file.type])}
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setViewingFile(file)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDownload(file)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteFileId(file.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-2 font-medium">
            {searchQuery ? 'No files found' : 'No knowledge files yet'}
          </p>
          <p className="text-sm text-muted-foreground">
            {searchQuery
              ? 'Try a different search'
              : 'Upload files or add content to build your knowledge base'}
          </p>
        </div>
      )}

      {/* Add File Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Knowledge File</DialogTitle>
            <DialogDescription>
              Add text content that will be available as context for conversations in
              this project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="filename">File Name</Label>
              <Input
                id="filename"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="knowledge.md"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={newFileContent}
                onChange={(e) => setNewFileContent(e.target.value)}
                placeholder="Enter your knowledge content here..."
                rows={10}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddManual}
              disabled={!newFileName.trim() || !newFileContent.trim()}
            >
              Add File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View File Dialog */}
      <Dialog open={!!viewingFile} onOpenChange={() => setViewingFile(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{viewingFile?.name}</DialogTitle>
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
            <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm">
              {viewingFile?.content}
            </pre>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingFile(null)}>
              Close
            </Button>
            {viewingFile && (
              <Button onClick={() => handleDownload(viewingFile)}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteFileId} onOpenChange={() => setDeleteFileId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this file from the knowledge base? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default KnowledgeBase;
