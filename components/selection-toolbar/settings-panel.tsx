"use client";

import { cn } from "@/lib/utils";
import { useSelectionStore } from "@/stores/selection-store";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { MousePointer2, Languages, Clock, Ban } from "lucide-react";

const LANGUAGES = [
  { value: "zh-CN", label: "Chinese (Simplified)" },
  { value: "zh-TW", label: "Chinese (Traditional)" },
  { value: "en", label: "English" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ru", label: "Russian" },
  { value: "ar", label: "Arabic" },
];

export function SelectionToolbarSettings() {
  const { config, isEnabled, updateConfig, setEnabled, resetConfig } =
    useSelectionStore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <MousePointer2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Selection Toolbar</h3>
            <p className="text-sm text-muted-foreground">
              AI-powered actions for selected text
            </p>
          </div>
        </div>
        <Switch checked={isEnabled} onCheckedChange={setEnabled} />
      </div>

      {/* Settings */}
      <div
        className={cn(
          "space-y-4 transition-opacity",
          !isEnabled && "opacity-50 pointer-events-none"
        )}
      >
        {/* Trigger Mode */}
        <div className="space-y-2">
          <Label>Trigger Mode</Label>
          <Select
            value={config.triggerMode}
            onValueChange={(value: "auto" | "shortcut") =>
              updateConfig({ triggerMode: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">
                Automatic (show on text selection)
              </SelectItem>
              <SelectItem value="shortcut">
                Shortcut only (Ctrl+Shift+S)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Target Language */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Languages className="w-4 h-4" />
            Default Translation Language
          </Label>
          <Select
            value={config.targetLanguage}
            onValueChange={(value) => updateConfig({ targetLanguage: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Delay */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Show Delay: {config.delayMs}ms
          </Label>
          <Slider
            value={[config.delayMs]}
            onValueChange={([value]) => updateConfig({ delayMs: value })}
            min={0}
            max={1000}
            step={50}
          />
          <p className="text-xs text-muted-foreground">
            Delay before showing the toolbar after text selection
          </p>
        </div>

        {/* Text Length Limits */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Min Text Length</Label>
            <Input
              type="number"
              value={config.minTextLength}
              onChange={(e) =>
                updateConfig({ minTextLength: parseInt(e.target.value) || 1 })
              }
              min={1}
              max={100}
            />
          </div>
          <div className="space-y-2">
            <Label>Max Text Length</Label>
            <Input
              type="number"
              value={config.maxTextLength}
              onChange={(e) =>
                updateConfig({
                  maxTextLength: parseInt(e.target.value) || 5000,
                })
              }
              min={100}
              max={50000}
            />
          </div>
        </div>

        {/* Excluded Apps */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Ban className="w-4 h-4" />
            Excluded Applications
          </Label>
          <Input
            placeholder="e.g., notepad.exe, code.exe (comma separated)"
            value={config.excludedApps.join(", ")}
            onChange={(e) =>
              updateConfig({
                excludedApps: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
          <p className="text-xs text-muted-foreground">
            Applications where the toolbar will not appear
          </p>
        </div>

        {/* Reset Button */}
        <div className="pt-4 border-t">
          <Button variant="outline" onClick={resetConfig}>
            Reset to Defaults
          </Button>
        </div>
      </div>
    </div>
  );
}
