'use client';

/**
 * V0Designer - Complete V0-style web page designer
 * Combines React sandbox, AI editing, and visual design tools
 */

import { useCallback, useEffect, useState } from 'react';
import { generateText } from 'ai';
import { getProviderModel, type ProviderName } from '@/lib/ai/client';
import { useSettingsStore } from '@/stores';
import {
  X,
  Sparkles,
  Send,
  Loader2,
  Wand2,
  Palette,
  Layout,
  Type,
  Box,
  Layers,
  Undo2,
  Redo2,
  Save,
} from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReactSandbox } from './react-sandbox';

// Template definitions
interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  code: string;
  thumbnail?: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'blank',
    name: 'Blank',
    description: 'Start from scratch',
    category: 'Basic',
    code: `export default function App() {
  return (
    <div className="min-h-screen bg-white p-8">
      <h1 className="text-2xl font-bold">Hello World</h1>
    </div>
  );
}`,
  },
  {
    id: 'landing',
    name: 'Landing Page',
    description: 'Modern landing page with hero section',
    category: 'Marketing',
    code: `export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="text-xl font-bold text-gray-900">Logo</div>
        <div className="flex items-center gap-6">
          <a href="#" className="text-gray-600 hover:text-gray-900">Features</a>
          <a href="#" className="text-gray-600 hover:text-gray-900">Pricing</a>
          <a href="#" className="text-gray-600 hover:text-gray-900">About</a>
          <button className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800">
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Build something amazing
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Create beautiful, responsive websites with our powerful platform.
          No coding required.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 font-medium">
            Start Free Trial
          </button>
          <button className="border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 font-medium">
            Watch Demo
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid grid-cols-3 gap-8">
          {[
            { title: 'Fast', desc: 'Lightning fast performance' },
            { title: 'Secure', desc: 'Enterprise-grade security' },
            { title: 'Scalable', desc: 'Grows with your business' },
          ].map((feature, i) => (
            <div key={i} className="p-6 rounded-xl border bg-white">
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}`,
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Admin dashboard with stats and charts',
    category: 'Application',
    code: `export default function App() {
  const stats = [
    { label: 'Total Revenue', value: '$45,231.89', change: '+20.1%' },
    { label: 'Subscriptions', value: '+2,350', change: '+180.1%' },
    { label: 'Sales', value: '+12,234', change: '+19%' },
    { label: 'Active Now', value: '+573', change: '+201' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r p-4">
        <div className="text-xl font-bold mb-8">Dashboard</div>
        <nav className="space-y-2">
          {['Overview', 'Analytics', 'Reports', 'Settings'].map((item) => (
            <a
              key={item}
              href="#"
              className="block px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700"
            >
              {item}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="ml-64 p-8">
        <h1 className="text-2xl font-bold mb-8">Overview</h1>
        
        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-green-600">{stat.change}</p>
            </div>
          ))}
        </div>

        {/* Chart placeholder */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Revenue Over Time</h2>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
            Chart Placeholder
          </div>
        </div>
      </main>
    </div>
  );
}`,
  },
  {
    id: 'form',
    name: 'Contact Form',
    description: 'Beautiful contact form with validation',
    category: 'Components',
    code: `import { useState } from 'react';

export default function App() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Form submitted!');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Contact Us</h1>
        <p className="text-gray-600 mb-6">We'd love to hear from you.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="John Doe"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="john@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Your message..."
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Send Message
          </button>
        </form>
      </div>
    </div>
  );
}`,
  },
  {
    id: 'pricing',
    name: 'Pricing Table',
    description: 'Pricing cards with features',
    category: 'Marketing',
    code: `export default function App() {
  const plans = [
    {
      name: 'Starter',
      price: '$9',
      description: 'Perfect for individuals',
      features: ['5 projects', '10GB storage', 'Basic support'],
      popular: false,
    },
    {
      name: 'Pro',
      price: '$29',
      description: 'Best for professionals',
      features: ['Unlimited projects', '100GB storage', 'Priority support', 'Advanced analytics'],
      popular: true,
    },
    {
      name: 'Enterprise',
      price: '$99',
      description: 'For large teams',
      features: ['Everything in Pro', 'Unlimited storage', '24/7 support', 'Custom integrations', 'SLA'],
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-gray-600">
            Choose the plan that's right for you
          </p>
        </div>

        <div className="grid grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={\`rounded-2xl p-8 \${
                plan.popular
                  ? 'bg-black text-white ring-4 ring-black'
                  : 'bg-white border'
              }\`}
            >
              {plan.popular && (
                <span className="inline-block bg-white text-black text-xs font-semibold px-3 py-1 rounded-full mb-4">
                  Most Popular
                </span>
              )}
              <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
              <p className={\`text-sm mb-4 \${plan.popular ? 'text-gray-300' : 'text-gray-600'}\`}>
                {plan.description}
              </p>
              <div className="mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className={\`\${plan.popular ? 'text-gray-300' : 'text-gray-600'}\`}>/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                className={\`w-full py-3 rounded-lg font-medium transition-colors \${
                  plan.popular
                    ? 'bg-white text-black hover:bg-gray-100'
                    : 'bg-black text-white hover:bg-gray-800'
                }\`}
              >
                Get Started
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}`,
  },
];

