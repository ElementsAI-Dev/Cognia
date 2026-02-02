/**
 * Agent Demo Export - Export agent workflow as interactive animated demonstration
 * 
 * Creates standalone HTML with simulated running animations showing:
 * - Step-by-step execution
 * - Tool call animations
 * - Thinking process visualization
 * - Timeline progress
 * - Parallel execution visualization
 */

import type { BackgroundAgent, BackgroundAgentStep } from '@/types/agent/background-agent';

export interface AgentDemoOptions {
  autoPlay: boolean;
  playbackSpeed: number; // 0.5 - 4
  showTimeline: boolean;
  showToolDetails: boolean;
  showThinkingProcess: boolean;
  animationStyle: 'smooth' | 'stepped' | 'typewriter';
  highlightActiveStep: boolean;
  theme: 'light' | 'dark' | 'system';
  showControls: boolean;
  compactMode: boolean;
}

const DEFAULT_OPTIONS: AgentDemoOptions = {
  autoPlay: false,
  playbackSpeed: 1,
  showTimeline: true,
  showToolDetails: true,
  showThinkingProcess: true,
  animationStyle: 'smooth',
  highlightActiveStep: true,
  theme: 'system',
  showControls: true,
  compactMode: false,
};

/**
 * Export agent workflow as interactive HTML demo
 */
export function exportAgentDemo(
  agent: BackgroundAgent,
  options: Partial<AgentDemoOptions> = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const agentJSON = JSON.stringify({
    id: agent.id,
    name: agent.name,
    task: agent.task,
    status: agent.status,
    steps: agent.steps.map(step => ({
      stepNumber: step.stepNumber,
      type: step.type,
      title: step.title,
      description: step.description,
      status: step.status,
      duration: step.duration,
      toolCalls: step.toolCalls,
      response: step.response,
      startedAt: step.startedAt,
      completedAt: step.completedAt,
    })),
    subAgents: agent.subAgents.map(sa => ({
      id: sa.id,
      name: sa.name,
      task: sa.task,
      status: sa.status,
    })),
    result: agent.result,
    createdAt: agent.createdAt,
    startedAt: agent.startedAt,
    completedAt: agent.completedAt,
  });

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agent 工作流演示 - ${escapeHtml(agent.name)}</title>
  <style>
${getAgentDemoStyles(opts)}
  </style>
</head>
<body>
  <div id="app">
    <header class="header">
      <div class="header-content">
        <div class="agent-info">
          <div class="agent-icon">🤖</div>
          <div class="agent-details">
            <h1 class="agent-name">${escapeHtml(agent.name)}</h1>
            <p class="agent-task">${escapeHtml(agent.task)}</p>
          </div>
        </div>
        <div class="agent-status status-${agent.status}">
          <span class="status-dot"></span>
          <span class="status-text">${getStatusText(agent.status)}</span>
        </div>
      </div>
      
      ${opts.showControls ? `
      <div class="controls">
        <button id="playPauseBtn" class="control-btn primary" title="播放/暂停">
          <svg id="playIcon" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          <svg id="pauseIcon" viewBox="0 0 24 24" fill="currentColor" style="display:none"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
        </button>
        <button id="restartBtn" class="control-btn" title="重新开始">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>
        </button>
        <button id="stepBtn" class="control-btn" title="下一步">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
        </button>
        <div class="speed-control">
          <label>速度:</label>
          <select id="speedSelect">
            <option value="0.5">0.5x</option>
            <option value="1" ${opts.playbackSpeed === 1 ? 'selected' : ''}>1x</option>
            <option value="2" ${opts.playbackSpeed === 2 ? 'selected' : ''}>2x</option>
            <option value="4">4x</option>
          </select>
        </div>
        <div class="progress-info">
          <span id="currentStep">0</span> / <span id="totalSteps">${agent.steps.length}</span> 步骤
        </div>
      </div>
      ` : ''}
      
      ${opts.showTimeline ? `
      <div class="timeline-container">
        <div class="timeline-track">
          <div class="timeline-progress" id="timelineProgress"></div>
          ${agent.steps.map((step, idx) => `
            <div class="timeline-marker" data-step="${idx}" style="left: ${(idx / Math.max(agent.steps.length - 1, 1)) * 100}%">
              <span class="marker-icon">${getStepIcon(step.type)}</span>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
    </header>

    <main class="workflow-container" id="workflow">
      <div class="steps-list" id="stepsList">
        <!-- Steps will be rendered here -->
      </div>
    </main>

    <footer class="footer">
      <div class="footer-info">
        <span>总耗时: <strong id="totalDuration">-</strong></span>
        <span>步骤数: <strong>${agent.steps.length}</strong></span>
        ${agent.subAgents.length > 0 ? `<span>子Agent: <strong>${agent.subAgents.length}</strong></span>` : ''}
      </div>
      <p class="export-info">导出自 Cognia · ${new Date().toLocaleString()}</p>
    </footer>
  </div>

  <script>
    const agent = ${agentJSON};
    const options = ${JSON.stringify(opts)};
    
${getAgentDemoScript()}
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

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    pending: '等待中',
    queued: '排队中',
    running: '执行中',
    completed: '已完成',
    failed: '已失败',
    paused: '已暂停',
    cancelled: '已取消',
  };
  return statusMap[status] || status;
}

