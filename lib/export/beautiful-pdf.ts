/**
 * Beautiful PDF Export - Generate professional PDF documents from chat conversations
 * Uses modern HTML/CSS rendering for high-quality PDF output
 */

import type { UIMessage, Session, MessagePart } from '@/types';

export interface PdfExportData {
  session: Session;
  messages: UIMessage[];
  exportedAt: Date;
  options?: PdfExportOptions;
}

export interface PdfExportOptions {
  theme?: 'light' | 'dark';
  showTimestamps?: boolean;
  showTokens?: boolean;
  showThinkingProcess?: boolean;
  showToolCalls?: boolean;
  includeCoverPage?: boolean;
  includeTableOfContents?: boolean;
  pageSize?: 'a4' | 'letter';
  fontSize?: 'small' | 'medium' | 'large';
}

const DEFAULT_OPTIONS: Required<PdfExportOptions> = {
  theme: 'light',
  showTimestamps: true,
  showTokens: false,
  showThinkingProcess: true,
  showToolCalls: true,
  includeCoverPage: true,
  includeTableOfContents: false,
  pageSize: 'a4',
  fontSize: 'medium',
};

/**
 * Generate PDF-optimized HTML for printing
 */
export function generatePdfHTML(data: PdfExportData): string {
  const { session, messages, exportedAt, options = {} } = data;
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const stats = calculateStats(messages);
  const fontSizeBase = opts.fontSize === 'small' ? '10pt' : opts.fontSize === 'large' ? '13pt' : '11pt';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(session.title)} - Cognia Export</title>
  <style>
${getPdfStyles(opts, fontSizeBase)}
  </style>
</head>
<body class="theme-${opts.theme}">
  ${opts.includeCoverPage ? generateCoverPage(session, stats, exportedAt, opts) : ''}
  
  <main class="content">
    ${!opts.includeCoverPage ? `<h1 class="document-title">${escapeHtml(session.title)}</h1>` : ''}
    
    <div class="conversation-info">
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Model</span>
          <span class="info-value">${escapeHtml(session.provider)} / ${escapeHtml(session.model)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Mode</span>
          <span class="info-value">${escapeHtml(session.mode)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Date</span>
          <span class="info-value">${session.createdAt.toLocaleDateString()}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Messages</span>
          <span class="info-value">${messages.length}</span>
        </div>
      </div>
    </div>
    
    <div class="messages">
      ${messages.map((msg, index) => generateMessageHTML(msg, index, opts)).join('')}
    </div>
  </main>
  
  <footer class="document-footer">
    <p>Exported from Cognia on ${exportedAt.toLocaleString()}</p>
  </footer>
</body>
</html>`;
}

/**
 * Export to PDF using browser print dialog
 */
export async function exportToBeautifulPDF(data: PdfExportData): Promise<void> {
  const htmlContent = generatePdfHTML(data);
  
  // Create a new window for printing
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    throw new Error('Failed to open print window. Please allow popups for this site.');
  }

  // Write the HTML content
  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Wait for styles and fonts to load
  await new Promise<void>((resolve) => {
    printWindow.onload = () => {
      // Additional delay for fonts
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        resolve();
      }, 500);
    };
  });
}

/**
 * Generate PDF blob using html2pdf (if available) or return HTML for manual printing
 */
export async function generatePdfBlob(data: PdfExportData): Promise<{ blob?: Blob; html: string; method: 'html2pdf' | 'print' }> {
  const htmlContent = generatePdfHTML(data);
  
  // Try to use html2pdf if available
  try {
    // Dynamic import with type assertion for optional dependency
    const html2pdfModule = await import(/* webpackIgnore: true */ 'html2pdf.js' as string) as { default?: (element?: HTMLElement) => { set: (options: Record<string, unknown>) => { from: (el: Element | null) => { outputPdf: (type: string) => Promise<Blob> } } } };
    if (html2pdfModule.default) {
      const container = document.createElement('div');
      container.innerHTML = htmlContent;
      document.body.appendChild(container);
      
      const blob = await html2pdfModule.default()
        .set({
          margin: [15, 15, 15, 15],
          filename: `${sanitizeFilename(data.session.title)}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: data.options?.pageSize || 'a4', orientation: 'portrait' }
        })
        .from(container.querySelector('.content'))
        .outputPdf('blob');
      
      document.body.removeChild(container);
      return { blob, html: htmlContent, method: 'html2pdf' };
    }
  } catch {
    // html2pdf not available, fallback to print
  }
  
  return { html: htmlContent, method: 'print' };
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

