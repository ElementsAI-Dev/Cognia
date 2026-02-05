"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Languages, ChevronDown, ArrowRight, Sparkles } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { LANGUAGES } from "@/types";

// Quick language pairs for one-click translation
const QUICK_LANGUAGE_PAIRS = [
  { source: "auto", target: "zh-CN", label: "→ 中文", flag: "🇨🇳" },
  { source: "auto", target: "en", label: "→ English", flag: "🇺🇸" },
  { source: "zh-CN", target: "en", label: "中 → 英", sourceFlag: "🇨🇳", targetFlag: "🇺🇸" },
  { source: "en", target: "zh-CN", label: "英 → 中", sourceFlag: "🇺🇸", targetFlag: "🇨🇳" },
  { source: "auto", target: "ja", label: "→ 日本語", flag: "🇯🇵" },
  { source: "auto", target: "ko", label: "→ 한국어", flag: "🇰🇷" },
];

export interface LanguageSelectorProps {
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
  onQuickTranslate?: (targetLang: string) => void;
  detectedLanguage?: string | null;
  isDetecting?: boolean;
  disabled?: boolean;
  className?: string;
  showQuickPairs?: boolean;
  compact?: boolean;
}

export function LanguageSelector({
  selectedLanguage,
  onLanguageChange,
  onQuickTranslate,
  detectedLanguage,
  isDetecting = false,
  disabled = false,
  className,
  showQuickPairs = true,
  compact = false,
}: LanguageSelectorProps) {
  const t = useTranslations("languageSelector");
  const [isOpen, setIsOpen] = useState(false);

  const selectedLang = LANGUAGES.find((l) => l.value === selectedLanguage);
  const detectedLang = detectedLanguage
    ? LANGUAGES.find((l) => l.value === detectedLanguage)
    : null;

  const handleLanguageSelect = useCallback(
    (lang: string) => {
      onLanguageChange(lang);
      setIsOpen(false);
    },
    [onLanguageChange]
  );

  const handleQuickTranslate = useCallback(
    (targetLang: string) => {
      onQuickTranslate?.(targetLang);
      setIsOpen(false);
    },
    [onQuickTranslate]
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className={cn(
            "h-8 gap-1.5 px-2",
            "text-white/80 hover:text-white hover:bg-white/10",
            "transition-colors duration-150",
            isOpen && "bg-white/15 text-cyan-400",
            className
          )}
        >
          <Languages className="w-4 h-4" />
          {!compact && (
            <>
              <span className="text-xs">
                {selectedLang?.flag} {selectedLang?.label || selectedLanguage}
              </span>
              <ChevronDown className={cn(
                "w-3 h-3 transition-transform duration-200",
                isOpen && "rotate-180"
              )} />
            </>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="start"
        className={cn(
          "w-72 p-0",
          "bg-gray-900/98 backdrop-blur-xl",
          "border border-white/10",
          "shadow-2xl shadow-black/50"
        )}
      >
        {/* Detected Language */}
        {(detectedLanguage || isDetecting) && (
          <div className="px-3 py-2 border-b border-white/10 bg-white/5">
            <div className="flex items-center gap-2 text-xs">
              {isDetecting ? (
                <>
                  <LoadingSpinner size="sm" className="text-cyan-400" />
                  <span className="text-white/60">{t("detectingLanguage")}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span className="text-white/60">{t("detected")}</span>
                  <Badge variant="secondary" className="h-5 text-[10px] bg-cyan-500/20 text-cyan-300">
                    {detectedLang?.flag} {detectedLang?.label || detectedLanguage}
                  </Badge>
                </>
              )}
            </div>
          </div>
        )}

        {/* Quick Language Pairs */}
        {showQuickPairs && (
          <div className="p-2 border-b border-white/10">
            <div className="text-[10px] font-medium text-white/40 uppercase tracking-wider mb-2 px-1">
              {t("quickTranslate")}
            </div>
            <div className="grid grid-cols-2 gap-1">
              {QUICK_LANGUAGE_PAIRS.map((pair, idx) => (
                <Button
                  key={idx}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleQuickTranslate(pair.target)}
                  className={cn(
                    "h-7 justify-start gap-1.5 text-xs",
                    "text-white/70 hover:text-white hover:bg-white/10"
                  )}
                >
                  {pair.sourceFlag ? (
                    <>
                      <span>{pair.sourceFlag}</span>
                      <ArrowRight className="w-3 h-3 text-white/40" />
                      <span>{pair.targetFlag}</span>
                    </>
                  ) : (
                    <>
                      <span>{pair.flag}</span>
                      <span>{pair.label}</span>
                    </>
                  )}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* All Languages */}
        <div className="p-2">
          <div className="text-[10px] font-medium text-white/40 uppercase tracking-wider mb-2 px-1">
            {t("targetLanguage")}
          </div>
          <ScrollArea className="h-48">
            <div className="space-y-0.5">
              {LANGUAGES.map((lang) => (
                <Button
                  key={lang.value}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLanguageSelect(lang.value)}
                  className={cn(
                    "w-full justify-start gap-2 h-8 text-xs",
                    "text-white/70 hover:text-white hover:bg-white/10",
                    selectedLanguage === lang.value && "bg-white/15 text-cyan-400"
                  )}
                >
                  <span className="text-base">{lang.flag}</span>
                  <span>{lang.label}</span>
                  {selectedLanguage === lang.value && (
                    <Badge variant="secondary" className="ml-auto h-4 text-[9px] bg-cyan-500/20 text-cyan-300">
                      {t("selected")}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Footer */}
        <Separator className="bg-white/10" />
        <div className="px-3 py-2 text-[10px] text-white/40">
          {t("quickTranslateHint")}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default LanguageSelector;
