/**
 * Animated HTML Export - GPT-style chat replay with typewriter animation
 */

import type { UIMessage, Session } from '@/types';

export interface AnimatedExportData {
  session: Session;
  messages: UIMessage[];
  exportedAt: Date;
  options?: AnimatedExportOptions;
}

export interface AnimatedExportOptions {
  theme?: 'light' | 'dark' | 'system';
  typingSpeed?: number; // characters per second
  messageDelay?: number; // ms between messages
  showTimestamps?: boolean;
  showTokens?: boolean;
  showControls?: boolean;
  autoPlay?: boolean;
}

const DEFAULT_OPTIONS: Required<AnimatedExportOptions> = {
  theme: 'system',
  typingSpeed: 50,
  messageDelay: 500,
  showTimestamps: true,
  showTokens: false,
  showControls: true,
  autoPlay: false,
};

/**
 * Generate standalone animated HTML file
 */
export function exportToAnimatedHTML(data: AnimatedExportData): string {
  const { session, messages, exportedAt, options = {} } = data;
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const messagesJSON = JSON.stringify(
    messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      parts: m.parts,
      attachments: m.attachments,
      sources: m.sources,
      tokens: m.tokens,
      createdAt: m.createdAt.toISOString(),
    }))
  );

  const sessionJSON = JSON.stringify({
    title: session.title,
    provider: session.provider,
    model: session.model,
    mode: session.mode,
    createdAt: session.createdAt.toISOString(),
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(session.title)} - Cognia Replay</title>
  <style>
${getStyles(opts.theme)}
  </style>
</head>
<body>
  <div id="app">
    <header class="header">
      <div class="header-content">
        <h1 class="title">${escapeHtml(session.title)}</h1>
        <div class="meta">
          <span class="badge">${session.provider}</span>
          <span class="badge">${session.model}</span>
          <span class="badge mode-${session.mode}">${session.mode}</span>
        </div>
      </div>
      ${opts.showControls ? `
      <div class="controls">
        <button id="playPauseBtn" class="control-btn" title="Play/Pause">
          <svg id="playIcon" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          <svg id="pauseIcon" viewBox="0 0 24 24" fill="currentColor" style="display:none"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
        </button>
        <button id="restartBtn" class="control-btn" title="Restart">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>
        </button>
        <div class="speed-control">
          <label>Speed:</label>
          <select id="speedSelect">
            <option value="0.5">0.5x</option>
            <option value="1" selected>1x</option>
            <option value="2">2x</option>
            <option value="4">4x</option>
            <option value="10">10x</option>
          </select>
        </div>
        <div class="progress-container">
          <input type="range" id="progressBar" min="0" max="100" value="0" class="progress-bar">
          <span id="progressText">0 / ${messages.length}</span>
        </div>
      </div>
      ` : ''}
    </header>

    <main class="conversation" id="conversation">
      <!-- Messages will be rendered here -->
    </main>

    <footer class="footer">
      <p>Exported from Cognia on ${exportedAt.toLocaleString()}</p>
    </footer>
  </div>

  <script>
    const messages = ${messagesJSON};
    const session = ${sessionJSON};
    const options = ${JSON.stringify(opts)};
    
${getAnimationScript()}
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

function getStyles(theme: 'light' | 'dark' | 'system'): string {
  return `
    :root {
      --bg-primary: #ffffff;
      --bg-secondary: #f5f5f5;
      --bg-user: #e3f2fd;
      --bg-assistant: #f5f5f5;
      --text-primary: #212121;
      --text-secondary: #757575;
      --border-color: #e0e0e0;
      --accent-color: #2196f3;
      --accent-light: #e3f2fd;
      --success-color: #4caf50;
      --error-color: #f44336;
      --warning-color: #ff9800;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg-primary: #1a1a1a;
        --bg-secondary: #2d2d2d;
        --bg-user: #1e3a5f;
        --bg-assistant: #2d2d2d;
        --text-primary: #e0e0e0;
        --text-secondary: #9e9e9e;
        --border-color: #404040;
        --accent-color: #64b5f6;
        --accent-light: #1e3a5f;
      }
    }

    ${theme === 'dark' ? `
    :root {
      --bg-primary: #1a1a1a;
      --bg-secondary: #2d2d2d;
      --bg-user: #1e3a5f;
      --bg-assistant: #2d2d2d;
      --text-primary: #e0e0e0;
      --text-secondary: #9e9e9e;
      --border-color: #404040;
      --accent-color: #64b5f6;
      --accent-light: #1e3a5f;
    }
    ` : ''}

    ${theme === 'light' ? `
    :root {
      --bg-primary: #ffffff;
      --bg-secondary: #f5f5f5;
      --bg-user: #e3f2fd;
      --bg-assistant: #f5f5f5;
      --text-primary: #212121;
      --text-secondary: #757575;
      --border-color: #e0e0e0;
      --accent-color: #2196f3;
      --accent-light: #e3f2fd;
    }
    ` : ''}

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      min-height: 100vh;
    }

    #app {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      max-width: 900px;
      margin: 0 auto;
    }

    .header {
      position: sticky;
      top: 0;
      background: var(--bg-primary);
      border-bottom: 1px solid var(--border-color);
      padding: 16px 20px;
      z-index: 100;
    }

    .header-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 12px;
    }

    .title {
      font-size: 20px;
      font-weight: 600;
    }

    .meta {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .badge {
      font-size: 12px;
      padding: 4px 10px;
      background: var(--bg-secondary);
      border-radius: 12px;
      color: var(--text-secondary);
    }

    .badge.mode-chat { background: #e3f2fd; color: #1976d2; }
    .badge.mode-agent { background: #fce4ec; color: #c2185b; }
    .badge.mode-research { background: #e8f5e9; color: #388e3c; }

    .controls {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .control-btn {
      width: 36px;
      height: 36px;
      border: none;
      background: var(--bg-secondary);
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-primary);
      transition: background 0.2s;
    }

    .control-btn:hover {
      background: var(--accent-light);
    }

    .control-btn svg {
      width: 20px;
      height: 20px;
    }

    .speed-control {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
    }

    .speed-control select {
      padding: 6px 10px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background: var(--bg-secondary);
      color: var(--text-primary);
      cursor: pointer;
    }

    .progress-container {
      flex: 1;
      min-width: 150px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .progress-bar {
      flex: 1;
      height: 6px;
      -webkit-appearance: none;
      background: var(--bg-secondary);
      border-radius: 3px;
      cursor: pointer;
    }

    .progress-bar::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 14px;
      height: 14px;
      background: var(--accent-color);
      border-radius: 50%;
      cursor: pointer;
    }

    #progressText {
      font-size: 13px;
      color: var(--text-secondary);
      white-space: nowrap;
    }

    .conversation {
      flex: 1;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .message {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 85%;
      opacity: 0;
      transform: translateY(10px);
      animation: messageIn 0.3s ease forwards;
    }

    @keyframes messageIn {
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .message.user {
      align-self: flex-end;
    }

    .message.assistant {
      align-self: flex-start;
    }

    .message-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--text-secondary);
    }

    .message-role {
      font-weight: 600;
      color: var(--text-primary);
    }

    .message-content {
      padding: 14px 18px;
      border-radius: 16px;
      font-size: 15px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .message.user .message-content {
      background: var(--bg-user);
      border-bottom-right-radius: 4px;
    }

    .message.assistant .message-content {
      background: var(--bg-assistant);
      border-bottom-left-radius: 4px;
    }

    .typing-cursor {
      display: inline-block;
      width: 2px;
      height: 1em;
      background: var(--accent-color);
      margin-left: 2px;
      animation: blink 0.7s infinite;
      vertical-align: text-bottom;
    }

    @keyframes blink {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0; }
    }

    .reasoning-block {
      margin: 10px 0;
      padding: 12px;
      background: var(--accent-light);
      border-radius: 8px;
      border-left: 3px solid var(--accent-color);
    }

    .reasoning-header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--accent-color);
      cursor: pointer;
      user-select: none;
    }

    .reasoning-content {
      margin-top: 8px;
      font-size: 14px;
      color: var(--text-secondary);
      display: none;
    }

    .reasoning-block.open .reasoning-content {
      display: block;
    }

    .tool-block {
      margin: 10px 0;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      overflow: hidden;
    }

    .tool-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: var(--bg-secondary);
      cursor: pointer;
    }

    .tool-name {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
    }

    .tool-status {
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 10px;
    }

    .tool-status.completed { background: #e8f5e9; color: #2e7d32; }
    .tool-status.error { background: #ffebee; color: #c62828; }
    .tool-status.running { background: #fff3e0; color: #ef6c00; }

    .tool-content {
      padding: 14px;
      display: none;
      font-size: 13px;
    }

    .tool-block.open .tool-content {
      display: block;
    }

    .tool-section {
      margin-bottom: 12px;
    }

    .tool-section-title {
      font-size: 11px;
      text-transform: uppercase;
      color: var(--text-secondary);
      margin-bottom: 6px;
    }

    .tool-code {
      background: var(--bg-primary);
      padding: 10px;
      border-radius: 6px;
      overflow-x: auto;
      font-family: 'Fira Code', monospace;
      font-size: 12px;
    }

    .sources-block {
      margin-top: 12px;
      padding: 12px;
      background: var(--bg-secondary);
      border-radius: 8px;
    }

    .sources-title {
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 8px;
    }

    .source-item {
      display: block;
      padding: 6px 0;
      font-size: 13px;
      color: var(--accent-color);
      text-decoration: none;
      border-bottom: 1px solid var(--border-color);
    }

    .source-item:last-child {
      border-bottom: none;
    }

    .source-item:hover {
      text-decoration: underline;
    }

    .attachments {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }

    .attachment {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      background: var(--bg-secondary);
      border-radius: 6px;
      font-size: 13px;
    }

    .attachment img {
      max-width: 200px;
      max-height: 150px;
      border-radius: 6px;
    }

    .footer {
      text-align: center;
      padding: 20px;
      font-size: 13px;
      color: var(--text-secondary);
      border-top: 1px solid var(--border-color);
    }

    /* Markdown rendering */
    .message-content h1, .message-content h2, .message-content h3 {
      margin: 16px 0 8px;
    }
    .message-content h1 { font-size: 1.4em; }
    .message-content h2 { font-size: 1.2em; }
    .message-content h3 { font-size: 1.1em; }
    
    .message-content code {
      background: var(--bg-secondary);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Fira Code', monospace;
      font-size: 0.9em;
    }

    .message-content pre {
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 14px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 12px 0;
    }

    .message-content pre code {
      background: none;
      padding: 0;
      color: inherit;
    }

    .message-content ul, .message-content ol {
      margin: 8px 0;
      padding-left: 24px;
    }

    .message-content blockquote {
      border-left: 3px solid var(--accent-color);
      margin: 12px 0;
      padding-left: 14px;
      color: var(--text-secondary);
    }

    .message-content a {
      color: var(--accent-color);
    }

    .message-content table {
      border-collapse: collapse;
      margin: 12px 0;
      width: 100%;
    }

    .message-content th, .message-content td {
      border: 1px solid var(--border-color);
      padding: 8px 12px;
      text-align: left;
    }

    .message-content th {
      background: var(--bg-secondary);
    }

    /* Loading shimmer */
    .shimmer {
      background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--bg-primary) 50%, var(--bg-secondary) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    @media (max-width: 600px) {
      .message {
        max-width: 95%;
      }
      .controls {
        flex-direction: column;
        align-items: stretch;
      }
      .progress-container {
        width: 100%;
      }
    }
  `;
}

function getAnimationScript(): string {
  return `
    // State
    let currentIndex = 0;
    let isPlaying = false;
    let speed = 1;
    let typingInterval = null;
    let messageTimeout = null;

    // Elements
    const conversation = document.getElementById('conversation');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const playIcon = document.getElementById('playIcon');
    const pauseIcon = document.getElementById('pauseIcon');
    const restartBtn = document.getElementById('restartBtn');
    const speedSelect = document.getElementById('speedSelect');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    // Initialize
    function init() {
      if (options.showControls) {
        playPauseBtn?.addEventListener('click', togglePlayPause);
        restartBtn?.addEventListener('click', restart);
        speedSelect?.addEventListener('change', (e) => {
          speed = parseFloat(e.target.value);
        });
        progressBar?.addEventListener('input', seekTo);
      }

      if (options.autoPlay) {
        setTimeout(() => play(), 500);
      } else {
        // Show first message immediately
        showMessage(0, false);
      }
    }

    function togglePlayPause() {
      if (isPlaying) {
        pause();
      } else {
        play();
      }
    }

    function play() {
      if (currentIndex >= messages.length) {
        currentIndex = 0;
        conversation.innerHTML = '';
      }
      isPlaying = true;
      updatePlayButton();
      showNextMessage();
    }

    function pause() {
      isPlaying = false;
      updatePlayButton();
      if (typingInterval) clearInterval(typingInterval);
      if (messageTimeout) clearTimeout(messageTimeout);
    }

    function restart() {
      pause();
      currentIndex = 0;
      conversation.innerHTML = '';
      updateProgress();
      play();
    }

    function seekTo() {
      const targetIndex = Math.floor((progressBar.value / 100) * messages.length);
      pause();
      conversation.innerHTML = '';
      
      // Show all messages up to target instantly
      for (let i = 0; i <= targetIndex && i < messages.length; i++) {
        showMessage(i, false);
      }
      currentIndex = targetIndex + 1;
      updateProgress();
    }

    function updatePlayButton() {
      if (playIcon && pauseIcon) {
        playIcon.style.display = isPlaying ? 'none' : 'block';
        pauseIcon.style.display = isPlaying ? 'block' : 'none';
      }
    }

    function updateProgress() {
      if (progressBar) {
        progressBar.value = (currentIndex / messages.length) * 100;
      }
      if (progressText) {
        progressText.textContent = currentIndex + ' / ' + messages.length;
      }
    }

    function showNextMessage() {
      if (!isPlaying || currentIndex >= messages.length) {
        if (currentIndex >= messages.length) {
          pause();
        }
        return;
      }

      showMessage(currentIndex, true);
    }

    function showMessage(index, animated) {
      const msg = messages[index];
      const messageEl = createMessageElement(msg);
      conversation.appendChild(messageEl);
      
      // Scroll to bottom
      conversation.scrollTop = conversation.scrollHeight;

      if (animated && msg.role === 'assistant') {
        // Animate typing for assistant messages
        animateTyping(messageEl, msg, () => {
          currentIndex = index + 1;
          updateProgress();
          messageTimeout = setTimeout(showNextMessage, options.messageDelay / speed);
        });
      } else {
        // Show instantly
        const contentEl = messageEl.querySelector('.message-text');
        if (contentEl) {
          contentEl.innerHTML = renderContent(msg.content);
        }
        renderMessageParts(messageEl, msg.parts);
        
        if (animated) {
          currentIndex = index + 1;
          updateProgress();
          messageTimeout = setTimeout(showNextMessage, options.messageDelay / speed);
        } else {
          currentIndex = index + 1;
          updateProgress();
        }
      }
    }

    function createMessageElement(msg) {
      const div = document.createElement('div');
      div.className = 'message ' + msg.role;
      
      const header = document.createElement('div');
      header.className = 'message-header';
      
      const role = document.createElement('span');
      role.className = 'message-role';
      role.textContent = msg.role === 'user' ? 'You' : 'Assistant';
      header.appendChild(role);
      
      if (options.showTimestamps) {
        const time = document.createElement('span');
        time.textContent = new Date(msg.createdAt).toLocaleTimeString();
        header.appendChild(time);
      }
      
      div.appendChild(header);

      // Attachments
      if (msg.attachments && msg.attachments.length > 0) {
        const attachments = document.createElement('div');
        attachments.className = 'attachments';
        msg.attachments.forEach(att => {
          const attEl = document.createElement('div');
          attEl.className = 'attachment';
          if (att.type === 'image' && att.url) {
            const img = document.createElement('img');
            img.src = att.url;
            img.alt = att.name;
            attEl.appendChild(img);
          } else {
            attEl.textContent = '📎 ' + att.name;
          }
          attachments.appendChild(attEl);
        });
        div.appendChild(attachments);
      }
      
      const content = document.createElement('div');
      content.className = 'message-content';
      
      const textSpan = document.createElement('span');
      textSpan.className = 'message-text';
      content.appendChild(textSpan);
      
      div.appendChild(content);
      
      return div;
    }

    function animateTyping(messageEl, msg, onComplete) {
      const contentEl = messageEl.querySelector('.message-text');
      const content = msg.content;
      let charIndex = 0;
      
      // Add cursor
      const cursor = document.createElement('span');
      cursor.className = 'typing-cursor';
      contentEl.appendChild(cursor);

      const baseInterval = 1000 / options.typingSpeed;
      
      typingInterval = setInterval(() => {
        if (charIndex < content.length) {
          // Remove cursor, add character, re-add cursor
          cursor.remove();
          contentEl.innerHTML = renderContent(content.substring(0, charIndex + 1));
          contentEl.appendChild(cursor);
          charIndex++;
          
          // Scroll to keep up
          conversation.scrollTop = conversation.scrollHeight;
        } else {
          clearInterval(typingInterval);
          cursor.remove();
          
          // Render parts after text animation
          renderMessageParts(messageEl, msg.parts);
          
          onComplete();
        }
      }, baseInterval / speed);
    }

    function renderMessageParts(messageEl, parts) {
      if (!parts || parts.length === 0) return;
      
      const content = messageEl.querySelector('.message-content');
      
      parts.forEach(part => {
        if (part.type === 'reasoning') {
          const block = document.createElement('div');
          block.className = 'reasoning-block';
          block.innerHTML = \`
            <div class="reasoning-header" onclick="this.parentElement.classList.toggle('open')">
              🧠 <span>Thinking\${part.duration ? ' (' + part.duration + 's)' : ''}</span>
              <span style="margin-left:auto">▼</span>
            </div>
            <div class="reasoning-content">\${escapeHtmlJS(part.content)}</div>
          \`;
          content.appendChild(block);
        }
        
        if (part.type === 'tool-invocation') {
          const statusClass = part.state === 'output-available' ? 'completed' : 
                             part.state === 'output-error' ? 'error' : 'running';
          const block = document.createElement('div');
          block.className = 'tool-block';
          block.innerHTML = \`
            <div class="tool-header" onclick="this.parentElement.classList.toggle('open')">
              <span class="tool-name">🔧 \${formatToolNameJS(part.toolName)}</span>
              <span class="tool-status \${statusClass}">\${part.state}</span>
            </div>
            <div class="tool-content">
              <div class="tool-section">
                <div class="tool-section-title">Parameters</div>
                <pre class="tool-code">\${JSON.stringify(part.args, null, 2)}</pre>
              </div>
              \${part.result ? \`
                <div class="tool-section">
                  <div class="tool-section-title">Result</div>
                  <pre class="tool-code">\${typeof part.result === 'string' ? escapeHtmlJS(part.result) : JSON.stringify(part.result, null, 2)}</pre>
                </div>
              \` : ''}
              \${part.errorText ? \`
                <div class="tool-section">
                  <div class="tool-section-title">Error</div>
                  <div style="color:var(--error-color)">\${escapeHtmlJS(part.errorText)}</div>
                </div>
              \` : ''}
            </div>
          \`;
          content.appendChild(block);
        }
        
        if (part.type === 'sources' && part.sources && part.sources.length > 0) {
          const block = document.createElement('div');
          block.className = 'sources-block';
          block.innerHTML = \`
            <div class="sources-title">📚 Sources (\${part.sources.length})</div>
            \${part.sources.map(s => \`<a href="\${s.url}" target="_blank" class="source-item">\${escapeHtmlJS(s.title)}</a>\`).join('')}
          \`;
          content.appendChild(block);
        }
      });
    }

    function renderContent(text) {
      // Simple markdown rendering
      let html = escapeHtmlJS(text);
      
      // Code blocks
      html = html.replace(/\`\`\`([\\s\\S]*?)\`\`\`/g, '<pre><code>$1</code></pre>');
      
      // Inline code
      html = html.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
      
      // Bold
      html = html.replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');
      
      // Italic
      html = html.replace(/\\*([^*]+)\\*/g, '<em>$1</em>');
      
      // Links
      html = html.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2" target="_blank">$1</a>');
      
      // Line breaks
      html = html.replace(/\\n/g, '<br>');
      
      return html;
    }

    function escapeHtmlJS(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function formatToolNameJS(name) {
      return name.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    // Start
    init();
  `;
}