function sanitizeFilename(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

function calculateStats(messages: UIMessage[]): { totalTokens: number; userCount: number; assistantCount: number } {
  return {
    totalTokens: messages.reduce((sum, m) => sum + (m.tokens?.total || 0), 0),
    userCount: messages.filter(m => m.role === 'user').length,
    assistantCount: messages.filter(m => m.role === 'assistant').length,
  };
}

function generateCoverPage(
  session: Session, 
  stats: { totalTokens: number; userCount: number; assistantCount: number }, 
  exportedAt: Date,
  _opts: Required<PdfExportOptions>
): string {
  return `
    <section class="cover-page">
      <div class="cover-header">
        <div class="cover-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>Cognia</span>
        </div>
      </div>
      
      <div class="cover-content">
        <h1 class="cover-title">${escapeHtml(session.title)}</h1>
        
        <div class="cover-details">
          <table class="details-table">
            <tr>
              <td class="label">Provider</td>
              <td class="value">${escapeHtml(session.provider)}</td>
            </tr>
            <tr>
              <td class="label">Model</td>
              <td class="value">${escapeHtml(session.model)}</td>
            </tr>
            <tr>
              <td class="label">Mode</td>
              <td class="value">${escapeHtml(session.mode)}</td>
            </tr>
            <tr>
              <td class="label">Created</td>
              <td class="value">${session.createdAt.toLocaleDateString()}</td>
            </tr>
            <tr>
              <td class="label">Messages</td>
              <td class="value">${stats.userCount + stats.assistantCount} total (${stats.userCount} user, ${stats.assistantCount} assistant)</td>
            </tr>
            ${stats.totalTokens > 0 ? `
            <tr>
              <td class="label">Tokens</td>
              <td class="value">${stats.totalTokens.toLocaleString()}</td>
            </tr>
            ` : ''}
          </table>
        </div>
      </div>
      
      <div class="cover-footer">
        <p>Exported on ${exportedAt.toLocaleString()}</p>
      </div>
    </section>
  `;
}

function generateMessageHTML(message: UIMessage, index: number, opts: Required<PdfExportOptions>): string {
  const isUser = message.role === 'user';
  const roleLabel = isUser ? 'You' : 'Assistant';
  
  // Process content
  const processedContent = processMessageContent(message.content);
  
  // Generate parts HTML
  const partsHTML = message.parts ? generatePartsHTML(message.parts, opts) : '';
  
  // Sources
  const sourcesHTML = message.sources?.length ? generateSourcesHTML(message.sources) : '';
  
  // Attachments
  const attachmentsHTML = message.attachments?.length ? generateAttachmentsHTML(message.attachments) : '';

  return `
    <article class="message ${message.role}">
      <div class="message-header">
        <span class="message-role ${message.role}">${roleLabel}</span>
        ${opts.showTimestamps ? `<span class="message-time">${message.createdAt.toLocaleTimeString()}</span>` : ''}
        ${opts.showTokens && message.tokens?.total ? `<span class="message-tokens">${message.tokens.total} tokens</span>` : ''}
      </div>
      ${attachmentsHTML}
      <div class="message-content">
        ${partsHTML}
        ${processedContent}
      </div>
      ${sourcesHTML}
    </article>
  `;
}

function processMessageContent(content: string): string {
  let html = escapeHtml(content);
  
  // Process code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    const language = lang || 'text';
    return `<div class="code-block">
      <div class="code-header">${language}</div>
      <pre><code>${code.trim()}</code></pre>
    </div>`;
  });
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  
  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  
  // Line breaks
  html = html.replace(/\n/g, '<br>');
  
  return html;
}

