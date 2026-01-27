"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from 'next-intl';
import { cn } from "@/lib/utils";
import { isTauri } from '@/lib/native/utils';
import {
  Download,
  Trash2,
  RefreshCw,
  Loader2,
  Settings,
  FileDown,
  AlertCircle,
  CheckCircle2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import type {
  ModelDefinition,
  DownloadConfig,
  DownloadProgress,
  ModelSource,
} from "@/lib/native/model-download";
import {
  SOURCE_NAMES,
  CATEGORY_NAMES,
  CATEGORY_ICONS,
  formatFileSize,
  formatSpeed,
  formatEta,
} from "@/lib/native/model-download-helpers";

// ============== Types ==============

interface ModelManagerProps {
  className?: string;
}

interface ModelState {
  definition: ModelDefinition;
  installed: boolean;
  downloading: boolean;
  progress?: DownloadProgress;
}

// ============== Components ==============

function ModelCard({
  model,
  onDownload,
  onDelete,
  t,
}: {
  model: ModelState;
  onDownload: () => void;
  onDelete: () => void;
  t: ReturnType<typeof useTranslations<'providers'>>;
}) {
  const { definition, installed, downloading, progress } = model;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {CATEGORY_ICONS[definition.category] || <FileDown className="w-4 h-4 shrink-0" />}
            <CardTitle className="text-sm font-medium truncate">{definition.name}</CardTitle>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {installed && (
              <Badge variant="outline" className="text-green-400 border-green-400/50 text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {t('installed')}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {formatFileSize(definition.size)}
            </Badge>
          </div>
        </div>
        <CardDescription className="text-xs line-clamp-2">
          {definition.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        {downloading && progress ? (
          <div className="space-y-2">
            <Progress value={progress.percent} className="h-2" />
            <div className="flex flex-col gap-0.5 text-xs text-muted-foreground sm:flex-row sm:justify-between">
              <span>{progress.status === "downloading" ? t('downloading') : progress.status}</span>
              <span className="truncate">
                {formatFileSize(progress.downloaded_bytes)} / {formatFileSize(progress.total_bytes)}
                {progress.speed_bps > 0 && ` • ${formatSpeed(progress.speed_bps)}`}
                <span className="hidden sm:inline">{progress.eta_secs && ` • ${formatEta(progress.eta_secs)} left`}</span>
              </span>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            {!installed ? (
              <Button
                size="sm"
                onClick={onDownload}
                disabled={downloading}
                className="flex-1 h-8"
              >
                <Download className="w-3 h-3 mr-1" />
                {t('download')}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="destructive"
                onClick={onDelete}
                className="flex-1 h-8"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                {t('delete')}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProxySettings({
  config,
  onConfigChange,
  proxyStatus,
  onTestProxy,
  onDetectProxy,
  t,
}: {
  config: DownloadConfig;
  onConfigChange: (config: DownloadConfig) => void;
  proxyStatus: "unknown" | "testing" | "connected" | "failed";
  onTestProxy: () => void;
  onDetectProxy: () => void;
  t: ReturnType<typeof useTranslations<'providers'>>;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>{t('modelManager.autoDetectProxy')}</Label>
          <p className="text-xs text-white/60">
            {t('modelManager.autoDetectProxyDesc')}
          </p>
        </div>
        <Switch
          checked={config.use_system_proxy}
          onCheckedChange={(checked) =>
            onConfigChange({ ...config, use_system_proxy: checked })
          }
        />
      </div>

      <div className="space-y-2">
        <Label>{t('modelManager.proxyUrl')}</Label>
        <div className="flex gap-2">
          <Input
            placeholder="http://127.0.0.1:7890"
            value={config.proxy_url || ""}
            onChange={(e) =>
              onConfigChange({ ...config, proxy_url: e.target.value || undefined })
            }
            className="flex-1 bg-gray-800/50 border-white/10"
          />
          <Button variant="outline" size="sm" onClick={onDetectProxy}>
            <RefreshCw className="w-4 h-4 mr-1" />
            {t('detect')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onTestProxy}
            disabled={proxyStatus === "testing"}
          >
            {proxyStatus === "testing" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : proxyStatus === "connected" ? (
              <Wifi className="w-4 h-4 text-green-400" />
            ) : proxyStatus === "failed" ? (
              <WifiOff className="w-4 h-4 text-red-400" />
            ) : (
              <Wifi className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('modelManager.preferredSources')}</Label>
        <p className="text-xs text-white/60">
          {t('routingHint')}
        </p>
        <div className="flex flex-wrap gap-2">
          {(["hugging_face", "model_scope", "git_hub"] as ModelSource[]).map((source) => {
            const isSelected = config.preferred_sources.includes(source);
            return (
              <Badge
                key={source}
                variant={isSelected ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-colors",
                  isSelected
                    ? "bg-cyan-600 hover:bg-cyan-700"
                    : "hover:bg-white/10"
                )}
                onClick={() => {
                  const newSources = isSelected
                    ? config.preferred_sources.filter((s) => s !== source)
                    : [...config.preferred_sources, source];
                  onConfigChange({ ...config, preferred_sources: newSources });
                }}
              >
                {SOURCE_NAMES[source] || source}
              </Badge>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('modelManager.downloadTimeout')}</Label>
        <Select
          value={String(config.timeout_secs)}
          onValueChange={(value) =>
            onConfigChange({ ...config, timeout_secs: Number(value) })
          }
        >
          <SelectTrigger className="bg-gray-800/50 border-white/10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-white/10">
            <SelectItem value="60">{t('modelManager.timeout1min')}</SelectItem>
            <SelectItem value="180">{t('modelManager.timeout3min')}</SelectItem>
            <SelectItem value="300">{t('modelManager.timeout5min')}</SelectItem>
            <SelectItem value="600">{t('modelManager.timeout10min')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ============== Main Component ==============

export function ModelManager({ className }: ModelManagerProps) {
  const t = useTranslations('providers');
  const [models, setModels] = useState<ModelState[]>([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<DownloadConfig>({
    preferred_sources: ["hugging_face", "model_scope"],
    use_system_proxy: true,
    timeout_secs: 300,
    max_retries: 3,
    custom_mirrors: {},
  });
  const [proxyStatus, setProxyStatus] = useState<"unknown" | "testing" | "connected" | "failed">("unknown");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Load models and installed status
  const loadModels = useCallback(async () => {
    if (typeof window === "undefined" || !isTauri()) return;

    try {
      setLoading(true);
      const { invoke } = await import("@tauri-apps/api/core");

      const [availableModels, installedIds] = await Promise.all([
        invoke<ModelDefinition[]>("model_list_available"),
        invoke<string[]>("model_list_installed"),
      ]);

      setModels(
        availableModels.map((def) => ({
          definition: def,
          installed: installedIds.includes(def.id),
          downloading: false,
        }))
      );
    } catch (err) {
      console.error("Failed to load models:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load config
  const loadConfig = useCallback(async () => {
    if (typeof window === "undefined" || !isTauri()) return;

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const savedConfig = await invoke<DownloadConfig>("model_get_download_config");
      setConfig(savedConfig);
    } catch (err) {
      console.error("Failed to load config:", err);
    }
  }, []);

  // Setup progress listener
  useEffect(() => {
    if (typeof window === "undefined" || !isTauri()) return;

    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      const { listen } = await import("@tauri-apps/api/event");
      unlisten = await listen<DownloadProgress>("model-download-progress", (event) => {
        const progress = event.payload;
        setModels((prev) =>
          prev.map((m) =>
            m.definition.id === progress.model_id
              ? {
                  ...m,
                  downloading: progress.status === "downloading" || progress.status === "connecting",
                  progress,
                  installed: progress.status === "completed" ? true : m.installed,
                }
              : m
          )
        );
      });
    };

    setupListener();
    return () => unlisten?.();
  }, []);

  // Initial load
  useEffect(() => {
    loadModels();
    loadConfig();
  }, [loadModels, loadConfig]);

  // Download model
  const handleDownload = async (modelId: string) => {
    if (typeof window === "undefined" || !isTauri()) return;

    setModels((prev) =>
      prev.map((m) =>
        m.definition.id === modelId ? { ...m, downloading: true } : m
      )
    );

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("model_download", { modelId, config });
    } catch (err) {
      console.error("Download failed:", err);
      setModels((prev) =>
        prev.map((m) =>
          m.definition.id === modelId ? { ...m, downloading: false } : m
        )
      );
    }
  };

  // Delete model
  const handleDelete = async (modelId: string) => {
    if (typeof window === "undefined" || !isTauri()) return;

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("model_delete", { modelId });
      setModels((prev) =>
        prev.map((m) =>
          m.definition.id === modelId ? { ...m, installed: false } : m
        )
      );
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  // Test proxy
  const handleTestProxy = async () => {
    if (!config.proxy_url) return;

    setProxyStatus("testing");
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const success = await invoke<boolean>("model_test_proxy", {
        proxyUrl: config.proxy_url,
      });
      setProxyStatus(success ? "connected" : "failed");
    } catch {
      setProxyStatus("failed");
    }
  };

  // Detect proxy
  const handleDetectProxy = async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const detected = await invoke<string | null>("model_detect_proxy");
      if (detected) {
        setConfig((prev) => ({ ...prev, proxy_url: detected }));
        setProxyStatus("connected");
      }
    } catch (err) {
      console.error("Proxy detection failed:", err);
    }
  };

  // Get categories
  const categories = ["all", ...new Set(models.map((m) => m.definition.category))];

  // Filter models by category
  const filteredModels =
    activeCategory === "all"
      ? models
      : models.filter((m) => m.definition.category === activeCategory);

  // Stats
  const installedCount = models.filter((m) => m.installed).length;
  const downloadingCount = models.filter((m) => m.downloading).length;

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <Loader2 className="w-6 h-6 animate-spin text-white/60" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn("space-y-4", className)}>
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">{t('modelManager.title')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('modelManager.installedCount', { installed: installedCount, total: models.length })}
              {downloadingCount > 0 && ` • ${downloadingCount} ${t('downloading')}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadModels} className="h-8">
              <RefreshCw className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">{t('refresh')}</span>
            </Button>
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Settings className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">{t('modelManager.settings')}</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{t('modelManager.downloadSettings')}</DialogTitle>
                  <DialogDescription>
                    {t('modelManager.downloadSettingsDesc')}
                  </DialogDescription>
                </DialogHeader>
                <ProxySettings
                  config={config}
                  onConfigChange={setConfig}
                  proxyStatus={proxyStatus}
                  onTestProxy={handleTestProxy}
                  onDetectProxy={handleDetectProxy}
                  t={t}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Proxy Status Banner */}
        {config.proxy_url && proxyStatus === "connected" && (
          <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
            <Wifi className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-400">
              {t('modelManager.usingProxy', { url: config.proxy_url })}
            </span>
          </div>
        )}

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="bg-gray-800/50">
            <TabsTrigger value="all">{t('allModels')}</TabsTrigger>
            {categories
              .filter((c) => c !== "all")
              .map((cat) => (
                <TabsTrigger key={cat} value={cat}>
                  {CATEGORY_NAMES[cat] || cat}
                </TabsTrigger>
              ))}
          </TabsList>

          <TabsContent value={activeCategory} className="mt-4">
            {filteredModels.length === 0 ? (
              <div className="text-center py-8 text-white/60">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>{t('modelManager.noModelsInCategory')}</p>
              </div>
            ) : (
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {filteredModels.map((model) => (
                  <ModelCard
                    key={model.definition.id}
                    model={model}
                    onDownload={() => handleDownload(model.definition.id)}
                    onDelete={() => handleDelete(model.definition.id)}
                    t={t}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

export default ModelManager;
