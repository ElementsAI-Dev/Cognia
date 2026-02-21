'use client';

/**
 * SpeechSettings - Configure voice input (STT) and text-to-speech (TTS) settings
 */

import { useState, useEffect, useMemo } from 'react';
import { Mic, Volume2, Languages, Zap, Settings2, Play, Square, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useSettingsStore } from '@/stores';
import {
  SPEECH_LANGUAGES,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  getLanguageFlag,
  type SpeechLanguageCode,
  type SpeechProvider,
  type TTSProvider,
  OPENAI_TTS_VOICES,
  OPENAI_TTS_MODELS,
  GEMINI_TTS_VOICES,
  EDGE_TTS_VOICES,
  ELEVENLABS_TTS_VOICES,
  ELEVENLABS_TTS_MODELS,
  LMNT_TTS_VOICES,
  HUME_TTS_VOICES,
  CARTESIA_TTS_VOICES,
  CARTESIA_TTS_MODELS,
  DEEPGRAM_TTS_VOICES,
} from '@/types/media/speech';
import { Input } from '@/components/ui/input';
import { useTTS } from '@/hooks';

export function SpeechSettings() {
  const t = useTranslations('speechSettings');

  // Speech settings from store
  const speechSettings = useSettingsStore((state) => state.speechSettings);
  const setSttEnabled = useSettingsStore((state) => state.setSttEnabled);
  const setSttLanguage = useSettingsStore((state) => state.setSttLanguage);
  const setSttProvider = useSettingsStore((state) => state.setSttProvider);
  const setSttContinuous = useSettingsStore((state) => state.setSttContinuous);
  const setSttAutoSend = useSettingsStore((state) => state.setSttAutoSend);
  const setTtsEnabled = useSettingsStore((state) => state.setTtsEnabled);
  const setTtsVoice = useSettingsStore((state) => state.setTtsVoice);
  const setTtsRate = useSettingsStore((state) => state.setTtsRate);
  const setTtsAutoPlay = useSettingsStore((state) => state.setTtsAutoPlay);
  const setSpeechSettings = useSettingsStore((state) => state.setSpeechSettings);

  // Check for API keys
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const hasOpenAIKey = !!providerSettings.openai?.apiKey;
  const hasGoogleKey = !!providerSettings.google?.apiKey;
  const hasElevenLabsKey = !!providerSettings.elevenlabs?.apiKey;
  const hasLMNTKey = !!providerSettings.lmnt?.apiKey;
  const hasHumeKey = !!providerSettings.hume?.apiKey;
  const hasCartesiaKey = !!providerSettings.cartesia?.apiKey;
  const hasDeepgramKey = !!providerSettings.deepgram?.apiKey;
  const [serverKeyStatus, setServerKeyStatus] = useState<Record<string, boolean>>({});
  
  // TTS hook for testing
  const { speak: testSpeak, stop: testStop, isPlaying: isTestPlaying, isLoading: isTestLoading } = useTTS({ source: 'settings' });

  // Browser support detection - initialize synchronously
  const [sttSupported] = useState(() => isSpeechRecognitionSupported());
  const [ttsSupported] = useState(() => isSpeechSynthesisSupported());
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Load available voices
  useEffect(() => {
    if (!ttsSupported) return;

    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      setVoices(availableVoices);
    };
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, [ttsSupported]);

  useEffect(() => {
    let mounted = true;
    fetch('/api/tts/status')
      .then((response) => response.json())
      .then((data) => {
        if (!mounted) return;
        setServerKeyStatus(data?.status || {});
      })
      .catch(() => {
        if (!mounted) return;
        setServerKeyStatus({});
      });

    return () => {
      mounted = false;
    };
  }, []);

  const keyStatus = useMemo(() => {
    const provider = speechSettings.ttsProvider;
    if (provider === 'system' || provider === 'edge') {
      return { local: true, server: true };
    }

    const keyProviderMap: Partial<Record<TTSProvider, string>> = {
      openai: 'openai',
      gemini: 'google',
      elevenlabs: 'elevenlabs',
      lmnt: 'lmnt',
      hume: 'hume',
      cartesia: 'cartesia',
      deepgram: 'deepgram',
    };

    const keyProvider = keyProviderMap[provider];
    if (!keyProvider) {
      return { local: false, server: false };
    }

    return {
      local: Boolean(providerSettings[keyProvider]?.apiKey),
      server: Boolean(serverKeyStatus[keyProvider]),
    };
  }, [providerSettings, serverKeyStatus, speechSettings.ttsProvider]);

  // Test TTS with current provider
  const handleTestTts = () => {
    if (isTestPlaying) {
      testStop();
      return;
    }

    const testText = speechSettings.sttLanguage.startsWith('zh')
      ? '你好，这是一段测试语音。'
      : speechSettings.sttLanguage.startsWith('ja')
      ? 'こんにちは、これはテスト音声です。'
      : 'Hello, this is a test of the text-to-speech feature.';

    testSpeak(testText);
  };

  // Get Edge voices filtered by language
  const filteredEdgeVoices = EDGE_TTS_VOICES.filter((v) =>
    v.language.startsWith(speechSettings.sttLanguage.split('-')[0])
  );

  // Filter voices by language
  const filteredVoices = voices.filter((v) =>
    v.lang.startsWith(speechSettings.sttLanguage.split('-')[0])
  );

  return (
    <div className="space-y-4">
      {/* Speech-to-Text Settings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mic className="h-4 w-4 text-muted-foreground" />
            {t('speechToText')}
            {!sttSupported && (
              <Badge variant="destructive" className="text-[10px]">
                {t('notSupported')}
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="text-xs">
            {t('sttDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enable STT */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">{t('enableVoiceInput')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('enableVoiceInputDesc')}
              </p>
            </div>
            <Switch
              checked={speechSettings.sttEnabled}
              onCheckedChange={setSttEnabled}
              disabled={!sttSupported}
            />
          </div>

          {/* Language Selection */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-2">
              <Languages className="h-3.5 w-3.5" />
              {t('language')}
            </Label>
            <Select
              value={speechSettings.sttLanguage}
              onValueChange={(v) => setSttLanguage(v as SpeechLanguageCode)}
              disabled={!speechSettings.sttEnabled}
            >
              <SelectTrigger className="w-full sm:w-[250px]">
                <SelectValue>
                  <span className="flex items-center gap-2">
                    <span>{getLanguageFlag(speechSettings.sttLanguage)}</span>
                    <span>
                      {SPEECH_LANGUAGES.find((l) => l.code === speechSettings.sttLanguage)?.name}
                    </span>
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SPEECH_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    <span className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Provider Selection */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-2">
              <Zap className="h-3.5 w-3.5" />
              {t('provider')}
            </Label>
            <Select
              value={speechSettings.sttProvider}
              onValueChange={(v) => setSttProvider(v as SpeechProvider)}
              disabled={!speechSettings.sttEnabled}
            >
              <SelectTrigger className="w-full sm:w-[250px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">
                  <span className="flex items-center gap-2">
                    <span>🌐</span>
                    <span>{t('systemSpeech')}</span>
                  </span>
                </SelectItem>
                <SelectItem value="openai" disabled={!hasOpenAIKey}>
                  <span className="flex items-center gap-2">
                    <span>🤖</span>
                    <span>{t('providers.openaiWhisper')}</span>
                    {!hasOpenAIKey && (
                      <Badge variant="outline" className="text-[10px] ml-1">
                        {t('needsApiKey')}
                      </Badge>
                    )}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {speechSettings.sttProvider === 'system'
                ? t('systemSpeechDesc')
                : t('whisperDesc')}
            </p>
          </div>

          {/* Continuous Mode */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">{t('continuousMode')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('continuousModeDesc')}
              </p>
            </div>
            <Switch
              checked={speechSettings.sttContinuous}
              onCheckedChange={setSttContinuous}
              disabled={!speechSettings.sttEnabled}
            />
          </div>

          {/* Auto Send */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">{t('autoSend')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('autoSendDesc')}
              </p>
            </div>
            <Switch
              checked={speechSettings.sttAutoSend}
              onCheckedChange={setSttAutoSend}
              disabled={!speechSettings.sttEnabled}
            />
          </div>

          {/* Auto Stop Silence */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">
                {t('autoStopSilence')}: {speechSettings.sttAutoStopSilence === 0 ? t('disabled') : `${speechSettings.sttAutoStopSilence / 1000}s`}
              </Label>
            </div>
            <Slider
              value={[speechSettings.sttAutoStopSilence]}
              onValueChange={([v]) => setSpeechSettings({ sttAutoStopSilence: v })}
              min={0}
              max={10000}
              step={500}
              disabled={!speechSettings.sttEnabled || !speechSettings.sttContinuous}
            />
            <p className="text-xs text-muted-foreground">
              {t('autoStopSilenceDesc')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Text-to-Speech Settings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            {t('textToSpeech')}
          </CardTitle>
          <CardDescription className="text-xs">
            {t('ttsDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enable TTS */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">{t('enableTts')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('enableTtsDesc')}
              </p>
            </div>
            <Switch
              checked={speechSettings.ttsEnabled}
              onCheckedChange={setTtsEnabled}
            />
          </div>

          {/* TTS Provider Selection */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-2">
              <Zap className="h-3.5 w-3.5" />
              {t('ttsProvider')}
            </Label>
            <Select
              value={speechSettings.ttsProvider}
              onValueChange={(v) => setSpeechSettings({ ttsProvider: v as TTSProvider })}
              disabled={!speechSettings.ttsEnabled}
            >
              <SelectTrigger className="w-full sm:w-[300px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">
                  <span className="flex items-center gap-2">
                    <span>🌐</span>
                    <span>{t('systemTts')}</span>
                  </span>
                </SelectItem>
                <SelectItem value="openai" disabled={!hasOpenAIKey}>
                  <span className="flex items-center gap-2">
                    <span>🤖</span>
                    <span>{t('providers.openaiTts')}</span>
                    {!hasOpenAIKey && (
                      <Badge variant="outline" className="text-[10px] ml-1">
                        {t('needsApiKey')}
                      </Badge>
                    )}
                  </span>
                </SelectItem>
                <SelectItem value="gemini" disabled={!hasGoogleKey}>
                  <span className="flex items-center gap-2">
                    <span>✨</span>
                    <span>{t('providers.geminiTts')}</span>
                    {!hasGoogleKey && (
                      <Badge variant="outline" className="text-[10px] ml-1">
                        {t('needsApiKey')}
                      </Badge>
                    )}
                  </span>
                </SelectItem>
                <SelectItem value="edge">
                  <span className="flex items-center gap-2">
                    <span>🔊</span>
                    <span>{t('providers.edgeTts')} ({t('free')})</span>
                  </span>
                </SelectItem>
                <SelectItem value="elevenlabs" disabled={!hasElevenLabsKey}>
                  <span className="flex items-center gap-2">
                    <span>🎙️</span>
                    <span>ElevenLabs</span>
                    {!hasElevenLabsKey && (
                      <Badge variant="outline" className="text-[10px] ml-1">
                        {t('needsApiKey')}
                      </Badge>
                    )}
                  </span>
                </SelectItem>
                <SelectItem value="lmnt" disabled={!hasLMNTKey}>
                  <span className="flex items-center gap-2">
                    <span>⚡</span>
                    <span>LMNT</span>
                    {!hasLMNTKey && (
                      <Badge variant="outline" className="text-[10px] ml-1">
                        {t('needsApiKey')}
                      </Badge>
                    )}
                  </span>
                </SelectItem>
                <SelectItem value="hume" disabled={!hasHumeKey}>
                  <span className="flex items-center gap-2">
                    <span>💬</span>
                    <span>Hume AI</span>
                    {!hasHumeKey && (
                      <Badge variant="outline" className="text-[10px] ml-1">
                        {t('needsApiKey')}
                      </Badge>
                    )}
                  </span>
                </SelectItem>
                <SelectItem value="cartesia" disabled={!hasCartesiaKey}>
                  <span className="flex items-center gap-2">
                    <span>🌊</span>
                    <span>Cartesia Sonic</span>
                    {!hasCartesiaKey && (
                      <Badge variant="outline" className="text-[10px] ml-1">
                        {t('needsApiKey')}
                      </Badge>
                    )}
                  </span>
                </SelectItem>
                <SelectItem value="deepgram" disabled={!hasDeepgramKey}>
                  <span className="flex items-center gap-2">
                    <span>🎤</span>
                    <span>Deepgram Aura</span>
                    {!hasDeepgramKey && (
                      <Badge variant="outline" className="text-[10px] ml-1">
                        {t('needsApiKey')}
                      </Badge>
                    )}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {speechSettings.ttsProvider === 'system' && t('systemTtsDesc')}
              {speechSettings.ttsProvider === 'openai' && t('openaiTtsDesc')}
              {speechSettings.ttsProvider === 'gemini' && t('geminiTtsDesc')}
              {speechSettings.ttsProvider === 'edge' && t('edgeTtsDesc')}
              {speechSettings.ttsProvider === 'elevenlabs' && t('elevenlabsTtsDesc')}
              {speechSettings.ttsProvider === 'lmnt' && t('lmntTtsDesc')}
              {speechSettings.ttsProvider === 'hume' && t('humeTtsDesc')}
              {speechSettings.ttsProvider === 'cartesia' && t('cartesiaTtsDesc')}
              {speechSettings.ttsProvider === 'deepgram' && t('deepgramTtsDesc')}
            </p>
            {speechSettings.ttsProvider !== 'system' && speechSettings.ttsProvider !== 'edge' && (
              <div className="flex items-center gap-2 text-xs">
                <Badge variant={keyStatus.local ? 'default' : 'secondary'}>
                  {keyStatus.local ? t('localKey') : t('noLocalKey')}
                </Badge>
                <Badge variant={keyStatus.server ? 'default' : 'secondary'}>
                  {keyStatus.server ? t('serverKey') : t('noServerKey')}
                </Badge>
                {!keyStatus.local && !keyStatus.server && (
                  <Badge variant="destructive">{t('unavailable')}</Badge>
                )}
              </div>
            )}
          </div>

          {/* System Voice Selection */}
          {speechSettings.ttsProvider === 'system' && (
            <div className="space-y-2">
              <Label className="text-sm">{t('voice')}</Label>
              <Select
                value={speechSettings.ttsVoice}
                onValueChange={setTtsVoice}
                disabled={!speechSettings.ttsEnabled}
              >
                <SelectTrigger className="w-full sm:w-[300px]">
                  <SelectValue placeholder={t('selectVoice')} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {filteredVoices.length > 0 ? (
                    filteredVoices.map((voice) => (
                      <SelectItem key={voice.name} value={voice.name}>
                        <span className="flex items-center gap-2">
                          <span className="truncate max-w-[200px]">{voice.name}</span>
                          {voice.default && (
                            <Badge variant="secondary" className="text-[10px]">
                              {t('default')}
                            </Badge>
                          )}
                        </span>
                      </SelectItem>
                    ))
                  ) : voices.length > 0 ? (
                    voices.slice(0, 20).map((voice) => (
                      <SelectItem key={voice.name} value={voice.name}>
                        <span className="flex items-center gap-2">
                          <span className="truncate max-w-[200px]">{voice.name}</span>
                          <span className="text-xs text-muted-foreground">({voice.lang})</span>
                        </span>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>
                      {t('noVoices')}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* OpenAI Voice Selection */}
          {speechSettings.ttsProvider === 'openai' && (
            <>
              <div className="space-y-2">
                <Label className="text-sm">{t('voice')}</Label>
                <Select
                  value={speechSettings.openaiTtsVoice}
                  onValueChange={(v) => setSpeechSettings({ openaiTtsVoice: v as typeof speechSettings.openaiTtsVoice })}
                  disabled={!speechSettings.ttsEnabled}
                >
                  <SelectTrigger className="w-full sm:w-[300px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPENAI_TTS_VOICES.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>
                        <span className="flex items-center gap-2">
                          <span>{voice.name}</span>
                          <span className="text-xs text-muted-foreground">({voice.description})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{t('model')}</Label>
                <Select
                  value={speechSettings.openaiTtsModel}
                  onValueChange={(v) => setSpeechSettings({ openaiTtsModel: v as typeof speechSettings.openaiTtsModel })}
                  disabled={!speechSettings.ttsEnabled}
                >
                  <SelectTrigger className="w-full sm:w-[300px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPENAI_TTS_MODELS.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <span className="flex items-center gap-2">
                          <span>{model.name}</span>
                          <span className="text-xs text-muted-foreground">({model.description})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{t('speed')}: {speechSettings.openaiTtsSpeed.toFixed(1)}x</Label>
                </div>
                <Slider
                  value={[speechSettings.openaiTtsSpeed * 10]}
                  onValueChange={([v]) => setSpeechSettings({ openaiTtsSpeed: v / 10 })}
                  min={2.5}
                  max={40}
                  step={2.5}
                  disabled={!speechSettings.ttsEnabled}
                />
              </div>
              {speechSettings.openaiTtsModel === 'gpt-4o-mini-tts' && (
                <div className="space-y-2">
                  <Label className="text-sm">Voice Instructions</Label>
                  <Input
                    value={speechSettings.openaiTtsInstructions}
                    onChange={(e) => setSpeechSettings({ openaiTtsInstructions: e.target.value })}
                    placeholder="e.g., Speak in a cheerful, warm tone with a British accent"
                    disabled={!speechSettings.ttsEnabled}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Control the voice style, tone, accent, and emotion (gpt-4o-mini-tts only)
                  </p>
                </div>
              )}
            </>
          )}

          {/* Gemini Voice Selection */}
          {speechSettings.ttsProvider === 'gemini' && (
            <div className="space-y-2">
              <Label className="text-sm">{t('voice')}</Label>
              <Select
                value={speechSettings.geminiTtsVoice}
                onValueChange={(v) => setSpeechSettings({ geminiTtsVoice: v as typeof speechSettings.geminiTtsVoice })}
                disabled={!speechSettings.ttsEnabled}
              >
                <SelectTrigger className="w-full sm:w-[300px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {GEMINI_TTS_VOICES.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      <span className="flex items-center gap-2">
                        <span>{voice.name}</span>
                        <span className="text-xs text-muted-foreground">({voice.description})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Edge Voice Selection */}
          {speechSettings.ttsProvider === 'edge' && (
            <>
              <div className="space-y-2">
                <Label className="text-sm">{t('voice')}</Label>
                <Select
                  value={speechSettings.edgeTtsVoice}
                  onValueChange={(v) => setSpeechSettings({ edgeTtsVoice: v as typeof speechSettings.edgeTtsVoice })}
                  disabled={!speechSettings.ttsEnabled}
                >
                  <SelectTrigger className="w-full sm:w-[300px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {filteredEdgeVoices.length > 0 ? (
                      filteredEdgeVoices.map((voice) => (
                        <SelectItem key={voice.id} value={voice.id}>
                          <span className="flex items-center gap-2">
                            <span>{voice.name}</span>
                            <span className="text-xs text-muted-foreground">({voice.gender})</span>
                          </span>
                        </SelectItem>
                      ))
                    ) : (
                      EDGE_TTS_VOICES.map((voice) => (
                        <SelectItem key={voice.id} value={voice.id}>
                          <span className="flex items-center gap-2">
                            <span>{voice.name}</span>
                            <span className="text-xs text-muted-foreground">({voice.language})</span>
                          </span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{t('edgeRate')}</Label>
                <Input
                  value={speechSettings.edgeTtsRate}
                  onChange={(event) => setSpeechSettings({ edgeTtsRate: event.target.value })}
                  placeholder="+0%"
                  disabled={!speechSettings.ttsEnabled}
                  className="w-full sm:w-[300px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{t('edgePitch')}</Label>
                <Input
                  value={speechSettings.edgeTtsPitch}
                  onChange={(event) => setSpeechSettings({ edgeTtsPitch: event.target.value })}
                  placeholder="+0Hz"
                  disabled={!speechSettings.ttsEnabled}
                  className="w-full sm:w-[300px]"
                />
              </div>
            </>
          )}

          {/* ElevenLabs Settings */}
          {speechSettings.ttsProvider === 'elevenlabs' && (
            <>
              <div className="space-y-2">
                <Label className="text-sm">{t('voice')}</Label>
                <Select
                  value={speechSettings.elevenlabsTtsVoice}
                  onValueChange={(v) => setSpeechSettings({ elevenlabsTtsVoice: v as typeof speechSettings.elevenlabsTtsVoice })}
                  disabled={!speechSettings.ttsEnabled}
                >
                  <SelectTrigger className="w-full sm:w-[300px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ELEVENLABS_TTS_VOICES.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>
                        <span className="flex items-center gap-2">
                          <span>{voice.name}</span>
                          <span className="text-xs text-muted-foreground">({voice.description})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{t('model')}</Label>
                <Select
                  value={speechSettings.elevenlabsTtsModel}
                  onValueChange={(v) => setSpeechSettings({ elevenlabsTtsModel: v as typeof speechSettings.elevenlabsTtsModel })}
                  disabled={!speechSettings.ttsEnabled}
                >
                  <SelectTrigger className="w-full sm:w-[300px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ELEVENLABS_TTS_MODELS.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <span className="flex items-center gap-2">
                          <span>{model.name}</span>
                          <span className="text-xs text-muted-foreground">({model.description})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Stability: {speechSettings.elevenlabsTtsStability.toFixed(2)}</Label>
                <Slider
                  value={[speechSettings.elevenlabsTtsStability * 100]}
                  onValueChange={([v]) => setSpeechSettings({ elevenlabsTtsStability: v / 100 })}
                  min={0}
                  max={100}
                  step={5}
                  disabled={!speechSettings.ttsEnabled}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Similarity Boost: {speechSettings.elevenlabsTtsSimilarityBoost.toFixed(2)}</Label>
                <Slider
                  value={[speechSettings.elevenlabsTtsSimilarityBoost * 100]}
                  onValueChange={([v]) => setSpeechSettings({ elevenlabsTtsSimilarityBoost: v / 100 })}
                  min={0}
                  max={100}
                  step={5}
                  disabled={!speechSettings.ttsEnabled}
                />
              </div>
            </>
          )}

          {/* LMNT Settings */}
          {speechSettings.ttsProvider === 'lmnt' && (
            <>
              <div className="space-y-2">
                <Label className="text-sm">{t('voice')}</Label>
                <Select
                  value={speechSettings.lmntTtsVoice}
                  onValueChange={(v) => setSpeechSettings({ lmntTtsVoice: v as typeof speechSettings.lmntTtsVoice })}
                  disabled={!speechSettings.ttsEnabled}
                >
                  <SelectTrigger className="w-full sm:w-[300px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LMNT_TTS_VOICES.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>
                        <span className="flex items-center gap-2">
                          <span>{voice.name}</span>
                          <span className="text-xs text-muted-foreground">({voice.description})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{t('speed')}: {speechSettings.lmntTtsSpeed.toFixed(1)}x</Label>
                <Slider
                  value={[speechSettings.lmntTtsSpeed * 10]}
                  onValueChange={([v]) => setSpeechSettings({ lmntTtsSpeed: v / 10 })}
                  min={5}
                  max={20}
                  step={1}
                  disabled={!speechSettings.ttsEnabled}
                />
              </div>
            </>
          )}

          {/* Hume Settings */}
          {speechSettings.ttsProvider === 'hume' && (
            <div className="space-y-2">
              <Label className="text-sm">{t('voice')}</Label>
              <Select
                value={speechSettings.humeTtsVoice}
                onValueChange={(v) => setSpeechSettings({ humeTtsVoice: v as typeof speechSettings.humeTtsVoice })}
                disabled={!speechSettings.ttsEnabled}
              >
                <SelectTrigger className="w-full sm:w-[300px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HUME_TTS_VOICES.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      <span className="flex items-center gap-2">
                        <span>{voice.name}</span>
                        <span className="text-xs text-muted-foreground">({voice.description})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Cartesia Settings */}
          {speechSettings.ttsProvider === 'cartesia' && (
            <>
              <div className="space-y-2">
                <Label className="text-sm">{t('voice')}</Label>
                <Select
                  value={speechSettings.cartesiaTtsVoice}
                  onValueChange={(v) => setSpeechSettings({ cartesiaTtsVoice: v as typeof speechSettings.cartesiaTtsVoice })}
                  disabled={!speechSettings.ttsEnabled}
                >
                  <SelectTrigger className="w-full sm:w-[300px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CARTESIA_TTS_VOICES.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>
                        <span className="flex items-center gap-2">
                          <span>{voice.name}</span>
                          <span className="text-xs text-muted-foreground">({voice.description})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{t('model')}</Label>
                <Select
                  value={speechSettings.cartesiaTtsModel}
                  onValueChange={(v) => setSpeechSettings({ cartesiaTtsModel: v as typeof speechSettings.cartesiaTtsModel })}
                  disabled={!speechSettings.ttsEnabled}
                >
                  <SelectTrigger className="w-full sm:w-[300px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CARTESIA_TTS_MODELS.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <span className="flex items-center gap-2">
                          <span>{model.name}</span>
                          <span className="text-xs text-muted-foreground">({model.description})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{t('languageCode')}</Label>
                <Input
                  value={speechSettings.cartesiaTtsLanguage}
                  onChange={(e) => setSpeechSettings({ cartesiaTtsLanguage: e.target.value })}
                  placeholder="en"
                  disabled={!speechSettings.ttsEnabled}
                  className="w-full sm:w-[300px]"
                />
                <p className="text-xs text-muted-foreground">
                  {t('languageCodeDesc')}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{t('speed')}: {speechSettings.cartesiaTtsSpeed.toFixed(1)}</Label>
                <Slider
                  value={[speechSettings.cartesiaTtsSpeed * 10]}
                  onValueChange={([v]) => setSpeechSettings({ cartesiaTtsSpeed: v / 10 })}
                  min={-10}
                  max={20}
                  step={1}
                  disabled={!speechSettings.ttsEnabled}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{t('emotion')}</Label>
                <Input
                  value={speechSettings.cartesiaTtsEmotion}
                  onChange={(e) => setSpeechSettings({ cartesiaTtsEmotion: e.target.value })}
                  placeholder={t('emotionPlaceholder')}
                  disabled={!speechSettings.ttsEnabled}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  {t('emotionDesc')}
                </p>
              </div>
            </>
          )}

          {/* Deepgram Settings */}
          {speechSettings.ttsProvider === 'deepgram' && (
            <div className="space-y-2">
              <Label className="text-sm">{t('voice')}</Label>
              <Select
                value={speechSettings.deepgramTtsVoice}
                onValueChange={(v) => setSpeechSettings({ deepgramTtsVoice: v as typeof speechSettings.deepgramTtsVoice })}
                disabled={!speechSettings.ttsEnabled}
              >
                <SelectTrigger className="w-full sm:w-[300px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEEPGRAM_TTS_VOICES.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      <span className="flex items-center gap-2">
                        <span>{voice.name}</span>
                        <span className="text-xs text-muted-foreground">({voice.description})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Speech Rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t('speechRate')}: {speechSettings.ttsRate.toFixed(1)}x</Label>
              <span className="text-[10px] text-muted-foreground">
                {speechSettings.ttsRate <= 0.8 ? t('slow') : speechSettings.ttsRate <= 1.2 ? t('normal') : t('fast')}
              </span>
            </div>
            <Slider
              value={[speechSettings.ttsRate * 10]}
              onValueChange={([v]) => setTtsRate(v / 10)}
              min={5}
              max={20}
              step={1}
              disabled={!speechSettings.ttsEnabled}
            />
          </div>

          {/* Pitch */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t('pitch')}: {speechSettings.ttsPitch.toFixed(1)}</Label>
            </div>
            <Slider
              value={[speechSettings.ttsPitch * 10]}
              onValueChange={([v]) => setSpeechSettings({ ttsPitch: v / 10 })}
              min={0}
              max={20}
              step={1}
              disabled={!speechSettings.ttsEnabled}
            />
          </div>

          {/* Volume */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t('volume')}: {Math.round(speechSettings.ttsVolume * 100)}%</Label>
            </div>
            <Slider
              value={[speechSettings.ttsVolume * 100]}
              onValueChange={([v]) => setSpeechSettings({ ttsVolume: v / 100 })}
              min={0}
              max={100}
              step={5}
              disabled={!speechSettings.ttsEnabled}
            />
          </div>

          {/* Auto Play */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">{t('autoPlayResponses')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('autoPlayResponsesDesc')}
              </p>
            </div>
            <Switch
              checked={speechSettings.ttsAutoPlay}
              onCheckedChange={setTtsAutoPlay}
              disabled={!speechSettings.ttsEnabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">{t('enableCache')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('enableCacheDesc')}
              </p>
            </div>
            <Switch
              checked={speechSettings.ttsCacheEnabled}
              onCheckedChange={(checked) => setSpeechSettings({ ttsCacheEnabled: checked })}
              disabled={!speechSettings.ttsEnabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">{t('enableStreaming')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('enableStreamingDesc')}
              </p>
            </div>
            <Switch
              checked={speechSettings.ttsStreamingEnabled}
              onCheckedChange={(checked) => setSpeechSettings({ ttsStreamingEnabled: checked })}
              disabled={!speechSettings.ttsEnabled}
            />
          </div>

          {/* Test Button */}
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestTts}
              disabled={!speechSettings.ttsEnabled || isTestLoading}
              className="gap-2"
            >
              {isTestLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t('loading')}
                </>
              ) : isTestPlaying ? (
                <>
                  <Square className="h-3.5 w-3.5" />
                  {t('stopTest')}
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  {t('testVoice')}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Browser Support Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            {t('browserSupport')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>{t('speechRecognition')}</span>
              <Badge variant={sttSupported ? 'default' : 'destructive'}>
                {sttSupported ? t('supported') : t('notSupported')}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>{t('speechSynthesis')}</span>
              <Badge variant={ttsSupported ? 'default' : 'destructive'}>
                {ttsSupported ? t('supported') : t('notSupported')}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>{t('availableVoices')}</span>
              <Badge variant="secondary">{voices.length}</Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {t('browserSupportNote')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default SpeechSettings;
