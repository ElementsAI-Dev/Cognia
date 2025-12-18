/**
 * Shared designer templates and AI suggestions
 */

export interface DesignerTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  code: string;
  thumbnail?: string;
}

export const DESIGNER_TEMPLATES: DesignerTemplate[] = [
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

export const AI_SUGGESTIONS = [
  'Add a dark mode toggle',
  'Make it responsive for mobile',
  'Add animations on scroll',
  'Change the color scheme to blue',
  'Add a loading skeleton',
  'Make the buttons more rounded',
  'Add hover effects to cards',
  'Include a footer section',
];

export const TEMPLATE_CATEGORIES = ['Basic', 'Marketing', 'Application', 'Components'] as const;
export type TemplateCategory = typeof TEMPLATE_CATEGORIES[number];
