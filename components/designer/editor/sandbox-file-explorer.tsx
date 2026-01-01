'use client';

/**
 * SandboxFileExplorer - File explorer for Sandpack sandbox
 * Shows and allows navigation of sandbox files
 */

import { useMemo, useState } from 'react';
import {
  File,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  FileCode,
  FileText,
  ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

interface SandboxFileExplorerProps {
  className?: string;
  files: Record<string, { code: string }>;
  activeFile?: string;
  onFileSelect?: (path: string) => void;
  onFileCreate?: (path: string) => void;
  onFileDelete?: (path: string) => void;
}

// Get icon for file type
function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'tsx':
    case 'ts':
    case 'jsx':
    case 'js':
      return <FileCode className="h-4 w-4 text-blue-500" />;
    case 'css':
    case 'scss':
    case 'sass':
      return <FileText className="h-4 w-4 text-purple-500" />;
    case 'html':
      return <FileText className="h-4 w-4 text-orange-500" />;
    case 'json':
      return <FileCode className="h-4 w-4 text-yellow-500" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return <ImageIcon className="h-4 w-4 text-green-500" />;
    default:
      return <File className="h-4 w-4 text-muted-foreground" />;
  }
}

// Build file tree from flat file list
function buildFileTree(files: Record<string, { code: string }>): FileNode[] {
  const root: FileNode[] = [];
  const pathMap = new Map<string, FileNode>();

  // Sort paths to ensure folders are created before their contents
  const sortedPaths = Object.keys(files).sort();

  for (const filePath of sortedPaths) {
    const parts = filePath.split('/').filter(Boolean);
    let currentPath = '';
    let currentLevel = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath += '/' + part;
      const isFile = i === parts.length - 1;

      let node = pathMap.get(currentPath);

      if (!node) {
        node = {
          name: part,
          path: currentPath,
          type: isFile ? 'file' : 'folder',
          children: isFile ? undefined : [],
        };
        pathMap.set(currentPath, node);
        currentLevel.push(node);
      }

      if (!isFile && node.children) {
        currentLevel = node.children;
      }
    }
  }

  return root;
}

interface FileTreeNodeProps {
  node: FileNode;
  depth: number;
  activeFile?: string;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  onFileSelect?: (path: string) => void;
  onFileDelete?: (path: string) => void;
}

function FileTreeNode({
  node,
  depth,
  activeFile,
  expandedFolders,
  onToggleFolder,
  onFileSelect,
  onFileDelete,
}: FileTreeNodeProps) {
  const isExpanded = expandedFolders.has(node.path);
  const isActive = node.path === activeFile;

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger>
          <button
            className={cn(
              'w-full flex items-center gap-1.5 py-1 px-2 text-sm hover:bg-accent rounded-sm transition-colors',
              isActive && 'bg-accent text-accent-foreground'
            )}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => {
              if (node.type === 'folder') {
                onToggleFolder(node.path);
              } else {
                onFileSelect?.(node.path);
              }
            }}
          >
            {node.type === 'folder' ? (
              <>
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                {isExpanded ? (
                  <FolderOpen className="h-4 w-4 text-yellow-500" />
                ) : (
                  <Folder className="h-4 w-4 text-yellow-500" />
                )}
              </>
            ) : (
              <>
                <span className="w-3.5" />
                {getFileIcon(node.name)}
              </>
            )}
            <span className="truncate">{node.name}</span>
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {node.type === 'file' && (
            <>
              <ContextMenuItem onClick={() => onFileSelect?.(node.path)}>
                Open
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                className="text-destructive"
                onClick={() => onFileDelete?.(node.path)}
              >
                Delete
              </ContextMenuItem>
            </>
          )}
          {node.type === 'folder' && (
            <ContextMenuItem onClick={() => onToggleFolder(node.path)}>
              {isExpanded ? 'Collapse' : 'Expand'}
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {node.type === 'folder' && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              activeFile={activeFile}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
              onFileSelect={onFileSelect}
              onFileDelete={onFileDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SandboxFileExplorer({
  className,
  files,
  activeFile,
  onFileSelect,
  onFileCreate,
  onFileDelete,
}: SandboxFileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/src']));
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const fileTree = useMemo(() => buildFileTree(files), [files]);

  const handleToggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleCreateFile = () => {
    if (newFileName.trim()) {
      const path = newFileName.startsWith('/') ? newFileName : '/' + newFileName;
      onFileCreate?.(path);
      setNewFileName('');
      setShowNewFile(false);
    }
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-xs font-medium text-muted-foreground uppercase">
          Files
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setShowNewFile(true)}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* New file input */}
      {showNewFile && (
        <div className="px-2 py-2 border-b">
          <Input
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder="filename.tsx"
            className="h-7 text-xs"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFile();
              if (e.key === 'Escape') setShowNewFile(false);
            }}
            onBlur={() => {
              if (!newFileName.trim()) setShowNewFile(false);
            }}
          />
        </div>
      )}

      {/* File tree */}
      <ScrollArea className="flex-1">
        <div className="py-1">
          {fileTree.map((node) => (
            <FileTreeNode
              key={node.path}
              node={node}
              depth={0}
              activeFile={activeFile}
              expandedFolders={expandedFolders}
              onToggleFolder={handleToggleFolder}
              onFileSelect={onFileSelect}
              onFileDelete={onFileDelete}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export default SandboxFileExplorer;
