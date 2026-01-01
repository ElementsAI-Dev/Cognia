'use client';

/**
 * ComponentLibrary - Quick-insert component panel for the designer
 * Provides categorized UI components with drag-drop support
 */

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useDraggable } from '@dnd-kit/core';
import {
  Search,
  Layout,
  Type,
  FormInput,
  Square,
  Navigation,
  MessageSquare,
  ImageIcon,
  Sparkles,
  List,
  Users,
  BarChart3,
  X,
  Plus,
  GripVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Component definitions
interface ComponentDefinition {
  id: string;
  name: string;
  description: string;
  code: string;
  icon: React.ReactNode;
}

interface ComponentCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  components: ComponentDefinition[];
}

const COMPONENT_CATEGORIES: ComponentCategory[] = [
  {
    id: 'layout',
    name: 'Layout',
    icon: <Layout className="h-4 w-4" />,
    components: [
      {
        id: 'container',
        name: 'Container',
        description: 'Centered container with max width',
        code: '<div className="container mx-auto px-4">\n  {/* Content */}\n</div>',
        icon: <Square className="h-4 w-4" />,
      },
      {
        id: 'flex-row',
        name: 'Flex Row',
        description: 'Horizontal flex container',
        code: '<div className="flex items-center gap-4">\n  {/* Items */}\n</div>',
        icon: <Layout className="h-4 w-4" />,
      },
      {
        id: 'flex-col',
        name: 'Flex Column',
        description: 'Vertical flex container',
        code: '<div className="flex flex-col gap-4">\n  {/* Items */}\n</div>',
        icon: <Layout className="h-4 w-4" />,
      },
      {
        id: 'grid-2',
        name: '2 Column Grid',
        description: 'Two column responsive grid',
        code: '<div className="grid grid-cols-1 md:grid-cols-2 gap-6">\n  <div>Column 1</div>\n  <div>Column 2</div>\n</div>',
        icon: <Layout className="h-4 w-4" />,
      },
      {
        id: 'grid-3',
        name: '3 Column Grid',
        description: 'Three column responsive grid',
        code: '<div className="grid grid-cols-1 md:grid-cols-3 gap-6">\n  <div>Column 1</div>\n  <div>Column 2</div>\n  <div>Column 3</div>\n</div>',
        icon: <Layout className="h-4 w-4" />,
      },
    ],
  },
  {
    id: 'typography',
    name: 'Typography',
    icon: <Type className="h-4 w-4" />,
    components: [
      {
        id: 'heading-1',
        name: 'Heading 1',
        description: 'Large page title',
        code: '<h1 className="text-4xl font-bold tracking-tight">Page Title</h1>',
        icon: <Type className="h-4 w-4" />,
      },
      {
        id: 'heading-2',
        name: 'Heading 2',
        description: 'Section heading',
        code: '<h2 className="text-3xl font-semibold">Section Title</h2>',
        icon: <Type className="h-4 w-4" />,
      },
      {
        id: 'paragraph',
        name: 'Paragraph',
        description: 'Body text paragraph',
        code: '<p className="text-base text-muted-foreground leading-relaxed">\n  Your paragraph text here.\n</p>',
        icon: <Type className="h-4 w-4" />,
      },
      {
        id: 'lead',
        name: 'Lead Text',
        description: 'Emphasized intro text',
        code: '<p className="text-xl text-muted-foreground">\n  A lead paragraph for introductions.\n</p>',
        icon: <Type className="h-4 w-4" />,
      },
    ],
  },
  {
    id: 'forms',
    name: 'Forms',
    icon: <FormInput className="h-4 w-4" />,
    components: [
      {
        id: 'input',
        name: 'Text Input',
        description: 'Basic text input field',
        code: '<input\n  type="text"\n  placeholder="Enter text..."\n  className="w-full px-3 py-2 border rounded-md"\n/>',
        icon: <FormInput className="h-4 w-4" />,
      },
      {
        id: 'textarea',
        name: 'Textarea',
        description: 'Multi-line text input',
        code: '<textarea\n  placeholder="Enter message..."\n  className="w-full px-3 py-2 border rounded-md min-h-[100px]"\n/>',
        icon: <FormInput className="h-4 w-4" />,
      },
      {
        id: 'button',
        name: 'Button',
        description: 'Primary action button',
        code: '<button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">\n  Click me\n</button>',
        icon: <Square className="h-4 w-4" />,
      },
      {
        id: 'form-group',
        name: 'Form Group',
        description: 'Label and input combo',
        code: '<div className="space-y-2">\n  <label className="text-sm font-medium">Label</label>\n  <input type="text" className="w-full px-3 py-2 border rounded-md" />\n</div>',
        icon: <FormInput className="h-4 w-4" />,
      },
    ],
  },
  {
    id: 'cards',
    name: 'Cards',
    icon: <Square className="h-4 w-4" />,
    components: [
      {
        id: 'card-basic',
        name: 'Basic Card',
        description: 'Simple card container',
        code: '<div className="p-6 bg-card border rounded-lg shadow-sm">\n  <h3 className="font-semibold">Card Title</h3>\n  <p className="text-sm text-muted-foreground mt-2">Card content goes here.</p>\n</div>',
        icon: <Square className="h-4 w-4" />,
      },
      {
        id: 'card-image',
        name: 'Image Card',
        description: 'Card with image header',
        code: '<div className="bg-card border rounded-lg overflow-hidden">\n  <div className="h-48 bg-muted" />\n  <div className="p-4">\n    <h3 className="font-semibold">Card Title</h3>\n    <p className="text-sm text-muted-foreground mt-1">Description text.</p>\n  </div>\n</div>',
        icon: <ImageIcon className="h-4 w-4" />,
      },
      {
        id: 'feature-card',
        name: 'Feature Card',
        description: 'Card with icon feature',
        code: '<div className="p-6 bg-card border rounded-lg">\n  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">\n    <Sparkles className="h-6 w-6 text-primary" />\n  </div>\n  <h3 className="font-semibold">Feature Title</h3>\n  <p className="text-sm text-muted-foreground mt-2">Feature description goes here.</p>\n</div>',
        icon: <Sparkles className="h-4 w-4" />,
      },
    ],
  },
  {
    id: 'navigation',
    name: 'Navigation',
    icon: <Navigation className="h-4 w-4" />,
    components: [
      {
        id: 'navbar',
        name: 'Navbar',
        description: 'Top navigation bar',
        code: '<nav className="flex items-center justify-between px-6 py-4 border-b">\n  <div className="font-bold text-xl">Logo</div>\n  <div className="flex items-center gap-6">\n    <a href="#" className="text-sm hover:text-primary">Home</a>\n    <a href="#" className="text-sm hover:text-primary">About</a>\n    <a href="#" className="text-sm hover:text-primary">Contact</a>\n  </div>\n</nav>',
        icon: <Navigation className="h-4 w-4" />,
      },
      {
        id: 'breadcrumb',
        name: 'Breadcrumb',
        description: 'Navigation breadcrumb',
        code: '<nav className="flex items-center gap-2 text-sm">\n  <a href="#" className="text-muted-foreground hover:text-foreground">Home</a>\n  <span className="text-muted-foreground">/</span>\n  <a href="#" className="text-muted-foreground hover:text-foreground">Category</a>\n  <span className="text-muted-foreground">/</span>\n  <span>Current Page</span>\n</nav>',
        icon: <Navigation className="h-4 w-4" />,
      },
    ],
  },
  {
    id: 'feedback',
    name: 'Feedback',
    icon: <MessageSquare className="h-4 w-4" />,
    components: [
      {
        id: 'alert',
        name: 'Alert',
        description: 'Information alert box',
        code: '<div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">\n  <p className="text-sm text-blue-800">This is an informational alert.</p>\n</div>',
        icon: <MessageSquare className="h-4 w-4" />,
      },
      {
        id: 'badge',
        name: 'Badge',
        description: 'Small label badge',
        code: '<span className="px-2.5 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">Badge</span>',
        icon: <Square className="h-4 w-4" />,
      },
    ],
  },
  {
    id: 'sections',
    name: 'Sections',
    icon: <Layout className="h-4 w-4" />,
    components: [
      {
        id: 'hero',
        name: 'Hero Section',
        description: 'Full-width hero with CTA',
        code: '<section className="py-20 px-6 text-center">\n  <h1 className="text-5xl font-bold tracking-tight">Welcome to Our Site</h1>\n  <p className="text-xl text-muted-foreground mt-4 max-w-2xl mx-auto">A brief description of what we do and why you should care.</p>\n  <div className="mt-8 flex justify-center gap-4">\n    <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg">Get Started</button>\n    <button className="px-6 py-3 border rounded-lg">Learn More</button>\n  </div>\n</section>',
        icon: <Sparkles className="h-4 w-4" />,
      },
      {
        id: 'cta',
        name: 'Call to Action',
        description: 'CTA section with background',
        code: '<section className="py-16 px-6 bg-primary text-primary-foreground rounded-lg text-center">\n  <h2 className="text-3xl font-bold">Ready to get started?</h2>\n  <p className="mt-4 opacity-90">Join thousands of satisfied customers today.</p>\n  <button className="mt-6 px-6 py-3 bg-background text-foreground rounded-lg">Sign Up Free</button>\n</section>',
        icon: <Sparkles className="h-4 w-4" />,
      },
      {
        id: 'testimonial',
        name: 'Testimonial',
        description: 'Customer testimonial card',
        code: '<div className="p-6 bg-card border rounded-lg">\n  <p className="text-lg italic">"This product changed my life. Highly recommended!"</p>\n  <div className="flex items-center gap-3 mt-4">\n    <div className="w-10 h-10 bg-muted rounded-full" />\n    <div>\n      <p className="font-medium">John Doe</p>\n      <p className="text-sm text-muted-foreground">CEO, Company</p>\n    </div>\n  </div>\n</div>',
        icon: <Users className="h-4 w-4" />,
      },
    ],
  },
  {
    id: 'data',
    name: 'Data Display',
    icon: <BarChart3 className="h-4 w-4" />,
    components: [
      {
        id: 'stat',
        name: 'Stat Card',
        description: 'Single statistic display',
        code: '<div className="p-6 bg-card border rounded-lg">\n  <p className="text-sm text-muted-foreground">Total Revenue</p>\n  <p className="text-3xl font-bold mt-1">$45,231</p>\n  <p className="text-sm text-green-600 mt-1">+20.1% from last month</p>\n</div>',
        icon: <BarChart3 className="h-4 w-4" />,
      },
      {
        id: 'list',
        name: 'List',
        description: 'Styled list items',
        code: '<ul className="space-y-3">\n  <li className="flex items-center gap-3 p-3 bg-card border rounded-lg">\n    <div className="w-8 h-8 bg-muted rounded" />\n    <div className="flex-1">\n      <p className="font-medium">List Item</p>\n      <p className="text-sm text-muted-foreground">Description</p>\n    </div>\n  </li>\n</ul>',
        icon: <List className="h-4 w-4" />,
      },
    ],
  },
];

