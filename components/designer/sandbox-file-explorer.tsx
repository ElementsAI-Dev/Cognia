'use client';

/**
 * SandboxFileExplorer - Custom file explorer for the sandbox
 * Features:
 * - Collapsed-by-default folders (except root level)
 * - Smooth collapse/expand animations
 * - File creation, deletion, and renaming
 * - Proper file tree structure
 */

import { useCallback, useMemo, useState } from 'react';
import { useSandpack } from '@codesandbox/sandpack-react';
import {
  ChevronRight,
  File,
  FileCode,
  FileJson,
  FileText,
  Folder,
  FolderOpen,
  Plus,
  Trash2,
  Edit3,
  FilePlus,
  FolderPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
}

interface SandboxFileExplorerProps {
  className?: string;
  onFileCreate?: (path: string, content: string) => void;
  onFileDelete?: (path: string) => void;
  onFileRename?: (oldPath: string, newPath: string) => void;
}

export function SandboxFileExplorer({
  className,
  onFileCreate,
  onFileDelete,
  onFileRename,
}: SandboxFileExplorerProps) {
  const { sandpack } = useSandpack();
  const { files, activeFile, setActiveFile, addFile, deleteFile } = sandpack;

  const [newFileDialog, setNewFileDialog] = useState<{
    open: boolean;
    type: 'file' | 'directory';
    parentPath: string;
  }>({ open: false, type: 'file', parentPath: '/' });
  const [newFileName, setNewFileName] = useState('');
  const [renameDialog, setRenameDialog] = useState<{
    open: boolean;
    path: string;
    currentName: string;
  }>({ open: false, path: '', currentName: '' });
  const [renameName, setRenameName] = useState('');

  // Build file tree from flat file list
  const fileTree = useMemo(() => {
    const tree: FileTreeNode[] = [];
    const pathMap: Record<string, FileTreeNode> = {};

    // Sort files by path
    const sortedPaths = Object.keys(files).sort();

    for (const filePath of sortedPaths) {
      const parts = filePath.split('/').filter(Boolean);
      let currentPath = '';

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;
        const parentPath = currentPath;
        currentPath = currentPath + '/' + part;

        if (!pathMap[currentPath]) {
          const node: FileTreeNode = {
            name: part,
            path: currentPath,
            type: isFile ? 'file' : 'directory',
            children: isFile ? undefined : [],
          };
          pathMap[currentPath] = node;

          if (parentPath && pathMap[parentPath]) {
            pathMap[parentPath].children?.push(node);
          } else if (!parentPath || parentPath === '') {
            tree.push(node);
          }
        }
      }
    }

    return tree;
  }, [files]);

  // Handle file creation
  const handleCreateFile = useCallback(() => {
    if (!newFileName.trim()) return;

    let path = newFileDialog.parentPath;
    if (!path.endsWith('/')) path += '/';
    path += newFileName.trim();

    if (newFileDialog.type === 'file') {
      // Add extension if not provided
      if (!path.includes('.')) {
        path += '.js';
      }
      addFile(path, '');
      onFileCreate?.(path, '');
    } else {
      // For directory, create a placeholder file
      const placeholderPath = path + '/.gitkeep';
      addFile(placeholderPath, '');
      onFileCreate?.(placeholderPath, '');
    }

    setNewFileDialog({ open: false, type: 'file', parentPath: '/' });
    setNewFileName('');
  }, [newFileName, newFileDialog, addFile, onFileCreate]);

  // Handle file deletion
  const handleDeleteFile = useCallback((path: string) => {
    deleteFile(path);
    onFileDelete?.(path);
  }, [deleteFile, onFileDelete]);

  // Handle file rename
  const handleRenameFile = useCallback(() => {
    if (!renameName.trim() || !renameDialog.path) return;

    const oldPath = renameDialog.path;
    const parts = oldPath.split('/');
    parts[parts.length - 1] = renameName.trim();
    const newPath = parts.join('/');

    // Get content and create new file, then delete old
    const content = files[oldPath]?.code || '';
    addFile(newPath, content);
    deleteFile(oldPath);
    onFileRename?.(oldPath, newPath);

    setRenameDialog({ open: false, path: '', currentName: '' });
    setRenameName('');
  }, [renameName, renameDialog, files, addFile, deleteFile, onFileRename]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header with actions */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Files
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => setNewFileDialog({ open: true, type: 'file', parentPath: '/' })}
            >
              <FilePlus className="h-4 w-4 mr-2" />
              New File
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setNewFileDialog({ open: true, type: 'directory', parentPath: '/' })}
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              New Folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* File tree */}
      <ScrollArea className="flex-1">
        <div className="p-1">
          {fileTree.map((node) => (
            <FileTreeItem
              key={node.path}
              node={node}
              depth={0}
              activeFile={activeFile}
              onSelect={setActiveFile}
              onDelete={handleDeleteFile}
              onRename={(path, name) => {
                setRenameDialog({ open: true, path, currentName: name });
                setRenameName(name);
              }}
              onNewFile={(parentPath) => {
                setNewFileDialog({ open: true, type: 'file', parentPath });
              }}
              onNewFolder={(parentPath) => {
                setNewFileDialog({ open: true, type: 'directory', parentPath });
              }}
            />
          ))}
        </div>
      </ScrollArea>

      {/* New File Dialog */}
      <Dialog open={newFileDialog.open} onOpenChange={(open) => setNewFileDialog({ ...newFileDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {newFileDialog.type === 'file' ? 'Create New File' : 'Create New Folder'}
            </DialogTitle>
            <DialogDescription>
              Enter the name for your new {newFileDialog.type}.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder={newFileDialog.type === 'file' ? 'filename.js' : 'folder-name'}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFile()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFileDialog({ ...newFileDialog, open: false })}>
              Cancel
            </Button>
            <Button onClick={handleCreateFile}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialog.open} onOpenChange={(open) => setRenameDialog({ ...renameDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
            <DialogDescription>
              Enter a new name for this file.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            placeholder="new-name.js"
            onKeyDown={(e) => e.key === 'Enter' && handleRenameFile()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialog({ ...renameDialog, open: false })}>
              Cancel
            </Button>
            <Button onClick={handleRenameFile}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// File icon based on extension
function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return <FileCode className="h-4 w-4 text-yellow-500" />;
    case 'json':
      return <FileJson className="h-4 w-4 text-amber-500" />;
    case 'css':
    case 'scss':
    case 'less':
      return <FileCode className="h-4 w-4 text-blue-500" />;
    case 'html':
      return <FileCode className="h-4 w-4 text-orange-500" />;
    case 'md':
    case 'txt':
      return <FileText className="h-4 w-4 text-gray-500" />;
    case 'vue':
      return <FileCode className="h-4 w-4 text-green-500" />;
    default:
      return <File className="h-4 w-4 text-muted-foreground" />;
  }
}

interface FileTreeItemProps {
  node: FileTreeNode;
  depth: number;
  activeFile: string;
  onSelect: (path: string) => void;
  onDelete: (path: string) => void;
  onRename: (path: string, currentName: string) => void;
  onNewFile: (parentPath: string) => void;
  onNewFolder: (parentPath: string) => void;
}

function FileTreeItem({
  node,
  depth,
  activeFile,
  onSelect,
  onDelete,
  onRename,
  onNewFile,
  onNewFolder,
}: FileTreeItemProps) {
  // Only expand root level by default
  const [isExpanded, setIsExpanded] = useState(depth === 0);
  const isDirectory = node.type === 'directory';
  const isActive = activeFile === node.path;
  const hasChildren = isDirectory && node.children && node.children.length > 0;

  const handleClick = useCallback(() => {
    if (isDirectory) {
      setIsExpanded(!isExpanded);
    } else {
      onSelect(node.path);
    }
  }, [isDirectory, isExpanded, node.path, onSelect]);

  // Skip .gitkeep files
  if (node.name === '.gitkeep') return null;

  const itemContent = (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-md px-2 py-1 text-sm cursor-pointer transition-colors',
        isActive && 'bg-primary/10 text-primary',
        !isActive && 'hover:bg-muted/50'
      )}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
      onClick={handleClick}
    >
      {/* Expand/collapse for directories */}
      {isDirectory ? (
        <ChevronRight
          className={cn(
            'h-3.5 w-3.5 transition-transform duration-200 text-muted-foreground',
            isExpanded && 'rotate-90'
          )}
        />
      ) : (
        <span className="w-3.5" />
      )}

      {/* Icon */}
      {isDirectory ? (
        isExpanded ? (
          <FolderOpen className="h-4 w-4 text-blue-500" />
        ) : (
          <Folder className="h-4 w-4 text-blue-500" />
        )
      ) : (
        getFileIcon(node.name)
      )}

      {/* Name */}
      <span className="flex-1 truncate text-xs">{node.name}</span>
    </div>
  );

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {isDirectory ? (
            <CollapsibleTrigger asChild>{itemContent}</CollapsibleTrigger>
          ) : (
            itemContent
          )}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          {isDirectory && (
            <>
              <ContextMenuItem onClick={() => onNewFile(node.path)}>
                <FilePlus className="h-4 w-4 mr-2" />
                New File
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onNewFolder(node.path)}>
                <FolderPlus className="h-4 w-4 mr-2" />
                New Folder
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          <ContextMenuItem onClick={() => onRename(node.path, node.name)}>
            <Edit3 className="h-4 w-4 mr-2" />
            Rename
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => onDelete(node.path)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Children */}
      {hasChildren && (
        <CollapsibleContent>
          {node.children!.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              activeFile={activeFile}
              onSelect={onSelect}
              onDelete={onDelete}
              onRename={onRename}
              onNewFile={onNewFile}
              onNewFolder={onNewFolder}
            />
          ))}
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

export default SandboxFileExplorer;
