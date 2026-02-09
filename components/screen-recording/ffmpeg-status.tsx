'use client';

/**
 * FFmpeg Status Component
 *
 * Displays FFmpeg availability status and provides installation guidance.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  AlertCircle,
  CheckCircle2,
  Cpu,
  Download,
  ExternalLink,
  Info,
  Loader2,
  RefreshCw,
  Terminal,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CopyButton } from '@/components/chat/ui/copy-button';
import { useScreenRecordingStore } from '@/stores/media';
import { isTauri } from '@/lib/native/utils';
import { cn } from '@/lib/utils';

interface FFmpegStatusProps {
  className?: string;
  showWhenAvailable?: boolean;
  compact?: boolean;
}

/**
 * Platform-specific installation instructions
 */
const INSTALLATION_INSTRUCTIONS = {
  windows: {
    title: 'Windows',
    steps: [
      'Download FFmpeg from https://ffmpeg.org/download.html',
      'Extract the downloaded archive',
      'Add the bin folder to your system PATH',
      'Restart Cognia after installation',
    ],
    wingetCommand: 'winget install FFmpeg',
    chocoCommand: 'choco install ffmpeg',
  },
  macos: {
    title: 'macOS',
    steps: [
      'Install Homebrew if not installed: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"',
      'Run: brew install ffmpeg',
      'Restart Cognia after installation',
    ],
    brewCommand: 'brew install ffmpeg',
  },
  linux: {
    title: 'Linux',
    steps: [
      'Ubuntu/Debian: sudo apt install ffmpeg',
      'Fedora: sudo dnf install ffmpeg',
      'Arch: sudo pacman -S ffmpeg',
      'Restart Cognia after installation',
    ],
    aptCommand: 'sudo apt install ffmpeg',
  },
};

interface InstallationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: 'windows' | 'macos' | 'linux';
  isChecking: boolean;
  onCheckAgain: () => void;
  t: ReturnType<typeof useTranslations<'ffmpegStatus'>>;
}

