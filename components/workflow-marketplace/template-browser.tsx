/**
 * Template Browser Component
 * 
 * Displays a grid of workflow templates with filtering and search capabilities
 */

'use client';

import { useState } from 'react';
import { Search, Filter, Star, Download, GitBranch } from 'lucide-react';
import { useTemplateMarketStore } from '@/stores/workflow/template-market-store';
import type { WorkflowTemplate } from '@/types/workflow/template';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { TemplatePreview } from './template-preview';

export function TemplateBrowser() {
  const {
    getFilteredTemplates,
    setSearchQuery,
    setFilters,
    categories,
    cloneTemplate,
    incrementUsage,
    getTemplate,
    selectedTemplateId,
    setSelectedTemplate,
  } = useTemplateMarketStore();

  const [searchInput, setSearchInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'rating' | 'usage' | 'date'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [previewTemplate, setPreviewTemplate] = useState<WorkflowTemplate | null>(null);

  const templates = getFilteredTemplates();

  const handleSearch = (value: string) => {
    setSearchInput(value);
    setSearchQuery(value);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setFilters({ category: category === 'all' ? undefined : category });
  };

  const handleSortChange = (value: string) => {
    setSortBy(value as 'name' | 'rating' | 'usage' | 'date');
    setFilters({ sortBy: value as 'name' | 'rating' | 'usage' | 'date' });
  };

  const handleSortOrderToggle = () => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newOrder);
    setFilters({ sortOrder: newOrder });
  };

  const handlePreview = (template: WorkflowTemplate) => {
    setPreviewTemplate(template);
    setSelectedTemplate(template.id);
  };

  const handleUseTemplate = (template: WorkflowTemplate) => {
    incrementUsage(template.id);
    // TODO: Load template into workflow editor
    console.log('Using template:', template.id);
  };

  const handleCloneTemplate = (template: WorkflowTemplate) => {
    const cloned = cloneTemplate(template.id, `${template.name} (Copy)`);
    if (cloned) {
      console.log('Cloned template:', cloned.id);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4">
        <h2 className="text-2xl font-bold mb-4">Template Marketplace</h2>

        {/* Search and Filters */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchInput}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={selectedCategory} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="rating">Rating</SelectItem>
              <SelectItem value="usage">Usage</SelectItem>
              <SelectItem value="date">Date</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={handleSortOrderToggle}
            title="Toggle sort order"
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Filter className="h-12 w-12 mb-4" />
            <p>No templates found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onPreview={() => handlePreview(template)}
                onUse={() => handleUseTemplate(template)}
                onClone={() => handleCloneTemplate(template)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Template Preview Dialog */}
      <Dialog
        open={!!previewTemplate}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewTemplate(null);
            setSelectedTemplate(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {previewTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <TemplatePreview template={previewTemplate} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TemplateCardProps {
  template: WorkflowTemplate;
  onPreview: () => void;
  onUse: () => void;
  onClone: () => void;
}

function TemplateCard({ template, onPreview, onUse, onClone }: TemplateCardProps) {
  return (
    <div className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      {/* Thumbnail */}
      <div className="aspect-video bg-muted flex items-center justify-center">
        {template.metadata.thumbnail ? (
          <img
            src={template.metadata.thumbnail}
            alt={template.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-4xl">{template.workflow.icon || '📦'}</div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-lg line-clamp-1">{template.name}</h3>
          {template.metadata.isOfficial && (
            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
              Official
            </span>
          )}
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {template.description}
        </p>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4" />
            <span>{template.metadata.rating.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Download className="h-4 w-4" />
            <span>{template.metadata.usageCount}</span>
          </div>
          {template.metadata.source === 'git' && (
            <div className="flex items-center gap-1" title="Git repository">
              <GitBranch className="h-4 w-4" />
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-4">
          {template.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs bg-secondary px-2 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
          {template.tags.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{template.tags.length - 3} more
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onPreview} className="flex-1">
            Preview
          </Button>
          <Button size="sm" onClick={onUse} className="flex-1">
            Use Template
          </Button>
          <Button variant="ghost" size="icon" onClick={onClone} title="Clone template">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
