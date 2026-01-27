"use client";

import Image from "next/image";
import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { isTauri } from "@/lib/native/utils";
import {
  ScanText,
  Upload,
  Camera,
  Clipboard,
  Copy,
  Check,
  X,
  Loader2,
  Languages,
  Sparkles,
  FileText,
  RefreshCw,
  AlertCircle,
  Zap,
  Cloud,
  Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  OcrProviderType,
  OcrProviderInfo,
  OcrResult as UnifiedOcrResult,
} from "@/lib/native/ocr";

interface OCRResult {
  text: string;
  confidence: number;
  language?: string;
  provider?: string;
  processing_time_ms?: number;
  lines?: Array<{
    text: string;
    words: Array<{
      text: string;
      bounds: { x: number; y: number; width: number; height: number };
      confidence: number;
    }>;
    bounds: { x: number; y: number; width: number; height: number };
  }>;
}

interface OCRPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onTextExtracted?: (text: string) => void;
  onAction?: (action: string, text: string) => void;
  className?: string;
}

// Provider icons mapping
const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  windows_ocr: <Monitor className="w-4 h-4" />,
  openai_vision: <Zap className="w-4 h-4" />,
  ollama_vision: <Sparkles className="w-4 h-4" />,
  google_vision: <Cloud className="w-4 h-4" />,
  azure_vision: <Cloud className="w-4 h-4" />,
  tesseract: <ScanText className="w-4 h-4" />,
};

// Language display names mapping
const LANGUAGE_NAMES: Record<string, string> = {
  "en-US": "English (US)",
  "en-GB": "English (UK)",
  "zh-Hans": "Chinese (Simplified)",
  "zh-Hant": "Chinese (Traditional)",
  "zh-CN": "Chinese (Simplified)",
  "zh-TW": "Chinese (Traditional)",
  "ja": "Japanese",
  "ko": "Korean",
  "de-DE": "German",
  "fr-FR": "French",
  "es-ES": "Spanish",
  "es-MX": "Spanish (Mexico)",
  "it-IT": "Italian",
  "pt-BR": "Portuguese (Brazil)",
  "pt-PT": "Portuguese (Portugal)",
  "ru-RU": "Russian",
  "ar-SA": "Arabic",
  "hi-IN": "Hindi",
  "th-TH": "Thai",
  "vi-VN": "Vietnamese",
  "nl-NL": "Dutch",
  "pl-PL": "Polish",
  "tr-TR": "Turkish",
  "uk-UA": "Ukrainian",
  "cs-CZ": "Czech",
  "sv-SE": "Swedish",
  "da-DK": "Danish",
  "fi-FI": "Finnish",
  "nb-NO": "Norwegian",
  "el-GR": "Greek",
  "he-IL": "Hebrew",
  "hu-HU": "Hungarian",
  "ro-RO": "Romanian",
  "sk-SK": "Slovak",
  "bg-BG": "Bulgarian",
  "hr-HR": "Croatian",
  "ms-MY": "Malay",
  "id-ID": "Indonesian",
};

const PREVIEW_IMAGE_WIDTH = 800;
const PREVIEW_IMAGE_HEIGHT = 600;

// Get display name for language code
function getLanguageDisplayName(code: string): string {
  return LANGUAGE_NAMES[code] || code;
}

const isInlineImageSource = (value?: string | null) =>
  !!value && (value.startsWith("data:") || value.startsWith("blob:"));

