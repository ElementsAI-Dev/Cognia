"use client";

import { cn } from "@/lib/utils";
import { Copy, Check, X, Loader2 } from "lucide-react";
import { useState } from "react";

export interface ResultPanelProps {
  result: string | null;
  error: string | null;
  isLoading: boolean;
  onClose: () => void;
  onCopy: () => void;
}

export function ResultPanel({
  result,
  error,
  isLoading,
  onClose,
  onCopy,
}: ResultPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!result && !error && !isLoading) {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute top-full left-0 right-0 mt-2",
        "bg-gray-900/95 backdrop-blur-xl",
        "rounded-xl shadow-2xl",
        "border border-white/10",
        "overflow-hidden",
        "animate-in fade-in slide-in-from-top-2 duration-200"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <span className="text-xs font-medium text-white/70">
          {isLoading ? "Processing..." : error ? "Error" : "Result"}
        </span>
        <div className="flex items-center gap-1">
          {result && !isLoading && (
            <button
              onClick={handleCopy}
              className={cn(
                "p-1.5 rounded-md",
                "hover:bg-white/10 transition-colors",
                "text-white/70 hover:text-white"
              )}
              title="Copy result"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          <button
            onClick={onClose}
            className={cn(
              "p-1.5 rounded-md",
              "hover:bg-white/10 transition-colors",
              "text-white/70 hover:text-white"
            )}
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 max-h-[200px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 text-white/50 animate-spin" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : (
          <p className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed">
            {result}
          </p>
        )}
      </div>
    </div>
  );
}
