'use client';

/**
 * Skill Test Panel Component
 * 
 * Provides dry-run capability and execution logging for skills
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Terminal,
  FileText,
  Coins,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CopyButton } from '@/components/chat/ui/copy-button';
import { EmptyState } from '@/components/layout/feedback/empty-state';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  buildSkillSystemPrompt,
  estimateSkillTokens,
  matchSkillToQuery,
} from '@/lib/skills/executor';
import type { Skill } from '@/types/system/skill';

interface ExecutionLog {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

interface TestResult {
  success: boolean;
  systemPrompt: string;
  tokenCount: number;
  matchScore: number;
  executionTime: number;
  logs: ExecutionLog[];
}

interface SkillTestPanelProps {
  skill: Skill;
  onExecutionComplete?: (result: TestResult) => void;
}

export function SkillTestPanel({ skill, onExecutionComplete }: SkillTestPanelProps) {
  const t = useTranslations('skills');
  const [testQuery, setTestQuery] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [activeTab, setActiveTab] = useState<'test' | 'prompt' | 'logs'>('test');

  // Estimate tokens
  const tokenEstimate = useMemo(() => estimateSkillTokens(skill), [skill]);

  // Add log entry
  const addLog = useCallback((type: ExecutionLog['type'], message: string, details?: string) => {
    const log: ExecutionLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      message,
      details,
    };
    setLogs(prev => [...prev, log]);
    return log;
  }, []);

  // Clear logs
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Run test
  const handleRunTest = useCallback(async () => {
    setIsRunning(true);
    setTestResult(null);
    clearLogs();

    const startTime = Date.now();
    const resultLogs: ExecutionLog[] = [];

    try {
      // Log start
      resultLogs.push({
        id: `${Date.now()}-start`,
        timestamp: new Date(),
        type: 'info',
        message: `Starting test for skill: ${skill.metadata.name}`,
      });
      addLog('info', `Starting test for skill: ${skill.metadata.name}`);

      // Check skill status
      if (skill.status !== 'enabled') {
        resultLogs.push({
          id: `${Date.now()}-status`,
          timestamp: new Date(),
          type: 'warning',
          message: 'Skill is not enabled',
          details: 'The skill will not be active in chat unless enabled.',
        });
        addLog('warning', 'Skill is not enabled', 'The skill will not be active in chat unless enabled.');
      }

      // Build system prompt
      addLog('info', 'Building system prompt...');
      const systemPrompt = buildSkillSystemPrompt(skill);
      resultLogs.push({
        id: `${Date.now()}-prompt`,
        timestamp: new Date(),
        type: 'success',
        message: `System prompt generated (${systemPrompt.length} chars)`,
      });
      addLog('success', `System prompt generated (${systemPrompt.length} chars)`);

      // Calculate token count
      const tokenCount = estimateSkillTokens(skill);
      resultLogs.push({
        id: `${Date.now()}-tokens`,
        timestamp: new Date(),
        type: 'info',
        message: `Estimated token count: ~${tokenCount} tokens`,
      });
      addLog('info', `Estimated token count: ~${tokenCount} tokens`);

      // Match score (if query provided)
      let matchScore = 0;
      if (testQuery.trim()) {
        addLog('info', `Testing query match: "${testQuery}"`);
        matchScore = matchSkillToQuery(skill, testQuery);
        const matchLevel = matchScore >= 0.7 ? 'high' : matchScore >= 0.4 ? 'medium' : 'low';
        resultLogs.push({
          id: `${Date.now()}-match`,
          timestamp: new Date(),
          type: matchScore >= 0.4 ? 'success' : 'warning',
          message: `Query match score: ${(matchScore * 100).toFixed(1)}% (${matchLevel})`,
          details: matchScore >= 0.4 
            ? 'This skill would likely be selected for this query.'
            : 'This skill may not be selected for this query.',
        });
        addLog(
          matchScore >= 0.4 ? 'success' : 'warning',
          `Query match score: ${(matchScore * 100).toFixed(1)}% (${matchLevel})`,
          matchScore >= 0.4 
            ? 'This skill would likely be selected for this query.'
            : 'This skill may not be selected for this query.'
        );
      }

      // Check resources
      if (skill.resources.length > 0) {
        resultLogs.push({
          id: `${Date.now()}-resources`,
          timestamp: new Date(),
          type: 'info',
          message: `Resources attached: ${skill.resources.length} file(s)`,
          details: skill.resources.map(r => `- ${r.name} (${r.type})`).join('\n'),
        });
        addLog('info', `Resources attached: ${skill.resources.length} file(s)`);
      }

      // Validation check
      if (skill.validationErrors && skill.validationErrors.length > 0) {
        const errors = skill.validationErrors.filter(e => e.severity === 'error');
        const warnings = skill.validationErrors.filter(e => e.severity === 'warning');
        
        if (errors.length > 0) {
          resultLogs.push({
            id: `${Date.now()}-errors`,
            timestamp: new Date(),
            type: 'error',
            message: `Validation errors: ${errors.length}`,
            details: errors.map(e => `- ${e.field}: ${e.message}`).join('\n'),
          });
          addLog('error', `Validation errors: ${errors.length}`);
        }
        if (warnings.length > 0) {
          resultLogs.push({
            id: `${Date.now()}-warnings`,
            timestamp: new Date(),
            type: 'warning',
            message: `Validation warnings: ${warnings.length}`,
            details: warnings.map(e => `- ${e.field}: ${e.message}`).join('\n'),
          });
          addLog('warning', `Validation warnings: ${warnings.length}`);
        }
      }

      const executionTime = Date.now() - startTime;

      // Complete
      resultLogs.push({
        id: `${Date.now()}-complete`,
        timestamp: new Date(),
        type: 'success',
        message: `Test completed in ${executionTime}ms`,
      });
      addLog('success', `Test completed in ${executionTime}ms`);

      const result: TestResult = {
        success: true,
        systemPrompt,
        tokenCount,
        matchScore,
        executionTime,
        logs: resultLogs,
      };

      setTestResult(result);
      onExecutionComplete?.(result);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      resultLogs.push({
        id: `${Date.now()}-error`,
        timestamp: new Date(),
        type: 'error',
        message: `Test failed: ${errorMessage}`,
      });
      addLog('error', `Test failed: ${errorMessage}`);

      setTestResult({
        success: false,
        systemPrompt: '',
        tokenCount: 0,
        matchScore: 0,
        executionTime: Date.now() - startTime,
        logs: resultLogs,
      });
    } finally {
      setIsRunning(false);
    }
  }, [skill, testQuery, addLog, clearLogs, onExecutionComplete]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Terminal className="h-4 w-4" />
            {t('skillTestPanel')}
          </CardTitle>
          <CardDescription>
            {t('testSkillDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Stats */}
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="flex items-center gap-1">
              <Coins className="h-3 w-3" />
              ~{tokenEstimate} {t('tokens')}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {skill.resources.length} {t('resources')}
            </Badge>
            <Badge variant={skill.status === 'enabled' ? 'default' : 'secondary'}>
              {skill.status}
            </Badge>
          </div>

          {/* Test Query Input */}
          <div className="space-y-2">
            <Label htmlFor="test-query">{t('testQuery')}</Label>
            <Textarea
              id="test-query"
              placeholder={t('testQueryPlaceholder')}
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              {t('testQueryHint')}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button onClick={handleRunTest} disabled={isRunning}>
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('running')}
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  {t('runTest')}
                </>
              )}
            </Button>
            {testResult && (
              <Button variant="outline" onClick={() => setTestResult(null)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('reset')}
              </Button>
            )}
            {logs.length > 0 && (
              <Button variant="outline" onClick={clearLogs}>
                <Trash2 className="h-4 w-4 mr-2" />
                {t('clearLogs')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {testResult && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList>
            <TabsTrigger value="test">{t('results')}</TabsTrigger>
            <TabsTrigger value="prompt">{t('systemPrompt')}</TabsTrigger>
            <TabsTrigger value="logs">{t('logs')} ({logs.length})</TabsTrigger>
          </TabsList>

          {/* Results Tab */}
          <TabsContent value="test" className="mt-4">
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  {/* Status */}
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    )}
                    <span className="font-medium">
                      {testResult.success ? t('testPassed') : t('testFailed')}
                    </span>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">{testResult.tokenCount}</p>
                      <p className="text-xs text-muted-foreground">{t('tokensLabel')}</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">
                        {testQuery ? `${(testResult.matchScore * 100).toFixed(0)}%` : 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground">{t('matchScore')}</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">{testResult.executionTime}ms</p>
                      <p className="text-xs text-muted-foreground">{t('duration')}</p>
                    </div>
                  </div>

                  {/* Match Info */}
                  {testQuery && (
                    <Alert variant={testResult.matchScore >= 0.4 ? 'default' : 'destructive'}>
                      <AlertDescription>
                        {testResult.matchScore >= 0.7 && (
                          <span><strong>{t('highMatch')}:</strong> {t('highMatchDesc')}</span>
                        )}
                        {testResult.matchScore >= 0.4 && testResult.matchScore < 0.7 && (
                          <span><strong>{t('mediumMatch')}:</strong> {t('mediumMatchDesc')}</span>
                        )}
                        {testResult.matchScore < 0.4 && (
                          <span><strong>{t('lowMatch')}:</strong> {t('lowMatchDesc')}</span>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Prompt Tab */}
          <TabsContent value="prompt" className="mt-4">
            <Card>
              <CardHeader className="py-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">{t('generatedSystemPrompt')}</CardTitle>
                <CopyButton
                  content={testResult.systemPrompt || ''}
                  className="h-8"
                  variant="ghost"
                />
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <pre className="text-xs font-mono whitespace-pre-wrap bg-muted p-4 rounded-lg">
                    {testResult.systemPrompt || t('noPromptGenerated')}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="mt-4">
            <Card>
              <CardContent className="pt-4">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className={`p-2 rounded text-sm ${
                          log.type === 'error' ? 'bg-destructive/10 text-destructive' :
                          log.type === 'warning' ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' :
                          log.type === 'success' ? 'bg-green-500/10 text-green-700 dark:text-green-400' :
                          'bg-muted'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          <span className="text-xs text-muted-foreground">
                            {log.timestamp.toLocaleTimeString()}
                          </span>
                          <span className="font-medium">{log.message}</span>
                        </div>
                        {log.details && (
                          <pre className="mt-1 text-xs whitespace-pre-wrap pl-5">
                            {log.details}
                          </pre>
                        )}
                      </div>
                    ))}
                    {logs.length === 0 && (
                      <EmptyState
                        icon={Terminal}
                        title={t('noLogsYet')}
                        description={t('runTestToSeeLogs')}
                        compact
                      />
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

export default SkillTestPanel;