// AI prompt suggestions
const AI_SUGGESTIONS = [
  'Add a dark mode toggle',
  'Make it responsive for mobile',
  'Add animations on scroll',
  'Change the color scheme to blue',
  'Add a loading skeleton',
  'Make the buttons more rounded',
  'Add hover effects to cards',
  'Include a footer section',
];

interface V0DesignerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCode?: string;
  onCodeChange?: (code: string) => void;
  onSave?: (code: string) => void;
  onAIRequest?: (prompt: string, code: string) => Promise<string>;
}

export function V0Designer({
  open,
  onOpenChange,
  initialCode,
  onCodeChange,
  onSave,
  onAIRequest,
}: V0DesignerProps) {
  const [code, setCode] = useState(initialCode || TEMPLATES[0].code);
  const [aiPrompt, setAIPrompt] = useState('');
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [showTemplates, setShowTemplates] = useState(!initialCode);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [aiError, setAIError] = useState<string | null>(null);

  // Settings for built-in AI
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const defaultProvider = useSettingsStore((state) => state.defaultProvider);

  // Built-in AI request handler
  const builtInAIRequest = useCallback(async (prompt: string, currentCode: string): Promise<string> => {
    const provider = (defaultProvider || 'openai') as ProviderName;
    const settings = providerSettings[provider];
    const model = settings?.defaultModel || 'gpt-4o-mini';

    if (!settings?.apiKey && provider !== 'ollama') {
      throw new Error(`No API key configured for ${provider}. Please add your API key in Settings.`);
    }

    const modelInstance = getProviderModel(provider, model, settings?.apiKey || '', settings?.baseURL);

    const result = await generateText({
      model: modelInstance,
      system: `You are an expert React developer. Modify the following React component based on the user's request.
Return ONLY the complete modified code, no explanations.
Preserve the component structure and use Tailwind CSS for styling.
Make sure the code is valid JSX that can be rendered.`,
      prompt: `Current code:\n\n${currentCode}\n\nUser request: ${prompt}`,
      temperature: 0.7,
    });

    if (result.text) {
      let newCode = result.text.trim();
      if (newCode.startsWith('```')) {
        newCode = newCode.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '');
      }
      return newCode;
    }
    throw new Error('No response from AI');
  }, [defaultProvider, providerSettings]);

  // Initialize with code
  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
      setShowTemplates(false);
    }
  }, [initialCode]);

  // Add to history
  const addToHistory = useCallback((newCode: string) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newCode);
      return newHistory.slice(-50); // Keep last 50 entries
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
  }, [historyIndex]);

  // Handle code change
  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    onCodeChange?.(newCode);
  }, [onCodeChange]);

  // Handle template selection
  const handleSelectTemplate = useCallback((template: Template) => {
    setCode(template.code);
    addToHistory(template.code);
    setShowTemplates(false);
    onCodeChange?.(template.code);
  }, [addToHistory, onCodeChange]);

  // Handle AI edit - uses provided handler or built-in
  const handleAIEdit = useCallback(async () => {
    if (!aiPrompt.trim()) return;

    setIsAIProcessing(true);
    setAIError(null);
    try {
      const aiHandler = onAIRequest || builtInAIRequest;
      const newCode = await aiHandler(aiPrompt, code);
      setCode(newCode);
      addToHistory(newCode);
      onCodeChange?.(newCode);
      setAIPrompt('');
    } catch (error) {
      console.error('AI edit failed:', error);
      setAIError(error instanceof Error ? error.message : 'AI edit failed');
    } finally {
      setIsAIProcessing(false);
    }
  }, [aiPrompt, code, onAIRequest, builtInAIRequest, addToHistory, onCodeChange]);

  // Undo/Redo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCode(history[newIndex]);
      onCodeChange?.(history[newIndex]);
    }
  }, [history, historyIndex, onCodeChange]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCode(history[newIndex]);
      onCodeChange?.(history[newIndex]);
    }
  }, [history, historyIndex, onCodeChange]);

  // Handle save
  const handleSave = useCallback(() => {
    onSave?.(code);
  }, [code, onSave]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[95vw] sm:max-w-[1600px] p-0 flex flex-col"
      >
        <TooltipProvider>
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
                  <Wand2 className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
                <span className="font-medium text-sm">Designer</span>
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Undo/Redo */}
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleUndo}
                      disabled={historyIndex <= 0}
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Undo</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleRedo}
                      disabled={historyIndex >= history.length - 1}
                    >
                      <Redo2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Redo</TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Templates button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTemplates(true)}
              >
                <Layers className="h-4 w-4 mr-2" />
                Templates
              </Button>

              {/* AI button */}
              <Button
                variant={showAIPanel ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setShowAIPanel(!showAIPanel)}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                AI Edit
              </Button>

              {/* Save button */}
              {onSave && (
                <Button variant="default" size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              )}

              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* AI Panel */}
          {showAIPanel && (
            <div className="border-b bg-muted/30 p-4">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <Textarea
                      value={aiPrompt}
                      onChange={(e) => setAIPrompt(e.target.value)}
                      placeholder="Describe what you want to change..."
                      className="min-h-[80px] resize-none"
                      disabled={isAIProcessing}
                    />
                    <div className="flex flex-wrap gap-2 mt-3">
                      {AI_SUGGESTIONS.slice(0, 4).map((suggestion) => (
                        <Badge
                          key={suggestion}
                          variant="secondary"
                          className="cursor-pointer hover:bg-secondary/80"
                          onClick={() => setAIPrompt(suggestion)}
                        >
                          {suggestion}
                        </Badge>
                      ))}
                    </div>
                    {aiError && (
                      <div className="flex items-center gap-2 mt-2 text-destructive text-sm">
                        <span>{aiError}</span>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={handleAIEdit}
                    disabled={!aiPrompt.trim() || isAIProcessing}
                    className="h-10"
                  >
                    {isAIProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Main content */}
          <div className="flex-1 overflow-hidden">
            <ReactSandbox
              code={code}
              onCodeChange={handleCodeChange}
              showFileExplorer={false}
              showConsole={false}
              onAIEdit={() => setShowAIPanel(true)}
            />
          </div>
        </TooltipProvider>

        {/* Templates Dialog */}
        <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Choose a Template</DialogTitle>
              <DialogDescription>
                Start with a pre-built template or create from scratch
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="all" className="flex-1 overflow-hidden flex flex-col">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="Basic">Basic</TabsTrigger>
                <TabsTrigger value="Marketing">Marketing</TabsTrigger>
                <TabsTrigger value="Application">Application</TabsTrigger>
                <TabsTrigger value="Components">Components</TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 mt-4">
                <TabsContent value="all" className="mt-0">
                  <div className="grid grid-cols-3 gap-4">
                    {TEMPLATES.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onSelect={handleSelectTemplate}
                      />
                    ))}
                  </div>
                </TabsContent>

                {['Basic', 'Marketing', 'Application', 'Components'].map((category) => (
                  <TabsContent key={category} value={category} className="mt-0">
                    <div className="grid grid-cols-3 gap-4">
                      {TEMPLATES.filter((t) => t.category === category).map((template) => (
                        <TemplateCard
                          key={template.id}
                          template={template}
                          onSelect={handleSelectTemplate}
                        />
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </ScrollArea>
            </Tabs>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}

// Template card component
function TemplateCard({
  template,
  onSelect,
}: {
  template: Template;
  onSelect: (template: Template) => void;
}) {
  return (
    <button
      onClick={() => onSelect(template)}
      className="group text-left rounded-lg border bg-card p-4 hover:border-primary hover:shadow-md transition-all"
    >
      <div className="aspect-video bg-muted rounded-md mb-3 flex items-center justify-center overflow-hidden">
        <div className="text-4xl opacity-50">
          {template.id === 'blank' && <Box className="h-8 w-8" />}
          {template.id === 'landing' && <Layout className="h-8 w-8" />}
          {template.id === 'dashboard' && <Layers className="h-8 w-8" />}
          {template.id === 'form' && <Type className="h-8 w-8" />}
          {template.id === 'pricing' && <Palette className="h-8 w-8" />}
        </div>
      </div>
      <h3 className="font-medium group-hover:text-primary transition-colors">
        {template.name}
      </h3>
      <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
      <Badge variant="secondary" className="mt-2">
        {template.category}
      </Badge>
    </button>
  );
}

export default V0Designer;