function getStepIcon(type: BackgroundAgentStep['type']): string {
  const iconMap: Record<string, string> = {
    thinking: '🤔',
    tool_call: '🔧',
    sub_agent: '🤖',
    response: '💬',
  };
  return iconMap[type] || '•';
}

function getAgentDemoStyles(opts: AgentDemoOptions): string {
  const isDark = opts.theme === 'dark';
  
  return `
    :root {
      --bg-primary: ${isDark ? '#0f0f0f' : '#f8fafc'};
      --bg-secondary: ${isDark ? '#1a1a1a' : '#ffffff'};
      --bg-tertiary: ${isDark ? '#262626' : '#f1f5f9'};
      --text-primary: ${isDark ? '#f1f5f9' : '#0f172a'};
      --text-secondary: ${isDark ? '#94a3b8' : '#64748b'};
      --border-color: ${isDark ? '#333333' : '#e2e8f0'};
      --accent-color: #3b82f6;
      --accent-light: ${isDark ? '#1e3a5f' : '#dbeafe'};
      --success-color: #22c55e;
      --error-color: #ef4444;
      --warning-color: #f59e0b;
      --thinking-color: #8b5cf6;
      --tool-color: #10b981;
      --agent-color: #3b82f6;
      --response-color: #ec4899;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        ${opts.theme === 'system' ? `
        --bg-primary: #0f0f0f;
        --bg-secondary: #1a1a1a;
        --bg-tertiary: #262626;
        --text-primary: #f1f5f9;
        --text-secondary: #94a3b8;
        --border-color: #333333;
        --accent-light: #1e3a5f;
        ` : ''}
      }
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', Roboto, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      min-height: 100vh;
    }

    #app {
      max-width: 1000px;
      margin: 0 auto;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .header {
      position: sticky;
      top: 0;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      padding: 20px;
      z-index: 100;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .agent-info {
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }

    .agent-icon {
      width: 56px;
      height: 56px;
      background: var(--accent-light);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
    }

    .agent-name {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .agent-task {
      color: var(--text-secondary);
      font-size: 14px;
      max-width: 500px;
    }

    .agent-status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .status-running { background: var(--warning-color)20; color: var(--warning-color); }
    .status-running .status-dot { background: var(--warning-color); animation: pulse 1.5s infinite; }
    .status-completed { background: var(--success-color)20; color: var(--success-color); }
    .status-completed .status-dot { background: var(--success-color); }
    .status-failed { background: var(--error-color)20; color: var(--error-color); }
    .status-failed .status-dot { background: var(--error-color); }
    .status-pending { background: var(--text-secondary)20; color: var(--text-secondary); }
    .status-pending .status-dot { background: var(--text-secondary); }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.2); }
    }

    .controls {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .control-btn {
      width: 40px;
      height: 40px;
      border: 1px solid var(--border-color);
      background: var(--bg-tertiary);
      border-radius: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-primary);
      transition: all 0.2s;
    }

    .control-btn:hover {
      background: var(--accent-light);
      border-color: var(--accent-color);
    }

    .control-btn.primary {
      background: var(--accent-color);
      border-color: var(--accent-color);
      color: white;
    }

    .control-btn.primary:hover {
      filter: brightness(1.1);
    }

    .control-btn svg {
      width: 20px;
      height: 20px;
    }

    .speed-control {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: var(--text-secondary);
    }

    .speed-control select {
      padding: 8px 12px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: var(--bg-tertiary);
      color: var(--text-primary);
      cursor: pointer;
    }

    .progress-info {
      margin-left: auto;
      font-size: 14px;
      color: var(--text-secondary);
    }

    .timeline-container {
      padding: 12px 0;
    }

    .timeline-track {
      position: relative;
      height: 40px;
      background: var(--bg-tertiary);
      border-radius: 20px;
      overflow: visible;
    }

    .timeline-progress {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      background: linear-gradient(90deg, var(--accent-color), var(--thinking-color));
      border-radius: 20px;
      width: 0;
      transition: width 0.3s ease;
    }

    .timeline-marker {
      position: absolute;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 32px;
      height: 32px;
      background: var(--bg-secondary);
      border: 2px solid var(--border-color);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.3s;
      z-index: 1;
    }

    .timeline-marker:hover {
      transform: translate(-50%, -50%) scale(1.2);
      border-color: var(--accent-color);
    }

    .timeline-marker.active {
      background: var(--accent-color);
      border-color: var(--accent-color);
      transform: translate(-50%, -50%) scale(1.2);
    }

    .timeline-marker.completed {
      background: var(--success-color);
      border-color: var(--success-color);
    }

    .workflow-container {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
    }

    .steps-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .step-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      overflow: hidden;
      opacity: 0.4;
      transform: translateY(20px);
      transition: all 0.4s ease;
    }

    .step-card.visible {
      opacity: 1;
      transform: translateY(0);
    }

    .step-card.active {
      border-color: var(--accent-color);
      box-shadow: 0 0 0 3px var(--accent-color)20;
    }

    .step-card.completed {
      opacity: 1;
    }

    .step-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      background: var(--bg-tertiary);
      cursor: pointer;
    }

    .step-icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }

    .step-type-thinking .step-icon { background: var(--thinking-color)20; }
    .step-type-tool_call .step-icon { background: var(--tool-color)20; }
    .step-type-sub_agent .step-icon { background: var(--agent-color)20; }
    .step-type-response .step-icon { background: var(--response-color)20; }

    .step-info {
      flex: 1;
    }

    .step-title {
      font-weight: 600;
      font-size: 15px;
      margin-bottom: 2px;
    }

    .step-meta {
      display: flex;
      gap: 12px;
      font-size: 13px;
      color: var(--text-secondary);
    }

    .step-status {
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 12px;
    }

    .step-status-completed { background: var(--success-color)20; color: var(--success-color); }
    .step-status-running { background: var(--warning-color)20; color: var(--warning-color); }
    .step-status-failed { background: var(--error-color)20; color: var(--error-color); }
    .step-status-pending { background: var(--text-secondary)20; color: var(--text-secondary); }

    .step-content {
      padding: 16px 20px;
      display: none;
      border-top: 1px solid var(--border-color);
    }

    .step-card.expanded .step-content {
      display: block;
    }

    .step-description {
      color: var(--text-secondary);
      font-size: 14px;
      margin-bottom: 12px;
    }

    .tool-calls {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .tool-call {
      background: var(--bg-tertiary);
      border-radius: 12px;
      padding: 14px;
    }

    .tool-call-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }

    .tool-name {
      font-weight: 600;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .tool-status {
      font-size: 12px;
      padding: 3px 8px;
      border-radius: 8px;
    }

    .tool-args, .tool-result {
      background: var(--bg-primary);
      border-radius: 8px;
      padding: 12px;
      font-family: 'Fira Code', monospace;
      font-size: 12px;
      overflow-x: auto;
      margin-top: 8px;
    }

    .tool-section-title {
      font-size: 11px;
      text-transform: uppercase;
      color: var(--text-secondary);
      margin: 12px 0 6px;
      letter-spacing: 0.5px;
    }

    .thinking-content {
      background: var(--thinking-color)10;
      border-left: 3px solid var(--thinking-color);
      padding: 12px 16px;
      border-radius: 0 8px 8px 0;
      font-size: 14px;
      color: var(--text-secondary);
      white-space: pre-wrap;
    }

    .typing-indicator {
      display: inline-flex;
      gap: 4px;
      padding: 8px 12px;
      background: var(--bg-tertiary);
      border-radius: 16px;
    }

    .typing-dot {
      width: 8px;
      height: 8px;
      background: var(--accent-color);
      border-radius: 50%;
      animation: typingBounce 1.4s infinite ease-in-out both;
    }

    .typing-dot:nth-child(1) { animation-delay: -0.32s; }
    .typing-dot:nth-child(2) { animation-delay: -0.16s; }
    .typing-dot:nth-child(3) { animation-delay: 0s; }

    @keyframes typingBounce {
      0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
      40% { transform: scale(1); opacity: 1; }
    }

    .footer {
      padding: 20px;
      text-align: center;
      border-top: 1px solid var(--border-color);
      background: var(--bg-secondary);
    }

    .footer-info {
      display: flex;
      justify-content: center;
      gap: 24px;
      margin-bottom: 8px;
      font-size: 14px;
      color: var(--text-secondary);
    }

    .export-info {
      font-size: 12px;
      color: var(--text-secondary);
    }

    @media (max-width: 600px) {
      .header-content {
        flex-direction: column;
        gap: 12px;
      }
      .agent-status {
        align-self: flex-start;
      }
      .controls {
        flex-direction: column;
        align-items: stretch;
      }
      .progress-info {
        margin-left: 0;
        text-align: center;
      }
    }
  `;
}

