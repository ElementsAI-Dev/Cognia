/**
 * Chat Settings Constants
 * Centralized configuration constants for chat and response settings
 */

import type {
  CodeThemeOption,
  FontFamilyOption,
  RoutingModeOption,
  RoutingStrategyOption,
  FallbackTierOption,
  TokenizerProviderOption,
} from '@/types/settings/chat';
import { Zap, Scale, Brain, Sparkles, DollarSign } from 'lucide-react';
import React from 'react';

/**
 * Code theme options for response settings
 */
export const CODE_THEME_OPTIONS: CodeThemeOption[] = [
  { value: 'github-dark', labelKey: 'codeTheme.githubDark' },
  { value: 'github-light', labelKey: 'codeTheme.githubLight' },
  { value: 'monokai', labelKey: 'codeTheme.monokai' },
  { value: 'dracula', labelKey: 'codeTheme.dracula' },
  { value: 'nord', labelKey: 'codeTheme.nord' },
  { value: 'one-dark', labelKey: 'codeTheme.oneDark' },
];

/**
 * Font family options for response settings
 */
export const FONT_FAMILY_OPTIONS: FontFamilyOption[] = [
  { value: 'system', labelKey: 'fontFamily.system' },
  { value: 'inter', labelKey: 'fontFamily.inter' },
  { value: 'roboto', labelKey: 'fontFamily.roboto' },
  { value: 'fira-code', labelKey: 'fontFamily.firaCode' },
  { value: 'jetbrains-mono', labelKey: 'fontFamily.jetbrainsMono' },
];

/**
 * Routing mode options for auto-router settings
 */
export const ROUTING_MODE_OPTIONS: RoutingModeOption[] = [
  { value: 'rule-based', labelKey: 'modeRuleBased', descKey: 'modeRuleBasedDesc' },
  { value: 'llm-based', labelKey: 'modeLlmBased', descKey: 'modeLlmBasedDesc' },
  { value: 'hybrid', labelKey: 'modeHybrid', descKey: 'modeHybridDesc' },
];

/**
 * Routing strategy options with icons for auto-router settings
 */
export const ROUTING_STRATEGY_OPTIONS: RoutingStrategyOption[] = [
  { value: 'quality', labelKey: 'strategyQuality', descKey: 'strategyQualityDesc', icon: React.createElement(Brain, { className: 'h-4 w-4' }) },
  { value: 'cost', labelKey: 'strategyCost', descKey: 'strategyCostDesc', icon: React.createElement(DollarSign, { className: 'h-4 w-4' }) },
  { value: 'speed', labelKey: 'strategySpeed', descKey: 'strategySpeedDesc', icon: React.createElement(Zap, { className: 'h-4 w-4' }) },
  { value: 'balanced', labelKey: 'strategyBalanced', descKey: 'strategyBalancedDesc', icon: React.createElement(Scale, { className: 'h-4 w-4' }) },
  { value: 'adaptive', labelKey: 'strategyAdaptive', descKey: 'strategyAdaptiveDesc', icon: React.createElement(Sparkles, { className: 'h-4 w-4' }) },
];

/**
 * Fallback tier options with icons for auto-router settings
 */
export const FALLBACK_TIER_OPTIONS: FallbackTierOption[] = [
  { value: 'fast', labelKey: 'tierFast', icon: React.createElement(Zap, { className: 'h-4 w-4 text-green-500' }) },
  { value: 'balanced', labelKey: 'tierBalanced', icon: React.createElement(Scale, { className: 'h-4 w-4 text-blue-500' }) },
  { value: 'powerful', labelKey: 'tierPowerful', icon: React.createElement(Brain, { className: 'h-4 w-4 text-purple-500' }) },
  { value: 'reasoning', labelKey: 'tierReasoning', icon: React.createElement(Sparkles, { className: 'h-4 w-4 text-amber-500' }) },
];

/**
 * Tokenizer provider options for tokenizer settings
 */
export const TOKENIZER_PROVIDER_OPTIONS: TokenizerProviderOption[] = [
  { value: 'auto', labelKey: 'provider.auto', descKey: 'provider.autoDesc' },
  { value: 'tiktoken', labelKey: 'provider.tiktoken', descKey: 'provider.tiktokenDesc' },
  { value: 'gemini-api', labelKey: 'provider.gemini', descKey: 'provider.geminiDesc' },
  { value: 'claude-api', labelKey: 'provider.claude', descKey: 'provider.claudeDesc' },
  { value: 'glm-api', labelKey: 'provider.glm', descKey: 'provider.glmDesc' },
  { value: 'estimation', labelKey: 'provider.estimation', descKey: 'provider.estimationDesc' },
];