interface ComponentLibraryProps {
  className?: string;
  onInsertComponent?: (code: string) => void;
}

// Draggable component item
function DraggableComponent({
  component,
  onInsert,
}: {
  component: ComponentDefinition;
  onInsert?: (code: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `component-${component.id}`,
    data: {
      type: 'component',
      componentId: component.id,
      code: component.code,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex items-center gap-2 p-2 rounded-md border bg-card cursor-grab active:cursor-grabbing',
        'hover:border-primary/50 hover:bg-accent/50 transition-colors',
        isDragging && 'opacity-50 ring-2 ring-primary'
      )}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      <div className="text-muted-foreground">{component.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{component.name}</p>
        <p className="text-xs text-muted-foreground truncate">{component.description}</p>
      </div>
      {onInsert && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onInsert(component.code);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Insert component</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

export function ComponentLibrary({
  className,
  onInsertComponent,
}: ComponentLibraryProps) {
  const t = useTranslations('designer');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter components based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return COMPONENT_CATEGORIES;

    const query = searchQuery.toLowerCase();
    return COMPONENT_CATEGORIES.map((category) => ({
      ...category,
      components: category.components.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query)
      ),
    })).filter((category) => category.components.length > 0);
  }, [searchQuery]);

  const totalComponents = useMemo(() => {
    return COMPONENT_CATEGORIES.reduce((acc, cat) => acc + cat.components.length, 0);
  }, []);

  return (
    <TooltipProvider>
      <div className={cn('flex flex-col h-full', className)}>
        {/* Header */}
        <div className="border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <Layout className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{t('componentLibrary') || 'Components'}</span>
            <Badge variant="secondary" className="text-xs">
              {totalComponents}
            </Badge>
          </div>
        </div>

        {/* Search */}
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchComponents') || 'Search components...'}
              className="h-8 pl-8 text-sm"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Component List */}
        <ScrollArea className="flex-1">
          {filteredCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Search className="h-8 w-8 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium">No components found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try a different search term
              </p>
            </div>
          ) : (
            <Accordion
              type="multiple"
              defaultValue={['layout', 'typography']}
              className="w-full"
            >
              {filteredCategories.map((category) => (
                <AccordionItem key={category.id} value={category.id}>
                  <AccordionTrigger className="px-3 py-2 text-sm hover:no-underline">
                    <div className="flex items-center gap-2">
                      {category.icon}
                      <span>{category.name}</span>
                      <Badge variant="outline" className="text-[10px] ml-auto mr-2">
                        {category.components.length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-2 pb-2 space-y-1">
                    {category.components.map((component) => (
                      <DraggableComponent
                        key={component.id}
                        component={component}
                        onInsert={onInsertComponent}
                      />
                    ))}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </ScrollArea>

        {/* Footer tip */}
        <div className="border-t px-3 py-2">
          <p className="text-[10px] text-muted-foreground text-center">
            {t('dragToInsert') || 'Drag components to insert them'}
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default ComponentLibrary;
