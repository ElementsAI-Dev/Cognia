/**
 * Beautiful HTML Export - Modern, professional HTML export with syntax highlighting
 * Generates a standalone, responsive HTML file with dark/light theme support
 */

import type { UIMessage, Session, MessagePart } from '@/types';
import { type SyntaxThemeName, type SyntaxTheme, getSyntaxTheme, generateSyntaxThemeCSS } from './syntax-themes';

export interface BeautifulExportData {
  session: Session;
  messages: UIMessage[];
  exportedAt: Date;
  options?: BeautifulExportOptions;
}

export interface BeautifulExportOptions {
  theme?: 'light' | 'dark' | 'auto' | 'system';
  syntaxTheme?: SyntaxThemeName | string;
  customThemes?: SyntaxTheme[];
  showTimestamps?: boolean;
  showTokens?: boolean;
  showThinkingProcess?: boolean;
  showToolCalls?: boolean;
  includeCoverPage?: boolean;
  includeTableOfContents?: boolean;
  syntaxHighlighting?: boolean;
  compactMode?: boolean;
}

const DEFAULT_OPTIONS: Required<BeautifulExportOptions> = {
  theme: 'auto',
  syntaxTheme: 'one-dark-pro',
  customThemes: [],
  showTimestamps: true,
  showTokens: false,
  showThinkingProcess: true,
  showToolCalls: true,
  includeCoverPage: true,
  includeTableOfContents: true,
  syntaxHighlighting: true,
  compactMode: false,
};

/**
 * Generate beautiful standalone HTML export
 */
