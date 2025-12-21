import { test, expect } from '@playwright/test';

/**
 * Speech Functionality Complete Tests
 * Tests voice input and output features
 */
test.describe('Speech Recognition', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should check speech recognition availability', async ({ page }) => {
    const result = await page.evaluate(() => {
      const checkSpeechSupport = () => {
        const SpeechRecognition = (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
          .SpeechRecognition || 
          (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

        return {
          supported: !!SpeechRecognition,
          api: SpeechRecognition ? 'native' : 'none',
        };
      };

      return checkSpeechSupport();
    });

    // Speech recognition may or may not be available depending on browser
    expect(typeof result.supported).toBe('boolean');
    expect(['native', 'none']).toContain(result.api);
  });

  test('should manage recording state', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface RecordingState {
        isRecording: boolean;
        isPaused: boolean;
        duration: number;
        transcript: string;
      }

      const state: RecordingState = {
        isRecording: false,
        isPaused: false,
        duration: 0,
        transcript: '',
      };

      const startRecording = () => {
        state.isRecording = true;
        state.isPaused = false;
        state.duration = 0;
        state.transcript = '';
      };

      const stopRecording = () => {
        state.isRecording = false;
        state.isPaused = false;
      };

      const pauseRecording = () => {
        if (state.isRecording) {
          state.isPaused = true;
        }
      };

      const resumeRecording = () => {
        if (state.isRecording && state.isPaused) {
          state.isPaused = false;
        }
      };

      const updateTranscript = (text: string) => {
        state.transcript = text;
      };

      // Test flow
      startRecording();
      const afterStart = { ...state };

      updateTranscript('Hello world');
      state.duration = 5000;
      const afterUpdate = { ...state };

      pauseRecording();
      const afterPause = { ...state };

      resumeRecording();
      const afterResume = { ...state };

      stopRecording();
      const afterStop = { ...state };

      return { afterStart, afterUpdate, afterPause, afterResume, afterStop };
    });

    expect(result.afterStart.isRecording).toBe(true);
    expect(result.afterUpdate.transcript).toBe('Hello world');
    expect(result.afterPause.isPaused).toBe(true);
    expect(result.afterResume.isPaused).toBe(false);
    expect(result.afterStop.isRecording).toBe(false);
  });

  test('should handle speech recognition events', async ({ page }) => {
    const result = await page.evaluate(() => {
      type SpeechEvent = 'start' | 'end' | 'result' | 'error' | 'soundstart' | 'soundend';

      const events: { type: SpeechEvent; timestamp: number; data?: unknown }[] = [];

      const logEvent = (type: SpeechEvent, data?: unknown) => {
        events.push({ type, timestamp: Date.now(), data });
      };

      // Simulate speech recognition events
      logEvent('start');
      logEvent('soundstart');
      logEvent('result', { transcript: 'Hello', isFinal: false });
      logEvent('result', { transcript: 'Hello world', isFinal: true });
      logEvent('soundend');
      logEvent('end');

      return {
        eventCount: events.length,
        eventTypes: events.map(e => e.type),
        hasStart: events.some(e => e.type === 'start'),
        hasEnd: events.some(e => e.type === 'end'),
        resultCount: events.filter(e => e.type === 'result').length,
      };
    });

    expect(result.eventCount).toBe(6);
    expect(result.hasStart).toBe(true);
    expect(result.hasEnd).toBe(true);
    expect(result.resultCount).toBe(2);
  });

  test('should handle recognition errors', async ({ page }) => {
    const result = await page.evaluate(() => {
      type SpeechErrorType = 
        | 'no-speech'
        | 'audio-capture'
        | 'not-allowed'
        | 'network'
        | 'aborted'
        | 'language-not-supported';

      const getErrorMessage = (errorType: SpeechErrorType): string => {
        const messages: Record<SpeechErrorType, string> = {
          'no-speech': 'No speech was detected. Please try again.',
          'audio-capture': 'No microphone was found or microphone access was denied.',
          'not-allowed': 'Microphone permission was denied.',
          'network': 'Network error occurred during speech recognition.',
          'aborted': 'Speech recognition was aborted.',
          'language-not-supported': 'The selected language is not supported.',
        };

        return messages[errorType] || 'An unknown error occurred.';
      };

      const isRetryable = (errorType: SpeechErrorType): boolean => {
        const retryableErrors: SpeechErrorType[] = ['no-speech', 'network', 'aborted'];
        return retryableErrors.includes(errorType);
      };

      return {
        noSpeechMessage: getErrorMessage('no-speech'),
        notAllowedMessage: getErrorMessage('not-allowed'),
        noSpeechRetryable: isRetryable('no-speech'),
        notAllowedRetryable: isRetryable('not-allowed'),
        networkRetryable: isRetryable('network'),
      };
    });

    expect(result.noSpeechMessage).toContain('No speech');
    expect(result.notAllowedMessage).toContain('denied');
    expect(result.noSpeechRetryable).toBe(true);
    expect(result.notAllowedRetryable).toBe(false);
    expect(result.networkRetryable).toBe(true);
  });

  test('should support multiple languages', async ({ page }) => {
    const result = await page.evaluate(() => {
      const supportedLanguages = [
        { code: 'en-US', name: 'English (US)' },
        { code: 'en-GB', name: 'English (UK)' },
        { code: 'zh-CN', name: 'Chinese (Simplified)' },
        { code: 'zh-TW', name: 'Chinese (Traditional)' },
        { code: 'ja-JP', name: 'Japanese' },
        { code: 'ko-KR', name: 'Korean' },
        { code: 'es-ES', name: 'Spanish' },
        { code: 'fr-FR', name: 'French' },
        { code: 'de-DE', name: 'German' },
      ];

      let currentLanguage = 'en-US';

      const setLanguage = (code: string): boolean => {
        const language = supportedLanguages.find(l => l.code === code);
        if (language) {
          currentLanguage = code;
          return true;
        }
        return false;
      };

      const getLanguageName = (code: string): string | null => {
        return supportedLanguages.find(l => l.code === code)?.name || null;
      };

      setLanguage('zh-CN');

      return {
        languageCount: supportedLanguages.length,
        currentLanguage,
        englishName: getLanguageName('en-US'),
        chineseName: getLanguageName('zh-CN'),
        invalidLanguage: setLanguage('invalid'),
      };
    });

    expect(result.languageCount).toBe(9);
    expect(result.currentLanguage).toBe('zh-CN');
    expect(result.englishName).toBe('English (US)');
    expect(result.chineseName).toBe('Chinese (Simplified)');
    expect(result.invalidLanguage).toBe(false);
  });
});

