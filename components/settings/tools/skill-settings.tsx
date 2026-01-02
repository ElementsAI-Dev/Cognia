'use client';

/**
 * Skill Settings Component
 * 
 * Main component for managing Claude Skills configurations
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Plus,
  Sparkles,
  Search,
  Trash2,
  Edit2,
  Upload,
  X,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  Zap,
  BookOpen,
  Code,
  Palette,
  Building2,
  MessageSquare,
  BarChart3,
  Cog,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useSkillStore } from '@/stores/agent';
import { getAllTemplates, getTemplateById } from '@/lib/skills/templates';
import { parseSkillMd, toHyphenCase } from '@/lib/skills/parser';
// Download functions available for future export button integration
// import { downloadSkillAsMarkdown, downloadSkillAsPackage } from '@/lib/skills/packager';
import { SkillDetail } from '@/components/skills/skill-detail';
import type { Skill, SkillCategory, CreateSkillInput } from '@/types/skill';

const CATEGORY_ICONS: Record<SkillCategory, React.ReactNode> = {
  'creative-design': <Palette className="h-4 w-4" />,
  'development': <Code className="h-4 w-4" />,
  'enterprise': <Building2 className="h-4 w-4" />,
  'productivity': <Zap className="h-4 w-4" />,
  'data-analysis': <BarChart3 className="h-4 w-4" />,
  'communication': <MessageSquare className="h-4 w-4" />,
  'meta': <Cog className="h-4 w-4" />,
  'custom': <FileText className="h-4 w-4" />,
};

// Category labels will be translated in component
const CATEGORY_KEYS: Record<SkillCategory, string> = {
  'creative-design': 'creativeDesign',
  'development': 'development',
  'enterprise': 'enterprise',
  'productivity': 'productivity',
  'data-analysis': 'dataAnalysis',
  'communication': 'communication',
  'meta': 'metaSkills',
  'custom': 'custom',
};

function SkillCard({ 
  skill, 
  onEdit, 
  onDelete, 
  onToggle,
  onActivate,
  t,
}: { 
  skill: Skill;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onActivate: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className={`transition-all ${skill.status === 'disabled' ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {CATEGORY_ICONS[skill.category]}
            <CardTitle className="text-base">{skill.metadata.name}</CardTitle>
            {skill.source === 'builtin' && (
              <Badge variant="secondary" className="text-xs">{t('builtin')}</Badge>
            )}
            {skill.isActive && (
              <Badge variant="default" className="text-xs bg-green-500">{t('active')}</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={skill.status === 'enabled'}
              onCheckedChange={onToggle}
            />
          </div>
        </div>
        <CardDescription className="line-clamp-2">
          {skill.metadata.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {skill.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {skill.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{skill.tags.length - 3}
                </Badge>
              )}
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {expanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="mt-4 space-y-4">
            <div className="text-sm text-muted-foreground">
              <p><strong>{t('category')}:</strong> {t(`categories.${CATEGORY_KEYS[skill.category]}`)}</p>
              <p><strong>{t('source')}:</strong> {skill.source}</p>
              {skill.version && <p><strong>{t('version')}:</strong> {skill.version}</p>}
              {skill.usageCount !== undefined && (
                <p><strong>{t('used')}:</strong> {skill.usageCount} {t('times')}</p>
              )}
            </div>
            {skill.validationErrors && skill.validationErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('validationErrors')}</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside">
                    {skill.validationErrors.map((err, i) => (
                      <li key={i}>{err.message}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onActivate}>
                {skill.isActive ? t('deactivate') : t('activate')}
              </Button>
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit2 className="h-4 w-4 mr-1" />
                {t('edit')}
              </Button>
              {skill.source !== 'builtin' && (
                <Button variant="outline" size="sm" onClick={onDelete}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  {t('delete')}
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

function CreateSkillDialog({
  open,
  onOpenChange,
  onCreateSkill,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateSkill: (input: CreateSkillInput) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<SkillCategory>('custom');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [mode, setMode] = useState<'blank' | 'template'>('blank');
  
  const templates = getAllTemplates();

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = getTemplateById(templateId);
    if (template) {
      setName(template.name.toLowerCase().replace(/\s+/g, '-'));
      setDescription(template.description);
      setContent(template.defaultContent);
      setCategory(template.category);
    }
  };

  const handleSubmit = () => {
    if (!name || !description || !content) return;
    
    onCreateSkill({
      name: toHyphenCase(name),
      description,
      content,
      category,
      tags: [],
    });
    
    // Reset form
    setName('');
    setDescription('');
    setContent('');
    setCategory('custom');
    setSelectedTemplate('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Skill</DialogTitle>
          <DialogDescription>
            Create a new Claude Skill to extend AI capabilities
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'blank' | 'template')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="blank">Start Blank</TabsTrigger>
            <TabsTrigger value="template">Use Template</TabsTrigger>
          </TabsList>

          <TabsContent value="template" className="space-y-4">
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all hover:border-primary ${
                    selectedTemplate === template.id ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  <CardHeader className="p-3">
                    <div className="flex items-center gap-2">
                      <span>{template.icon}</span>
                      <CardTitle className="text-sm">{template.name}</CardTitle>
                    </div>
                    <CardDescription className="text-xs line-clamp-2">
                      {template.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="blank" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Start with a blank skill and define everything from scratch.
            </p>
          </TabsContent>
        </Tabs>

        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="my-skill-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Hyphen-case, lowercase only
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as SkillCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_KEYS).map(([key]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        {CATEGORY_ICONS[key as SkillCategory]}
                        {key}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What this skill does and when to use it..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Max 1024 characters. No &lt; or &gt; characters.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Skill Instructions (Markdown)</Label>
            <Textarea
              id="content"
              placeholder="# My Skill&#10;&#10;## When to Use&#10;&#10;## Instructions&#10;&#10;..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name || !description || !content}>
            Create Skill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportSkillDialog({
  open,
  onOpenChange,
  onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (content: string) => void;
}) {
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleImport = () => {
    const result = parseSkillMd(content);
    if (!result.success) {
      setError(result.errors[0]?.message || 'Invalid SKILL.md content');
      return;
    }
    onImport(content);
    setContent('');
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Skill</DialogTitle>
          <DialogDescription>
            Paste the contents of a SKILL.md file to import
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            placeholder="---&#10;name: my-skill&#10;description: What this skill does...&#10;---&#10;&#10;# My Skill&#10;..."
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setError(null);
            }}
            rows={15}
            className="font-mono text-sm"
          />
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!content}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SkillSettings() {
  const t = useTranslations('skillSettings');
  const tCommon = useTranslations('common');

  const {
    skills,
    isLoading,
    error,
    createSkill,
    deleteSkill,
    enableSkill,
    disableSkill,
    activateSkill,
    deactivateSkill,
    clearError,
    importSkill,
  } = useSkillStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<SkillCategory | 'all'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);

  const allSkills = Object.values(skills);
  
  const filteredSkills = allSkills.filter((skill) => {
    const matchesSearch = !searchQuery || 
      skill.metadata.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.metadata.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'all' || skill.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const handleCreateSkill = useCallback((input: CreateSkillInput) => {
    createSkill(input);
  }, [createSkill]);

  const handleImportSkill = useCallback((content: string) => {
    const result = parseSkillMd(content);
    if (result.success && result.metadata && result.content) {
      importSkill({
        metadata: result.metadata,
        content: result.content,
        rawContent: result.rawContent,
        resources: [],
        status: 'enabled',
        source: 'imported',
        category: 'custom',
        tags: [],
      });
    }
  }, [importSkill]);

  const handleToggleSkill = useCallback((skill: Skill) => {
    if (skill.status === 'enabled') {
      disableSkill(skill.id);
    } else {
      enableSkill(skill.id);
    }
  }, [enableSkill, disableSkill]);

  const handleActivateSkill = useCallback((skill: Skill) => {
    if (skill.isActive) {
      deactivateSkill(skill.id);
    } else {
      activateSkill(skill.id);
    }
  }, [activateSkill, deactivateSkill]);

  const [deleteConfirmSkillId, setDeleteConfirmSkillId] = useState<string | null>(null);

  const handleDeleteSkill = useCallback((skillId: string) => {
    setDeleteConfirmSkillId(skillId);
  }, []);

  const confirmDeleteSkill = useCallback(() => {
    if (deleteConfirmSkillId) {
      deleteSkill(deleteConfirmSkillId);
    }
    setDeleteConfirmSkillId(null);
  }, [deleteConfirmSkillId, deleteSkill, setDeleteConfirmSkillId]);

  const groupedSkills = filteredSkills.reduce((acc, skill) => {
    if (!acc[skill.category]) {
      acc[skill.category] = [];
    }
    acc[skill.category].push(skill);
    return acc;
  }, {} as Record<SkillCategory, Skill[]>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{tCommon('error')}</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                {error}
                <Button variant="ghost" size="sm" onClick={clearError}>
                  <X className="h-4 w-4" />
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-4">
            <InputGroup className="flex-1">
              <InputGroupAddon align="inline-start">
                <Search className="h-4 w-4" />
              </InputGroupAddon>
              <InputGroupInput
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </InputGroup>
            <Select
              value={categoryFilter}
              onValueChange={(v) => setCategoryFilter(v as SkillCategory | 'all')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('allCategories')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allCategories')}</SelectItem>
                {Object.entries(CATEGORY_KEYS).map(([key, labelKey]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      {CATEGORY_ICONS[key as SkillCategory]}
                      {t(`categories.${labelKey}`)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('createSkill')}
            </Button>
            <Button variant="outline" onClick={() => setShowImportDialog(true)}>
              <Upload className="h-4 w-4 mr-2" />
              {t('import')}
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredSkills.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={t('noSkills')}
              description={t('noSkillsDesc')}
            />
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedSkills).map(([category, categorySkills]) => (
                <div key={category}>
                  <h3 className="flex items-center gap-2 text-sm font-medium mb-3">
                    {CATEGORY_ICONS[category as SkillCategory]}
                    {t(`categories.${CATEGORY_KEYS[category as SkillCategory]}`)}
                    <Badge variant="secondary" className="ml-2">
                      {categorySkills.length}
                    </Badge>
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {categorySkills.map((skill) => (
                      <SkillCard
                        key={skill.id}
                        skill={skill}
                        onEdit={() => setSelectedSkillId(skill.id)}
                        onDelete={() => handleDeleteSkill(skill.id)}
                        onToggle={() => handleToggleSkill(skill)}
                        onActivate={() => handleActivateSkill(skill)}
                        t={t}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateSkillDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateSkill={handleCreateSkill}
      />

      <ImportSkillDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImport={handleImportSkill}
      />

      {/* Skill Detail Dialog */}
      <Dialog open={!!selectedSkillId} onOpenChange={(open) => !open && setSelectedSkillId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
          {selectedSkillId && (
            <SkillDetail
              skillId={selectedSkillId}
              onClose={() => setSelectedSkillId(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmSkillId} onOpenChange={(open) => !open && setDeleteConfirmSkillId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteSkill')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteSkillConfirmation')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSkill}>
              {tCommon('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default SkillSettings;
