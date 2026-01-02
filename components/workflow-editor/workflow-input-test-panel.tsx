'use client';

/**
 * WorkflowInputTestPanel - Test workflow inputs before execution
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useWorkflowEditorStore } from '@/stores/workflow';
import {
  Play,
  TestTube,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileJson,
  Copy,
} from 'lucide-react';
import type { StartNodeData } from '@/types/workflow-editor';
import type { WorkflowIOSchema } from '@/types/workflow';

interface InputValue {
  value: string;
  isValid: boolean;
  error?: string;
}

export function WorkflowInputTestPanel() {
  const t = useTranslations('workflowEditor');
  const {
    currentWorkflow,
    startExecution,
    isExecuting,
    validate,
    validationErrors,
  } = useWorkflowEditorStore();

  const [inputValues, setInputValues] = useState<Record<string, InputValue>>({});
  const [isOpen, setIsOpen] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'running' | 'success' | 'error';
    message?: string;
  }>({ status: 'idle' });

  // Get workflow inputs from start node
  const workflowInputs = useMemo(() => {
    if (!currentWorkflow) return {};
    const startNode = currentWorkflow.nodes.find((n) => n.type === 'start');
    if (!startNode) return {};
    return (startNode.data as StartNodeData).workflowInputs || {};
  }, [currentWorkflow]);

  const inputEntries = useMemo(() => {
    return Object.entries(workflowInputs);
  }, [workflowInputs]);

  // Get default value based on type
  const getDefaultValue = useCallback((schema: WorkflowIOSchema): string => {
    if (schema.default !== undefined) {
      return typeof schema.default === 'string' 
        ? schema.default 
        : JSON.stringify(schema.default);
    }
    switch (schema.type) {
      case 'string': return '';
      case 'number': return '0';
      case 'boolean': return 'false';
      case 'object': return '{}';
      case 'array': return '[]';
      default: return '';
    }
  }, []);

  // Initialize input values when panel opens
  const initializeInputs = useCallback(() => {
    const initial: Record<string, InputValue> = {};
    inputEntries.forEach(([key, schema]) => {
      initial[key] = {
        value: getDefaultValue(schema),
        isValid: !schema.required,
      };
    });
    setInputValues(initial);
    setTestResult({ status: 'idle' });
  }, [inputEntries, getDefaultValue]);

  // Validate a single input
  function validateInput(key: string, value: string, schema: WorkflowIOSchema): InputValue {
    if (schema.required && !value.trim()) {
      return { value, isValid: false, error: 'This field is required' };
    }

    try {
      switch (schema.type) {
        case 'number':
          if (value && isNaN(Number(value))) {
            return { value, isValid: false, error: 'Must be a valid number' };
          }
          break;
        case 'boolean':
          if (value && !['true', 'false'].includes(value.toLowerCase())) {
            return { value, isValid: false, error: 'Must be true or false' };
          }
          break;
        case 'object':
        case 'array':
          if (value) {
            JSON.parse(value);
          }
          break;
      }
      return { value, isValid: true };
    } catch {
      return { value, isValid: false, error: `Invalid ${schema.type} format` };
    }
  }

  // Handle input change
  const handleInputChange = (key: string, value: string) => {
    const schema = workflowInputs[key];
    const validated = validateInput(key, value, schema);
    setInputValues((prev) => ({ ...prev, [key]: validated }));
  };

  // Check if all required inputs are valid
  const allInputsValid = useMemo(() => {
    return inputEntries.every(([key, schema]) => {
      const input = inputValues[key];
      if (!input) return !schema.required;
      return input.isValid;
    });
  }, [inputEntries, inputValues]);

  // Parse input values for execution
  const parseInputValues = (): Record<string, unknown> => {
    const parsed: Record<string, unknown> = {};
    inputEntries.forEach(([key, schema]) => {
      const input = inputValues[key];
      if (!input || !input.value) return;

      try {
        switch (schema.type) {
          case 'number':
            parsed[key] = Number(input.value);
            break;
          case 'boolean':
            parsed[key] = input.value.toLowerCase() === 'true';
            break;
          case 'object':
          case 'array':
            parsed[key] = JSON.parse(input.value);
            break;
          default:
            parsed[key] = input.value;
        }
      } catch {
        parsed[key] = input.value;
      }
    });
    return parsed;
  };

  // Run workflow with test inputs
  const handleRunTest = async () => {
    // Validate workflow first
    const errors = validate();
    if (errors.some((e) => e.severity === 'error')) {
      setTestResult({
        status: 'error',
        message: 'Workflow has validation errors. Please fix them first.',
      });
      return;
    }

    setTestResult({ status: 'running' });
    try {
      const inputs = parseInputValues();
      await startExecution(inputs);
      setTestResult({ status: 'success', message: 'Workflow started successfully!' });
      setIsOpen(false);
    } catch (error) {
      setTestResult({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to start workflow',
      });
    }
  };

  // Copy inputs as JSON
  const handleCopyAsJson = () => {
    const inputs = parseInputValues();
    navigator.clipboard.writeText(JSON.stringify(inputs, null, 2));
  };

  // Load sample inputs (if available)
  const handleLoadSample = () => {
    inputEntries.forEach(([key, schema]) => {
      let sampleValue = '';
      switch (schema.type) {
        case 'string':
          sampleValue = schema.description || 'Sample text';
          break;
        case 'number':
          sampleValue = '42';
          break;
        case 'boolean':
          sampleValue = 'true';
          break;
        case 'object':
          sampleValue = '{"key": "value"}';
          break;
        case 'array':
          sampleValue = '["item1", "item2"]';
          break;
      }
      handleInputChange(key, sampleValue);
    });
  };

  const hasValidationErrors = validationErrors.some((e) => e.severity === 'error');

  return (
    <Sheet open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (open) initializeInputs();
    }}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title={t('testInputs') || 'Test Inputs'}
          disabled={!currentWorkflow}
        >
          <TestTube className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[500px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            {t('testWorkflowInputs') || 'Test Workflow Inputs'}
          </SheetTitle>
          <SheetDescription>
            {t('testInputsDescription') || 'Configure test inputs and run the workflow'}
          </SheetDescription>
        </SheetHeader>

        {/* Validation Status */}
        {hasValidationErrors && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-destructive text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Workflow has validation errors. Fix them before running.</span>
          </div>
        )}

        {/* Test Result */}
        {testResult.status !== 'idle' && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
              testResult.status === 'running'
                ? 'bg-blue-500/10 text-blue-600'
                : testResult.status === 'success'
                ? 'bg-green-500/10 text-green-600'
                : 'bg-destructive/10 text-destructive'
            }`}
          >
            {testResult.status === 'running' ? (
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            ) : testResult.status === 'success' ? (
              <CheckCircle className="h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{testResult.message || 'Running...'}</span>
          </div>
        )}

        {/* Inputs */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {inputEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
              <FileJson className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm">{t('noInputsDefined') || 'No inputs defined'}</p>
              <p className="text-xs mt-1">
                {t('configureStartNode') || 'Configure inputs in the Start node'}
              </p>
            </div>
          ) : (
            <Accordion type="single" collapsible defaultValue="inputs" className="space-y-2">
              <AccordionItem value="inputs" className="border rounded-lg">
                <AccordionTrigger className="px-3 py-2 text-sm hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span>{t('workflowInputs') || 'Workflow Inputs'}</span>
                    <Badge variant="secondary" className="text-xs">
                      {inputEntries.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  <div className="space-y-4">
                    {inputEntries.map(([key, schema]) => {
                      const input = inputValues[key] || { value: '', isValid: true };
                      const isTextArea = schema.type === 'object' || 
                        schema.type === 'array' || 
                        (schema.type === 'string' && (schema.description?.includes('content') || schema.description?.includes('text')));

                      return (
                        <div key={key} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium flex items-center gap-1">
                              {key}
                              {schema.required && (
                                <span className="text-destructive">*</span>
                              )}
                            </Label>
                            <Badge variant="outline" className="text-[10px]">
                              {schema.type}
                            </Badge>
                          </div>
                          {schema.description && (
                            <p className="text-xs text-muted-foreground">
                              {schema.description}
                            </p>
                          )}
                          {schema.type === 'boolean' ? (
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={input.value === 'true'}
                                onCheckedChange={(checked) =>
                                  handleInputChange(key, String(checked))
                                }
                              />
                              <span className="text-xs text-muted-foreground">
                                {input.value === 'true' ? 'true' : 'false'}
                              </span>
                            </div>
                          ) : isTextArea ? (
                            <Textarea
                              value={input.value}
                              onChange={(e) => handleInputChange(key, e.target.value)}
                              placeholder={`Enter ${key}...`}
                              className={`text-sm min-h-[80px] font-mono ${
                                !input.isValid ? 'border-destructive' : ''
                              }`}
                              rows={3}
                            />
                          ) : (
                            <Input
                              type={schema.type === 'number' ? 'number' : 'text'}
                              value={input.value}
                              onChange={(e) => handleInputChange(key, e.target.value)}
                              placeholder={`Enter ${key}...`}
                              className={`h-8 text-sm ${
                                !input.isValid ? 'border-destructive' : ''
                              }`}
                            />
                          )}
                          {input.error && (
                            <p className="text-xs text-destructive">{input.error}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </ScrollArea>

        {/* Footer Actions */}
        <SheetFooter className="flex-col sm:flex-col gap-2 pt-4 border-t">
          <div className="flex items-center gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={handleLoadSample}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              {t('loadSample') || 'Load Sample'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={handleCopyAsJson}
            >
              <Copy className="h-3 w-3 mr-1" />
              {t('copyJson') || 'Copy JSON'}
            </Button>
          </div>
          <Button
            className="w-full"
            onClick={handleRunTest}
            disabled={!allInputsValid || isExecuting || hasValidationErrors}
          >
            {isExecuting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('running') || 'Running...'}
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                {t('runWithInputs') || 'Run Workflow'}
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default WorkflowInputTestPanel;
