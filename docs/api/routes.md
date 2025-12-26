# Cognia API Routes Documentation

Complete reference for all API routes in the Cognia application.

---

## Table of Contents

- [Search API](#search-api)
  - [POST /api/search](#post-api-search)
  - [POST /api/search/test-connection](#post-api-searchtest-connection)
- [AI Prompt Enhancement API](#ai-prompt-enhancement-api)
  - [POST /api/enhance-builtin-prompt](#post-api-enhance-builtin-prompt)
  - [POST /api/generate-preset](#post-api-generate-preset)
  - [POST /api/optimize-prompt](#post-api-optimize-prompt)
- [Speech API](#speech-api)
  - [POST /api/speech](#post-api-speech)
- [OAuth API](#oauth-api)
  - [GET /api/oauth/openrouter/callback](#get-api-oauthopenroutercallback)
  - [POST /api/oauth/openrouter/exchange](#post-api-oauthopenrouterexchange)

---

## Search API

### POST /api/search

Multi-provider web search endpoint supporting 8 different search providers with automatic fallback.

**Endpoint:** `POST /api/search`

**Description:** Executes web search queries using specified provider or automatic provider selection with fallback support.

**Request Body:**

```typescript
interface SearchRequestBody {
  query: string;                                    // Required: Search query
  provider?: SearchProviderType;                    // Optional: Specific provider to use
  apiKey?: string;                                  // Optional: API key for single provider
  providerSettings?: Record<SearchProviderType, SearchProviderSettings>;  // For multi-provider
  options?: SearchOptions;                          // Optional: Search configuration
}

type SearchProviderType =
  | 'tavily'
  | 'perplexity'
  | 'exa'
  | 'searchapi'
  | 'serpapi'
  | 'bing'
  | 'google'
  | 'brave';

interface SearchOptions {
  maxResults?: number;                              // Default: 10
  searchDepth?: 'basic' | 'advanced' | 'deep';     // Default: 'basic'
  searchType?: 'general' | 'news' | 'academic' | 'images' | 'videos';
  includeAnswer?: boolean;                          // Include AI-generated answer
  includeRawContent?: boolean | 'text' | 'markdown';
  includeDomains?: string[];                        // Whitelist domains
  excludeDomains?: string[];                        // Blacklist domains
  recency?: 'day' | 'week' | 'month' | 'year' | 'any';
  country?: string;                                 // ISO country code
  language?: string;                                // ISO language code
}

interface SearchProviderSettings {
  providerId: SearchProviderType;
  apiKey: string;
  enabled: boolean;
  priority: number;                                 // 1-8, lower = higher priority
  defaultOptions?: Partial<SearchOptions>;
}
```

**Response:**

```typescript
interface SearchResponse {
  provider: SearchProviderType;                     // Provider that returned results
  query: string;                                    // Original query
  answer?: string;                                  // AI-generated answer (if supported)
  results: SearchResult[];                          // Search results array
  responseTime: number;                             // Response time in milliseconds
  totalResults?: number;                            // Total results available
  images?: SearchImage[];                           // Image results (if searchType: 'images')
}

interface SearchResult {
  title: string;                                    // Page title
  url: string;                                      // Page URL
  content: string;                                  // Snippet/extracted content
  score: number;                                    // Relevance score (0-1)
  publishedDate?: string;                           // Publication date
  source?: string;                                  // Source name
  favicon?: string;                                 // Favicon URL
  thumbnail?: string;                               // Thumbnail URL
}

interface SearchImage {
  url: string;                                      // Image URL
  thumbnailUrl?: string;                            // Thumbnail URL
  title?: string;                                   // Image title
  width?: number;                                   // Image width
  height?: number;                                  // Image height
}
```

**Status Codes:**

- `200 OK` - Search completed successfully
- `400 Bad Request` - Missing required fields or invalid parameters
- `500 Internal Server Error` - Search provider error or network failure

**Usage Example:**

```typescript
// Single provider search
async function searchWithSingleProvider() {
  try {
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'Rust programming language tutorial',
        provider: 'tavily',
        apiKey: 'tvly-your-api-key-here',
        options: {
          maxResults: 10,
          searchDepth: 'advanced',
          includeAnswer: true,
          includeRawContent: true,
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Search failed');
    }

    const data: SearchResponse = await response.json();
    console.log(`Found ${data.results.length} results in ${data.responseTime}ms`);

    if (data.answer) {
      console.log('AI Answer:', data.answer);
    }

    return data;
  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }
}

// Multi-provider search with fallback
async function searchWithFallback() {
  try {
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'machine learning trends 2024',
        providerSettings: {
          tavily: {
            providerId: 'tavily',
            apiKey: 'tvly-key1',
            enabled: true,
            priority: 1,
            defaultOptions: { maxResults: 5 }
          },
          brave: {
            providerId: 'brave',
            apiKey: 'BSA-key2',
            enabled: true,
            priority: 2
          }
        },
        options: {
          fallbackEnabled: true,  // Try next provider if first fails
          recency: 'month',
          searchType: 'news'
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'All search providers failed');
    }

    const data: SearchResponse = await response.json();
    console.log(`Results from ${data.provider}:`, data.results.length);

    return data;
  } catch (error) {
    console.error('Multi-provider search error:', error);
    throw error;
  }
}

// Image search
async function searchImages() {
  try {
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'cute cats',
        provider: 'searchapi',
        apiKey: 'your-api-key',
        options: {
          searchType: 'images',
          maxResults: 20
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Image search failed');
    }

    const data: SearchResponse = await response.json();
    console.log(`Found ${data.images?.length || 0} images`);

    return data;
  } catch (error) {
    console.error('Image search error:', error);
    throw error;
  }
}
```

**Provider Features Comparison:**

| Provider | AI Answer | News | Academic | Images | Videos | Domain Filter | Price per Search |
|----------|-----------|------|----------|--------|--------|---------------|------------------|
| Tavily   | Yes       | Yes  | No       | Yes    | No     | Yes           | $0.001           |
| Perplexity | No     | Yes  | No       | No     | No     | Yes           | $0.005           |
| Exa      | Yes       | Yes  | Yes      | No     | No     | Yes           | $0.001           |
| SearchAPI | Yes      | Yes  | Yes      | Yes    | Yes    | Yes           | $0.002           |
| SerpAPI  | No        | Yes  | Yes      | Yes    | Yes    | No            | $0.004           |
| Bing     | No        | Yes  | No       | Yes    | Yes    | No            | $0.003           |
| Google   | No        | No   | No       | Yes    | No     | Yes           | $0.005           |
| Brave    | Yes       | Yes  | No       | Yes    | Yes    | No            | $0.003           |

---

### POST /api/search/test-connection

Tests the validity of a search provider API key.

**Endpoint:** `POST /api/search/test-connection`

**Description:** Validates API key for a specific search provider by making a test request.

**Request Body:**

```typescript
interface TestConnectionRequestBody {
  provider: SearchProviderType;    // Required: Provider to test
  apiKey: string;                  // Required: API key to validate
}
```

**Response:**

```typescript
interface TestConnectionResponse {
  success: boolean;                // true if API key is valid
}
```

**Status Codes:**

- `200 OK` - Test completed (check response body for result)
- `400 Bad Request` - Missing provider or apiKey
- `500 Internal Server Error` - Test failed due to network error

**Usage Example:**

```typescript
async function testSearchProviderConnection() {
  try {
    const response = await fetch('/api/search/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'tavily',
        apiKey: 'tvly-your-api-key-here'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Connection test failed');
    }

    const data: TestConnectionResponse = await response.json();

    if (data.success) {
      console.log('API key is valid!');
    } else {
      console.log('API key is invalid or quota exceeded');
    }

    return data.success;
  } catch (error) {
    console.error('Connection test error:', error);
    return false;
  }
}

// Test multiple providers
async function testAllProviders(providerSettings: Record<string, { apiKey: string }>) {
  const results: Record<string, boolean> = {};

  for (const [provider, settings] of Object.entries(providerSettings)) {
    if (!settings.apiKey) continue;

    results[provider] = await testSearchProviderConnection();
  }

  return results;
}
```

---

## AI Prompt Enhancement API

### POST /api/enhance-builtin-prompt

Enhances existing prompts or generates new quick prompts for presets using AI.

**Endpoint:** `POST /api/enhance-builtin-prompt`

**Description:** Uses AI to either enhance existing preset prompts or generate new ones based on preset context.

**Request Body:**

```typescript
interface EnhanceRequest {
  presetName: string;                    // Required: Name of the preset
  presetDescription?: string;            // Optional: Description of preset purpose
  systemPrompt?: string;                 // Optional: System prompt for context
  existingPrompts?: Array<{              // Optional: Existing prompts to enhance
    name: string;
    content: string;
    description?: string;
  }>;
  action: 'enhance' | 'generate';        // Required: Action to perform
  count?: number;                        // Optional: Number of prompts to generate (default: 3)
  provider: string;                      // Required: AI provider (openai, anthropic, etc.)
  apiKey: string;                        // Required: API key for provider
  baseURL?: string;                      // Optional: Custom base URL
}
```

**Response:**

```typescript
interface EnhanceResponse {
  prompts: Array<{
    name: string;                        // Short descriptive name
    content: string;                     // The actual prompt content
    description: string;                 // Brief description of purpose
  }>;
  usage?: {                              // Token usage information
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
```

**Status Codes:**

- `200 OK` - Prompts enhanced/generated successfully
- `400 Bad Request` - Missing required fields
- `500 Internal Server Error` - AI provider error

**Usage Example:**

```typescript
// Generate new prompts for a preset
async function generatePresetPrompts() {
  try {
    const response = await fetch('/api/enhance-builtin-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        presetName: 'Code Review Assistant',
        presetDescription: 'AI assistant for reviewing code and suggesting improvements',
        systemPrompt: 'You are an expert code reviewer. Analyze code for bugs, performance issues, and best practices.',
        action: 'generate',
        count: 5,
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Prompt generation failed');
    }

    const data: EnhanceResponse = await response.json();
    console.log(`Generated ${data.prompts.length} prompts:`);

    data.prompts.forEach(prompt => {
      console.log(`- ${prompt.name}: ${prompt.description}`);
      console.log(`  ${prompt.content}\n`);
    });

    return data.prompts;
  } catch (error) {
    console.error('Prompt generation error:', error);
    throw error;
  }
}

// Enhance existing prompts
async function enhanceExistingPrompts(existingPrompts: Array<{ name: string; content: string }>) {
  try {
    const response = await fetch('/api/enhance-builtin-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        presetName: 'Creative Writing Coach',
        presetDescription: 'Helps users improve their creative writing',
        systemPrompt: 'You are a creative writing coach providing constructive feedback.',
        existingPrompts,
        action: 'enhance',
        provider: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Prompt enhancement failed');
    }

    const data: EnhanceResponse = await response.json();
    console.log('Enhanced prompts:', data.prompts);

    return data.prompts;
  } catch (error) {
    console.error('Prompt enhancement error:', error);
    throw error;
  }
}
```

---

### POST /api/generate-preset

Generates complete preset configurations using AI based on user description.

**Endpoint:** `POST /api/generate-preset`

**Description:** Creates intelligent preset configurations including system prompt, temperature, mode, and quick prompts from a natural language description.

**Request Body:**

```typescript
interface GenerateRequest {
  description: string;              // Required: Description of desired preset
  provider: string;                 // Required: AI provider to use
  apiKey: string;                   // Required: API key for provider
  baseURL?: string;                 // Optional: Custom base URL
}
```

**Response:**

```typescript
interface GenerateResponse {
  preset: {
    name: string;                   // Concise, descriptive name
    description: string;            // Brief description
    icon: string;                   // Emoji icon
    color: string;                  // Hex color code
    systemPrompt: string;           // Well-crafted system prompt
    temperature: number;            // Recommended temperature (0-2)
    mode: 'chat' | 'agent' | 'research';  // Recommended chat mode
    webSearchEnabled: boolean;      // Whether web search should be enabled
    thinkingEnabled: boolean;       // Whether extended thinking should be enabled
    builtinPrompts: Array<{         // Useful quick prompts
      name: string;
      content: string;
      description?: string;
    }>;
  };
  usage?: {                         // Token usage
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
```

**Status Codes:**

- `200 OK` - Preset generated successfully
- `400 Bad Request` - Missing required fields
- `500 Internal Server Error` - AI provider error

**Usage Example:**

```typescript
async function generatePresetFromDescription() {
  try {
    const response = await fetch('/api/generate-preset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'A math tutor that helps explain calculus concepts to high school students in a friendly way',
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Preset generation failed');
    }

    const data: GenerateResponse = await response.json();
    const preset = data.preset;

    console.log(`Generated preset: ${preset.name}`);
    console.log(`Description: ${preset.description}`);
    console.log(`Icon: ${preset.icon} | Color: ${preset.color}`);
    console.log(`Mode: ${preset.mode} | Temperature: ${preset.temperature}`);
    console.log(`\nSystem Prompt:\n${preset.systemPrompt}`);
    console.log(`\nQuick Prompts (${preset.builtinPrompts.length}):`);

    preset.builtinPrompts.forEach((prompt, i) => {
      console.log(`  ${i + 1}. ${prompt.name}`);
      console.log(`     ${prompt.content}`);
    });

    // Save preset to store
    const { usePresetStore } = await import('@/stores/preset-store');
    usePresetStore.getState().createPreset({
      name: preset.name,
      description: preset.description,
      icon: preset.icon,
      color: preset.color,
      systemPrompt: preset.systemPrompt,
      temperature: preset.temperature,
      mode: preset.mode,
      webSearchEnabled: preset.webSearchEnabled,
      thinkingEnabled: preset.thinkingEnabled,
      builtinPrompts: preset.builtinPrompts
    });

    return preset;
  } catch (error) {
    console.error('Preset generation error:', error);
    throw error;
  }
}

// Generate multiple variations
async function generatePresetVariations(baseDescription: string) {
  const variations = [
    `${baseDescription} with a focus on beginners`,
    `${baseDescription} for advanced users`,
    `${baseDescription} with interactive examples`
  ];

  const presets = await Promise.all(
    variations.map(desc => generatePresetFromDescription())
  );

  return presets;
}
```

---

### POST /api/optimize-prompt

Optimizes and improves system prompts for better AI interactions.

**Endpoint:** `POST /api/optimize-prompt`

**Description:** Enhances system prompts to make them more effective, clear, and comprehensive using AI.

**Request Body:**

```typescript
interface OptimizeRequest {
  prompt: string;                   // Required: System prompt to optimize
  provider: string;                 // Required: AI provider to use
  apiKey: string;                   // Required: API key for provider
  baseURL?: string;                 // Optional: Custom base URL
  model?: string;                   // Optional: Specific model to use
}
```

**Response:**

```typescript
interface OptimizeResponse {
  optimizedPrompt: string;          // The improved system prompt
  usage?: {                         // Token usage
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
```

**Status Codes:**

- `200 OK` - Prompt optimized successfully
- `400 Bad Request` - Missing required fields
- `500 Internal Server Error` - AI provider error

**Usage Example:**

```typescript
async function optimizeSystemPrompt(originalPrompt: string) {
  try {
    const response = await fetch('/api/optimize-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: originalPrompt,
        provider: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: 'claude-3-5-sonnet-20241022'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Prompt optimization failed');
    }

    const data: OptimizeResponse = await response.json();

    console.log('Original prompt:');
    console.log(originalPrompt);
    console.log('\nOptimized prompt:');
    console.log(data.optimizedPrompt);

    // Show comparison
    const originalLength = originalPrompt.length;
    const optimizedLength = data.optimizedPrompt.length;
    const improvement = ((optimizedLength - originalLength) / originalLength * 100).toFixed(1);

    console.log(`\nLength change: ${originalLength} -> ${optimizedLength} (${improvement}%)`);

    return data.optimizedPrompt;
  } catch (error) {
    console.error('Prompt optimization error:', error);
    throw error;
  }
}

// Optimize and save preset
async function optimizeAndUpdatePreset(presetId: string) {
  const { usePresetStore } = await import('@/stores/preset-store');
  const preset = usePresetStore.getState().presets[presetId];

  if (!preset) {
    throw new Error('Preset not found');
  }

  const optimizedPrompt = await optimizeSystemPrompt(preset.systemPrompt);

  usePresetStore.getState().updatePreset(presetId, {
    systemPrompt: optimizedPrompt
  });

  console.log(`Preset "${preset.name}" updated with optimized prompt`);
}
```

---

## Speech API

### POST /api/speech

Transcribes audio files using OpenAI's Whisper API.

**Endpoint:** `POST /api/speech`

**Description:** Converts audio files to text using OpenAI Whisper speech-to-text model.

**Request:** Multipart form data with the following fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| audio | File | Yes | Audio file to transcribe (max 25MB) |
| apiKey | string | No* | OpenAI API key (required if not in env) |
| model | string | No | Whisper model to use (default: "whisper-1") |
| language | string | No | ISO-639-1 language code (e.g., "en", "zh", "es") |
| prompt | string | No | Text to guide transcription style |
| temperature | number | No | Sampling temperature (0-1) |

*Either `apiKey` must be provided or `OPENAI_API_KEY` environment variable must be set.

**Response:**

```typescript
interface SpeechResponse {
  text: string;                     // Transcribed text
  language?: string;                // Detected language code
  duration?: number;                // Audio duration in seconds
}
```

**Status Codes:**

- `200 OK` - Transcription completed successfully
- `400 Bad Request` - Missing audio file, file too large, or empty file
- `401 Unauthorized` - Missing API key
- `500 Internal Server Error` - Whisper API error

**Supported Audio Formats:**

- MP3, MP4, MPEG, M4A, WAV, WEBM
- Maximum file size: 25MB

**Usage Example:**

```typescript
async function transcribeAudioFile(audioFile: File) {
  try {
    // Validate file size
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (audioFile.size > maxSize) {
      throw new Error('Audio file is too large (max 25MB)');
    }

    // Prepare form data
    const formData = new FormData();
    formData.append('audio', audioFile);
    formData.append('model', 'whisper-1');

    // Optional: Specify language for better accuracy
    formData.append('language', 'en');

    // Optional: Add context prompt
    formData.append('prompt', 'This is a conversation about programming');

    const response = await fetch('/api/speech', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Transcription failed');
    }

    const data: SpeechResponse = await response.json();

    console.log('Transcribed text:', data.text);
    console.log('Detected language:', data.language);
    console.log('Duration:', data.duration, 'seconds');

    return data.text;
  } catch (error) {
    console.error('Audio transcription error:', error);
    throw error;
  }
}

// Record and transcribe from microphone
async function recordAndTranscribe() {
  return new Promise((resolve, reject) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      reject(new Error('Microphone access not supported'));
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const mediaRecorder = new MediaRecorder(stream);
        const audioChunks: Blob[] = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const audioFile = new File([audioBlob], 'recording.webm', {
            type: 'audio/webm'
          });

          try {
            const text = await transcribeAudioFile(audioFile);
            resolve(text);
          } catch (error) {
            reject(error);
          }
        };

        // Start recording
        mediaRecorder.start();

        // Stop after 30 seconds
        setTimeout(() => {
          mediaRecorder.stop();
          stream.getTracks().forEach(track => track.stop());
        }, 30000);
      })
      .catch(error => {
        reject(new Error('Microphone access denied'));
      });
  });
}

// Transcribe with custom settings
async function transcribeWithSettings(
  audioFile: File,
  language?: string,
  temperature?: number
) {
  const formData = new FormData();
  formData.append('audio', audioFile);
  formData.append('model', 'whisper-1');

  if (language) {
    // Use ISO-639-1 code (first part of locale)
    const langCode = language.split('-')[0];
    formData.append('language', langCode);
  }

  if (temperature !== undefined) {
    formData.append('temperature', temperature.toString());
  }

  const response = await fetch('/api/speech', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Transcription failed');
  }

  const data: SpeechResponse = await response.json();
  return data.text;
}
```

---

## OAuth API

### GET /api/oauth/openrouter/callback

Handles OAuth callback for OpenRouter authentication.

**Endpoint:** `GET /api/oauth/openrouter/callback`

**Description:** Static HTML page that processes OAuth callback parameters client-side and redirects to settings.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| code | string | Authorization code from OAuth provider |
| error | string | Error code if authorization failed |

**Response:** HTML page with JavaScript that:
1. Extracts OAuth parameters from URL
2. Redirects to `/settings?tab=providers`
3. Passes parameters via URL query strings

**Status Codes:**

- `200 OK` - HTML page returned

**Important Notes:**

- This is a static page for static export compatibility
- Actual OAuth flow is handled client-side
- The page redirects to settings with OAuth parameters

**Usage Flow:**

```typescript
// Client-side OAuth flow
// 1. Initiate OAuth
function initiateOpenRouterOAuth() {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = crypto.randomUUID();

  // Store for later verification
  sessionStorage.setItem('oauth_code_verifier', codeVerifier);
  sessionStorage.setItem('oauth_state', state);

  const params = new URLSearchParams({
    client_id: 'your-client-id',
    redirect_uri: `${window.location.origin}/api/oauth/openrouter/callback`,
    response_type: 'code',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: state
  });

  window.location.href = `https://openrouter.ai/auth?${params}`;
}

// 2. Handle callback (on settings page)
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('oauth_code');
  const error = params.get('oauth_error');

  if (error) {
    console.error('OAuth error:', error);
    return;
  }

  if (code) {
    exchangeCodeForApiKey(code);
  }
}, []);

// 3. Exchange code for API key
async function exchangeCodeForApiKey(code: string) {
  const response = await fetch('/api/oauth/openrouter/exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });

  const data = await response.json();

  if (data.success) {
    // Save API key to settings
    const { useSettingsStore } = await import('@/stores/settings-store');
    useSettingsStore.getState().setProviderSettings('openrouter', {
      apiKey: data.apiKey
    });

    console.log('Successfully authenticated with OpenRouter');
  }
}
```

---

### POST /api/oauth/openrouter/exchange

Exchanges OAuth authorization code for API key using PKCE flow.

**Endpoint:** `POST /api/oauth/openrouter/exchange`

**Description:** For OpenRouter's PKCE flow, the authorization code IS the API key (no additional exchange needed).

**Request Body:**

```typescript
interface ExchangeRequest {
  code: string;                     // Authorization code from callback
  codeVerifier?: string;            // PKCE code verifier (optional, not used by OpenRouter)
}
```

**Response:**

```typescript
interface ExchangeResponse {
  apiKey: string;                   // The API key (same as code for OpenRouter PKCE)
  provider: 'openrouter';           // Provider identifier
  success: boolean;                 // true if exchange succeeded
}
```

**Status Codes:**

- `200 OK` - Exchange completed successfully
- `400 Bad Request` - Missing authorization code
- `500 Internal Server Error` - Exchange failed

**Usage Example:**

```typescript
async function completeOAuthFlow(code: string) {
  try {
    const response = await fetch('/api/oauth/openrouter/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Code exchange failed');
    }

    const data: ExchangeResponse = await response.json();

    if (data.success) {
      // Store API key securely
      const { useSettingsStore } = await import('@/stores/settings-store');

      useSettingsStore.getState().setProviderSettings('openrouter', {
        apiKey: data.apiKey,
        enabled: true
      });

      console.log('Successfully connected OpenRouter account');
      return data.apiKey;
    }
  } catch (error) {
    console.error('OAuth exchange error:', error);
    throw error;
  }
}

// Complete OAuth PKCE flow
async function performOpenRouterPKCEFlow() {
  // Step 1: Generate PKCE parameters
  const codeVerifier = generateRandomString(128);
  const codeChallenge = await sha256(codeVerifier);
  const state = crypto.randomUUID();

  sessionStorage.setItem('oauth_state', state);

  // Step 2: Redirect to OpenRouter
  const authUrl = new URL('https://openrouter.ai/auth');
  authUrl.searchParams.set('client_id', 'your-client-id');
  authUrl.searchParams.set('redirect_uri', `${window.location.origin}/api/oauth/openrouter/callback`);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('state', state);

  window.location.href = authUrl.toString();

  // Step 3: Handle callback (on settings page - see GET /api/oauth/openrouter/callback)
  // Step 4: Exchange code for API key
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('oauth_code');

  if (code) {
    await completeOAuthFlow(code);
  }
}

// Helper functions
function generateRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => charset[byte % charset.length]).join('');
}

async function sha256(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
```

**OpenRouter PKCE Flow Details:**

- OpenRouter uses a simplified PKCE flow where the authorization code IS the API key
- No additional token exchange endpoint is needed
- The code returned in the OAuth callback can be used directly as the API key
- Reference: https://openrouter.ai/docs/use-cases/oauth-pkce

---

## Error Handling

All API routes follow a consistent error response format:

```typescript
interface ErrorResponse {
  error: string;                    // Human-readable error message
}
```

**Common Error Status Codes:**

- `400 Bad Request` - Invalid or missing parameters
- `401 Unauthorized` - Missing or invalid API key
- `500 Internal Server Error` - Server-side error

**Example Error Handling:**

```typescript
async function apiCallWithHandling() {
  try {
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'test' })
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();

      // Handle specific status codes
      switch (response.status) {
        case 400:
          console.error('Invalid request:', error.error);
          break;
        case 401:
          console.error('Authentication failed:', error.error);
          break;
        case 500:
          console.error('Server error:', error.error);
          break;
        default:
          console.error('Unexpected error:', error.error);
      }

      throw new Error(error.error);
    }

    return await response.json();
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError) {
      console.error('Network error - check your connection');
    }
    throw error;
  }
}
```

---

## Static Export Compatibility

**Important:** Cognia uses static export (`output: "export"`) for Tauri desktop deployment.

**Implications:**

1. **API routes only work in development mode** (`pnpm dev`)
2. **Production builds** serve static files from `/out` directory
3. **Tauri desktop app** uses Rust backend for server-side functionality
4. **Client-side features** should work without server-side API routes

**Workarounds for Production:**

- Move server-side logic to Tauri Rust commands (`src-tauri/src/commands/`)
- Use external APIs directly from client-side
- Implement mock responses for development

**Example: Tauri Command Alternative**

```rust
// src-tauri/src/commands/search.rs
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct SearchRequest {
    pub query: String,
    pub provider: String,
    pub api_key: String,
}

#[derive(Serialize)]
pub struct SearchResult {
    pub title: String,
    pub url: String,
    pub content: String,
}

#[tauri::command]
pub async fn search_web(request: SearchRequest) -> Result<Vec<SearchResult>, String> {
    // Perform search using reqwest
    // Return results or error
}
```

```typescript
// Client-side invocation
import { invoke } from '@tauri-apps/api/tauri';

const results = await invoke('search_web', {
  query: 'test',
  provider: 'tavily',
  apiKey: 'tvly-key'
});
```

---

## Rate Limiting & Best Practices

### Rate Limits by Provider

| Provider | Rate Limit | Free Tier |
|----------|------------|-----------|
| Tavily   | 60 req/min | 1,000 searches/month |
| Perplexity | 200 req/day | None |
| Exa      | 100 req/min | 1,000 searches/month |
| SearchAPI | Variable | 100 searches/month |
| SerpAPI  | 100 req/day | 100 searches/month |
| Bing     | 10 req/sec | 1,000 transactions/month |
| Google   | 10 req/sec | 100 queries/day |
| Brave    | 100 req/min | 2,000 queries/month |

### Best Practices

1. **Implement Client-Side Caching**
   ```typescript
   const searchCache = new Map<string, SearchResponse>();

   async function cachedSearch(query: string) {
     if (searchCache.has(query)) {
       return searchCache.get(query);
     }

     const results = await fetch('/api/search', { /* ... */ });
     searchCache.set(query, results);
     return results;
   }
   ```

2. **Use Debouncing for Search Input**
   ```typescript
   import { debounce } from 'lodash';

   const debouncedSearch = debounce(async (query: string) => {
     const results = await performSearch(query);
     displayResults(results);
   }, 500);
   ```

3. **Handle Rate Limit Errors**
   ```typescript
   async function searchWithRetry(query: string, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await performSearch(query);
       } catch (error) {
         if (error.status === 429 && i < maxRetries - 1) {
           const delay = Math.pow(2, i) * 1000; // Exponential backoff
           await new Promise(resolve => setTimeout(resolve, delay));
         } else {
           throw error;
         }
       }
     }
   }
   ```

4. **Validate Input Before API Calls**
   ```typescript
   function validateSearchQuery(query: string): boolean {
     if (!query || query.trim().length < 2) {
       throw new Error('Query must be at least 2 characters');
     }
     if (query.length > 400) {
       throw new Error('Query is too long (max 400 characters)');
     }
     return true;
   }
   ```

---

## Security Considerations

### API Key Management

1. **Never expose API keys in client-side code**
   - Store keys in environment variables (`NEXT_PUBLIC_` prefix for client access)
   - Use Tauri's secure storage for desktop apps
   - Implement server-side proxy routes for sensitive operations

2. **Validate API Keys Server-Side**
   ```typescript
   // Route handler validation
   if (!apiKey || !apiKey.startsWith('tvly-')) {
     return NextResponse.json(
       { error: 'Invalid API key format' },
       { status: 400 }
     );
   }
   ```

3. **Implement Request Signing for Production**
   ```typescript
   import { signRequest } from '@/lib/security';

   const signature = signRequest(apiKey, request.body);
   headers.set('X-Signature', signature);
   ```

### Input Sanitization

```typescript
// Sanitize search queries
function sanitizeQuery(query: string): string {
  return query
    .trim()
    .replace(/[<>]/g, '') // Remove HTML tags
    .slice(0, 400);       // Limit length
}
```

### CORS Configuration

For development, configure `next.config.ts`:

```typescript
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
        ],
      },
    ];
  },
};
```

---

## Testing API Routes

### Unit Testing Example

```typescript
// __tests__/api/search.test.ts
import { POST } from '@/app/api/search/route';
import { NextRequest } from 'next/server';