export function OCRPanel({
  isOpen,
  onClose,
  onTextExtracted,
  onAction,
  className,
}: OCRPanelProps) {
  const t = useTranslations("ocr");
  const [isProcessing, setIsProcessing] = useState(false);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [ocrAvailable, setOcrAvailable] = useState<boolean | null>(null);
  const [loadingLanguages, setLoadingLanguages] = useState(false);
  const [providers, setProviders] = useState<OcrProviderInfo[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<OcrProviderType>("windows_ocr");
  const [_defaultProvider, setDefaultProvider] = useState<OcrProviderType>("windows_ocr");

  // Load available OCR providers and languages on mount
  useEffect(() => {
    async function loadOcrInfo() {
      if (isTauri()) {
        try {
          setLoadingLanguages(true);
          const { invoke } = await import("@tauri-apps/api/core");
          
          // Load providers using new multi-provider API
          try {
            const providerResponse = await invoke<{
              providers: OcrProviderInfo[];
              default_provider: OcrProviderType;
            }>("ocr_get_providers");
            
            setProviders(providerResponse.providers);
            setDefaultProvider(providerResponse.default_provider);
            setSelectedProvider(providerResponse.default_provider);
            
            // Check if any provider is available
            const hasAvailable = providerResponse.providers.some(p => p.available);
            setOcrAvailable(hasAvailable);
            
            // Get languages from the selected provider
            if (hasAvailable) {
              const availableProvider = providerResponse.providers.find(
                p => p.provider_type === providerResponse.default_provider && p.available
              ) || providerResponse.providers.find(p => p.available);
              
              if (availableProvider) {
                setAvailableLanguages(availableProvider.languages);
              }
            }
          } catch {
            // Fallback to legacy API
            const isAvailable = await invoke<boolean>("screenshot_ocr_is_available");
            setOcrAvailable(isAvailable);
            
            if (isAvailable) {
              const languages = await invoke<string[]>("screenshot_get_ocr_languages");
              setAvailableLanguages(languages);
            }
          }
        } catch (err) {
          console.error("Failed to load OCR info:", err);
          setOcrAvailable(false);
        } finally {
          setLoadingLanguages(false);
        }
      }
    }
    
    if (isOpen) {
      loadOcrInfo();
    }
  }, [isOpen]);

  const [result, setResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("auto");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update languages when provider changes
  useEffect(() => {
    const provider = providers.find(p => p.provider_type === selectedProvider);
    if (provider && provider.languages.length > 0) {
      setAvailableLanguages(provider.languages);
    }
  }, [selectedProvider, providers]);

  const processOCR = useCallback(
    async (imageData: string) => {
      setIsProcessing(true);
      setError(null);

      try {
        if (isTauri()) {
          const { invoke } = await import("@tauri-apps/api/core");
          const imageBase64 = imageData.replace(/^data:image\/\w+;base64,/, "");

          // Try multi-provider API first
          try {
            const ocrResult = await invoke<UnifiedOcrResult>("ocr_extract_text", {
              request: {
                image_base64: imageBase64,
                provider: selectedProvider,
                options: {
                  language: selectedLanguage === "auto" ? null : selectedLanguage,
                  word_level: false,
                },
              },
            });

            setResult({
              text: ocrResult.text,
              confidence: ocrResult.confidence,
              language: ocrResult.language,
              provider: ocrResult.provider,
              processing_time_ms: ocrResult.processing_time_ms,
            });

            if (ocrResult.text) {
              onTextExtracted?.(ocrResult.text);
            }
          } catch {
            // Fallback to legacy Windows OCR API
            const ocrResult = await invoke<{
              text: string;
              confidence: number;
              language?: string;
            }>("screenshot_ocr_windows", {
              imageBase64,
              language: selectedLanguage === "auto" ? null : selectedLanguage,
            });

            setResult({
              text: ocrResult.text,
              confidence: ocrResult.confidence,
              language: ocrResult.language,
              provider: "Windows OCR",
            });

            if (ocrResult.text) {
              onTextExtracted?.(ocrResult.text);
            }
          }
        } else {
          // Web fallback - would need a cloud OCR service
          setError("OCR is only available in the desktop app");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to process image");
      } finally {
        setIsProcessing(false);
      }
    },
    [selectedLanguage, selectedProvider, onTextExtracted]
  );

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;
        setImagePreview(imageData);
        await processOCR(imageData);
      };
      reader.readAsDataURL(file);
    },
    [processOCR]
  );

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      if (isTauri()) {
        const { invoke } = await import("@tauri-apps/api/core");

        // Check if clipboard has image
        const hasImage = await invoke<boolean>("clipboard_has_image");
        if (!hasImage) {
          setError("No image found in clipboard");
          return;
        }

        // Read image from clipboard
        const imageData = await invoke<string>("read_clipboard_image");
        if (imageData) {
          setImagePreview(`data:image/png;base64,${imageData}`);
          await processOCR(imageData);
        }
      } else {
        // Web fallback
        const items = await navigator.clipboard.read();
        for (const item of items) {
          if (item.types.includes("image/png")) {
            const blob = await item.getType("image/png");
            const reader = new FileReader();
            reader.onload = async (e) => {
              const imageData = e.target?.result as string;
              setImagePreview(imageData);
              await processOCR(imageData);
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
        setError("No image found in clipboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read clipboard");
    }
  }, [processOCR]);

  const handleScreenCapture = useCallback(async () => {
    try {
      if (isTauri()) {
        const { invoke } = await import("@tauri-apps/api/core");

        // Start region selection for screenshot
        await invoke("screenshot_start_region_selection");

        // Listen for the result
        const { listen } = await import("@tauri-apps/api/event");
        const unlisten = await listen<{ imageBase64: string }>(
          "screenshot-region-captured",
          async (event) => {
            unlisten();
            const imageData = event.payload.imageBase64;
            setImagePreview(`data:image/png;base64,${imageData}`);
            await processOCR(imageData);
          }
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to capture screen");
    }
  }, [processOCR]);

  const handleCopyResult = useCallback(() => {
    if (result?.text) {
      navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [result]);

  const handleAction = useCallback(
    (action: string) => {
      if (result?.text) {
        onAction?.(action, result.text);
      }
    },
    [result, onAction]
  );

  const handleReset = useCallback(() => {
    setResult(null);
    setError(null);
    setImagePreview(null);
  }, []);

  if (!isOpen) return null;

  return (
    <TooltipProvider>
      <div
        className={cn(
          "w-[420px] max-h-[600px] z-50",
          "bg-gray-900/95 backdrop-blur-xl",
          "rounded-2xl border border-white/10",
          "shadow-2xl shadow-black/50",
          "animate-in fade-in zoom-in-95 duration-200",
          "flex flex-col overflow-hidden",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <ScanText className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-medium text-white">
              {t("title")}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/60 hover:text-white"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* OCR Availability Warning */}
        {ocrAvailable === false && (
          <div className="px-4 py-2 border-b border-white/10 bg-amber-500/10">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs">{t("notAvailable")}</span>
            </div>
          </div>
        )}

        {/* Provider and Language Selection */}
        <div className="px-4 py-2 border-b border-white/10 flex flex-wrap items-center gap-3">
          {/* Provider Selection */}
          <div className="flex items-center gap-2">
            {PROVIDER_ICONS[selectedProvider] || <ScanText className="w-4 h-4 text-white/40" />}
            <span className="text-xs text-white/60">{t("provider")}</span>
            <Select 
              value={selectedProvider} 
              onValueChange={(value) => setSelectedProvider(value as OcrProviderType)} 
              disabled={loadingLanguages}
            >
              <SelectTrigger className="h-7 w-36 text-xs bg-white/5 border-white/10">
                <SelectValue placeholder={t("selectProvider")} />
              </SelectTrigger>
              <SelectContent className="bg-gray-900/95 border-white/10">
                {providers.filter(p => p.available).map((provider) => (
                  <SelectItem 
                    key={provider.provider_type} 
                    value={provider.provider_type} 
                    className="text-xs"
                    showIconInTrigger
                  >
                    {PROVIDER_ICONS[provider.provider_type]}
                    <span>{provider.display_name}</span>
                    {provider.is_local && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">{t("providers.windows_ocr")}</Badge>
                    )}
                  </SelectItem>
                ))}
                {providers.filter(p => p.available).length === 0 && (
                  <SelectItem value="windows_ocr" className="text-xs" disabled>
                    {t("noProviders")}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Language Selection */}
          <div className="flex items-center gap-2">
            <Languages className="w-4 h-4 text-white/40" />
            <span className="text-xs text-white/60">{t("language")}</span>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage} disabled={loadingLanguages}>
              <SelectTrigger className="h-7 w-32 text-xs bg-white/5 border-white/10">
                <SelectValue placeholder={loadingLanguages ? t("loading") : t("select")} />
              </SelectTrigger>
              <SelectContent className="bg-gray-900/95 border-white/10 max-h-[300px]">
                <SelectItem value="auto" className="text-xs">
                  {t("autoDetect")}
                </SelectItem>
                {availableLanguages.map((langCode) => (
                  <SelectItem key={langCode} value={langCode} className="text-xs">
                    {getLanguageDisplayName(langCode)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {loadingLanguages && (
            <Loader2 className="w-3 h-3 animate-spin text-white/40" />
          )}
        </div>

        {/* Input Methods */}
        {!imagePreview && !result && (
          <div className="p-4 space-y-3">
            <p className="text-xs text-white/60 text-center mb-4">
              {t("chooseMethod")}
            </p>

            <div className="grid grid-cols-3 gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2 bg-white/5 border-white/10 hover:bg-white/10"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                  >
                    <Upload className="w-6 h-6 text-blue-400" />
                    <span className="text-xs">{t("upload")}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("uploadDesc")}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2 bg-white/5 border-white/10 hover:bg-white/10"
                    onClick={handlePasteFromClipboard}
                    disabled={isProcessing}
                  >
                    <Clipboard className="w-6 h-6 text-amber-400" />
                    <span className="text-xs">{t("paste")}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("pasteDesc")}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2 bg-white/5 border-white/10 hover:bg-white/10"
                    onClick={handleScreenCapture}
                    disabled={isProcessing}
                  >
                    <Camera className="w-6 h-6 text-green-400" />
                    <span className="text-xs">{t("capture")}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("captureDesc")}</TooltipContent>
              </Tooltip>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              aria-label="Upload image file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />

            {isProcessing && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                <span className="text-sm text-white/60">{t("processing")}</span>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Image Preview */}
        {imagePreview && (
          <div className="p-4 space-y-3">
            <div className="relative rounded-lg overflow-hidden bg-black/50">
              <Image
                src={imagePreview}
                alt="OCR source"
                width={PREVIEW_IMAGE_WIDTH}
                height={PREVIEW_IMAGE_HEIGHT}
                className="w-full max-h-40 h-auto object-contain"
                sizes="(max-width: 480px) 100vw, 420px"
                unoptimized={isInlineImageSource(imagePreview)}
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 bg-black/50 hover:bg-black/70"
                onClick={handleReset}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>

            {isProcessing && (
              <div className="flex items-center justify-center gap-2 py-2">
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                <span className="text-xs text-white/60">{t("extracting")}</span>
              </div>
            )}
          </div>
        )}

        {/* OCR Result */}
        {result && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-medium text-white/80">
                  {t("extractedText")}
                </span>
                {result.confidence > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-5 text-[10px] bg-white/10"
                  >
                    {Math.round(result.confidence * 100)}% {t("confidence")}
                  </Badge>
                )}
                {result.language && (
                  <Badge
                    variant="outline"
                    className="h-5 text-[10px] border-white/20"
                  >
                    {result.language}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-white/60 hover:text-white"
                  onClick={handleReset}
                >
                  <RefreshCw className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-white/60 hover:text-white"
                  onClick={handleCopyResult}
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 max-h-[200px]">
              <div className="p-4">
                <p className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed">
                  {result.text}
                </p>
              </div>
            </ScrollArea>

            {/* Quick Actions */}
            <div className="px-4 py-3 border-t border-white/10 space-y-2">
              <span className="text-[10px] text-white/40 uppercase tracking-wider">
                {t("quickActions")}
              </span>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 text-xs bg-white/10 hover:bg-white/20"
                  onClick={() => handleAction("translate")}
                >
                  <Languages className="w-3 h-3 mr-1" />
                  {t("translate")}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 text-xs bg-white/10 hover:bg-white/20"
                  onClick={() => handleAction("explain")}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  {t("explain")}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 text-xs bg-white/10 hover:bg-white/20"
                  onClick={() => handleAction("summarize")}
                >
                  <FileText className="w-3 h-3 mr-1" />
                  {t("summarize")}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 text-xs bg-white/10 hover:bg-white/20"
                  onClick={() => handleAction("send-to-chat")}
                >
                  {t("sendToChat")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-2 border-t border-white/10 text-center">
          <p className="text-[10px] text-white/30">
            {t("poweredBy")}
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
}