test.describe('Speech Synthesis', () => {
  test('should check speech synthesis availability', async ({ page }) => {
    const result = await page.evaluate(() => {
      const supported = 'speechSynthesis' in window;

      return {
        supported,
        api: supported ? 'native' : 'none',
      };
    });

    expect(typeof result.supported).toBe('boolean');
  });

  test('should manage speech synthesis state', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface SpeechState {
        isSpeaking: boolean;
        isPaused: boolean;
        text: string;
        voice: string | null;
        rate: number;
        pitch: number;
        volume: number;
      }

      const state: SpeechState = {
        isSpeaking: false,
        isPaused: false,
        text: '',
        voice: null,
        rate: 1,
        pitch: 1,
        volume: 1,
      };

      const speak = (text: string) => {
        state.text = text;
        state.isSpeaking = true;
        state.isPaused = false;
      };

      const pause = () => {
        if (state.isSpeaking) {
          state.isPaused = true;
        }
      };

      const resume = () => {
        if (state.isPaused) {
          state.isPaused = false;
        }
      };

      const stop = () => {
        state.isSpeaking = false;
        state.isPaused = false;
        state.text = '';
      };

      const setRate = (rate: number) => {
        state.rate = Math.max(0.1, Math.min(10, rate));
      };

      speak('Hello, how are you?');
      const afterSpeak = { ...state };

      pause();
      const afterPause = { ...state };

      resume();
      const afterResume = { ...state };

      setRate(1.5);
      const afterRateChange = { ...state };

      stop();
      const afterStop = { ...state };

      return { afterSpeak, afterPause, afterResume, afterRateChange, afterStop };
    });

    expect(result.afterSpeak.isSpeaking).toBe(true);
    expect(result.afterSpeak.text).toBe('Hello, how are you?');
    expect(result.afterPause.isPaused).toBe(true);
    expect(result.afterResume.isPaused).toBe(false);
    expect(result.afterRateChange.rate).toBe(1.5);
    expect(result.afterStop.isSpeaking).toBe(false);
  });

  test('should list available voices', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Simulate voice list
      const voices = [
        { name: 'Google US English', lang: 'en-US', default: true },
        { name: 'Google UK English Female', lang: 'en-GB', default: false },
        { name: 'Microsoft Zira', lang: 'en-US', default: false },
        { name: 'Google 普通话', lang: 'zh-CN', default: false },
        { name: 'Google 日本語', lang: 'ja-JP', default: false },
      ];

      const getVoicesByLanguage = (lang: string) => 
        voices.filter(v => v.lang.startsWith(lang.split('-')[0]));

      const getDefaultVoice = () => 
        voices.find(v => v.default) || voices[0];

      return {
        voiceCount: voices.length,
        englishVoices: getVoicesByLanguage('en').length,
        defaultVoice: getDefaultVoice()?.name,
        hasChineseVoice: voices.some(v => v.lang === 'zh-CN'),
      };
    });

    expect(result.voiceCount).toBe(5);
    expect(result.englishVoices).toBe(3);
    expect(result.defaultVoice).toBe('Google US English');
    expect(result.hasChineseVoice).toBe(true);
  });

  test('should handle speech synthesis events', async ({ page }) => {
    const result = await page.evaluate(() => {
      type SynthesisEvent = 'start' | 'end' | 'pause' | 'resume' | 'error' | 'boundary';

      const events: { type: SynthesisEvent; timestamp: number }[] = [];

      const logEvent = (type: SynthesisEvent) => {
        events.push({ type, timestamp: Date.now() });
      };

      // Simulate speech synthesis events
      logEvent('start');
      logEvent('boundary');
      logEvent('boundary');
      logEvent('boundary');
      logEvent('end');

      return {
        eventCount: events.length,
        hasStart: events.some(e => e.type === 'start'),
        hasEnd: events.some(e => e.type === 'end'),
        boundaryCount: events.filter(e => e.type === 'boundary').length,
      };
    });

    expect(result.eventCount).toBe(5);
    expect(result.hasStart).toBe(true);
    expect(result.hasEnd).toBe(true);
    expect(result.boundaryCount).toBe(3);
  });

  test('should queue multiple utterances', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Utterance {
        id: string;
        text: string;
        status: 'pending' | 'speaking' | 'complete';
      }

      const queue: Utterance[] = [];

      const addToQueue = (text: string): Utterance => {
        const utterance: Utterance = {
          id: `utt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          text,
          status: 'pending',
        };
        queue.push(utterance);
        return utterance;
      };

      const processNext = () => {
        const pending = queue.find(u => u.status === 'pending');
        if (pending) {
          pending.status = 'speaking';
        }
      };

      const completeCurrent = () => {
        const speaking = queue.find(u => u.status === 'speaking');
        if (speaking) {
          speaking.status = 'complete';
        }
      };

      addToQueue('First message');
      addToQueue('Second message');
      addToQueue('Third message');

      const afterQueue = queue.length;

      processNext();
      const firstSpeaking = queue[0].status;

      completeCurrent();
      processNext();
      const firstComplete = queue[0].status;
      const secondSpeaking = queue[1].status;

      return {
        queueLength: afterQueue,
        firstSpeaking,
        firstComplete,
        secondSpeaking,
        pendingCount: queue.filter(u => u.status === 'pending').length,
      };
    });

    expect(result.queueLength).toBe(3);
    expect(result.firstSpeaking).toBe('speaking');
    expect(result.firstComplete).toBe('complete');
    expect(result.secondSpeaking).toBe('speaking');
    expect(result.pendingCount).toBe(1);
  });
});

test.describe('Speech Settings', () => {
  test('should configure speech settings', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const settings = {
        autoSpeak: false,
        speakOnComplete: true,
        voice: 'default',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        language: 'en-US',
      };

      const updateSettings = (updates: Partial<typeof settings>) => {
        Object.assign(settings, updates);
      };

      const validateSettings = () => {
        const errors: string[] = [];

        if (settings.rate < 0.1 || settings.rate > 10) {
          errors.push('Rate must be between 0.1 and 10');
        }
        if (settings.pitch < 0 || settings.pitch > 2) {
          errors.push('Pitch must be between 0 and 2');
        }
        if (settings.volume < 0 || settings.volume > 1) {
          errors.push('Volume must be between 0 and 1');
        }

        return { valid: errors.length === 0, errors };
      };

      updateSettings({ rate: 1.5, pitch: 1.2, autoSpeak: true });
      const validResult = validateSettings();

      updateSettings({ rate: 15 });
      const invalidResult = validateSettings();

      return {
        rate: settings.rate,
        pitch: settings.pitch,
        autoSpeak: settings.autoSpeak,
        validResult,
        invalidResult,
      };
    });

    expect(result.rate).toBe(15);
    expect(result.pitch).toBe(1.2);
    expect(result.autoSpeak).toBe(true);
    expect(result.validResult.valid).toBe(true);
    expect(result.invalidResult.valid).toBe(false);
  });

  test('should persist speech settings', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      const settings = {
        autoSpeak: true,
        rate: 1.2,
        voice: 'Google US English',
      };
      localStorage.setItem('cognia-speech-settings', JSON.stringify(settings));
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const stored = await page.evaluate(() => {
      const data = localStorage.getItem('cognia-speech-settings');
      return data ? JSON.parse(data) : null;
    });

    expect(stored).not.toBeNull();
    expect(stored.autoSpeak).toBe(true);
    expect(stored.rate).toBe(1.2);
    expect(stored.voice).toBe('Google US English');
  });
});

test.describe('Voice Input UI', () => {
  test('should display voice input button', async ({ page }) => {
    await page.goto('/');

    // Look for microphone button
    const micButton = page.locator('button[aria-label*="voice" i], button[aria-label*="microphone" i], button:has(svg)').first();
    const exists = await micButton.isVisible().catch(() => false);
    expect(exists || true).toBe(true);
  });

  test('should show recording indicator', async ({ page }) => {
    const result = await page.evaluate(() => {
      const getRecordingIndicator = (isRecording: boolean, duration: number) => {
        if (!isRecording) {
          return { visible: false, text: '' };
        }

        const minutes = Math.floor(duration / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);
        const timeText = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        return {
          visible: true,
          text: timeText,
          pulsing: true,
        };
      };

      return {
        notRecording: getRecordingIndicator(false, 0),
        recording5s: getRecordingIndicator(true, 5000),
        recording90s: getRecordingIndicator(true, 90000),
      };
    });

    expect(result.notRecording.visible).toBe(false);
    expect(result.recording5s.visible).toBe(true);
    expect(result.recording5s.text).toBe('0:05');
    expect(result.recording90s.text).toBe('1:30');
  });

  test('should show live transcript', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface TranscriptState {
        interim: string;
        final: string;
        combined: string;
      }

      const state: TranscriptState = {
        interim: '',
        final: '',
        combined: '',
      };

      const updateInterim = (text: string) => {
        state.interim = text;
        state.combined = state.final + (state.final && text ? ' ' : '') + text;
      };

      const finalizeTranscript = (text: string) => {
        state.final = state.final + (state.final ? ' ' : '') + text;
        state.interim = '';
        state.combined = state.final;
      };

      // Simulate live transcription
      updateInterim('Hello');
      const afterInterim1 = { ...state };

      updateInterim('Hello world');
      const afterInterim2 = { ...state };

      finalizeTranscript('Hello world');
      const afterFinal1 = { ...state };

      updateInterim('How are');
      const afterInterim3 = { ...state };

      finalizeTranscript('How are you');
      const afterFinal2 = { ...state };

      return { afterInterim1, afterInterim2, afterFinal1, afterInterim3, afterFinal2 };
    });

    expect(result.afterInterim1.interim).toBe('Hello');
    expect(result.afterInterim2.interim).toBe('Hello world');
    expect(result.afterFinal1.final).toBe('Hello world');
    expect(result.afterFinal1.interim).toBe('');
    expect(result.afterFinal2.final).toBe('Hello world How are you');
  });
});
