'use client';

/**
 * SpeechSettings - Configure voice input (STT) and text-to-speech (TTS) settings
 */

import { useState, useEffect } from 'react';
import { Mic, Volume2, Languages, Zap, Settings2, Play, Square } from 'lucide-react';
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
} from '@/types/speech';

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

  // Check for OpenAI API key
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const hasOpenAIKey = !!providerSettings.openai?.apiKey;

  // Browser support detection - initialize synchronously
  const [sttSupported] = useState(() => isSpeechRecognitionSupported());
  const [ttsSupported] = useState(() => isSpeechSynthesisSupported());
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isTestPlaying, setIsTestPlaying] = useState(false);

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

  // Test TTS
  const handleTestTts = () => {
    if (!ttsSupported) return;

    if (isTestPlaying) {
      speechSynthesis.cancel();
      setIsTestPlaying(false);
      return;
    }

    const testText = speechSettings.sttLanguage.startsWith('zh')
      ? '你好，这是一段测试语音。'
      : speechSettings.sttLanguage.startsWith('ja')
      ? 'こんにちは、これはテスト音声です。'
      : 'Hello, this is a test of the text-to-speech feature.';

    const utterance = new SpeechSynthesisUtterance(testText);
    
    if (speechSettings.ttsVoice) {
      const voice = voices.find((v) => v.name === speechSettings.ttsVoice);
      if (voice) utterance.voice = voice;
    }
    
    utterance.rate = speechSettings.ttsRate;
    utterance.pitch = speechSettings.ttsPitch;
    utterance.volume = speechSettings.ttsVolume;
    
    utterance.onstart = () => setIsTestPlaying(true);
    utterance.onend = () => setIsTestPlaying(false);
    utterance.onerror = () => setIsTestPlaying(false);

    speechSynthesis.speak(utterance);
  };

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
                    <span>OpenAI Whisper</span>
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
            {!ttsSupported && (
              <Badge variant="destructive" className="text-[10px]">
                {t('notSupported')}
              </Badge>
            )}
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
              disabled={!ttsSupported}
            />
          </div>

          {/* Voice Selection */}
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

          {/* Test Button */}
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestTts}
              disabled={!speechSettings.ttsEnabled || !ttsSupported}
              className="gap-2"
            >
              {isTestPlaying ? (
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
