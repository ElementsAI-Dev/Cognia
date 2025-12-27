'use client';

/**
 * ComponentLibrary - Panel for quick-inserting UI components
 * Provides a library of common components that can be inserted into code
 */

import { useCallback, useState } from 'react';
import { useActiveCode } from '@codesandbox/sandpack-react';
import { useDesignerDragDrop, type DragData } from '@/hooks';
import {
  Box,
  Type,
  Image as ImageIcon,
  FormInput,
  LayoutGrid,
  Square,
  RectangleHorizontal,
  CircleDot,
  ToggleLeft,
  ChevronDown,
  Search,
  Menu,
  User,
  Star,
  Check,
  AlertCircle,
  Info,
  Copy,
  GripVertical,
  Zap,
  Quote,
  Table,
  List,
  ArrowRight,
  Mail,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ComponentItem {
  id: string;
  name: string;
  icon: React.ReactNode;
  code: string;
  description: string;
}

interface ComponentCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  components: ComponentItem[];
}

// Component library data
const COMPONENT_LIBRARY: ComponentCategory[] = [
  {
    id: 'layout',
    name: 'Layout',
    icon: <LayoutGrid className="h-4 w-4" />,
    components: [
      {
        id: 'container',
        name: 'Container',
        icon: <Box className="h-4 w-4" />,
        description: 'Centered container with max-width',
        code: `<div className="container mx-auto px-4 max-w-6xl">
  {/* Content */}
</div>`,
      },
      {
        id: 'flex-row',
        name: 'Flex Row',
        icon: <RectangleHorizontal className="h-4 w-4" />,
        description: 'Horizontal flex container',
        code: `<div className="flex items-center gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>`,
      },
      {
        id: 'flex-col',
        name: 'Flex Column',
        icon: <Box className="h-4 w-4" />,
        description: 'Vertical flex container',
        code: `<div className="flex flex-col gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>`,
      },
      {
        id: 'grid',
        name: 'Grid',
        icon: <LayoutGrid className="h-4 w-4" />,
        description: 'Responsive grid layout',
        code: `<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <div className="p-4 border rounded">Item 1</div>
  <div className="p-4 border rounded">Item 2</div>
  <div className="p-4 border rounded">Item 3</div>
</div>`,
      },
      {
        id: 'section',
        name: 'Section',
        icon: <Square className="h-4 w-4" />,
        description: 'Page section with padding',
        code: `<section className="py-16 px-4">
  <div className="container mx-auto max-w-6xl">
    <h2 className="text-3xl font-bold mb-8">Section Title</h2>
    {/* Content */}
  </div>
</section>`,
      },
    ],
  },
  {
    id: 'typography',
    name: 'Typography',
    icon: <Type className="h-4 w-4" />,
    components: [
      {
        id: 'heading',
        name: 'Heading',
        icon: <Type className="h-4 w-4" />,
        description: 'Page heading',
        code: `<h1 className="text-4xl font-bold tracking-tight">
  Page Title
</h1>`,
      },
      {
        id: 'subheading',
        name: 'Subheading',
        icon: <Type className="h-4 w-4" />,
        description: 'Section subheading',
        code: `<h2 className="text-2xl font-semibold">
  Section Title
</h2>`,
      },
      {
        id: 'paragraph',
        name: 'Paragraph',
        icon: <Type className="h-4 w-4" />,
        description: 'Body text paragraph',
        code: `<p className="text-gray-600 leading-relaxed">
  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
</p>`,
      },
      {
        id: 'lead',
        name: 'Lead Text',
        icon: <Type className="h-4 w-4" />,
        description: 'Large intro text',
        code: `<p className="text-xl text-gray-500 leading-relaxed">
  A brief introduction or summary that captures attention.
</p>`,
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
        name: 'Input',
        icon: <FormInput className="h-4 w-4" />,
        description: 'Text input field',
        code: `<div className="space-y-2">
  <label className="text-sm font-medium">Label</label>
  <input
    type="text"
    placeholder="Enter text..."
    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
  />
</div>`,
      },
      {
        id: 'textarea',
        name: 'Textarea',
        icon: <Square className="h-4 w-4" />,
        description: 'Multi-line text input',
        code: `<div className="space-y-2">
  <label className="text-sm font-medium">Message</label>
  <textarea
    rows={4}
    placeholder="Enter message..."
    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
  />
</div>`,
      },
      {
        id: 'select',
        name: 'Select',
        icon: <ChevronDown className="h-4 w-4" />,
        description: 'Dropdown select',
        code: `<div className="space-y-2">
  <label className="text-sm font-medium">Select Option</label>
  <select className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
    <option value="">Choose...</option>
    <option value="1">Option 1</option>
    <option value="2">Option 2</option>
    <option value="3">Option 3</option>
  </select>
</div>`,
      },
      {
        id: 'checkbox',
        name: 'Checkbox',
        icon: <Check className="h-4 w-4" />,
        description: 'Checkbox input',
        code: `<label className="flex items-center gap-2 cursor-pointer">
  <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
  <span className="text-sm">I agree to the terms</span>
</label>`,
      },
      {
        id: 'toggle',
        name: 'Toggle',
        icon: <ToggleLeft className="h-4 w-4" />,
        description: 'Toggle switch',
        code: `<label className="flex items-center gap-3 cursor-pointer">
  <div className="relative">
    <input type="checkbox" className="sr-only peer" />
    <div className="w-10 h-6 bg-gray-200 rounded-full peer-checked:bg-blue-500 transition-colors"></div>
    <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-4 transition-transform"></div>
  </div>
  <span className="text-sm">Enable feature</span>
</label>`,
      },
      {
        id: 'search',
        name: 'Search',
        icon: <Search className="h-4 w-4" />,
        description: 'Search input with icon',
        code: `<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
  <input
    type="search"
    placeholder="Search..."
    className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
  />
</div>`,
      },
    ],
  },
  {
    id: 'buttons',
    name: 'Buttons',
    icon: <CircleDot className="h-4 w-4" />,
    components: [
      {
        id: 'button-primary',
        name: 'Primary Button',
        icon: <CircleDot className="h-4 w-4" />,
        description: 'Primary action button',
        code: `<button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
  Get Started
</button>`,
      },
      {
        id: 'button-secondary',
        name: 'Secondary Button',
        icon: <CircleDot className="h-4 w-4" />,
        description: 'Secondary action button',
        code: `<button className="px-4 py-2 bg-gray-100 text-gray-900 rounded-md hover:bg-gray-200 transition-colors">
  Learn More
</button>`,
      },
      {
        id: 'button-outline',
        name: 'Outline Button',
        icon: <CircleDot className="h-4 w-4" />,
        description: 'Outlined button',
        code: `<button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
  Cancel
</button>`,
      },
      {
        id: 'button-icon',
        name: 'Icon Button',
        icon: <CircleDot className="h-4 w-4" />,
        description: 'Button with icon',
        code: `<button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
  <Mail className="h-4 w-4" />
  Send Email
</button>`,
      },
      {
        id: 'button-group',
        name: 'Button Group',
        icon: <RectangleHorizontal className="h-4 w-4" />,
        description: 'Group of buttons',
        code: `<div className="inline-flex rounded-md shadow-sm">
  <button className="px-4 py-2 bg-white border border-r-0 rounded-l-md hover:bg-gray-50">
    Left
  </button>
  <button className="px-4 py-2 bg-white border hover:bg-gray-50">
    Center
  </button>
  <button className="px-4 py-2 bg-white border border-l-0 rounded-r-md hover:bg-gray-50">
    Right
  </button>
</div>`,
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
        icon: <Square className="h-4 w-4" />,
        description: 'Simple card component',
        code: `<div className="p-6 bg-white border rounded-lg shadow-sm">
  <h3 className="text-lg font-semibold mb-2">Card Title</h3>
  <p className="text-gray-600">
    Card description goes here. Add more content as needed.
  </p>
</div>`,
      },
      {
        id: 'card-image',
        name: 'Image Card',
        icon: <ImageIcon className="h-4 w-4" />,
        description: 'Card with image',
        code: `<div className="bg-white border rounded-lg shadow-sm overflow-hidden">
  <img
    src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=300&fit=crop"
    alt="Card image"
    className="w-full h-48 object-cover"
  />
  <div className="p-6">
    <h3 className="text-lg font-semibold mb-2">Card Title</h3>
    <p className="text-gray-600">
      Card description with an image above.
    </p>
  </div>
</div>`,
      },
      {
        id: 'card-feature',
        name: 'Feature Card',
        icon: <Star className="h-4 w-4" />,
        description: 'Feature highlight card',
        code: `<div className="p-6 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow">
  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
    <Star className="h-6 w-6 text-blue-600" />
  </div>
  <h3 className="text-lg font-semibold mb-2">Feature Title</h3>
  <p className="text-gray-600">
    Describe this amazing feature and its benefits.
  </p>
</div>`,
      },
      {
        id: 'card-pricing',
        name: 'Pricing Card',
        icon: <CircleDot className="h-4 w-4" />,
        description: 'Pricing plan card',
        code: `<div className="p-6 bg-white border rounded-lg shadow-sm">
  <h3 className="text-lg font-semibold">Pro Plan</h3>
  <div className="mt-4 flex items-baseline">
    <span className="text-4xl font-bold">$29</span>
    <span className="text-gray-500 ml-1">/month</span>
  </div>
  <ul className="mt-6 space-y-3">
    <li className="flex items-center gap-2">
      <Check className="h-4 w-4 text-green-500" />
      <span>Unlimited projects</span>
    </li>
    <li className="flex items-center gap-2">
      <Check className="h-4 w-4 text-green-500" />
      <span>Priority support</span>
    </li>
    <li className="flex items-center gap-2">
      <Check className="h-4 w-4 text-green-500" />
      <span>Advanced analytics</span>
    </li>
  </ul>
  <button className="w-full mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
    Get Started
  </button>
</div>`,
      },
    ],
  },
  {
    id: 'navigation',
    name: 'Navigation',
    icon: <Menu className="h-4 w-4" />,
    components: [
      {
        id: 'navbar',
        name: 'Navbar',
        icon: <Menu className="h-4 w-4" />,
        description: 'Top navigation bar',
        code: `<nav className="flex items-center justify-between px-6 py-4 bg-white border-b">
  <div className="flex items-center gap-2">
    <div className="w-8 h-8 bg-blue-600 rounded-lg"></div>
    <span className="font-semibold text-lg">Brand</span>
  </div>
  <div className="flex items-center gap-6">
    <a href="#" className="text-gray-600 hover:text-gray-900">Home</a>
    <a href="#" className="text-gray-600 hover:text-gray-900">Features</a>
    <a href="#" className="text-gray-600 hover:text-gray-900">Pricing</a>
    <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
      Sign Up
    </button>
  </div>
</nav>`,
      },
      {
        id: 'breadcrumb',
        name: 'Breadcrumb',
        icon: <ChevronDown className="h-4 w-4" />,
        description: 'Navigation breadcrumb',
        code: `<nav className="flex items-center gap-2 text-sm">
  <a href="#" className="text-gray-500 hover:text-gray-700">Home</a>
  <span className="text-gray-400">/</span>
  <a href="#" className="text-gray-500 hover:text-gray-700">Products</a>
  <span className="text-gray-400">/</span>
  <span className="text-gray-900">Current Page</span>
</nav>`,
      },
      {
        id: 'tabs',
        name: 'Tabs',
        icon: <RectangleHorizontal className="h-4 w-4" />,
        description: 'Tab navigation',
        code: `<div>
  <div className="flex border-b">
    <button className="px-4 py-2 border-b-2 border-blue-600 text-blue-600 font-medium">
      Tab 1
    </button>
    <button className="px-4 py-2 text-gray-500 hover:text-gray-700">
      Tab 2
    </button>
    <button className="px-4 py-2 text-gray-500 hover:text-gray-700">
      Tab 3
    </button>
  </div>
  <div className="p-4">
    Tab content goes here
  </div>
</div>`,
      },
    ],
  },
  {
    id: 'feedback',
    name: 'Feedback',
    icon: <AlertCircle className="h-4 w-4" />,
    components: [
      {
        id: 'alert-info',
        name: 'Info Alert',
        icon: <Info className="h-4 w-4" />,
        description: 'Informational alert',
        code: `<div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
  <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
  <div>
    <h4 className="font-medium text-blue-900">Information</h4>
    <p className="text-sm text-blue-700 mt-1">
      This is an informational message for the user.
    </p>
  </div>
</div>`,
      },
      {
        id: 'alert-success',
        name: 'Success Alert',
        icon: <Check className="h-4 w-4" />,
        description: 'Success message alert',
        code: `<div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
  <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
  <div>
    <h4 className="font-medium text-green-900">Success</h4>
    <p className="text-sm text-green-700 mt-1">
      Your changes have been saved successfully.
    </p>
  </div>
</div>`,
      },
      {
        id: 'alert-error',
        name: 'Error Alert',
        icon: <AlertCircle className="h-4 w-4" />,
        description: 'Error message alert',
        code: `<div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
  <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
  <div>
    <h4 className="font-medium text-red-900">Error</h4>
    <p className="text-sm text-red-700 mt-1">
      Something went wrong. Please try again.
    </p>
  </div>
</div>`,
      },
      {
        id: 'badge',
        name: 'Badge',
        icon: <CircleDot className="h-4 w-4" />,
        description: 'Status badge',
        code: `<div className="flex items-center gap-2">
  <span className="px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
    Active
  </span>
  <span className="px-2.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
    Pending
  </span>
  <span className="px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full">
    Inactive
  </span>
</div>`,
      },
    ],
  },
  {
    id: 'media',
    name: 'Media',
    icon: <ImageIcon className="h-4 w-4" />,
    components: [
      {
        id: 'avatar',
        name: 'Avatar',
        icon: <User className="h-4 w-4" />,
        description: 'User avatar',
        code: `<div className="flex items-center gap-3">
  <img
    src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face"
    alt="Avatar"
    className="w-10 h-10 rounded-full object-cover"
  />
  <div>
    <p className="font-medium">John Doe</p>
    <p className="text-sm text-gray-500">john@example.com</p>
  </div>
</div>`,
      },
      {
        id: 'avatar-group',
        name: 'Avatar Group',
        icon: <User className="h-4 w-4" />,
        description: 'Group of avatars',
        code: `<div className="flex -space-x-2">
  <img src="https://i.pravatar.cc/100?img=1" className="w-8 h-8 rounded-full border-2 border-white" alt="User 1" />
  <img src="https://i.pravatar.cc/100?img=2" className="w-8 h-8 rounded-full border-2 border-white" alt="User 2" />
  <img src="https://i.pravatar.cc/100?img=3" className="w-8 h-8 rounded-full border-2 border-white" alt="User 3" />
  <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-xs font-medium">
    +5
  </div>
</div>`,
      },
      {
        id: 'image-gallery',
        name: 'Image Gallery',
        icon: <ImageIcon className="h-4 w-4" />,
        description: 'Grid image gallery',
        code: `<div className="grid grid-cols-3 gap-2">
  <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&h=200&fit=crop" className="w-full aspect-square object-cover rounded-lg" alt="Gallery image 1" />
  <img src="https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=200&h=200&fit=crop" className="w-full aspect-square object-cover rounded-lg" alt="Gallery image 2" />
  <img src="https://images.unsplash.com/photo-1618556450994-a6a128ef0d9d?w=200&h=200&fit=crop" className="w-full aspect-square object-cover rounded-lg" alt="Gallery image 3" />
</div>`,
      },
    ],
  },
  {
    id: 'hero',
    name: 'Hero Sections',
    icon: <Zap className="h-4 w-4" />,
    components: [
      {
        id: 'hero-simple',
        name: 'Simple Hero',
        icon: <Zap className="h-4 w-4" />,
        description: 'Clean hero with headline and CTA',
        code: `<section className="py-20 px-4 text-center">
  <h1 className="text-5xl font-bold tracking-tight mb-6">
    Build something amazing
  </h1>
  <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
    Create beautiful, responsive websites with our intuitive design tools.
  </p>
  <div className="flex items-center justify-center gap-4">
    <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
      Get Started
    </button>
    <button className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
      Learn More
    </button>
  </div>
</section>`,
      },
      {
        id: 'hero-split',
        name: 'Split Hero',
        icon: <RectangleHorizontal className="h-4 w-4" />,
        description: 'Hero with image on side',
        code: `<section className="py-16 px-4">
  <div className="container mx-auto max-w-6xl flex flex-col md:flex-row items-center gap-12">
    <div className="flex-1">
      <h1 className="text-4xl font-bold tracking-tight mb-4">
        Transform your workflow
      </h1>
      <p className="text-lg text-gray-600 mb-6">
        Streamline your processes and boost productivity with our powerful platform.
      </p>
      <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
        Start Free Trial
      </button>
    </div>
    <div className="flex-1">
      <img
        src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=600&h=400&fit=crop"
        alt="Hero"
        className="w-full rounded-lg shadow-lg"
      />
    </div>
  </div>
</section>`,
      },
      {
        id: 'hero-gradient',
        name: 'Gradient Hero',
        icon: <Zap className="h-4 w-4" />,
        description: 'Hero with gradient background',
        code: `<section className="py-24 px-4 bg-gradient-to-br from-blue-600 to-purple-700 text-white">
  <div className="container mx-auto max-w-4xl text-center">
    <h1 className="text-5xl font-bold mb-6">
      The future of design
    </h1>
    <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
      Experience the next generation of creative tools, powered by AI.
    </p>
    <div className="flex items-center justify-center gap-4">
      <button className="px-6 py-3 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50">
        Get Started Free
      </button>
      <button className="px-6 py-3 border border-white/30 rounded-lg hover:bg-white/10">
        Watch Demo
      </button>
    </div>
  </div>
</section>`,
      },
    ],
  },
  {
    id: 'cta',
    name: 'Call to Action',
    icon: <ArrowRight className="h-4 w-4" />,
    components: [
      {
        id: 'cta-simple',
        name: 'Simple CTA',
        icon: <ArrowRight className="h-4 w-4" />,
        description: 'Centered call-to-action',
        code: `<section className="py-16 px-4 bg-gray-50">
  <div className="container mx-auto max-w-4xl text-center">
    <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
    <p className="text-gray-600 mb-8">Join thousands of satisfied customers today.</p>
    <button className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
      Start Your Free Trial
    </button>
  </div>
</section>`,
      },
      {
        id: 'cta-newsletter',
        name: 'Newsletter CTA',
        icon: <Mail className="h-4 w-4" />,
        description: 'Email signup form',
        code: `<section className="py-12 px-4 bg-blue-600 text-white">
  <div className="container mx-auto max-w-xl text-center">
    <h2 className="text-2xl font-bold mb-2">Stay in the loop</h2>
    <p className="text-blue-100 mb-6">Get updates on new features and tips.</p>
    <div className="flex gap-2">
      <input
        type="email"
        placeholder="Enter your email"
        className="flex-1 px-4 py-2 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
      />
      <button className="px-6 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50">
        Subscribe
      </button>
    </div>
  </div>
</section>`,
      },
      {
        id: 'cta-banner',
        name: 'Banner CTA',
        icon: <RectangleHorizontal className="h-4 w-4" />,
        description: 'Horizontal banner with action',
        code: `<div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-white">
  <div>
    <h3 className="font-semibold">Upgrade to Pro</h3>
    <p className="text-sm text-purple-100">Unlock all premium features</p>
  </div>
  <button className="px-4 py-2 bg-white text-purple-600 rounded-lg font-medium hover:bg-purple-50">
    Upgrade Now
  </button>
</div>`,
      },
    ],
  },
  {
    id: 'lists',
    name: 'Lists',
    icon: <List className="h-4 w-4" />,
    components: [
      {
        id: 'list-simple',
        name: 'Simple List',
        icon: <List className="h-4 w-4" />,
        description: 'Basic vertical list',
        code: `<ul className="space-y-2">
  <li className="flex items-center gap-2">
    <Check className="h-4 w-4 text-green-500" />
    <span>First item in the list</span>
  </li>
  <li className="flex items-center gap-2">
    <Check className="h-4 w-4 text-green-500" />
    <span>Second item in the list</span>
  </li>
  <li className="flex items-center gap-2">
    <Check className="h-4 w-4 text-green-500" />
    <span>Third item in the list</span>
  </li>
</ul>`,
      },
      {
        id: 'list-divided',
        name: 'Divided List',
        icon: <List className="h-4 w-4" />,
        description: 'List with dividers',
        code: `<ul className="divide-y border rounded-lg">
  <li className="flex items-center justify-between p-4 hover:bg-gray-50">
    <div>
      <p className="font-medium">List item one</p>
      <p className="text-sm text-gray-500">Description text</p>
    </div>
    <ArrowRight className="h-4 w-4 text-gray-400" />
  </li>
  <li className="flex items-center justify-between p-4 hover:bg-gray-50">
    <div>
      <p className="font-medium">List item two</p>
      <p className="text-sm text-gray-500">Description text</p>
    </div>
    <ArrowRight className="h-4 w-4 text-gray-400" />
  </li>
  <li className="flex items-center justify-between p-4 hover:bg-gray-50">
    <div>
      <p className="font-medium">List item three</p>
      <p className="text-sm text-gray-500">Description text</p>
    </div>
    <ArrowRight className="h-4 w-4 text-gray-400" />
  </li>
</ul>`,
      },
      {
        id: 'list-icon',
        name: 'Icon List',
        icon: <List className="h-4 w-4" />,
        description: 'List with icons',
        code: `<ul className="space-y-4">
  <li className="flex items-start gap-3">
    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
      <Zap className="h-4 w-4 text-blue-600" />
    </div>
    <div>
      <h4 className="font-medium">Lightning Fast</h4>
      <p className="text-sm text-gray-600">Optimized for speed and performance.</p>
    </div>
  </li>
  <li className="flex items-start gap-3">
    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
      <Check className="h-4 w-4 text-green-600" />
    </div>
    <div>
      <h4 className="font-medium">Easy to Use</h4>
      <p className="text-sm text-gray-600">Intuitive interface for everyone.</p>
    </div>
  </li>
  <li className="flex items-start gap-3">
    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
      <Star className="h-4 w-4 text-purple-600" />
    </div>
    <div>
      <h4 className="font-medium">Premium Quality</h4>
      <p className="text-sm text-gray-600">Built with attention to detail.</p>
    </div>
  </li>
</ul>`,
      },
    ],
  },
  {
    id: 'testimonials',
    name: 'Testimonials',
    icon: <Quote className="h-4 w-4" />,
    components: [
      {
        id: 'testimonial-simple',
        name: 'Simple Quote',
        icon: <Quote className="h-4 w-4" />,
        description: 'Single testimonial quote',
        code: `<blockquote className="p-6 bg-gray-50 border-l-4 border-blue-500 rounded-r-lg">
  <p className="text-lg text-gray-700 italic mb-4">
    "This product has completely transformed how we work. Highly recommended!"
  </p>
  <footer className="flex items-center gap-3">
    <img
      src="https://i.pravatar.cc/100?img=12"
      alt="Avatar"
      className="w-10 h-10 rounded-full"
    />
    <div>
      <p className="font-medium">Sarah Johnson</p>
      <p className="text-sm text-gray-500">CEO, TechCorp</p>
    </div>
  </footer>
</blockquote>`,
      },
      {
        id: 'testimonial-card',
        name: 'Testimonial Card',
        icon: <Quote className="h-4 w-4" />,
        description: 'Card-style testimonial',
        code: `<div className="p-6 bg-white border rounded-xl shadow-sm">
  <div className="flex gap-1 mb-4">
    <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
    <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
    <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
    <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
    <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
  </div>
  <p className="text-gray-600 mb-4">
    "Amazing experience! The team went above and beyond to help us succeed."
  </p>
  <div className="flex items-center gap-3">
    <img
      src="https://i.pravatar.cc/100?img=8"
      alt="Avatar"
      className="w-12 h-12 rounded-full"
    />
    <div>
      <p className="font-medium">Michael Chen</p>
      <p className="text-sm text-gray-500">Product Manager</p>
    </div>
  </div>
</div>`,
      },
      {
        id: 'testimonial-grid',
        name: 'Testimonial Grid',
        icon: <LayoutGrid className="h-4 w-4" />,
        description: 'Grid of testimonials',
        code: `<div className="grid md:grid-cols-3 gap-6">
  <div className="p-6 bg-white border rounded-lg">
    <p className="text-gray-600 mb-4">"Outstanding service and support."</p>
    <div className="flex items-center gap-2">
      <img src="https://i.pravatar.cc/100?img=1" alt="Alex Kim" className="w-8 h-8 rounded-full" />
      <span className="text-sm font-medium">Alex Kim</span>
    </div>
  </div>
  <div className="p-6 bg-white border rounded-lg">
    <p className="text-gray-600 mb-4">"Best decision we ever made."</p>
    <div className="flex items-center gap-2">
      <img src="https://i.pravatar.cc/100?img=5" alt="Emma Davis" className="w-8 h-8 rounded-full" />
      <span className="text-sm font-medium">Emma Davis</span>
    </div>
  </div>
  <div className="p-6 bg-white border rounded-lg">
    <p className="text-gray-600 mb-4">"Exceeded all our expectations."</p>
    <div className="flex items-center gap-2">
      <img src="https://i.pravatar.cc/100?img=3" alt="James Wilson" className="w-8 h-8 rounded-full" />
      <span className="text-sm font-medium">James Wilson</span>
    </div>
  </div>
</div>`,
      },
    ],
  },
  {
    id: 'data',
    name: 'Data Display',
    icon: <BarChart3 className="h-4 w-4" />,
    components: [
      {
        id: 'stats',
        name: 'Stats Grid',
        icon: <TrendingUp className="h-4 w-4" />,
        description: 'Key metrics display',
        code: `<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  <div className="p-4 bg-white border rounded-lg text-center">
    <p className="text-3xl font-bold text-blue-600">10K+</p>
    <p className="text-sm text-gray-500">Active Users</p>
  </div>
  <div className="p-4 bg-white border rounded-lg text-center">
    <p className="text-3xl font-bold text-green-600">99.9%</p>
    <p className="text-sm text-gray-500">Uptime</p>
  </div>
  <div className="p-4 bg-white border rounded-lg text-center">
    <p className="text-3xl font-bold text-purple-600">50M+</p>
    <p className="text-sm text-gray-500">Requests/Day</p>
  </div>
  <div className="p-4 bg-white border rounded-lg text-center">
    <p className="text-3xl font-bold text-orange-600">24/7</p>
    <p className="text-sm text-gray-500">Support</p>
  </div>
</div>`,
      },
      {
        id: 'table-simple',
        name: 'Simple Table',
        icon: <Table className="h-4 w-4" />,
        description: 'Basic data table',
        code: `<div className="border rounded-lg overflow-hidden">
  <table className="w-full">
    <thead className="bg-gray-50 border-b">
      <tr>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Name</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Role</th>
      </tr>
    </thead>
    <tbody className="divide-y">
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-3">John Doe</td>
        <td className="px-4 py-3"><span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Active</span></td>
        <td className="px-4 py-3 text-gray-500">Admin</td>
      </tr>
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-3">Jane Smith</td>
        <td className="px-4 py-3"><span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Active</span></td>
        <td className="px-4 py-3 text-gray-500">Editor</td>
      </tr>
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-3">Bob Johnson</td>
        <td className="px-4 py-3"><span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">Pending</span></td>
        <td className="px-4 py-3 text-gray-500">Viewer</td>
      </tr>
    </tbody>
  </table>
</div>`,
      },
      {
        id: 'progress-bar',
        name: 'Progress Bar',
        icon: <BarChart3 className="h-4 w-4" />,
        description: 'Progress indicator',
        code: `<div className="space-y-4">
  <div>
    <div className="flex justify-between text-sm mb-1">
      <span>Storage Used</span>
      <span className="text-gray-500">75%</span>
    </div>
    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
      <div className="h-full bg-blue-600 rounded-full" style={{ width: '75%' }}></div>
    </div>
  </div>
  <div>
    <div className="flex justify-between text-sm mb-1">
      <span>Bandwidth</span>
      <span className="text-gray-500">45%</span>
    </div>
    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
      <div className="h-full bg-green-500 rounded-full" style={{ width: '45%' }}></div>
    </div>
  </div>
  <div>
    <div className="flex justify-between text-sm mb-1">
      <span>API Calls</span>
      <span className="text-gray-500">90%</span>
    </div>
    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
      <div className="h-full bg-orange-500 rounded-full" style={{ width: '90%' }}></div>
    </div>
  </div>
</div>`,
      },
    ],
  },
  {
    id: 'footer',
    name: 'Footer',
    icon: <RectangleHorizontal className="h-4 w-4" />,
    components: [
      {
        id: 'footer-simple',
        name: 'Simple Footer',
        icon: <RectangleHorizontal className="h-4 w-4" />,
        description: 'Minimal footer',
        code: `<footer className="py-6 px-4 border-t">
  <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
    <p className="text-sm text-gray-500">© 2024 Company. All rights reserved.</p>
    <div className="flex items-center gap-6">
      <a href="#" className="text-sm text-gray-500 hover:text-gray-700">Privacy</a>
      <a href="#" className="text-sm text-gray-500 hover:text-gray-700">Terms</a>
      <a href="#" className="text-sm text-gray-500 hover:text-gray-700">Contact</a>
    </div>
  </div>
</footer>`,
      },
      {
        id: 'footer-columns',
        name: 'Multi-Column Footer',
        icon: <LayoutGrid className="h-4 w-4" />,
        description: 'Footer with link columns',
        code: `<footer className="py-12 px-4 bg-gray-900 text-white">
  <div className="container mx-auto max-w-6xl">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
      <div>
        <h4 className="font-semibold mb-4">Product</h4>
        <ul className="space-y-2 text-sm text-gray-400">
          <li><a href="#" className="hover:text-white">Features</a></li>
          <li><a href="#" className="hover:text-white">Pricing</a></li>
          <li><a href="#" className="hover:text-white">Changelog</a></li>
        </ul>
      </div>
      <div>
        <h4 className="font-semibold mb-4">Company</h4>
        <ul className="space-y-2 text-sm text-gray-400">
          <li><a href="#" className="hover:text-white">About</a></li>
          <li><a href="#" className="hover:text-white">Blog</a></li>
          <li><a href="#" className="hover:text-white">Careers</a></li>
        </ul>
      </div>
      <div>
        <h4 className="font-semibold mb-4">Resources</h4>
        <ul className="space-y-2 text-sm text-gray-400">
          <li><a href="#" className="hover:text-white">Docs</a></li>
          <li><a href="#" className="hover:text-white">Help Center</a></li>
          <li><a href="#" className="hover:text-white">Community</a></li>
        </ul>
      </div>
      <div>
        <h4 className="font-semibold mb-4">Contact</h4>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> hello@company.com</li>
          <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> (555) 123-4567</li>
          <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> San Francisco, CA</li>
        </ul>
      </div>
    </div>
    <div className="pt-8 border-t border-gray-800 text-sm text-gray-400 text-center">
      © 2024 Company. All rights reserved.
    </div>
  </div>
</footer>`,
      },
      {
        id: 'footer-cta',
        name: 'Footer with CTA',
        icon: <ArrowRight className="h-4 w-4" />,
        description: 'Footer with newsletter signup',
        code: `<footer className="py-12 px-4 bg-gray-50 border-t">
  <div className="container mx-auto max-w-4xl text-center">
    <h3 className="text-xl font-semibold mb-2">Stay up to date</h3>
    <p className="text-gray-600 mb-6">Get notified about updates and new features.</p>
    <div className="flex justify-center gap-2 mb-8">
      <input
        type="email"
        placeholder="Enter your email"
        className="px-4 py-2 border rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
        Subscribe
      </button>
    </div>
    <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
      <a href="#" className="hover:text-gray-700">Privacy</a>
      <a href="#" className="hover:text-gray-700">Terms</a>
      <a href="#" className="hover:text-gray-700">Contact</a>
    </div>
  </div>
</footer>`,
      },
    ],
  },
];