function getAgentDemoScript(): string {
  return `
    // State
    let currentStepIndex = -1;
    let isPlaying = false;
    let speed = options.playbackSpeed;
    let animationTimeout = null;

    // DOM Elements
    const stepsList = document.getElementById('stepsList');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const playIcon = document.getElementById('playIcon');
    const pauseIcon = document.getElementById('pauseIcon');
    const restartBtn = document.getElementById('restartBtn');
    const stepBtn = document.getElementById('stepBtn');
    const speedSelect = document.getElementById('speedSelect');
    const currentStepEl = document.getElementById('currentStep');
    const totalDurationEl = document.getElementById('totalDuration');
    const timelineProgress = document.getElementById('timelineProgress');

    // Initialize
    function init() {
      renderSteps();
      setupEventListeners();
      calculateTotalDuration();
      
      if (options.autoPlay) {
        setTimeout(() => play(), 500);
      }
    }

    function setupEventListeners() {
      playPauseBtn?.addEventListener('click', togglePlayPause);
      restartBtn?.addEventListener('click', restart);
      stepBtn?.addEventListener('click', nextStep);
      speedSelect?.addEventListener('change', (e) => {
        speed = parseFloat(e.target.value);
      });

      // Timeline marker clicks
      document.querySelectorAll('.timeline-marker').forEach(marker => {
        marker.addEventListener('click', () => {
          const stepIndex = parseInt(marker.dataset.step);
          jumpToStep(stepIndex);
        });
      });
    }

    function renderSteps() {
      stepsList.innerHTML = agent.steps.map((step, idx) => \`
        <div class="step-card step-type-\${step.type}" id="step-\${idx}" data-step="\${idx}">
          <div class="step-header" onclick="toggleStep(\${idx})">
            <div class="step-icon">\${getStepIcon(step.type)}</div>
            <div class="step-info">
              <div class="step-title">\${escapeHtml(step.title)}</div>
              <div class="step-meta">
                <span>\${getStepTypeName(step.type)}</span>
                \${step.duration ? \`<span>\${formatDuration(step.duration)}</span>\` : ''}
              </div>
            </div>
            <div class="step-status step-status-\${step.status}">\${getStatusName(step.status)}</div>
          </div>
          <div class="step-content">
            \${step.description ? \`<p class="step-description">\${escapeHtml(step.description)}</p>\` : ''}
            \${renderStepDetails(step)}
          </div>
        </div>
      \`).join('');
    }

    function renderStepDetails(step) {
      if (step.type === 'thinking' && step.content) {
        return \`<div class="thinking-content">\${escapeHtml(step.content)}</div>\`;
      }
      
      if (step.type === 'tool_call' && step.toolCalls && step.toolCalls.length > 0) {
        return \`
          <div class="tool-calls">
            \${step.toolCalls.map(tc => \`
              <div class="tool-call">
                <div class="tool-call-header">
                  <span class="tool-name">🔧 \${escapeHtml(tc.name)}</span>
                  <span class="tool-status step-status-\${tc.status}">\${getStatusName(tc.status)}</span>
                </div>
                \${tc.args ? \`
                  <div class="tool-section-title">参数</div>
                  <pre class="tool-args">\${JSON.stringify(tc.args, null, 2)}</pre>
                \` : ''}
                \${tc.result ? \`
                  <div class="tool-section-title">结果</div>
                  <pre class="tool-result">\${typeof tc.result === 'string' ? escapeHtml(tc.result) : JSON.stringify(tc.result, null, 2)}</pre>
                \` : ''}
              </div>
            \`).join('')}
          </div>
        \`;
      }
      
      if (step.content) {
        return \`<div class="step-description">\${escapeHtml(step.content)}</div>\`;
      }
      
      return '';
    }

    function getStepIcon(type) {
      const icons = { thinking: '🤔', tool_call: '🔧', sub_agent: '🤖', response: '💬' };
      return icons[type] || '•';
    }

    function getStepTypeName(type) {
      const names = { thinking: '思考', tool_call: '工具调用', sub_agent: '子Agent', response: '回复' };
      return names[type] || type;
    }

    function getStatusName(status) {
      const names = { pending: '等待', running: '执行中', completed: '完成', failed: '失败' };
      return names[status] || status;
    }

    function formatDuration(ms) {
      if (ms < 1000) return ms + 'ms';
      if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
      return Math.floor(ms / 60000) + 'm ' + Math.floor((ms % 60000) / 1000) + 's';
    }

    function escapeHtml(text) {
      if (!text) return '';
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function calculateTotalDuration() {
      const total = agent.steps.reduce((sum, step) => sum + (step.duration || 0), 0);
      if (totalDurationEl) {
        totalDurationEl.textContent = formatDuration(total);
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
      isPlaying = true;
      updatePlayButton();
      
      if (currentStepIndex >= agent.steps.length - 1) {
        currentStepIndex = -1;
        resetAllSteps();
      }
      
      playNextStep();
    }

    function pause() {
      isPlaying = false;
      updatePlayButton();
      if (animationTimeout) {
        clearTimeout(animationTimeout);
      }
    }

    function restart() {
      pause();
      currentStepIndex = -1;
      resetAllSteps();
      updateProgress();
      play();
    }

    function nextStep() {
      if (currentStepIndex < agent.steps.length - 1) {
        showStep(currentStepIndex + 1);
      }
    }

    function jumpToStep(index) {
      pause();
      resetAllSteps();
      
      for (let i = 0; i <= index; i++) {
        const stepCard = document.getElementById('step-' + i);
        if (stepCard) {
          stepCard.classList.add('visible', 'completed');
        }
        updateTimelineMarker(i, 'completed');
      }
      
      currentStepIndex = index;
      updateProgress();
    }

    function playNextStep() {
      if (!isPlaying) return;
      
      currentStepIndex++;
      
      if (currentStepIndex >= agent.steps.length) {
        pause();
        return;
      }
      
      showStep(currentStepIndex);
      
      const step = agent.steps[currentStepIndex];
      const delay = (step.duration || 1500) / speed;
      
      animationTimeout = setTimeout(playNextStep, Math.min(delay, 3000));
    }

    function showStep(index) {
      currentStepIndex = index;
      const step = agent.steps[index];
      const stepCard = document.getElementById('step-' + index);
      
      // Remove active from all
      document.querySelectorAll('.step-card').forEach(el => {
        el.classList.remove('active');
      });
      
      if (stepCard) {
        stepCard.classList.add('visible', 'active');
        
        // Expand current step
        stepCard.classList.add('expanded');
        
        // Scroll into view
        stepCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Mark as completed after animation
        setTimeout(() => {
          stepCard.classList.add('completed');
          stepCard.classList.remove('active');
          updateTimelineMarker(index, 'completed');
        }, 500);
      }
      
      updateProgress();
      updateTimelineMarker(index, 'active');
    }

    function resetAllSteps() {
      document.querySelectorAll('.step-card').forEach(el => {
        el.classList.remove('visible', 'active', 'completed', 'expanded');
      });
      document.querySelectorAll('.timeline-marker').forEach(el => {
        el.classList.remove('active', 'completed');
      });
      if (timelineProgress) {
        timelineProgress.style.width = '0';
      }
    }

    function updatePlayButton() {
      if (playIcon && pauseIcon) {
        playIcon.style.display = isPlaying ? 'none' : 'block';
        pauseIcon.style.display = isPlaying ? 'block' : 'none';
      }
    }

    function updateProgress() {
      if (currentStepEl) {
        currentStepEl.textContent = Math.max(0, currentStepIndex + 1);
      }
      if (timelineProgress && agent.steps.length > 0) {
        const progress = ((currentStepIndex + 1) / agent.steps.length) * 100;
        timelineProgress.style.width = progress + '%';
      }
    }

    function updateTimelineMarker(index, status) {
      const marker = document.querySelector('.timeline-marker[data-step="' + index + '"]');
      if (marker) {
        marker.classList.remove('active', 'completed');
        marker.classList.add(status);
      }
    }

    function toggleStep(index) {
      const stepCard = document.getElementById('step-' + index);
      if (stepCard) {
        stepCard.classList.toggle('expanded');
      }
    }

    // Start
    init();
  `;
}