function InstallationDialog({
  open,
  onOpenChange,
  platform,
  isChecking,
  onCheckAgain,
  t,
}: InstallationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {t('installFFmpeg')}
          </DialogTitle>
          <DialogDescription>
            {t('installDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Platform-specific instructions */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">
              {INSTALLATION_INSTRUCTIONS[platform].title}
            </h4>
            
            {/* Quick install command */}
            {platform === 'windows' && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{t('usingWinget')}</p>
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md font-mono text-sm">
                  <Terminal className="h-4 w-4 text-muted-foreground" />
                  <code className="flex-1">{INSTALLATION_INSTRUCTIONS.windows.wingetCommand}</code>
                  <CopyButton
                    content={INSTALLATION_INSTRUCTIONS.windows.wingetCommand}
                    iconOnly
                    tooltip={t('copyToClipboard')}
                    showToast={false}
                    saveToHistory={false}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{t('orChocolatey')}</p>
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md font-mono text-sm">
                  <Terminal className="h-4 w-4 text-muted-foreground" />
                  <code className="flex-1">{INSTALLATION_INSTRUCTIONS.windows.chocoCommand}</code>
                  <CopyButton
                    content={INSTALLATION_INSTRUCTIONS.windows.chocoCommand}
                    iconOnly
                    tooltip={t('copyToClipboard')}
                    showToast={false}
                    saveToHistory={false}
                  />
                </div>
              </div>
            )}
            
            {platform === 'macos' && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{t('usingHomebrew')}</p>
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md font-mono text-sm">
                  <Terminal className="h-4 w-4 text-muted-foreground" />
                  <code className="flex-1">{INSTALLATION_INSTRUCTIONS.macos.brewCommand}</code>
                  <CopyButton
                    content={INSTALLATION_INSTRUCTIONS.macos.brewCommand}
                    iconOnly
                    tooltip={t('copyToClipboard')}
                    showToast={false}
                    saveToHistory={false}
                  />
                </div>
              </div>
            )}
            
            {platform === 'linux' && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{t('usingPackageManager')}</p>
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md font-mono text-sm">
                  <Terminal className="h-4 w-4 text-muted-foreground" />
                  <code className="flex-1">{INSTALLATION_INSTRUCTIONS.linux.aptCommand}</code>
                  <CopyButton
                    content={INSTALLATION_INSTRUCTIONS.linux.aptCommand}
                    iconOnly
                    tooltip={t('copyToClipboard')}
                    showToast={false}
                    saveToHistory={false}
                  />
                </div>
              </div>
            )}

            {/* Manual steps */}
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">{t('manualSteps')}</p>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                {INSTALLATION_INSTRUCTIONS[platform].steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>
          </div>

          {/* Official download link */}
          <div className="pt-2 border-t">
            <a
              href="https://ffmpeg.org/download.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              {t('officialDownload')}
            </a>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('close')}
          </Button>
          <Button onClick={onCheckAgain} disabled={isChecking}>
            {isChecking ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {t('checkAgain')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FFmpegStatus({
  className,
  showWhenAvailable = false,
  compact = false,
}: FFmpegStatusProps) {
  const t = useTranslations('ffmpegStatus');
  const [showDialog, setShowDialog] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  
  // Detect platform on initial render
  const [platform] = useState<'windows' | 'macos' | 'linux'>(() => {
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      if (userAgent.includes('win')) {
        return 'windows';
      } else if (userAgent.includes('mac')) {
        return 'macos';
      } else {
        return 'linux';
      }
    }
    return 'windows';
  });

  const {
    ffmpegAvailable,
    ffmpegInfo,
    ffmpegVersionOk,
    hardwareAcceleration,
    ffmpegInstallGuide,
    isInitialized,
    checkFfmpeg,
    refreshFFmpegInfo,
    refreshHardwareAcceleration,
    refreshFFmpegInstallGuide,
  } = useScreenRecordingStore();

  const handleCheckAgain = async () => {
    setIsChecking(true);
    const available = await checkFfmpeg();
    if (available) {
      await Promise.all([refreshFFmpegInfo(), refreshHardwareAcceleration()]);
    } else {
      await refreshFFmpegInstallGuide();
    }
    setIsChecking(false);
  };


  // Don't render in web environment
  if (!isTauri()) {
    return null;
  }

  // Don't render if not initialized yet
  if (!isInitialized) {
    return null;
  }

  // If available and we don't want to show when available
  if (ffmpegAvailable && !showWhenAvailable) {
    return null;
  }

  const hwAccelLabels = hardwareAcceleration
    ? [
        hardwareAcceleration.nvidia && 'NVIDIA',
        hardwareAcceleration.intel_qsv && 'Intel QSV',
        hardwareAcceleration.amd_amf && 'AMD AMF',
        hardwareAcceleration.vaapi && 'VAAPI',
      ].filter(Boolean)
    : [];

  // Compact mode - just show a badge
  if (compact) {
    return (
      <>
        <div className={cn('flex items-center gap-1.5', className)}>
          {ffmpegAvailable ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-destructive" />
          )}
          <span className="text-xs text-muted-foreground">
            {ffmpegAvailable
              ? ffmpegInfo?.version
                ? `FFmpeg ${ffmpegInfo.version}`
                : t('available')
              : t('notAvailable')}
          </span>
          {ffmpegAvailable && hwAccelLabels.length > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Cpu className="h-3 w-3" />
              {hwAccelLabels.join(', ')}
            </span>
          )}
          {!ffmpegAvailable && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => setShowDialog(true)}
            >
              {t('install')}
            </Button>
          )}
        </div>
        <InstallationDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          platform={platform}
          isChecking={isChecking}
          onCheckAgain={handleCheckAgain}
          t={t}
        />
      </>
    );
  }

  // Full alert display
  return (
    <>
      <Alert
        variant={ffmpegAvailable ? 'default' : 'destructive'}
        className={className}
      >
        {ffmpegAvailable ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <AlertCircle className="h-4 w-4" />
        )}
        <AlertTitle>
          {ffmpegAvailable ? t('ffmpegReady') : t('ffmpegRequired')}
        </AlertTitle>
        <AlertDescription className="mt-2">
          {ffmpegAvailable ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {t('readyDescription')}
              </p>
              {ffmpegInfo && (
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {ffmpegInfo.version && (
                    <div className="flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5" />
                      <span>
                        {t('version')}: {ffmpegInfo.version}
                        {!ffmpegVersionOk && (
                          <span className="ml-1 text-amber-500">({t('versionWarning')})</span>
                        )}
                      </span>
                    </div>
                  )}
                  {ffmpegInfo.path && (
                    <div className="flex items-center gap-1.5">
                      <Terminal className="h-3.5 w-3.5" />
                      <span className="font-mono truncate max-w-xs" title={ffmpegInfo.path}>
                        {ffmpegInfo.path}
                      </span>
                    </div>
                  )}
                  {hwAccelLabels.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Cpu className="h-3.5 w-3.5" />
                      <span>{t('hwAcceleration')}: {hwAccelLabels.join(', ')}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm">
                {t('requiredDescription')}
              </p>
              {ffmpegInstallGuide?.quick_install && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md font-mono text-sm">
                  <Terminal className="h-4 w-4 text-muted-foreground shrink-0" />
                  <code className="flex-1 truncate">{ffmpegInstallGuide.quick_install}</code>
                  <CopyButton
                    content={ffmpegInstallGuide.quick_install}
                    iconOnly
                    tooltip={t('copyToClipboard')}
                    showToast={false}
                    saveToHistory={false}
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDialog(true)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t('installGuide')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCheckAgain}
                  disabled={isChecking}
                >
                  {isChecking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="ml-2">{t('checkAgain')}</span>
                </Button>
              </div>
            </div>
          )}
        </AlertDescription>
      </Alert>

      <InstallationDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        platform={platform}
        isChecking={isChecking}
        onCheckAgain={handleCheckAgain}
        t={t}
      />
    </>
  );
}

export default FFmpegStatus;