interface ComponentLibraryProps {
  className?: string;
}

export function ComponentLibrary({ className }: ComponentLibraryProps) {
  const { code, updateCode } = useActiveCode();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['layout', 'buttons']);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Drag-drop support
  const { isDragging, createDragHandlers } = useDesignerDragDrop();

  // Filter components by search
  const filteredLibrary = COMPONENT_LIBRARY.map(category => ({
    ...category,
    components: category.components.filter(comp =>
      comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.description.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(category => category.components.length > 0);

  // Insert component code at cursor position
  const handleInsertComponent = useCallback((component: ComponentItem) => {
    // For now, append to the end of the code
    // In a more advanced implementation, we'd insert at cursor position
    const newCode = code + '\n\n' + component.code;
    updateCode(newCode);
  }, [code, updateCode]);

  // Copy component code to clipboard
  const handleCopyCode = useCallback(async (component: ComponentItem) => {
    await navigator.clipboard.writeText(component.code);
    setCopiedId(component.id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // Toggle category expansion
  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  }, []);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="shrink-0 p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search components..."
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Component list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredLibrary.map((category) => (
            <Collapsible
              key={category.id}
              open={expandedCategories.includes(category.id)}
              onOpenChange={() => toggleCategory(category.id)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 h-8 px-2"
                >
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 transition-transform',
                      expandedCategories.includes(category.id) ? '' : '-rotate-90'
                    )}
                  />
                  {category.icon}
                  <span className="text-sm font-medium">{category.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {category.components.length}
                  </span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="ml-6 space-y-0.5 py-1">
                  <TooltipProvider>
                    {category.components.map((component) => {
                      // Create drag data for this component
                      const dragData: DragData = {
                        type: 'component',
                        componentCode: component.code,
                        componentName: component.name,
                      };
                      const dragHandlers = createDragHandlers(dragData);

                      return (
                        <div
                          key={component.id}
                          className={cn(
                            'flex items-center gap-1 group rounded-md transition-colors',
                            isDragging && 'opacity-50'
                          )}
                          {...dragHandlers}
                        >
                          {/* Drag handle */}
                          <div className="opacity-0 group-hover:opacity-50 cursor-grab active:cursor-grabbing px-0.5">
                            <GripVertical className="h-3 w-3 text-muted-foreground" />
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="flex-1 justify-start gap-2 h-7 px-2 text-xs"
                                onClick={() => handleInsertComponent(component)}
                              >
                                {component.icon}
                                <span className="truncate">{component.name}</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              <p className="font-medium">{component.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {component.description}
                              </p>
                              <p className="text-xs mt-1 text-primary">
                                Click to insert · Drag to place
                              </p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleCopyCode(component)}
                              >
                                {copiedId === component.id ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy code</TooltipContent>
                          </Tooltip>
                        </div>
                      );
                    })}
                  </TooltipProvider>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export default ComponentLibrary;
