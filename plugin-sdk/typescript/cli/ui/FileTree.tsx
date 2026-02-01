/**
 * FileTree Component
 *
 * Display file/folder structure with icons.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { colors, symbols } from './theme.js';

export interface FileNode {
  name: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: string;
}

export interface FileTreeProps {
  /** Root nodes to display */
  nodes: FileNode[];
  /** Title for the tree */
  title?: string;
  /** Indent size per level */
  indentSize?: number;
}

function renderNode(node: FileNode, depth: number, isLast: boolean, prefix: string): React.ReactElement[] {
  const elements: React.ReactElement[] = [];
  const connector = isLast ? '└── ' : '├── ';
  const icon = node.type === 'directory' ? symbols.folder : symbols.file;
  const nameColor = node.type === 'directory' ? colors.primary : undefined;

  elements.push(
    <Box key={`${prefix}${node.name}`}>
      <Text color={colors.muted}>{prefix}{connector}</Text>
      <Text>{icon} </Text>
      <Text color={nameColor} bold={node.type === 'directory'}>
        {node.name}
      </Text>
      {node.size && (
        <Text color={colors.dim}> ({node.size})</Text>
      )}
    </Box>
  );

  if (node.children && node.children.length > 0) {
    const childPrefix = prefix + (isLast ? '    ' : '│   ');
    node.children.forEach((child, index) => {
      const childElements = renderNode(
        child,
        depth + 1,
        index === node.children!.length - 1,
        childPrefix
      );
      elements.push(...childElements);
    });
  }

  return elements;
}

export function FileTree({
  nodes,
  title,
  indentSize = 4,
}: FileTreeProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      {title && (
        <Box marginBottom={1}>
          <Text bold color={colors.primary}>{symbols.folder} {title}</Text>
        </Box>
      )}
      <Box flexDirection="column">
        {nodes.map((node, index) => {
          const elements = renderNode(
            node,
            0,
            index === nodes.length - 1,
            ''
          );
          return (
            <Box key={node.name} flexDirection="column">
              {elements}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export function generateFileTree(files: string[]): FileNode[] {
  const root: FileNode[] = [];
  const dirMap = new Map<string, FileNode>();

  files.sort().forEach((filePath) => {
    const parts = filePath.split('/');
    let currentLevel = root;
    let currentPath = '';

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isFile = index === parts.length - 1;

      let existing = currentLevel.find((n) => n.name === part);

      if (!existing) {
        existing = {
          name: part,
          type: isFile ? 'file' : 'directory',
          children: isFile ? undefined : [],
        };
        currentLevel.push(existing);
        if (!isFile) {
          dirMap.set(currentPath, existing);
        }
      }

      if (!isFile && existing.children) {
        currentLevel = existing.children;
      }
    });
  });

  return root;
}

export default FileTree;
