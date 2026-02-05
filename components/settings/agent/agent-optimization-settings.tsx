'use client';

/**
 * Agent Optimization Settings Component
 * Configures Claude best practices for agent systems:
 * - Smart Routing (single vs multi-agent decision)
 * - Token Budget Awareness
 * - Context Isolation
 * - Skills-MCP Auto-loading
 * - Tool Warnings
 */

import React from 'react';
import {
  Brain,
  Coins,
  Shield,
  Sparkles,
  Settings2,
  AlertTriangle,
  Info,
  Users,
  HelpCircle,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useSettingsStore } from '@/stores';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

export function AgentOptimizationSettings() {
  const t = useTranslations('agentOptimization');
  
  const agentOptSettings = useSettingsStore((state) => state.agentOptimizationSettings);
  const setAgentOptimizationSettings = useSettingsStore((state) => state.setAgentOptimizationSettings);
  const setSmartRoutingEnabled = useSettingsStore((state) => state.setSmartRoutingEnabled);
  const setTokenBudgetEnabled = useSettingsStore((state) => state.setTokenBudgetEnabled);
  const setContextIsolationEnabled = useSettingsStore((state) => state.setContextIsolationEnabled);
  const setToolWarningsEnabled = useSettingsStore((state) => state.setToolWarningsEnabled);
  const setSkillMcpAutoLoadEnabled = useSettingsStore((state) => state.setSkillMcpAutoLoadEnabled);
  const resetAgentOptimizationSettings = useSettingsStore((state) => state.resetAgentOptimizationSettings);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{t('title')}</CardTitle>
            <Badge variant="secondary" className="ml-2">Claude Best Practices</Badge>
          </div>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>
      </Card>

      <Accordion type="multiple" defaultValue={['smart-routing', 'skills-mcp']} className="space-y-4">
        {/* Smart Routing Section */}
        <AccordionItem value="smart-routing" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                agentOptSettings.enableSmartRouting ? "bg-primary/10" : "bg-muted"
              )}>
                <Users className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="font-medium">{t('smartRouting.title')}</p>
                <p className="text-xs text-muted-foreground">{t('smartRouting.subtitle')}</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 space-y-4">
            {/* Enable Smart Routing */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">{t('smartRouting.enable')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('smartRouting.enableDesc')}
                </p>
              </div>
              <Switch
                checked={agentOptSettings.enableSmartRouting}
                onCheckedChange={setSmartRoutingEnabled}
              />
            </div>

            {agentOptSettings.enableSmartRouting && (
              <div className="space-y-4 pl-4 border-l-2 border-muted">
                {/* Single Agent Threshold */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Label className="text-sm">{t('smartRouting.threshold')}</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-[250px]">
                            <p>{t('smartRouting.thresholdTooltip')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {(agentOptSettings.singleAgentThreshold * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('smartRouting.thresholdDesc')}
                  </p>
                  <Slider
                    value={[agentOptSettings.singleAgentThreshold]}
                    onValueChange={([value]) => 
                      setAgentOptimizationSettings({ singleAgentThreshold: value })
                    }
                    min={0.3}
                    max={0.9}
                    step={0.1}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t('smartRouting.preferMulti')}</span>
                    <span>{t('smartRouting.preferSingle')}</span>
                  </div>
                </div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Token Budget Section */}
        <AccordionItem value="token-budget" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                agentOptSettings.enableTokenBudget ? "bg-primary/10" : "bg-muted"
              )}>
                <Coins className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="font-medium">{t('tokenBudget.title')}</p>
                <p className="text-xs text-muted-foreground">{t('tokenBudget.subtitle')}</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 space-y-4">
            {/* Enable Token Budget */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">{t('tokenBudget.enable')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('tokenBudget.enableDesc')}
                </p>
              </div>
              <Switch
                checked={agentOptSettings.enableTokenBudget}
                onCheckedChange={setTokenBudgetEnabled}
              />
            </div>

            {agentOptSettings.enableTokenBudget && (
              <div className="space-y-4 pl-4 border-l-2 border-muted">
                {/* Max Token Budget */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Label className="text-sm">{t('tokenBudget.maxBudget')}</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-[250px]">
                          <p>{t('tokenBudget.maxBudgetTooltip')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={agentOptSettings.maxTokenBudget}
                      onChange={(e) => 
                        setAgentOptimizationSettings({ maxTokenBudget: parseInt(e.target.value) || 50000 })
                      }
                      min={10000}
                      max={200000}
                      step={5000}
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">tokens</span>
                  </div>
                </div>

                {/* Estimated Tokens Per Sub-Agent */}
                <div className="space-y-2">
                  <Label className="text-sm">{t('tokenBudget.perSubAgent')}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={agentOptSettings.estimatedTokensPerSubAgent}
                      onChange={(e) => 
                        setAgentOptimizationSettings({ estimatedTokensPerSubAgent: parseInt(e.target.value) || 2000 })
                      }
                      min={500}
                      max={10000}
                      step={500}
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">tokens</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('tokenBudget.maxSubAgents', { 
                      count: Math.floor(agentOptSettings.maxTokenBudget / agentOptSettings.estimatedTokensPerSubAgent) 
                    })}
                  </p>
                </div>

                {/* Enable Warnings */}
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{t('tokenBudget.showWarnings')}</Label>
                  <Switch
                    checked={agentOptSettings.enableTokenWarnings}
                    onCheckedChange={(checked) => 
                      setAgentOptimizationSettings({ enableTokenWarnings: checked })
                    }
                  />
                </div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Context Isolation Section */}
        <AccordionItem value="context-isolation" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                agentOptSettings.enableContextIsolation ? "bg-primary/10" : "bg-muted"
              )}>
                <Shield className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="font-medium">{t('contextIsolation.title')}</p>
                <p className="text-xs text-muted-foreground">{t('contextIsolation.subtitle')}</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 space-y-4">
            {/* Enable Context Isolation */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">{t('contextIsolation.enable')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('contextIsolation.enableDesc')}
                </p>
              </div>
              <Switch
                checked={agentOptSettings.enableContextIsolation}
                onCheckedChange={setContextIsolationEnabled}
              />
            </div>

            {agentOptSettings.enableContextIsolation && (
              <div className="space-y-4 pl-4 border-l-2 border-muted">
                {/* Summarize Results */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">{t('contextIsolation.summarize')}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t('contextIsolation.summarizeDesc')}
                    </p>
                  </div>
                  <Switch
                    checked={agentOptSettings.summarizeSubAgentResults}
                    onCheckedChange={(checked) => 
                      setAgentOptimizationSettings({ summarizeSubAgentResults: checked })
                    }
                  />
                </div>

                {agentOptSettings.summarizeSubAgentResults && (
                  <div className="space-y-2">
                    <Label className="text-sm">{t('contextIsolation.maxTokens')}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={agentOptSettings.maxResultTokens}
                        onChange={(e) => 
                          setAgentOptimizationSettings({ maxResultTokens: parseInt(e.target.value) || 500 })
                        }
                        min={100}
                        max={2000}
                        step={100}
                        className="w-32"
                      />
                      <span className="text-sm text-muted-foreground">tokens</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Skills-MCP Auto-loading Section */}
        <AccordionItem value="skills-mcp" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                agentOptSettings.enableSkillMcpAutoLoad ? "bg-primary/10" : "bg-muted"
              )}>
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="font-medium">{t('skillsMcp.title')}</p>
                <p className="text-xs text-muted-foreground">{t('skillsMcp.subtitle')}</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">{t('skillsMcp.enable')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('skillsMcp.enableDesc')}
                </p>
              </div>
              <Switch
                checked={agentOptSettings.enableSkillMcpAutoLoad}
                onCheckedChange={setSkillMcpAutoLoadEnabled}
              />
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {t('skillsMcp.info')}
              </AlertDescription>
            </Alert>
          </AccordionContent>
        </AccordionItem>

        {/* Tool Warnings Section */}
        <AccordionItem value="tool-warnings" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                agentOptSettings.enableToolWarnings ? "bg-primary/10" : "bg-muted"
              )}>
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="font-medium">{t('toolWarnings.title')}</p>
                <p className="text-xs text-muted-foreground">{t('toolWarnings.subtitle')}</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">{t('toolWarnings.enable')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('toolWarnings.enableDesc')}
                </p>
              </div>
              <Switch
                checked={agentOptSettings.enableToolWarnings}
                onCheckedChange={setToolWarningsEnabled}
              />
            </div>

            {agentOptSettings.enableToolWarnings && (
              <div className="space-y-2 pl-4 border-l-2 border-muted">
                <Label className="text-sm">{t('toolWarnings.threshold')}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={agentOptSettings.toolWarningThreshold}
                    onChange={(e) => 
                      setAgentOptimizationSettings({ toolWarningThreshold: parseInt(e.target.value) || 20 })
                    }
                    min={5}
                    max={50}
                    step={5}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">{t('toolWarnings.tools')}</span>
                </div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Reset Button */}
      <Button
        variant="outline"
        onClick={resetAgentOptimizationSettings}
        className="w-full"
      >
        <Settings2 className="h-4 w-4 mr-2" />
        {t('resetToDefaults')}
      </Button>
    </div>
  );
}

export default AgentOptimizationSettings;
