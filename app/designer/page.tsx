'use client';

/**
 * Designer Page - Standalone V0-style web page designer
 */

import { useState, useCallback } from 'react';
import { ReactSandbox } from '@/components/designer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Send,
  Loader2,
  ArrowLeft,
  Wand2,
  Layers,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';

// Templates
const TEMPLATES = [
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
    description: 'Modern landing page',
    category: 'Marketing',
    code: `export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="text-xl font-bold text-gray-900">Logo</div>
        <div className="flex items-center gap-6">
          <a href="#" className="text-gray-600 hover:text-gray-900">Features</a>
          <a href="#" className="text-gray-600 hover:text-gray-900">Pricing</a>
          <button className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800">
            Get Started
          </button>
        </div>
      </nav>
      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Build something amazing
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Create beautiful, responsive websites with our powerful platform.
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
    </div>
  );
}`,
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Admin dashboard',
    category: 'Application',
    code: `export default function App() {
  const stats = [
    { label: 'Revenue', value: '$45,231', change: '+20.1%' },
    { label: 'Users', value: '2,350', change: '+180.1%' },
    { label: 'Sales', value: '12,234', change: '+19%' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r p-4">
        <div className="text-xl font-bold mb-8">Dashboard</div>
        <nav className="space-y-2">
          {['Overview', 'Analytics', 'Reports', 'Settings'].map((item) => (
            <a key={item} href="#" className="block px-4 py-2 rounded-lg hover:bg-gray-100">
              {item}
            </a>
          ))}
        </nav>
      </aside>
      <main className="ml-64 p-8">
        <h1 className="text-2xl font-bold mb-8">Overview</h1>
        <div className="grid grid-cols-3 gap-6">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-green-600">{stat.change}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}`,
  },
  {
    id: 'form',
    name: 'Contact Form',
    description: 'Beautiful form',
    category: 'Components',
    code: `import { useState } from 'react';

export default function App() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border shadow-sm p-6 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Contact Us</h1>
        <p className="text-gray-600 mb-6">We'd love to hear from you.</p>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="john@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Your message..."
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg"
          >
            Send Message
          </button>
        </form>
      </div>
    </div>
  );
}`,
  },
];

const AI_SUGGESTIONS = [
  'Add a dark mode toggle',
  'Make it responsive for mobile',
  'Add animations on scroll',
  'Change the color scheme to blue',
  'Add a loading skeleton',
  'Make the buttons more rounded',
];

export default function DesignerPage() {
  const [code, setCode] = useState(TEMPLATES[0].code);
  const [showTemplates, setShowTemplates] = useState(true);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiPrompt, setAIPrompt] = useState('');
  const [isAIProcessing, setIsAIProcessing] = useState(false);

  const handleSelectTemplate = useCallback((template: typeof TEMPLATES[0]) => {
    setCode(template.code);
    setShowTemplates(false);
  }, []);

  const handleAIEdit = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    
    setIsAIProcessing(true);
    // Simulate AI processing - in production, this would call the AI API
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsAIProcessing(false);
    setAIPrompt('');
  }, [aiPrompt]);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
              <Wand2 className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-medium text-sm">Designer</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)}>
            <Layers className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <Button
            variant={showAIPanel ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowAIPanel(!showAIPanel)}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            AI Edit
          </Button>
        </div>
      </header>

      {/* AI Panel */}
      {showAIPanel && (
        <div className="border-b p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAIPrompt(e.target.value)}
                placeholder="Describe what you want to change..."
                className="min-h-[60px] resize-none text-sm"
                disabled={isAIProcessing}
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {AI_SUGGESTIONS.slice(0, 4).map((suggestion) => (
                  <Badge
                    key={suggestion}
                    variant="outline"
                    className="cursor-pointer hover:bg-muted text-xs"
                    onClick={() => setAIPrompt(suggestion)}
                  >
                    {suggestion}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                onClick={handleAIEdit}
                disabled={!aiPrompt.trim() || isAIProcessing}
              >
                {isAIProcessing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    Generate
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowAIPanel(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <ReactSandbox
          code={code}
          onCodeChange={setCode}
          showFileExplorer={false}
          showConsole={false}
        />
      </div>

      {/* Templates Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      className="group text-left rounded-md border p-3 hover:border-foreground/20 hover:bg-muted/50 transition-colors"
                    >
                      <div className="aspect-video bg-muted rounded mb-2 flex items-center justify-center">
                        <Layers className="h-6 w-6 opacity-20" />
                      </div>
                      <h3 className="text-sm font-medium">
                        {template.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {template.description}
                      </p>
                      <Badge variant="outline" className="mt-2 text-xs">
                        {template.category}
                      </Badge>
                    </button>
                  ))}
                </div>
              </TabsContent>

              {['Basic', 'Marketing', 'Application', 'Components'].map((category) => (
                <TabsContent key={category} value={category} className="mt-0">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {TEMPLATES.filter((t) => t.category === category).map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleSelectTemplate(template)}
                        className="group text-left rounded-md border p-3 hover:border-foreground/20 hover:bg-muted/50 transition-colors"
                      >
                        <div className="aspect-video bg-muted rounded mb-2 flex items-center justify-center">
                          <Layers className="h-6 w-6 opacity-20" />
                        </div>
                        <h3 className="text-sm font-medium">
                          {template.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {template.description}
                        </p>
                        <Badge variant="outline" className="mt-2 text-xs">
                          {template.category}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
