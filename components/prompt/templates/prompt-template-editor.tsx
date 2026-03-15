"use client";

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { TagInput } from '@/components/ui/tag-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { applyTemplateVariables, buildTemplateVariables } from '@/lib/prompts/template-utils';
import { derivePromptWorkflowState } from '@/lib/prompts/marketplace-utils';
import type {
  CreatePromptTemplateInput,
  PromptTemplate,
  PromptTemplateVariableType,
  TemplateVariable,
} from '@/types/content/prompt-template';
import { cn } from '@/lib/utils';

export interface PromptTemplateEditorProps {
  template?: PromptTemplate;
  draftSnapshot?: Partial<CreatePromptTemplateInput>;
  categories: string[];
  submitError?: string;
  onCancel?: () => void;
  onSaveDraft?: (input: CreatePromptTemplateInput) => void;
  onSubmit: (input: CreatePromptTemplateInput) => void;
}

export function PromptTemplateEditor({
  template,
  draftSnapshot,
  categories,
  submitError,
  onCancel,
  onSaveDraft,
  onSubmit,
}: PromptTemplateEditorProps) {
  const t = useTranslations('promptTemplate.editor');

  // State initialized from template props - parent should use key={template?.id} to reset on template change
  const initialSnapshot = useMemo(
    () => ({
      name: draftSnapshot?.name ?? template?.name ?? '',
      description: draftSnapshot?.description ?? template?.description ?? '',
      content: draftSnapshot?.content ?? template?.content ?? '',
      category: draftSnapshot?.category ?? template?.category ?? categories[0] ?? 'custom',
      tags: draftSnapshot?.tags ?? template?.tags ?? [],
      variables: draftSnapshot?.variables ?? template?.variables ?? [],
      targets: (draftSnapshot?.targets ?? template?.targets ?? ['chat']) as NonNullable<
        PromptTemplate['targets']
      >,
    }),
    [
      categories,
      draftSnapshot?.category,
      draftSnapshot?.content,
      draftSnapshot?.description,
      draftSnapshot?.name,
      draftSnapshot?.tags,
      draftSnapshot?.targets,
      draftSnapshot?.variables,
      template?.category,
      template?.content,
      template?.description,
      template?.name,
      template?.tags,
      template?.targets,
      template?.variables,
    ]
  );
  const initialName = initialSnapshot.name;
  const initialDescription = initialSnapshot.description;
  const initialContent = initialSnapshot.content;
  const initialCategory = initialSnapshot.category;
  const initialTags = initialSnapshot.tags;
  const initialVariables = initialSnapshot.variables;
  const initialTargets = initialSnapshot.targets;

  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [content, setContent] = useState(initialContent);
  const [category, setCategory] = useState(initialCategory);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [variables, setVariables] = useState<TemplateVariable[]>(initialVariables);
  const [targets, setTargets] = useState<NonNullable<PromptTemplate['targets']>>(initialTargets);
  const [variableValues, setVariableValues] = useState<Record<string, string | number | boolean>>({});
  const [previewTab, setPreviewTab] = useState<'values' | 'output'>('values');

  const detectedVariables = useMemo(
    () => buildTemplateVariables(content, variables),
    [content, variables]
  );

  // Compute variable values synchronously based on detected variables
  const computedVariableValues = useMemo(() => {
    const next: Record<string, string | number | boolean> = {};
    detectedVariables.forEach((variable) => {
      next[variable.name] = variableValues[variable.name] ?? variable.sampleValue ?? '';
    });
    return next;
  }, [detectedVariables, variableValues]);

  const preview = useMemo(
    () => applyTemplateVariables(content, computedVariableValues),
    [content, computedVariableValues]
  );

  const buildEditorInput = useCallback((): CreatePromptTemplateInput => ({
      name: name.trim(),
      description: description.trim(),
      content,
      category,
      tags: tags.map((t) => t.trim()).filter(Boolean),
      variables: detectedVariables,
      targets,
      source: template?.source ?? draftSnapshot?.source ?? 'user',
      meta: template?.meta ?? draftSnapshot?.meta,
    }),
    [
      category,
      content,
      description,
      detectedVariables,
      draftSnapshot?.meta,
      draftSnapshot?.source,
      name,
      tags,
      targets,
      template?.meta,
      template?.source,
    ]
  );

  const editorInput = useMemo(() => buildEditorInput(), [buildEditorInput]);
  const currentTemplate = useMemo<PromptTemplate>(() => ({
    id: template?.id ?? '__editor__',
    name: editorInput.name,
    description: editorInput.description,
    content: editorInput.content,
    category: editorInput.category,
    tags: editorInput.tags ?? [],
    variables: editorInput.variables ?? [],
    targets: editorInput.targets ?? ['chat'],
    source: editorInput.source ?? 'user',
    meta: editorInput.meta,
    usageCount: template?.usageCount ?? 0,
    createdAt: template?.createdAt ?? new Date(),
    updatedAt: new Date(),
  }), [editorInput, template?.createdAt, template?.id, template?.usageCount]);
  const workflowState = useMemo(
    () => derivePromptWorkflowState({ template: currentTemplate }),
    [currentTemplate]
  );
  const hasChanges = useMemo(
    () =>
      JSON.stringify({
        name,
        description,
        content,
        category,
        tags,
        variables: detectedVariables,
        targets,
      }) !==
      JSON.stringify({
        name: initialName,
        description: initialDescription,
        content: initialContent,
        category: initialCategory,
        tags: initialTags,
        variables: buildTemplateVariables(initialContent, initialVariables),
        targets: initialTargets,
      }),
    [
      category,
      content,
      description,
      detectedVariables,
      initialCategory,
      initialContent,
      initialDescription,
      initialName,
      initialTags,
      initialTargets,
      initialVariables,
      name,
      tags,
      targets,
    ]
  );

  const handleSubmit = () => {
    if (!name.trim() || !content.trim()) return;
    onSubmit(editorInput);
  };

  const handleCancel = () => {
    if (hasChanges && onSaveDraft) {
      onSaveDraft(editorInput);
    }
    onCancel?.();
  };

  const updateVariable = (index: number, patch: Partial<TemplateVariable>) => {
    setVariables((prev) => prev.map((variable, i) => (i === index ? { ...variable, ...patch } : variable)));
  };

  const removeVariable = (index: number) => {
    setVariables((prev) => prev.filter((_, i) => i !== index));
  };

  const addVariable = () => {
    setVariables((prev) => [...prev, { name: `variable_${prev.length + 1}`, required: false, type: 'text' }]);
  };

  const updateVariableValue = (name: string, value: string | number | boolean) => {
    setVariableValues((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="template-name">{t('name')}</Label>
          <Input
            id="template-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('namePlaceholder')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="template-category">{t('category')}</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="template-category">
              <SelectValue placeholder={t('selectCategory')} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="template-description">{t('description')}</Label>
        <Textarea
          id="template-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('descriptionPlaceholder')}
          className="min-h-[72px]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="template-content">{t('content')}</Label>
        <Textarea
          id="template-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t('contentPlaceholder')}
          className="min-h-[180px] font-mono"
        />
        <p className="text-muted-foreground text-xs">{t('contentHint')}</p>
      </div>

      <div className="rounded-md border border-dashed border-border/70 bg-muted/30 px-3 py-2 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline">{workflowState.saveBehavior}</Badge>
          <Badge variant={workflowState.publishReadiness.isReady ? 'secondary' : 'outline'}>
            {workflowState.publishReadiness.isReady ? 'Publish ready' : 'Publish blocked'}
          </Badge>
          {hasChanges && (
            <Badge variant="outline">Unsaved changes</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {workflowState.saveBehavior === 'fork-on-save'
            ? 'Saving this template creates a user-owned copy.'
            : workflowState.saveBehavior === 'restricted-update'
              ? 'This template keeps marketplace linkage and may require publish or update resolution.'
              : 'Saving updates this template directly.'}
        </p>
        {!workflowState.publishReadiness.isReady && (
          <p className="text-xs text-amber-700">
            {`Publish blockers: ${workflowState.publishReadiness.reasons.join(', ')}`}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>{t('variables')}</Label>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setVariables(detectedVariables)}>
              {t('syncFromContent')}
            </Button>
            <Button variant="secondary" size="sm" onClick={addVariable}>
              {t('addVariable')}
            </Button>
          </div>
        </div>
        <div className="space-y-3">
          {detectedVariables.length === 0 && (
            <p className="text-muted-foreground text-sm">{t('noVariablesDetected')}</p>
          )}
          {detectedVariables.map((variable, index) => (
            <div key={variable.name} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Input
                  value={variable.name}
                  onChange={(e) => updateVariable(index, { name: e.target.value })}
                  placeholder={t('variableNamePlaceholder')}
                />
                <Button variant="ghost" size="sm" onClick={() => removeVariable(index)}>
                  {t('removeVariable')}
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('description')}</Label>
                  <Input
                    value={variable.description ?? ''}
                    onChange={(e) => updateVariable(index, { description: e.target.value })}
                    placeholder={t('variableDescPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('type')}</Label>
                  <Select
                    value={(variable.type ?? 'text') as PromptTemplateVariableType}
                    onValueChange={(value) => updateVariable(index, { type: value as PromptTemplateVariableType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">{t('typeText')}</SelectItem>
                      <SelectItem value="multiline">{t('typeMultiline')}</SelectItem>
                      <SelectItem value="number">{t('typeNumber')}</SelectItem>
                      <SelectItem value="boolean">{t('typeBoolean')}</SelectItem>
                      <SelectItem value="select">{t('typeSelect')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id={`variable-required-${index}`}
                  checked={variable.required ?? false}
                  onCheckedChange={(checked) => updateVariable(index, { required: checked })}
                />
                <Label htmlFor={`variable-required-${index}`}>{t('required')}</Label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label>{t('tags')}</Label>
        <TagInput
          value={tags}
          onChange={setTags}
          placeholder={t('addTagPlaceholder')}
        />
      </div>

      <div className="space-y-2">
        <Label>{t('targets')}</Label>
        <div className="flex flex-wrap gap-2">
          {['chat', 'workflow', 'agent', 'ide-rules', 'mcp', 'project'].map((target) => {
            const active = targets.includes(target as (typeof targets)[number]);
            return (
              <button
                key={target}
                type="button"
                onClick={() =>
                  setTargets((prev) =>
                    active ? prev.filter((t) => t !== target) : [...prev, target as (typeof targets)[number]]
                  )
                }
                className={cn(
                  'rounded-full border px-3 py-1 text-sm transition-colors',
                  active ? 'border-primary bg-primary/10 text-primary' : 'border-border'
                )}
              >
                {target}
              </button>
            );
          })}
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>{t('preview')}</Label>
          <span className="text-xs text-muted-foreground">
            {preview.missing.length > 0 ? t('missingCount', { count: preview.missing.length }) : t('allVariablesFilled')}
          </span>
        </div>
        <Tabs value={previewTab} onValueChange={(value) => setPreviewTab(value as typeof previewTab)}>
          <TabsList>
            <TabsTrigger value="values">{t('previewValues')}</TabsTrigger>
            <TabsTrigger value="output">{t('previewOutput')}</TabsTrigger>
          </TabsList>
          <TabsContent value="values" className="space-y-2">
            {detectedVariables.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t('addPlaceholdersHint')}</p>
            ) : (
              detectedVariables.map((variable) => (
                <div key={variable.name} className="space-y-1">
                  <Label className="text-xs">{variable.name}</Label>
                  {variable.type === 'multiline' ? (
                    <Textarea
                      value={String(computedVariableValues[variable.name] ?? '')}
                      onChange={(e) => updateVariableValue(variable.name, e.target.value)}
                      placeholder={variable.placeholder}
                      aria-label={`preview-${variable.name}`}
                    />
                  ) : variable.type === 'boolean' ? (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={Boolean(computedVariableValues[variable.name])}
                        onCheckedChange={(checked) => updateVariableValue(variable.name, checked)}
                        id={`preview-boolean-${variable.name}`}
                      />
                      <Label htmlFor={`preview-boolean-${variable.name}`} className="text-sm text-muted-foreground">
                        {t('toggleValue')}
                      </Label>
                    </div>
                  ) : (
                    <Input
                      type={variable.type === 'number' ? 'number' : 'text'}
                      value={String(computedVariableValues[variable.name] ?? '')}
                      onChange={(e) =>
                        updateVariableValue(
                          variable.name,
                          variable.type === 'number' ? Number(e.target.value) : e.target.value
                        )
                      }
                      placeholder={variable.placeholder}
                      aria-label={`preview-${variable.name}`}
                    />
                  )}
                </div>
              ))
            )}
          </TabsContent>
          <TabsContent value="output" className="space-y-2">
            <Textarea
              readOnly
              className="min-h-[180px] font-mono"
              value={preview.output || ''}
              aria-label="template-preview-output"
            />
            {preview.missing.length > 0 && (
              <p className="text-xs text-amber-600">{t('missingVariables', { variables: preview.missing.join(', ') })}</p>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2">
        <div>
          {submitError && <p className="text-sm text-destructive">{submitError}</p>}
        </div>
        <div className="flex items-center gap-2">
        {onCancel && (
          <Button variant="ghost" onClick={handleCancel}>
            {t('cancel')}
          </Button>
        )}
        <Button onClick={handleSubmit}>{template ? t('save') : t('createTemplateBtn')}</Button>
        </div>
      </div>
    </div>
  );
}