export function exportToBeautifulHTML(data: BeautifulExportData): string {
  const { session, messages, exportedAt, options = {} } = data;
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const stats = calculateStats(messages);
  
  return `<!DOCTYPE html>
<html lang="en" data-theme="${opts.theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Chat export from Cognia - ${escapeHtml(session.title)}">
  <title>${escapeHtml(session.title)} - Cognia Export</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
${getBeautifulStyles(opts)}
  </style>
</head>
<body>
  <div class="container">
    ${opts.includeCoverPage ? generateCoverPage(session, stats, exportedAt) : ''}
    
    ${opts.includeTableOfContents ? generateTableOfContents(messages) : ''}
    
    <main class="conversation" id="conversation">
      <header class="conversation-header">
        <div class="header-meta">
          <span class="badge provider">${escapeHtml(session.provider)}</span>
          <span class="badge model">${escapeHtml(session.model)}</span>
          <span class="badge mode mode-${session.mode}">${escapeHtml(session.mode)}</span>
        </div>
      </header>
      
      <div class="messages">
        ${messages.map((msg, index) => generateMessageHTML(msg, index, opts)).join('')}
      </div>
    </main>
    
    <footer class="export-footer">
      <div class="footer-content">
        <p>Exported from <strong>Cognia</strong> on ${exportedAt.toLocaleString()}</p>
        <p class="stats-line">${messages.length} messages • ${stats.totalTokens.toLocaleString()} tokens</p>
      </div>
      <button class="theme-toggle" onclick="toggleTheme()" aria-label="Toggle theme">
        <svg class="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"></circle>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>
        </svg>
        <svg class="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      </button>
    </footer>
  </div>
  
  <script>
${getBeautifulScript()}
  </script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function calculateStats(messages: UIMessage[]): { totalTokens: number; userCount: number; assistantCount: number } {
  return {
    totalTokens: messages.reduce((sum, m) => sum + (m.tokens?.total || 0), 0),
    userCount: messages.filter(m => m.role === 'user').length,
    assistantCount: messages.filter(m => m.role === 'assistant').length,
  };
}

function generateCoverPage(session: Session, stats: { totalTokens: number; userCount: number; assistantCount: number }, exportedAt: Date): string {
  return `
    <section class="cover-page">
      <div class="cover-content">
        <div class="cover-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <h1 class="cover-title">${escapeHtml(session.title)}</h1>
        <div class="cover-meta">
          <div class="meta-row">
            <span class="meta-label">Model</span>
            <span class="meta-value">${escapeHtml(session.provider)} / ${escapeHtml(session.model)}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Mode</span>
            <span class="meta-value capitalize">${escapeHtml(session.mode)}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Created</span>
            <span class="meta-value">${session.createdAt.toLocaleDateString()}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Messages</span>
            <span class="meta-value">${stats.userCount + stats.assistantCount} (${stats.userCount} user, ${stats.assistantCount} assistant)</span>
          </div>
          ${stats.totalTokens > 0 ? `
          <div class="meta-row">
            <span class="meta-label">Tokens</span>
            <span class="meta-value">${stats.totalTokens.toLocaleString()}</span>
          </div>
          ` : ''}
        </div>
        <div class="cover-footer">
          <p>Exported ${exportedAt.toLocaleString()}</p>
        </div>
      </div>
      <div class="cover-decoration"></div>
    </section>
  `;
}

function generateTableOfContents(messages: UIMessage[]): string {
  const tocItems = messages
    .filter(m => m.role === 'user')
    .slice(0, 20)
    .map((msg, index) => {
      const preview = msg.content.slice(0, 60).replace(/\n/g, ' ');
      return `<li><a href="#msg-${index * 2}">${escapeHtml(preview)}${msg.content.length > 60 ? '...' : ''}</a></li>`;
    });

  if (tocItems.length === 0) return '';

  return `
    <nav class="toc" aria-label="Table of contents">
      <h2>Table of Contents</h2>
      <ol>${tocItems.join('')}</ol>
    </nav>
  `;
}

function generateMessageHTML(message: UIMessage, index: number, opts: Required<BeautifulExportOptions>): string {
  const isUser = message.role === 'user';
  const roleLabel = isUser ? 'You' : 'Assistant';
  const roleIcon = isUser ? getUserIcon() : getAssistantIcon();
  
  // Process content with syntax highlighting
  const processedContent = processMessageContent(message.content, opts.syntaxHighlighting);
  
  // Generate parts HTML (thinking, tool calls, etc.)
  const partsHTML = message.parts ? generatePartsHTML(message.parts, opts) : '';
  
  // Sources
  const sourcesHTML = message.sources?.length ? generateSourcesHTML(message.sources) : '';
  
  // Attachments
  const attachmentsHTML = message.attachments?.length ? generateAttachmentsHTML(message.attachments) : '';

  return `
    <article class="message ${message.role}" id="msg-${index}">
      <div class="message-avatar">
        ${roleIcon}
      </div>
      <div class="message-wrapper">
        <header class="message-header">
          <span class="message-role">${roleLabel}</span>
          ${opts.showTimestamps ? `<time class="message-time">${message.createdAt.toLocaleTimeString()}</time>` : ''}
          ${opts.showTokens && message.tokens?.total ? `<span class="message-tokens">${message.tokens.total} tokens</span>` : ''}
        </header>
        ${attachmentsHTML}
        <div class="message-content">
          ${partsHTML}
          ${processedContent}
        </div>
        ${sourcesHTML}
      </div>
    </article>
  `;
}

function getUserIcon(): string {
  return `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>`;
}

function getAssistantIcon(): string {
  return `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
  </svg>`;
}

function processMessageContent(content: string, syntaxHighlighting: boolean): string {
  let html = escapeHtml(content);
  
  // Process code blocks with syntax highlighting
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    const language = lang || 'text';
    const highlightedCode = syntaxHighlighting ? highlightCode(code.trim(), language) : escapeHtml(code.trim());
    return `<div class="code-block">
      <div class="code-header">
        <span class="code-language">${language}</span>
        <button class="copy-btn" onclick="copyCode(this)" data-code="${escapeHtml(code.trim())}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          Copy
        </button>
      </div>
      <pre><code class="language-${language}">${highlightedCode}</code></pre>
    </div>`;
  });
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  
  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Line breaks
  html = html.replace(/\n/g, '<br>');
  
  return html;
}

function highlightCode(code: string, language: string): string {
  // Enhanced syntax highlighting for common patterns
  let highlighted = escapeHtml(code);
  
  // Language-specific keywords and configurations
  const langConfig: Record<string, { keywords: string[]; types?: string[]; builtins?: string[] }> = {
    javascript: {
      keywords: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'class', 'extends', 'super', 'import', 'export', 'from', 'as', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'new', 'delete', 'typeof', 'instanceof', 'in', 'of', 'yield', 'static', 'get', 'set'],
      builtins: ['console', 'window', 'document', 'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Date', 'Promise', 'Map', 'Set', 'Symbol', 'Proxy', 'Reflect'],
    },
    typescript: {
      keywords: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'class', 'extends', 'super', 'import', 'export', 'from', 'as', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'new', 'delete', 'typeof', 'instanceof', 'in', 'of', 'yield', 'static', 'get', 'set', 'implements', 'private', 'public', 'protected', 'readonly', 'abstract', 'declare', 'namespace', 'module', 'keyof', 'infer'],
      types: ['interface', 'type', 'enum', 'any', 'unknown', 'never', 'void', 'string', 'number', 'boolean', 'object', 'null', 'undefined', 'symbol', 'bigint'],
      builtins: ['console', 'window', 'document', 'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Date', 'Promise', 'Map', 'Set', 'Symbol', 'Proxy', 'Reflect', 'Record', 'Partial', 'Required', 'Pick', 'Omit', 'Exclude', 'Extract'],
    },
    python: {
      keywords: ['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'break', 'continue', 'pass', 'import', 'from', 'as', 'try', 'except', 'finally', 'raise', 'with', 'lambda', 'yield', 'global', 'nonlocal', 'assert', 'del', 'and', 'or', 'not', 'in', 'is', 'async', 'await'],
      types: ['True', 'False', 'None'],
      builtins: ['print', 'len', 'range', 'str', 'int', 'float', 'list', 'dict', 'set', 'tuple', 'bool', 'type', 'isinstance', 'hasattr', 'getattr', 'setattr', 'open', 'input', 'map', 'filter', 'zip', 'enumerate', 'sorted', 'reversed', 'min', 'max', 'sum', 'abs', 'round'],
    },
    rust: {
      keywords: ['fn', 'let', 'mut', 'const', 'static', 'struct', 'enum', 'union', 'impl', 'trait', 'pub', 'use', 'mod', 'crate', 'self', 'super', 'if', 'else', 'match', 'for', 'while', 'loop', 'return', 'break', 'continue', 'async', 'await', 'move', 'ref', 'where', 'unsafe', 'extern', 'dyn', 'box', 'as', 'type'],
      types: ['i8', 'i16', 'i32', 'i64', 'i128', 'isize', 'u8', 'u16', 'u32', 'u64', 'u128', 'usize', 'f32', 'f64', 'bool', 'char', 'str', 'String', 'Vec', 'Option', 'Result', 'Box', 'Rc', 'Arc', 'Cell', 'RefCell', 'true', 'false', 'Self'],
      builtins: ['println', 'print', 'format', 'panic', 'assert', 'debug_assert', 'Some', 'None', 'Ok', 'Err'],
    },
    go: {
      keywords: ['func', 'var', 'const', 'type', 'struct', 'interface', 'package', 'import', 'if', 'else', 'for', 'range', 'switch', 'case', 'default', 'return', 'defer', 'go', 'chan', 'select', 'break', 'continue', 'fallthrough', 'goto', 'map', 'make', 'new', 'cap', 'len', 'append', 'copy', 'delete', 'close'],
      types: ['int', 'int8', 'int16', 'int32', 'int64', 'uint', 'uint8', 'uint16', 'uint32', 'uint64', 'float32', 'float64', 'complex64', 'complex128', 'bool', 'byte', 'rune', 'string', 'error', 'true', 'false', 'nil', 'iota'],
      builtins: ['fmt', 'Println', 'Printf', 'Sprintf', 'Errorf'],
    },
    html: {
      keywords: [],
      types: [],
    },
    css: {
      keywords: ['important', 'media', 'keyframes', 'supports', 'import', 'charset', 'font-face', 'page'],
      types: [],
    },
    json: {
      keywords: [],
      types: ['true', 'false', 'null'],
    },
    sql: {
      keywords: ['SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER', 'INDEX', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'AND', 'OR', 'NOT', 'NULL', 'IS', 'IN', 'LIKE', 'BETWEEN', 'ORDER', 'BY', 'ASC', 'DESC', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'AS', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'CASCADE'],
      types: ['INT', 'INTEGER', 'VARCHAR', 'TEXT', 'BOOLEAN', 'DATE', 'DATETIME', 'TIMESTAMP', 'FLOAT', 'DOUBLE', 'DECIMAL'],
    },
    bash: {
      keywords: ['if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'do', 'done', 'case', 'esac', 'in', 'function', 'return', 'exit', 'export', 'local', 'readonly', 'declare', 'typeset', 'unset', 'shift', 'break', 'continue'],
      builtins: ['echo', 'printf', 'read', 'cd', 'pwd', 'ls', 'cp', 'mv', 'rm', 'mkdir', 'rmdir', 'cat', 'grep', 'sed', 'awk', 'find', 'xargs', 'sort', 'uniq', 'wc', 'head', 'tail', 'cut', 'tr', 'chmod', 'chown', 'curl', 'wget'],
    },
  };
  
  const config = langConfig[language.toLowerCase()] || langConfig.javascript || { keywords: [] };
  
  // Order matters! Process from most specific to least specific
  
  // 1. Highlight strings first (before anything else to preserve them)
  highlighted = highlighted.replace(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g, '<span class="token string">$&</span>');
  
  // 2. Highlight comments
  if (['python', 'bash', 'shell', 'sh'].includes(language.toLowerCase())) {
    highlighted = highlighted.replace(/(#.*$)/gm, '<span class="token comment">$1</span>');
  } else if (['html', 'xml'].includes(language.toLowerCase())) {
    highlighted = highlighted.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="token comment">$1</span>');
  } else if (['css'].includes(language.toLowerCase())) {
    highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="token comment">$1</span>');
  } else {
    highlighted = highlighted.replace(/(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, '<span class="token comment">$1</span>');
  }
  
  // 3. Highlight numbers (including hex, binary, octal)
  highlighted = highlighted.replace(/\b(0x[a-fA-F0-9]+|0b[01]+|0o[0-7]+|\d+\.?\d*(?:e[+-]?\d+)?)\b/gi, '<span class="token number">$1</span>');
  
  // 4. Highlight operators
  highlighted = highlighted.replace(/([+\-*/%=<>!&|^~?:]+)/g, '<span class="token operator">$1</span>');
  
  // 5. Highlight types
  if (config.types) {
    for (const type of config.types) {
      const regex = new RegExp(`\\b(${type})\\b`, 'g');
      highlighted = highlighted.replace(regex, '<span class="token class-name">$1</span>');
    }
  }
  
  // 6. Highlight builtins
  if (config.builtins) {
    for (const builtin of config.builtins) {
      const regex = new RegExp(`\\b(${builtin})\\b`, 'g');
      highlighted = highlighted.replace(regex, '<span class="token property">$1</span>');
    }
  }
  
  // 7. Highlight keywords
  for (const keyword of config.keywords) {
    const regex = new RegExp(`\\b(${keyword})\\b`, language === 'sql' ? 'gi' : 'g');
    highlighted = highlighted.replace(regex, '<span class="token keyword">$1</span>');
  }
  
  // 8. Highlight function calls
  highlighted = highlighted.replace(/\b([a-zA-Z_]\w*)\s*\(/g, '<span class="token function">$1</span>(');
  
  // 9. Highlight decorators (Python, TypeScript)
  if (['python', 'typescript', 'javascript'].includes(language.toLowerCase())) {
    highlighted = highlighted.replace(/@([a-zA-Z_]\w*)/g, '<span class="token property">@$1</span>');
  }
  
  return highlighted;
}

function generatePartsHTML(parts: MessagePart[], opts: Required<BeautifulExportOptions>): string {
  const partsContent: string[] = [];
  
  for (const part of parts) {
    if (part.type === 'reasoning' && opts.showThinkingProcess) {
      partsContent.push(`
        <details class="thinking-block">
          <summary>
            <span class="thinking-icon">💭</span>
            <span>Thinking${part.duration ? ` (${part.duration}s)` : ''}</span>
          </summary>
          <div class="thinking-content">${escapeHtml(part.content)}</div>
        </details>
      `);
    }
    
    if (part.type === 'tool-invocation' && opts.showToolCalls) {
      const statusClass = part.state === 'output-available' ? 'success' : 
                         part.state === 'output-error' ? 'error' : 'pending';
      partsContent.push(`
        <details class="tool-block ${statusClass}">
          <summary>
            <span class="tool-icon">🔧</span>
            <span class="tool-name">${formatToolName(part.toolName)}</span>
            <span class="tool-status ${statusClass}">${part.state}</span>
          </summary>
          <div class="tool-content">
            <div class="tool-section">
              <h4>Parameters</h4>
              <pre class="tool-code">${JSON.stringify(part.args, null, 2)}</pre>
            </div>
            ${part.result ? `
              <div class="tool-section">
                <h4>Result</h4>
                <pre class="tool-code">${typeof part.result === 'string' ? escapeHtml(part.result) : JSON.stringify(part.result, null, 2)}</pre>
              </div>
            ` : ''}
            ${part.errorText ? `
              <div class="tool-section error">
                <h4>Error</h4>
                <pre class="tool-code error">${escapeHtml(part.errorText)}</pre>
              </div>
            ` : ''}
          </div>
        </details>
      `);
    }
  }
  
  return partsContent.join('');
}

function formatToolName(name: string): string {
  return name
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function generateSourcesHTML(sources: Array<{ title: string; url: string; snippet?: string }>): string {
  return `
    <details class="sources-block">
      <summary>
        <span class="sources-icon">📚</span>
        <span>Sources (${sources.length})</span>
      </summary>
      <ul class="sources-list">
        ${sources.map(s => `
          <li>
            <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.title)}</a>
            ${s.snippet ? `<p class="source-snippet">${escapeHtml(s.snippet.slice(0, 150))}...</p>` : ''}
          </li>
        `).join('')}
      </ul>
    </details>
  `;
}

function generateAttachmentsHTML(attachments: Array<{ name: string; type: string; url?: string; size?: number }>): string {
  return `
    <div class="attachments">
      ${attachments.map(a => `
        <div class="attachment">
          ${a.type === 'image' && a.url ? 
            `<img src="${escapeHtml(a.url)}" alt="${escapeHtml(a.name)}" loading="lazy">` :
            `<span class="attachment-icon">📎</span><span class="attachment-name">${escapeHtml(a.name)}</span>`
          }
        </div>
      `).join('')}
    </div>
  `;
}

function getBeautifulStyles(opts: Required<BeautifulExportOptions>): string {
  return `
    :root {
      --bg-primary: #ffffff;
      --bg-secondary: #f8fafc;
      --bg-tertiary: #f1f5f9;
      --bg-user: #dbeafe;
      --bg-assistant: #f1f5f9;
      --bg-code: #1e293b;
      --text-primary: #0f172a;
      --text-secondary: #475569;
      --text-tertiary: #94a3b8;
      --text-code: #e2e8f0;
      --border-color: #e2e8f0;
      --border-light: #f1f5f9;
      --accent-primary: #3b82f6;
      --accent-secondary: #8b5cf6;
      --accent-success: #10b981;
      --accent-warning: #f59e0b;
      --accent-error: #ef4444;
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
      --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1);
      --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1);
      --radius-sm: 6px;
      --radius-md: 10px;
      --radius-lg: 16px;
      --radius-xl: 24px;
    }

    [data-theme="dark"], 
    @media (prefers-color-scheme: dark) {
      html:not([data-theme="light"]) {
        --bg-primary: #0f172a;
        --bg-secondary: #1e293b;
        --bg-tertiary: #334155;
        --bg-user: #1e3a5f;
        --bg-assistant: #1e293b;
        --bg-code: #0f172a;
        --text-primary: #f1f5f9;
        --text-secondary: #94a3b8;
        --text-tertiary: #64748b;
        --text-code: #e2e8f0;
        --border-color: #334155;
        --border-light: #1e293b;
      }
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html {
      scroll-behavior: smooth;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 0 20px;
    }

    /* Cover Page */
    .cover-page {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      position: relative;
      padding: 60px 20px;
      background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
      border-bottom: 1px solid var(--border-color);
      margin-bottom: 40px;
    }

    .cover-content {
      position: relative;
      z-index: 1;
    }

    .cover-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 24px;
      background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
      border-radius: var(--radius-xl);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: var(--shadow-lg);
    }

    .cover-icon svg {
      width: 40px;
      height: 40px;
      color: white;
    }

    .cover-title {
      font-size: clamp(1.75rem, 5vw, 2.5rem);
      font-weight: 700;
      margin-bottom: 32px;
      line-height: 1.2;
      background: linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .cover-meta {
      display: grid;
      gap: 12px;
      max-width: 400px;
      margin: 0 auto 32px;
      text-align: left;
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 16px;
      background: var(--bg-primary);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
    }

    .meta-label {
      font-weight: 500;
      color: var(--text-secondary);
    }

    .meta-value {
      font-weight: 600;
      color: var(--text-primary);
    }

    .capitalize {
      text-transform: capitalize;
    }

    .cover-footer {
      color: var(--text-tertiary);
      font-size: 0.875rem;
    }

    .cover-decoration {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: 
        radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 40%),
        radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.1) 0%, transparent 40%);
      pointer-events: none;
    }

    /* Table of Contents */
    .toc {
      padding: 24px;
      background: var(--bg-secondary);
      border-radius: var(--radius-lg);
      margin-bottom: 40px;
      border: 1px solid var(--border-color);
    }

    .toc h2 {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 16px;
      color: var(--text-primary);
    }

    .toc ol {
      list-style: none;
      counter-reset: toc-counter;
    }

    .toc li {
      counter-increment: toc-counter;
      padding: 8px 0;
      border-bottom: 1px solid var(--border-light);
    }

    .toc li:last-child {
      border-bottom: none;
    }

    .toc li::before {
      content: counter(toc-counter) ".";
      font-weight: 600;
      color: var(--accent-primary);
      margin-right: 12px;
    }

    .toc a {
      color: var(--text-secondary);
      text-decoration: none;
      transition: color 0.2s;
    }

    .toc a:hover {
      color: var(--accent-primary);
    }

    /* Conversation Header */
    .conversation-header {
      padding: 20px 0;
      margin-bottom: 24px;
      border-bottom: 1px solid var(--border-color);
    }

    .header-meta {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .badge {
      font-size: 0.75rem;
      font-weight: 500;
      padding: 4px 12px;
      border-radius: 9999px;
      background: var(--bg-tertiary);
      color: var(--text-secondary);
    }

    .badge.mode-chat { background: #dbeafe; color: #1d4ed8; }
    .badge.mode-agent { background: #fce7f3; color: #be185d; }
    .badge.mode-research { background: #d1fae5; color: #047857; }

    /* Messages */
    .messages {
      display: flex;
      flex-direction: column;
      gap: ${opts.compactMode ? '20px' : '32px'};
      padding: ${opts.compactMode ? '16px 0' : '24px 0'};
    }

    .message {
      display: flex;
      gap: 16px;
      animation: messageIn 0.3s ease-out;
      position: relative;
    }

    /* Subtle connector line between messages */
    .message:not(:last-child)::after {
      content: '';
      position: absolute;
      left: 19px;
      top: 48px;
      bottom: -${opts.compactMode ? '20px' : '32px'};
      width: 2px;
      background: linear-gradient(to bottom, var(--border-color) 0%, transparent 100%);
      opacity: 0.3;
    }

    @keyframes messageIn {
      from {
        opacity: 0;
        transform: translateY(12px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .message-avatar {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: var(--shadow-sm);
      position: relative;
      z-index: 1;
    }

    .message.user .message-avatar {
      background: linear-gradient(135deg, var(--accent-primary) 0%, #60a5fa 100%);
      color: white;
    }

    .message.assistant .message-avatar {
      background: linear-gradient(135deg, var(--accent-secondary) 0%, #a78bfa 100%);
      color: white;
    }

    .message-avatar svg {
      width: 22px;
      height: 22px;
    }

    .message-wrapper {
      flex: 1;
      min-width: 0;
    }

    .message-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
    }

    .message-role {
      font-weight: 600;
      font-size: 0.9375rem;
    }

    .message.user .message-role {
      color: var(--accent-primary);
    }

    .message.assistant .message-role {
      color: var(--accent-secondary);
    }

    .message-time {
      font-size: 0.8125rem;
      color: var(--text-tertiary);
    }

    .message-tokens {
      font-size: 0.75rem;
      color: var(--text-tertiary);
      padding: 3px 10px;
      background: var(--bg-tertiary);
      border-radius: 9999px;
      font-weight: 500;
    }

    .message-content {
      font-size: 0.9375rem;
      line-height: 1.75;
      color: var(--text-primary);
      letter-spacing: -0.01em;
    }

    .message.user .message-content {
      background: var(--bg-user);
      padding: 18px 22px;
      border-radius: var(--radius-lg);
      border-bottom-left-radius: var(--radius-sm);
      box-shadow: var(--shadow-sm);
      border: 1px solid rgba(59, 130, 246, 0.1);
    }

    .message.assistant .message-content {
      padding: 8px 0;
    }

    /* Paragraph spacing in assistant messages */
    .message.assistant .message-content br + br {
      display: block;
      content: '';
      margin-top: 1em;
    }

    /* Inline Elements */
    .inline-code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.875em;
      background: var(--bg-tertiary);
      padding: 2px 6px;
      border-radius: var(--radius-sm);
      color: var(--accent-primary);
    }

    strong {
      font-weight: 600;
    }

    a {
      color: var(--accent-primary);
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    /* Code Blocks */
    .code-block {
      margin: 16px 0;
      border-radius: var(--radius-md);
      overflow: hidden;
      background: var(--bg-code);
      box-shadow: var(--shadow-md);
    }

    .code-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      background: rgba(0,0,0,0.2);
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }

    .code-language {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .copy-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text-tertiary);
      background: transparent;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.2s;
    }

    .copy-btn:hover {
      background: rgba(255,255,255,0.1);
      color: white;
    }

    .copy-btn svg {
      width: 14px;
      height: 14px;
    }

    .code-block pre {
      margin: 0;
      padding: 16px;
      overflow-x: auto;
    }

    .code-block code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.875rem;
      line-height: 1.6;
      color: var(--text-code);
    }

    /* Syntax Highlighting - Dynamic Theme */
    ${generateSyntaxThemeCSS(getSyntaxTheme(opts.syntaxTheme, opts.customThemes))}

    /* Code block line numbers (optional enhancement) */
    .code-block pre {
      counter-reset: line;
    }

    .code-block code {
      display: block;
    }

    /* Thinking Block */
    .thinking-block {
      margin: 16px 0;
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .thinking-block summary {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      cursor: pointer;
      font-weight: 500;
      color: var(--accent-secondary);
      user-select: none;
    }

    .thinking-block summary:hover {
      background: rgba(139, 92, 246, 0.1);
    }

    .thinking-icon {
      font-size: 1.125rem;
    }

    .thinking-content {
      padding: 16px;
      font-size: 0.875rem;
      color: var(--text-secondary);
      border-top: 1px solid rgba(139, 92, 246, 0.2);
      white-space: pre-wrap;
    }

    /* Tool Block */
    .tool-block {
      margin: 16px 0;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .tool-block summary {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      cursor: pointer;
      background: var(--bg-secondary);
      font-weight: 500;
      user-select: none;
    }

    .tool-icon {
      font-size: 1rem;
    }

    .tool-name {
      flex: 1;
    }

    .tool-status {
      font-size: 0.75rem;
      padding: 2px 8px;
      border-radius: 9999px;
      font-weight: 500;
    }

    .tool-status.success { background: #d1fae5; color: #047857; }
    .tool-status.error { background: #fee2e2; color: #b91c1c; }
    .tool-status.pending { background: #fef3c7; color: #b45309; }

    .tool-content {
      padding: 16px;
      border-top: 1px solid var(--border-color);
    }

    .tool-section {
      margin-bottom: 16px;
    }

    .tool-section:last-child {
      margin-bottom: 0;
    }

    .tool-section h4 {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--text-tertiary);
      margin-bottom: 8px;
    }

    .tool-code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8125rem;
      background: var(--bg-tertiary);
      padding: 12px;
      border-radius: var(--radius-sm);
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .tool-section.error .tool-code {
      background: #fee2e2;
      color: #b91c1c;
    }

    /* Sources Block */
    .sources-block {
      margin: 16px 0;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .sources-block summary {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      cursor: pointer;
      background: var(--bg-secondary);
      font-weight: 500;
    }

    .sources-list {
      list-style: none;
      padding: 16px;
      border-top: 1px solid var(--border-color);
    }

    .sources-list li {
      padding: 8px 0;
      border-bottom: 1px solid var(--border-light);
    }

    .sources-list li:last-child {
      border-bottom: none;
    }

    .source-snippet {
      font-size: 0.8125rem;
      color: var(--text-tertiary);
      margin-top: 4px;
    }

    /* Attachments */
    .attachments {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .attachment {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      font-size: 0.875rem;
    }

    .attachment img {
      max-width: 200px;
      max-height: 150px;
      border-radius: var(--radius-sm);
    }

    /* Footer */
    .export-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 32px 0;
      margin-top: 48px;
      border-top: 1px solid var(--border-color);
    }

    .footer-content p {
      font-size: 0.875rem;
      color: var(--text-tertiary);
    }

    .stats-line {
      margin-top: 4px;
      font-size: 0.8125rem !important;
    }

    .theme-toggle {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
      background: var(--bg-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
      transition: all 0.2s;
    }

    .theme-toggle:hover {
      background: var(--bg-tertiary);
      color: var(--text-primary);
    }

    .theme-toggle svg {
      width: 20px;
      height: 20px;
    }

    .sun-icon { display: none; }
    .moon-icon { display: block; }

    [data-theme="dark"] .sun-icon,
    @media (prefers-color-scheme: dark) {
      html:not([data-theme="light"]) .sun-icon { display: block; }
      html:not([data-theme="light"]) .moon-icon { display: none; }
    }

    [data-theme="light"] .sun-icon { display: none; }
    [data-theme="light"] .moon-icon { display: block; }

    /* Print Styles */
    @media print {
      .theme-toggle, .copy-btn {
        display: none !important;
      }
      
      .cover-page {
        min-height: auto;
        page-break-after: always;
      }
      
      .message {
        page-break-inside: avoid;
      }
      
      .code-block {
        page-break-inside: avoid;
      }
    }

    /* Responsive */
    @media (max-width: 640px) {
      .container {
        padding: 0 16px;
      }
      
      .message {
        gap: 12px;
      }
      
      .message-avatar {
        width: 32px;
        height: 32px;
      }
      
      .cover-meta {
        padding: 0 16px;
      }
    }
  `;
}

function getBeautifulScript(): string {
  return `
    // Theme toggle
    function toggleTheme() {
      const html = document.documentElement;
      const currentTheme = html.getAttribute('data-theme');
      
      if (currentTheme === 'dark') {
        html.setAttribute('data-theme', 'light');
      } else if (currentTheme === 'light') {
        html.setAttribute('data-theme', 'dark');
      } else {
        // Auto mode - check current preference and toggle
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        html.setAttribute('data-theme', isDark ? 'light' : 'dark');
      }
    }

    // Copy code
    async function copyCode(button) {
      const code = button.getAttribute('data-code')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");
      
      try {
        await navigator.clipboard.writeText(code);
        const originalText = button.innerHTML;
        button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!';
        button.style.color = '#10b981';
        
        setTimeout(() => {
          button.innerHTML = originalText;
          button.style.color = '';
        }, 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
      // Smooth scroll for TOC links
      document.querySelectorAll('.toc a').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const target = document.querySelector(link.getAttribute('href'));
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      });
    });
  `;
}
