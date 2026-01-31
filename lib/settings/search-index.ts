import { SettingsSection } from '@/types/settings';

export interface SearchableSetting {
  id: string;
  title: string;
  keywords: string[];
  sectionId: SettingsSection;
  description?: string;
}

export const SETTINGS_SEARCH_INDEX: SearchableSetting[] = [
  {
    id: 'openai-api-key',
    title: 'OpenAI API Key',
    keywords: ['openai', 'gpt', 'token', 'key', 'api'],
    sectionId: 'providers',
    description: 'Configure OpenAI API key and settings'
  },
  {
    id: 'anthropic-api-key',
    title: 'Anthropic API Key',
    keywords: ['anthropic', 'claude', 'token', 'key', 'api'],
    sectionId: 'providers',
  },
  {
    id: 'google-api-key',
    title: 'Google Gemini API Key',
    keywords: ['google', 'gemini', 'palm', 'token', 'key', 'api'],
    sectionId: 'providers',
  },
  {
    id: 'theme-mode',
    title: 'Theme & Appearance',
    keywords: ['dark', 'light', 'system', 'mode', 'color', 'theme'],
    sectionId: 'appearance',
  },
  {
    id: 'font-size',
    title: 'Font Size',
    keywords: ['font', 'text', 'size', 'typography'],
    sectionId: 'appearance',
  },
  {
    id: 'temperature',
    title: 'Default Temperature',
    keywords: ['temperature', 'randomness', 'creative', 'model parameters'],
    sectionId: 'chat',
  },
  {
    id: 'context-length',
    title: 'Context Length',
    keywords: ['context', 'history', 'memory', 'tokens', 'window'],
    sectionId: 'chat',
  },
  {
    id: 'stream-response',
    title: 'Stream Response',
    keywords: ['stream', 'typing', 'effect', 'realtime'],
    sectionId: 'chat',
  },
  {
    id: 'mcp-server',
    title: 'MCP Servers',
    keywords: ['mcp', 'server', 'protocol', 'tools', 'context'],
    sectionId: 'mcp',
  },
  {
    id: 'shortcuts',
    title: 'Keyboard Shortcuts',
    keywords: ['hotkey', 'binding', 'key', 'command'],
    sectionId: 'keyboard',
  },
  {
    id: 'git-config',
    title: 'Git Configuration',
    keywords: ['git', 'version control', 'commit', 'repo', 'repository'],
    sectionId: 'git',
  },
  {
    id: 'ollama-endpoint',
    title: 'Ollama Endpoint',
    keywords: ['ollama', 'local', 'llm', 'endpoint', 'url'],
    sectionId: 'providers',
  },
  {
    id: 'azure-openai',
    title: 'Azure OpenAI',
    keywords: ['azure', 'microsoft', 'openai', 'endpoint', 'deployment'],
    sectionId: 'providers',
  },
  {
    id: 'groq-api-key',
    title: 'Groq API Key',
    keywords: ['groq', 'mixtral', 'llama', 'fast', 'inference'],
    sectionId: 'providers',
  },
  {
    id: 'deepseek-api-key',
    title: 'DeepSeek API Key',
    keywords: ['deepseek', 'coder', 'chat', 'model'],
    sectionId: 'providers',
  },
  {
    id: 'openrouter-api-key',
    title: 'OpenRouter API Key',
    keywords: ['openrouter', 'aggregator', 'models', 'api'],
    sectionId: 'providers',
  },
  {
    id: 'custom-instructions',
    title: 'Custom Instructions',
    keywords: ['system', 'prompt', 'instructions', 'persona', 'behavior'],
    sectionId: 'instructions',
  },
  {
    id: 'memory-settings',
    title: 'Memory Settings',
    keywords: ['memory', 'long term', 'vector', 'recall', 'forget'],
    sectionId: 'memory',
  },
  {
    id: 'speech-to-text',
    title: 'Speech to Text',
    keywords: ['voice', 'speech', 'recognition', 'stt', 'whisper'],
    sectionId: 'speech',
  },
  {
    id: 'text-to-speech',
    title: 'Text to Speech',
    keywords: ['tts', 'voice', 'synthesis', 'speak', 'audio'],
    sectionId: 'speech',
  },
  {
    id: 'safety-settings',
    title: 'Safety Settings',
    keywords: ['safety', 'filter', 'moderation', 'guardrails', 'nsfw'],
    sectionId: 'safety',
  },
  {
    id: 'observability-settings',
    title: 'Observability Settings',
    keywords: ['observability', 'metrics', 'tracing', 'logs', 'analytics', 'langfuse'],
    sectionId: 'observability',
  },
  {
    id: 'agent-trace-viewer',
    title: 'Agent Trace',
    keywords: ['agent trace', 'attribution', 'code provenance', 'trace', 'files', 'artifacts'],
    sectionId: 'agent-trace',
    description: 'View AI attribution traces for generated files and artifacts',
  },
  {
    id: 'cloud-sync',
    title: 'Cloud Sync',
    keywords: ['sync', 'webdav', 'github', 'backup', 'cloud', 'remote', 'synchronize', 'gist'],
    sectionId: 'sync',
    description: 'Sync data across devices via WebDAV or GitHub',
  },
];