function generatePartsHTML(parts: MessagePart[], opts: Required<PdfExportOptions>): string {
  const partsContent: string[] = [];
  
  for (const part of parts) {
    if (part.type === 'reasoning' && opts.showThinkingProcess) {
      partsContent.push(`
        <div class="thinking-block">
          <div class="thinking-header">
            <span class="thinking-icon">💭</span>
            <span>Thinking${part.duration ? ` (${part.duration}s)` : ''}</span>
          </div>
          <div class="thinking-content">${escapeHtml(part.content)}</div>
        </div>
      `);
    }
    
    if (part.type === 'tool-invocation' && opts.showToolCalls) {
      const statusLabel = part.state === 'output-available' ? '✓ Success' : 
                         part.state === 'output-error' ? '✗ Error' : '⋯ Pending';
      partsContent.push(`
        <div class="tool-block ${part.state}">
          <div class="tool-header">
            <span class="tool-icon">🔧</span>
            <span class="tool-name">${formatToolName(part.toolName)}</span>
            <span class="tool-status">${statusLabel}</span>
          </div>
          <div class="tool-content">
            <div class="tool-section">
              <div class="tool-section-title">Parameters</div>
              <pre class="tool-code">${JSON.stringify(part.args, null, 2)}</pre>
            </div>
            ${part.result ? `
              <div class="tool-section">
                <div class="tool-section-title">Result</div>
                <pre class="tool-code">${typeof part.result === 'string' ? escapeHtml(part.result) : JSON.stringify(part.result, null, 2)}</pre>
              </div>
            ` : ''}
            ${part.errorText ? `
              <div class="tool-section error">
                <div class="tool-section-title">Error</div>
                <pre class="tool-code error">${escapeHtml(part.errorText)}</pre>
              </div>
            ` : ''}
          </div>
        </div>
      `);
    }

    // Handle image parts
    if (part.type === 'image') {
      const imageSrc = part.base64 
        ? `data:${part.mimeType || 'image/png'};base64,${part.base64}`
        : part.url;
      const isGenerated = part.isGenerated;
      partsContent.push(`
        <figure class="media-block image-block${isGenerated ? ' ai-generated' : ''}">
          ${isGenerated ? '<div class="ai-badge">✨ AI Generated Image</div>' : ''}
          <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(part.alt || '')}" class="media-image">
          ${(part.alt || part.prompt || (part.width && part.height)) ? `
            <figcaption class="media-caption">
              ${part.alt ? `<div class="caption-text">${escapeHtml(part.alt)}</div>` : ''}
              ${part.width && part.height ? `<div class="media-dimensions">📐 ${part.width}×${part.height}</div>` : ''}
              ${part.prompt ? `
                <div class="media-prompt">
                  <span class="prompt-label">Prompt:</span>
                  <span class="prompt-text">${escapeHtml(part.prompt)}</span>
                </div>
              ` : ''}
              ${part.revisedPrompt ? `
                <div class="media-prompt revised">
                  <span class="prompt-label">Revised:</span>
                  <span class="prompt-text">${escapeHtml(part.revisedPrompt)}</span>
                </div>
              ` : ''}
            </figcaption>
          ` : ''}
        </figure>
      `);
    }

    // Handle video parts
    if (part.type === 'video') {
      const isGenerated = part.isGenerated;
      const thumbnailSrc = part.thumbnailBase64
        ? `data:image/jpeg;base64,${part.thumbnailBase64}`
        : part.thumbnailUrl;
      
      // Format duration
      let durationStr = '';
      if (part.durationSeconds) {
        const mins = Math.floor(part.durationSeconds / 60);
        const secs = Math.floor(part.durationSeconds % 60);
        durationStr = mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
      }
      
      partsContent.push(`
        <figure class="media-block video-block${isGenerated ? ' ai-generated' : ''}">
          ${isGenerated ? `<div class="ai-badge">🎬 AI Generated Video${part.provider ? ` (${escapeHtml(part.provider)})` : ''}</div>` : ''}
          <div class="video-preview">
            ${thumbnailSrc 
              ? `<img src="${escapeHtml(thumbnailSrc)}" alt="Video thumbnail" class="video-thumbnail">` 
              : '<div class="video-placeholder">🎥</div>'
            }
            <div class="video-play-icon">▶</div>
            ${part.url ? `<div class="video-link"><a href="${escapeHtml(part.url)}" target="_blank">Open Video</a></div>` : ''}
          </div>
          <figcaption class="media-caption">
            ${part.title ? `<div class="caption-text">${escapeHtml(part.title)}</div>` : ''}
            <div class="video-meta">
              ${durationStr ? `<span class="meta-item">⏱️ ${durationStr}</span>` : ''}
              ${part.width && part.height ? `<span class="meta-item">📐 ${part.width}×${part.height}</span>` : ''}
              ${part.fps ? `<span class="meta-item">🎞️ ${part.fps}fps</span>` : ''}
              ${part.model ? `<span class="meta-item">🤖 ${escapeHtml(part.model)}</span>` : ''}
            </div>
            ${part.prompt ? `
              <div class="media-prompt">
                <span class="prompt-label">Prompt:</span>
                <span class="prompt-text">${escapeHtml(part.prompt)}</span>
              </div>
            ` : ''}
            ${part.revisedPrompt ? `
              <div class="media-prompt revised">
                <span class="prompt-label">Revised:</span>
                <span class="prompt-text">${escapeHtml(part.revisedPrompt)}</span>
              </div>
            ` : ''}
          </figcaption>
        </figure>
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
    <div class="sources-block">
      <div class="sources-header">📚 Sources (${sources.length})</div>
      <ul class="sources-list">
        ${sources.map((s, i) => `
          <li>
            <span class="source-num">${i + 1}.</span>
            <span class="source-title">${escapeHtml(s.title)}</span>
            <span class="source-url">${escapeHtml(s.url)}</span>
          </li>
        `).join('')}
      </ul>
    </div>
  `;
}

function generateAttachmentsHTML(attachments: Array<{ name: string; type: string; url?: string; size?: number }>): string {
  const nonImageAttachments = attachments.filter(a => a.type !== 'image');
  if (nonImageAttachments.length === 0) return '';
  
  return `
    <div class="attachments">
      ${nonImageAttachments.map(a => `
        <span class="attachment">📎 ${escapeHtml(a.name)}</span>
      `).join('')}
    </div>
  `;
}

function getPdfStyles(opts: Required<PdfExportOptions>, fontSizeBase: string): string {
  const isLight = opts.theme === 'light';
  
  return `
    @page {
      size: ${opts.pageSize === 'letter' ? 'letter' : 'A4'};
      margin: 20mm 15mm;
      
      @bottom-center {
        content: counter(page);
        font-size: 9pt;
        color: #666;
      }
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: ${fontSizeBase};
      line-height: 1.6;
      color: ${isLight ? '#1f2937' : '#e5e7eb'};
      background: ${isLight ? '#ffffff' : '#111827'};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Cover Page */
    .cover-page {
      page-break-after: always;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      padding: 40px;
    }

    .cover-header {
      margin-bottom: auto;
    }

    .cover-logo {
      display: flex;
      align-items: center;
      gap: 8px;
      color: ${isLight ? '#6366f1' : '#818cf8'};
      font-weight: 600;
      font-size: 14pt;
    }

    .cover-logo svg {
      width: 28px;
      height: 28px;
    }

    .cover-content {
      text-align: center;
      margin: auto 0;
    }

    .cover-title {
      font-size: 28pt;
      font-weight: 700;
      color: ${isLight ? '#111827' : '#f9fafb'};
      margin-bottom: 40px;
      line-height: 1.2;
    }

    .cover-details {
      max-width: 400px;
      margin: 0 auto;
    }

    .details-table {
      width: 100%;
      border-collapse: collapse;
    }

    .details-table td {
      padding: 10px 16px;
      border-bottom: 1px solid ${isLight ? '#e5e7eb' : '#374151'};
    }

    .details-table .label {
      font-weight: 500;
      color: ${isLight ? '#6b7280' : '#9ca3af'};
      text-align: left;
      width: 100px;
    }

    .details-table .value {
      color: ${isLight ? '#111827' : '#f9fafb'};
      text-align: right;
    }

    .cover-footer {
      margin-top: auto;
      text-align: center;
      font-size: 10pt;
      color: ${isLight ? '#9ca3af' : '#6b7280'};
    }

    /* Content */
    .content {
      padding: 0;
    }

    .document-title {
      font-size: 20pt;
      font-weight: 700;
      margin-bottom: 24px;
      color: ${isLight ? '#111827' : '#f9fafb'};
    }

    .conversation-info {
      margin-bottom: 32px;
      padding: 16px;
      background: ${isLight ? '#f9fafb' : '#1f2937'};
      border-radius: 8px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .info-item {
      display: flex;
      justify-content: space-between;
    }

    .info-label {
      font-weight: 500;
      color: ${isLight ? '#6b7280' : '#9ca3af'};
    }

    .info-value {
      font-weight: 600;
      color: ${isLight ? '#111827' : '#f9fafb'};
    }

    /* Messages */
    .messages {
      display: flex;
      flex-direction: column;
      gap: 28px;
      padding: 16px 0;
    }

    .message {
      page-break-inside: avoid;
      position: relative;
      padding-left: 48px;
    }

    /* Message role indicator */
    .message::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      width: 36px;
      height: 36px;
      border-radius: 8px;
    }

    .message.user::before {
      background: linear-gradient(135deg, ${isLight ? '#3b82f6' : '#60a5fa'} 0%, ${isLight ? '#60a5fa' : '#93c5fd'} 100%);
    }

    .message.assistant::before {
      background: linear-gradient(135deg, ${isLight ? '#8b5cf6' : '#a78bfa'} 0%, ${isLight ? '#a78bfa' : '#c4b5fd'} 100%);
    }

    .message-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
    }

    .message-role {
      font-weight: 600;
      font-size: 1.05em;
    }

    .message-role.user {
      color: ${isLight ? '#2563eb' : '#60a5fa'};
    }

    .message-role.assistant {
      color: ${isLight ? '#7c3aed' : '#a78bfa'};
    }

    .message-time {
      font-size: 0.85em;
      color: ${isLight ? '#9ca3af' : '#6b7280'};
    }

    .message-tokens {
      font-size: 0.75em;
      padding: 3px 10px;
      background: ${isLight ? '#f3f4f6' : '#374151'};
      border-radius: 9999px;
      color: ${isLight ? '#6b7280' : '#9ca3af'};
      font-weight: 500;
    }

    .message-content {
      line-height: 1.75;
      letter-spacing: -0.01em;
    }

    .message.user .message-content {
      padding: 16px 20px;
      background: ${isLight ? '#eff6ff' : '#1e3a5f'};
      border-radius: 12px;
      border-left: 4px solid ${isLight ? '#3b82f6' : '#60a5fa'};
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    .message.assistant .message-content {
      padding: 4px 0;
    }

    /* Code */
    .code-block {
      margin: 16px 0;
      background: ${isLight ? '#1e293b' : '#0f172a'};
      border-radius: 10px;
      overflow: hidden;
      page-break-inside: avoid;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }

    .code-header {
      padding: 8px 16px;
      font-size: 0.75em;
      font-weight: 600;
      color: #94a3b8;
      background: rgba(0,0,0,0.3);
      border-bottom: 1px solid rgba(255,255,255,0.1);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .code-block pre {
      margin: 0;
      padding: 16px;
      overflow-x: auto;
    }

    .code-block code {
      font-family: 'Consolas', 'Monaco', 'Fira Code', monospace;
      font-size: 0.85em;
      line-height: 1.6;
      color: #e2e8f0;
    }

    .inline-code {
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 0.88em;
      padding: 3px 7px;
      background: ${isLight ? '#f1f5f9' : '#374151'};
      border-radius: 5px;
      color: ${isLight ? '#6366f1' : '#a78bfa'};
      font-weight: 500;
    }

    /* Thinking Block */
    .thinking-block {
      margin: 14px 0;
      background: ${isLight ? '#f5f3ff' : 'rgba(139, 92, 246, 0.15)'};
      border: 1px solid ${isLight ? '#ddd6fe' : 'rgba(139, 92, 246, 0.3)'};
      border-radius: 8px;
      overflow: hidden;
      page-break-inside: avoid;
    }

    .thinking-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      font-weight: 500;
      color: ${isLight ? '#7c3aed' : '#a78bfa'};
      background: ${isLight ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.1)'};
    }

    .thinking-content {
      padding: 14px;
      font-size: 0.9em;
      color: ${isLight ? '#6b7280' : '#9ca3af'};
      white-space: pre-wrap;
    }

    /* Tool Block */
    .tool-block {
      margin: 14px 0;
      border: 1px solid ${isLight ? '#e5e7eb' : '#374151'};
      border-radius: 8px;
      overflow: hidden;
      page-break-inside: avoid;
    }

    .tool-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: ${isLight ? '#f9fafb' : '#1f2937'};
    }

    .tool-name {
      flex: 1;
      font-weight: 500;
    }

    .tool-status {
      font-size: 0.75em;
      font-weight: 500;
    }

    .tool-block.output-available .tool-status { color: #10b981; }
    .tool-block.output-error .tool-status { color: #ef4444; }

    .tool-content {
      padding: 14px;
    }

    .tool-section {
      margin-bottom: 12px;
    }

    .tool-section:last-child {
      margin-bottom: 0;
    }

    .tool-section-title {
      font-size: 0.7em;
      font-weight: 600;
      text-transform: uppercase;
      color: ${isLight ? '#9ca3af' : '#6b7280'};
      margin-bottom: 6px;
    }

    .tool-code {
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 0.8em;
      padding: 10px;
      background: ${isLight ? '#f3f4f6' : '#111827'};
      border-radius: 6px;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .tool-section.error .tool-code {
      background: ${isLight ? '#fef2f2' : 'rgba(239, 68, 68, 0.1)'};
      color: #ef4444;
    }

    /* Sources */
    .sources-block {
      margin: 14px 0;
      padding: 14px;
      background: ${isLight ? '#f9fafb' : '#1f2937'};
      border-radius: 8px;
    }

    .sources-header {
      font-weight: 600;
      margin-bottom: 10px;
    }

    .sources-list {
      list-style: none;
    }

    .sources-list li {
      padding: 6px 0;
      border-bottom: 1px solid ${isLight ? '#e5e7eb' : '#374151'};
      font-size: 0.9em;
    }

    .sources-list li:last-child {
      border-bottom: none;
    }

    .source-num {
      font-weight: 600;
      color: ${isLight ? '#6366f1' : '#818cf8'};
      margin-right: 8px;
    }

    .source-title {
      font-weight: 500;
    }

    .source-url {
      display: block;
      font-size: 0.85em;
      color: ${isLight ? '#6b7280' : '#9ca3af'};
      word-break: break-all;
    }

    /* Attachments */
    .attachments {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 10px;
    }

    .attachment {
      font-size: 0.85em;
      padding: 4px 10px;
      background: ${isLight ? '#f3f4f6' : '#374151'};
      border-radius: 6px;
    }

    /* Media Blocks (Images & Videos) */
    .media-block {
      margin: 18px 0;
      border-radius: 10px;
      overflow: hidden;
      background: ${isLight ? '#f9fafb' : '#1f2937'};
      border: 1px solid ${isLight ? '#e5e7eb' : '#374151'};
      page-break-inside: avoid;
    }

    .media-block.ai-generated {
      border: 2px solid ${isLight ? '#8b5cf6' : '#a78bfa'};
    }

    .ai-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      background: ${isLight ? '#f5f3ff' : 'rgba(139, 92, 246, 0.15)'};
      font-size: 0.8em;
      font-weight: 600;
      color: ${isLight ? '#7c3aed' : '#a78bfa'};
    }

    .media-image {
      display: block;
      width: 100%;
      max-height: 400px;
      object-fit: contain;
      background: ${isLight ? '#f3f4f6' : '#111827'};
    }

    .video-preview {
      position: relative;
      background: #000;
      min-height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .video-thumbnail {
      width: 100%;
      max-height: 300px;
      object-fit: contain;
    }

    .video-placeholder {
      font-size: 48px;
      color: #6b7280;
    }

    .video-play-icon {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 60px;
      height: 60px;
      background: rgba(0, 0, 0, 0.7);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
    }

    .video-link {
      position: absolute;
      bottom: 10px;
      right: 10px;
    }

    .video-link a {
      padding: 6px 12px;
      background: ${isLight ? '#3b82f6' : '#60a5fa'};
      color: white;
      border-radius: 6px;
      font-size: 0.8em;
      font-weight: 500;
      text-decoration: none;
    }

    .media-caption {
      padding: 12px 14px;
    }

    .caption-text {
      font-weight: 500;
      margin-bottom: 6px;
      color: ${isLight ? '#111827' : '#f9fafb'};
    }

    .media-dimensions {
      font-size: 0.8em;
      color: ${isLight ? '#6b7280' : '#9ca3af'};
      margin-bottom: 6px;
    }

    .video-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 0.8em;
      color: ${isLight ? '#6b7280' : '#9ca3af'};
      margin-bottom: 8px;
    }

    .meta-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .media-prompt {
      font-size: 0.85em;
      padding: 8px 10px;
      background: ${isLight ? '#f3f4f6' : '#111827'};
      border-radius: 6px;
      margin-top: 8px;
    }

    .media-prompt.revised {
      border-left: 3px solid ${isLight ? '#8b5cf6' : '#a78bfa'};
      font-style: italic;
    }

    .prompt-label {
      font-weight: 600;
      color: ${isLight ? '#6b7280' : '#9ca3af'};
      margin-right: 6px;
    }

    .prompt-text {
      color: ${isLight ? '#374151' : '#d1d5db'};
    }

    /* Document Footer */
    .document-footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid ${isLight ? '#e5e7eb' : '#374151'};
      text-align: center;
      font-size: 0.85em;
      color: ${isLight ? '#9ca3af' : '#6b7280'};
    }

    /* Links */
    a {
      color: ${isLight ? '#2563eb' : '#60a5fa'};
      text-decoration: none;
    }

    strong {
      font-weight: 600;
    }

    /* Print adjustments */
    @media print {
      body {
        background: white !important;
        color: #1f2937 !important;
      }
      
      .cover-page {
        height: 100vh;
      }
      
      .code-block {
        break-inside: avoid;
      }
      
      .thinking-block, .tool-block, .sources-block {
        break-inside: avoid;
      }
    }
  `;
}