describe('POST /api/search', () => {
  it('should return 400 for missing query', async () => {
    const request = new NextRequest('http://localhost:3000/api/search', {
      method: 'POST',
      body: JSON.stringify({ provider: 'tavily', apiKey: 'test' })
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe('Query is required');
  });

  it('should return search results for valid request', async () => {
    const request = new NextRequest('http://localhost:3000/api/search', {
      method: 'POST',
      body: JSON.stringify({
        query: 'test query',
        provider: 'tavily',
        apiKey: 'tvly-test-key'
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('results');
    expect(data).toHaveProperty('provider');
  });
});
```

### Integration Testing Example

```typescript
// e2e/api-routes.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Search API', () => {
  test('should perform search', async ({ request }) => {
    const response = await request.post('/api/search', {
      data: {
        query: 'playwright testing',
        provider: 'tavily',
        apiKey: process.env.TEST_TAVILY_API_KEY
      }
    });

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.results).toBeInstanceOf(Array);
    expect(data.results.length).toBeGreaterThan(0);
  });
});
```

---

## Additional Resources

- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Tauri Command Documentation](https://tauri.app/v1/guides/features/command)
- [Vercel AI SDK](https://sdk.vercel.ai)
- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [OpenRouter OAuth Documentation](https://openrouter.ai/docs/use-cases/oauth-pkce)

---

**Last Updated:** December 25, 2024
**API Version:** 1.0.0
**Maintainer:** Cognia Development Team
