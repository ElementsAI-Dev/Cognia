'use client';

/**
 * ProxySettings - Configuration UI for network proxy management
 *
 * Features:
 * - Auto-detection of proxy software (Clash, V2Ray, etc.)
 * - Manual proxy configuration
 * - Proxy testing
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Globe,
  RefreshCw,
  Check,
  Wifi,
  WifiOff,
  AlertCircle,
  Loader2,
  Settings,
  Zap,
  Shield,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { useProxy } from '@/hooks/network';
import {
  PROXY_SOFTWARE_INFO,
  type ProxyMode,
  type ProxyProtocol,
  type ManualProxyConfig,
} from '@/types/system/proxy';

export function ProxySettings() {
  const t = useTranslations('proxySettings');
  const {
    mode,
    enabled,
    manualConfig,
    selectedProxy,
    detectedProxies,
    isDetecting,
    isTesting,
    connected,
    currentProxy,
    lastTestLatency,
    error,
    isAvailable,
    setMode,
    setEnabled,
    setManualConfig,
    selectProxy,
    detectProxies,
    testCurrentProxy,
    clearError,
  } = useProxy();

  const [localManual, setLocalManual] = useState<ManualProxyConfig>({
    protocol: 'http',
    host: '127.0.0.1',
    port: 7890,
    ...manualConfig,
  });

  const handleModeChange = (newMode: string) => {
    setMode(newMode as ProxyMode);
    if (newMode !== 'off') {
      setEnabled(true);
    } else {
      setEnabled(false);
    }
  };

  const handleManualConfigSave = () => {
    setManualConfig(localManual);
  };

  const runningProxies = detectedProxies.filter((p) => p.running);

  // Not available state (browser environment)
  if (!isAvailable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <WifiOff className="h-12 w-12 mb-4 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">{t('notAvailable')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('notAvailableDesc')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {t('title')}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                {t('description')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {connected ? (
                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                  <Wifi className="h-3 w-3 mr-1" />
                  {t('connected')}
                  {lastTestLatency && ` (${lastTestLatency}ms)`}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  <WifiOff className="h-3 w-3 mr-1" />
                  {t('disconnected')}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={enabled}
                onCheckedChange={setEnabled}
              />
              <Label>{t('enableProxy')}</Label>
            </div>
            {currentProxy && (
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {currentProxy}
              </code>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={clearError}>
              {t('dismiss')}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Proxy Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {t('proxyMode')}
          </CardTitle>
          <CardDescription className="text-xs">
            {t('proxyModeDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={mode} onValueChange={handleModeChange} className="space-y-3">
            <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="off" id="mode-off" />
              <Label htmlFor="mode-off" className="flex-1 cursor-pointer">
                <div className="font-medium">{t('modeOff')}</div>
                <div className="text-xs text-muted-foreground">{t('modeOffDesc')}</div>
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="auto" id="mode-auto" />
              <Label htmlFor="mode-auto" className="flex-1 cursor-pointer">
                <div className="font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  {t('modeAuto')}
                </div>
                <div className="text-xs text-muted-foreground">{t('modeAutoDesc')}</div>
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="manual" id="mode-manual" />
              <Label htmlFor="mode-manual" className="flex-1 cursor-pointer">
                <div className="font-medium">{t('modeManual')}</div>
                <div className="text-xs text-muted-foreground">{t('modeManualDesc')}</div>
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="system" id="mode-system" />
              <Label htmlFor="mode-system" className="flex-1 cursor-pointer">
                <div className="font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-500" />
                  {t('modeSystem')}
                </div>
                <div className="text-xs text-muted-foreground">{t('modeSystemDesc')}</div>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Auto-detected Proxies */}
      {mode === 'auto' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  {t('detectedProxies')}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t('detectedProxiesDesc')}
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={detectProxies}
                disabled={isDetecting}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isDetecting ? 'animate-spin' : ''}`} />
                {t('detect')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {runningProxies.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <WifiOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t('noProxiesFound')}</p>
                <p className="text-xs mt-1">{t('noProxiesFoundDesc')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {runningProxies.map((proxy) => {
                  const info = PROXY_SOFTWARE_INFO[proxy.software];
                  const isSelected = selectedProxy === proxy.software;
                  
                  return (
                    <div
                      key={proxy.software}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected ? 'border-primary bg-primary/5' : 'hover:bg-accent/50'
                      }`}
                      onClick={() => selectProxy(proxy.software)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{info.icon}</span>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {info.name}
                            {isSelected && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {proxy.mixedPort && `Port: ${proxy.mixedPort}`}
                            {proxy.version && ` • v${proxy.version}`}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-green-600 border-green-200">
                        <Check className="h-3 w-3 mr-1" />
                        {t('running')}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual Configuration */}
      {mode === 'manual' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('manualConfig')}</CardTitle>
            <CardDescription className="text-xs">
              {t('manualConfigDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('protocol')}</Label>
                <Select
                  value={localManual.protocol}
                  onValueChange={(v) => setLocalManual({ ...localManual, protocol: v as ProxyProtocol })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="http">HTTP</SelectItem>
                    <SelectItem value="https">HTTPS</SelectItem>
                    <SelectItem value="socks5">SOCKS5</SelectItem>
                    <SelectItem value="socks4">SOCKS4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('port')}</Label>
                <Input
                  type="number"
                  value={localManual.port}
                  onChange={(e) => setLocalManual({ ...localManual, port: parseInt(e.target.value) || 0 })}
                  placeholder="7890"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('host')}</Label>
              <Input
                value={localManual.host}
                onChange={(e) => setLocalManual({ ...localManual, host: e.target.value })}
                placeholder="127.0.0.1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('username')} ({t('optional')})</Label>
                <Input
                  value={localManual.username || ''}
                  onChange={(e) => setLocalManual({ ...localManual, username: e.target.value || undefined })}
                  placeholder={t('username')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('password')} ({t('optional')})</Label>
                <Input
                  type="password"
                  value={localManual.password || ''}
                  onChange={(e) => setLocalManual({ ...localManual, password: e.target.value || undefined })}
                  placeholder={t('password')}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleManualConfigSave}>
                {t('save')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Test Proxy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('testProxy')}</CardTitle>
          <CardDescription className="text-xs">
            {t('testProxyDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              onClick={testCurrentProxy}
              disabled={isTesting || mode === 'off'}
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wifi className="h-4 w-4 mr-2" />
              )}
              {t('testConnection')}
            </Button>
            {connected && lastTestLatency && (
              <span className="text-sm text-green-600">
                ✓ {t('testSuccess')} ({lastTestLatency}ms)
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ProxySettings;
