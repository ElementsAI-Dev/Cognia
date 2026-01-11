'use client';

/**
 * A2UITemplatePreview - Preview component for A2UI templates in custom mode editor
 * Shows a visual preview of the A2UI components configured for a custom mode
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff, Layout, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { CustomModeA2UITemplate } from '@/stores/agent/custom-mode-store';
import type { A2UIComponent } from '@/types/artifact/a2ui';

// =============================================================================
// Types
// =============================================================================

interface A2UITemplatePreviewProps {
  template?: CustomModeA2UITemplate;
  showPreview?: boolean;
  onTogglePreview?: () => void;
  className?: string;
}

// =============================================================================
// Component Preview Renderer
// =============================================================================

function ComponentPreview({ component }: { component: A2UIComponent }) {
  const getComponentStyle = () => {
    switch (component.component) {
      case 'Button':
        return 'bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-md text-sm';
      case 'TextField':
      case 'TextArea':
        return 'bg-muted border border-border px-3 py-2 rounded-md text-sm w-full';
      case 'Select':
        return 'bg-muted border border-border px-3 py-2 rounded-md text-sm';
      case 'Checkbox':
      case 'Radio':
        return 'flex items-center gap-2 text-sm';
      case 'Card':
        return 'bg-card border border-border rounded-lg p-3';
      case 'Text':
        return 'text-sm';
      case 'Row':
        return 'flex flex-row gap-2 items-center';
      case 'Column':
        return 'flex flex-col gap-2';
      case 'List':
        return 'space-y-1';
      case 'Divider':
        return 'border-t border-border my-2';
      case 'Progress':
        return 'h-2 bg-muted rounded-full overflow-hidden';
      case 'Badge':
        return 'inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-secondary';
      case 'Alert':
        return 'p-3 rounded-md border bg-muted/50';
      default:
        return 'p-2 bg-muted/30 rounded border border-dashed border-muted-foreground/30';
    }
  };

  const getComponentContent = () => {
    switch (component.component) {
      case 'Button':
        return ('text' in component && typeof component.text === 'string') ? component.text : 'Button';
      case 'TextField':
        return ('placeholder' in component) ? component.placeholder : 'Text input...';
      case 'TextArea':
        return ('placeholder' in component) ? component.placeholder : 'Text area...';
      case 'Select':
        return ('placeholder' in component) ? component.placeholder : 'Select...';
      case 'Text':
        return ('text' in component && typeof component.text === 'string') ? component.text : 'Text';
      case 'Badge':
        return ('text' in component && typeof component.text === 'string') ? component.text : 'Badge';
      case 'Progress':
        return <div className="h-full bg-primary/60 w-1/2 rounded-full" />;
      case 'Divider':
        return null;
      default:
        return component.component;
    }
  };

  return (
    <div className={getComponentStyle()}>
      {getComponentContent()}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function A2UITemplatePreview({
  template,
  showPreview = true,
  onTogglePreview,
  className,
}: A2UITemplatePreviewProps) {
  const t = useTranslations('customMode');

  // Get root components (components that are not children of other components)
  const components = template?.components;
  const rootComponents = useMemo(() => {
    if (!components) return [];
    
    // Find all component IDs that are referenced as children
    const childIds = new Set<string>();
    for (const component of components) {
      if ('children' in component && Array.isArray(component.children)) {
        for (const childId of component.children) {
          childIds.add(childId);
        }
      }
    }
    
    // Root components are those not referenced as children
    return components.filter(c => !childIds.has(c.id));
  }, [components]);

  // Component count by type
  const componentCounts = useMemo(() => {
    if (!components) return {};
    
    const counts: Record<string, number> = {};
    for (const component of components) {
      counts[component.component] = (counts[component.component] || 0) + 1;
    }
    return counts;
  }, [components]);

  if (!template) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layout className="h-4 w-4" />
            {t('a2uiSettings')}
          </CardTitle>
          <CardDescription>{t('a2uiSettingsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No A2UI template configured for this mode.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <Layout className="h-4 w-4" />
              {template.name}
            </CardTitle>
            {template.description && (
              <CardDescription className="mt-1">{template.description}</CardDescription>
            )}
          </div>
          {onTogglePreview && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onTogglePreview}
              className="gap-2"
            >
              {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showPreview ? 'Hide' : 'Show'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Component summary */}
        <div className="flex flex-wrap gap-1">
          {Object.entries(componentCounts).map(([type, count]) => (
            <Badge key={type} variant="outline" className="text-xs">
              {type}: {count}
            </Badge>
          ))}
        </div>

        {/* Preview */}
        {showPreview && rootComponents.length > 0 && (
          <div className="border rounded-lg p-4 bg-background/50">
            <p className="text-xs text-muted-foreground mb-3">Preview</p>
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-2">
                {rootComponents.map((component) => (
                  <ComponentPreview key={component.id} component={component} />
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Data model info */}
        {template.dataModel && Object.keys(template.dataModel).length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Data Model</p>
            <div className="flex flex-wrap gap-1">
              {Object.keys(template.dataModel).map((key) => (
                <Badge key={key} variant="secondary" className="text-xs font-mono">
                  {key}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Actions info */}
        {template.actions && template.actions.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Actions</p>
            <div className="flex flex-wrap gap-1">
              {template.actions.map((action) => (
                <Badge key={action.id} variant="outline" className="text-xs">
                  {action.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default A2UITemplatePreview;