/**
 * Export agent workflow as simplified markdown for sharing
 */
export function exportAgentAsMarkdown(
  agent: BackgroundAgent,
  options: { includeDetails?: boolean } = {}
): string {
  const { includeDetails = true } = options;
  
  const lines: string[] = [];
  
  lines.push(`# 🤖 ${agent.name}`);
  lines.push('');
  lines.push(`**任务**: ${agent.task}`);
  lines.push(`**状态**: ${getStatusText(agent.status)}`);
  lines.push(`**步骤数**: ${agent.steps.length}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 执行步骤');
  lines.push('');
  
  for (const step of agent.steps) {
    const icon = getStepIcon(step.type);
    const status = step.status === 'completed' ? '✅' : step.status === 'failed' ? '❌' : '⏳';
    
    lines.push(`### ${icon} ${step.title} ${status}`);
    
    if (includeDetails) {
      if (step.description) {
        lines.push('');
        lines.push(`> ${step.description}`);
      }
      
      if (step.duration) {
        lines.push('');
        lines.push(`*耗时: ${formatDuration(step.duration)}*`);
      }
      
      if (step.toolCalls && step.toolCalls.length > 0) {
        lines.push('');
        lines.push('**工具调用:**');
        for (const tc of step.toolCalls) {
          lines.push(`- \`${tc.name}\` - ${tc.status === 'completed' ? '成功' : tc.status}`);
        }
      }
    }
    
    lines.push('');
  }
  
  lines.push('---');
  lines.push(`*导出自 Cognia - ${new Date().toLocaleString()}*`);
  
  return lines.join('\n');
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}
