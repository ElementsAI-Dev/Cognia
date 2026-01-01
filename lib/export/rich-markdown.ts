/**
 * Rich Markdown Export - Enhanced markdown export with full message parts support
 */

import type { UIMessage, Session, MessagePart, Attachment, Source } from '@/types';
import { formatBytes } from '@/lib/utils';

export interface RichExportData {
  session: Session;
  messages: UIMessage[];
  exportedAt: Date;
  includeMetadata?: boolean;
  includeAttachments?: boolean;
  includeTokens?: boolean;
}

/**
 * Export conversation to rich Markdown format with full message parts
 */
export function exportToRichMarkdown(data: RichExportData): string {
  const { session, messages, exportedAt, includeMetadata = true, includeAttachments = true, includeTokens = false } = data;

  const lines: string[] = [];

  // Header
  lines.push(`# ${session.title}`);
  lines.push('');
  
  // Metadata section
  if (includeMetadata) {
    lines.push('## Conversation Info');
    lines.push('');
    lines.push(`| Property | Value |`);
    lines.push(`|----------|-------|`);
    lines.push(`| **Date** | ${session.createdAt.toLocaleDateString()} |`);
    lines.push(`| **Provider** | ${session.provider} |`);
    lines.push(`| **Model** | ${session.model} |`);
    lines.push(`| **Mode** | ${session.mode} |`);
    if (session.temperature !== undefined) {
      lines.push(`| **Temperature** | ${session.temperature} |`);
    }
    if (session.maxTokens !== undefined) {
      lines.push(`| **Max Tokens** | ${session.maxTokens} |`);
    }
    lines.push(`| **Messages** | ${messages.length} |`);
    lines.push(`| **Exported** | ${exportedAt.toLocaleString()} |`);
    lines.push('');
  }

  // System prompt if present
  if (session.systemPrompt) {
    lines.push('## System Prompt');
    lines.push('');
    lines.push('```');
    lines.push(session.systemPrompt);
    lines.push('```');
    lines.push('');
  }

  // Conversation
  lines.push('## Conversation');
  lines.push('');
  lines.push('---');
  lines.push('');

  // Messages
  for (const message of messages) {
    const roleLabel = getRoleLabel(message.role);
    const timestamp = message.createdAt.toLocaleTimeString();
    
    lines.push(`### ${roleLabel}`);
    lines.push(`<sub>${timestamp}</sub>`);
    lines.push('');

    // Token usage if enabled
    if (includeTokens && message.tokens) {
      lines.push(`<details><summary>Token Usage</summary>`);
      lines.push('');
      lines.push(`- Prompt: ${message.tokens.prompt || 0}`);
      lines.push(`- Completion: ${message.tokens.completion || 0}`);
      lines.push(`- Total: ${message.tokens.total || 0}`);
      lines.push('');
      lines.push('</details>');
      lines.push('');
    }

    // Attachments
    if (includeAttachments && message.attachments && message.attachments.length > 0) {
      lines.push(renderAttachments(message.attachments));
      lines.push('');
    }

    // Message content with parts
    if (message.parts && message.parts.length > 0) {
      lines.push(renderMessageParts(message.parts));
    } else {
      lines.push(message.content);
    }
    lines.push('');

    // Sources if present
    if (message.sources && message.sources.length > 0) {
      lines.push(renderSources(message.sources));
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  // Footer
  lines.push('');
  lines.push(`*Exported from Cognia on ${exportedAt.toLocaleString()}*`);

  return lines.join('\n');
}

/**
 * Get display label for message role
 */
function getRoleLabel(role: string): string {
  switch (role) {
    case 'user':
      return '👤 **You**';
    case 'assistant':
      return '🤖 **Assistant**';
    case 'system':
      return '⚙️ **System**';
    case 'tool':
      return '🔧 **Tool**';
    default:
      return `**${role}**`;
  }
}

/**
 * Render message parts to markdown
 */
function renderMessageParts(parts: MessagePart[]): string {
  const lines: string[] = [];

  for (const part of parts) {
    switch (part.type) {
      case 'text':
        lines.push(part.content);
        break;

      case 'reasoning':
        lines.push('<details>');
        lines.push(`<summary>💭 Thinking${part.duration ? ` (${part.duration}s)` : ''}</summary>`);
        lines.push('');
        lines.push('> ' + part.content.split('\n').join('\n> '));
        lines.push('');
        lines.push('</details>');
        lines.push('');
        break;

      case 'tool-invocation':
        lines.push('<details>');
        lines.push(`<summary>🔧 Tool: ${formatToolName(part.toolName)} [${part.state}]</summary>`);
        lines.push('');
        lines.push('**Parameters:**');
        lines.push('```json');
        lines.push(JSON.stringify(part.args, null, 2));
        lines.push('```');
        if (part.result) {
          lines.push('');
          lines.push('**Result:**');
          lines.push('```json');
          lines.push(typeof part.result === 'string' ? part.result : JSON.stringify(part.result, null, 2));
          lines.push('```');
        }
        if (part.errorText) {
          lines.push('');
          lines.push('**Error:**');
          lines.push(`> ❌ ${part.errorText}`);
        }
        lines.push('');
        lines.push('</details>');
        lines.push('');
        break;

      case 'sources':
        lines.push(renderSources(part.sources));
        break;

      case 'image': {
        const imageSrc = part.base64 
          ? `data:${part.mimeType || 'image/png'};base64,${part.base64}`
          : part.url;
        const isGenerated = part.isGenerated;
        
        if (isGenerated) {
          lines.push('> ✨ **AI Generated Image**');
          lines.push('');
        }
        lines.push(`![${part.alt || 'Image'}](${imageSrc})`);
        if (part.width && part.height) {
          lines.push(`*${part.width}×${part.height}*`);
        }
        if (part.prompt) {
          lines.push('');
          lines.push('<details>');
          lines.push('<summary>View prompt</summary>');
          lines.push('');
          lines.push(`> ${part.prompt}`);
          if (part.revisedPrompt) {
            lines.push('');
            lines.push(`> **Revised:** ${part.revisedPrompt}`);
          }
          lines.push('');
          lines.push('</details>');
        }
        lines.push('');
        break;
      }

      case 'video': {
        const isGenerated = part.isGenerated;
        const videoSrc = part.url || (part.base64 ? '[Base64 Video Data]' : '');
        
        if (isGenerated) {
          lines.push(`> 🎬 **AI Generated Video**${part.provider ? ` (${part.provider})` : ''}${part.model ? ` - ${part.model}` : ''}`);
          lines.push('');
        }
        
        lines.push(`🎥 **Video:** ${part.title || 'Untitled Video'}`);
        lines.push('');
        
        // Video metadata
        const metaParts: string[] = [];
        if (part.durationSeconds) {
          const mins = Math.floor(part.durationSeconds / 60);
          const secs = Math.floor(part.durationSeconds % 60);
          metaParts.push(`⏱️ ${mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`}`);
        }
        if (part.width && part.height) {
          metaParts.push(`📐 ${part.width}×${part.height}`);
        }
        if (part.fps) {
          metaParts.push(`🎞️ ${part.fps}fps`);
        }
        if (metaParts.length > 0) {
          lines.push(`*${metaParts.join(' • ')}*`);
          lines.push('');
        }
        
        // Video link if URL available
        if (part.url) {
          lines.push(`[▶️ Play Video](${videoSrc})`);
          lines.push('');
        }
        
        // Thumbnail if available
        if (part.thumbnailUrl) {
          lines.push(`![Video Thumbnail](${part.thumbnailUrl})`);
          lines.push('');
        }
        
        // Prompt details
        if (part.prompt) {
          lines.push('<details>');
          lines.push('<summary>View prompt</summary>');
          lines.push('');
          lines.push(`> ${part.prompt}`);
          if (part.revisedPrompt) {
            lines.push('');
            lines.push(`> **Revised:** ${part.revisedPrompt}`);
          }
          lines.push('');
          lines.push('</details>');
        }
        lines.push('');
        break;
      }

      case 'file':
        lines.push(`📎 **Attachment:** [${part.attachment.name}](${part.attachment.url})`);
        lines.push('');
        break;
    }
  }

  return lines.join('\n');
}

/**
 * Render attachments section
 */
function renderAttachments(attachments: Attachment[]): string {
  const lines: string[] = [];
  
  lines.push('<details>');
  lines.push(`<summary>📎 Attachments (${attachments.length})</summary>`);
  lines.push('');

  for (const attachment of attachments) {
    if (attachment.type === 'image') {
      lines.push(`- **${attachment.name}** (${formatBytes(attachment.size)})`);
      lines.push(`  ![${attachment.name}](${attachment.url})`);
    } else {
      lines.push(`- **${attachment.name}** (${attachment.mimeType}, ${formatBytes(attachment.size)})`);
    }
  }

  lines.push('');
  lines.push('</details>');

  return lines.join('\n');
}

/**
 * Render sources section
 */
function renderSources(sources: Source[]): string {
  const lines: string[] = [];

  lines.push('<details>');
  lines.push(`<summary>📚 Sources (${sources.length})</summary>`);
  lines.push('');

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    lines.push(`${i + 1}. [${source.title}](${source.url})`);
    if (source.snippet) {
      lines.push(`   > ${source.snippet.slice(0, 150)}...`);
    }
  }

  lines.push('');
  lines.push('</details>');

  return lines.join('\n');
}

/**
 * Format tool name for display
 */
function formatToolName(name: string): string {
  return name
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Export to rich JSON with complete data
 */
export function exportToRichJSON(data: RichExportData): string {
  const { session, messages, exportedAt } = data;

  return JSON.stringify(
    {
      version: '2.0',
      exportedAt: exportedAt.toISOString(),
      session: {
        id: session.id,
        title: session.title,
        provider: session.provider,
        model: session.model,
        mode: session.mode,
        systemPrompt: session.systemPrompt,
        builtinPrompts: session.builtinPrompts,
        temperature: session.temperature,
        maxTokens: session.maxTokens,
        webSearchEnabled: session.webSearchEnabled,
        thinkingEnabled: session.thinkingEnabled,
        projectId: session.projectId,
        branches: session.branches,
        activeBranchId: session.activeBranchId,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      },
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        parts: m.parts,
        model: m.model,
        provider: m.provider,
        tokens: m.tokens,
        attachments: m.attachments?.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          url: a.url,
          size: a.size,
          mimeType: a.mimeType,
        })),
        sources: m.sources,
        branchId: m.branchId,
        parentMessageId: m.parentMessageId,
        isEdited: m.isEdited,
        editHistory: m.editHistory,
        isBookmarked: m.isBookmarked,
        reaction: m.reaction,
        translatedContent: m.translatedContent,
        translatedTo: m.translatedTo,
        createdAt: m.createdAt.toISOString(),
      })),
      statistics: {
        totalMessages: messages.length,
        userMessages: messages.filter((m) => m.role === 'user').length,
        assistantMessages: messages.filter((m) => m.role === 'assistant').length,
        totalTokens: messages.reduce((sum, m) => sum + (m.tokens?.total || 0), 0),
        hasAttachments: messages.some((m) => m.attachments && m.attachments.length > 0),
        hasSources: messages.some((m) => m.sources && m.sources.length > 0),
        hasToolCalls: messages.some((m) => m.parts?.some((p) => p.type === 'tool-invocation')),
      },
    },
    null,
    2
  );
}
