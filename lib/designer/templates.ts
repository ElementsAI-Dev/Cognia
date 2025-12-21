/**
 * Shared designer templates and AI suggestions
 * This is the single source of truth for all designer templates
 */

export type FrameworkType = 'react' | 'vue' | 'html';

export interface DesignerTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  code: string;
  framework: FrameworkType;
  thumbnail?: string;
  icon?: string;
}

export const TEMPLATE_CATEGORIES = ['Basic', 'Marketing', 'Application', 'Components', 'E-commerce'] as const;
export type TemplateCategory = typeof TEMPLATE_CATEGORIES[number];

export const FRAMEWORK_OPTIONS: { value: FrameworkType; label: string; icon: string }[] = [
  { value: 'react', label: 'React', icon: 'Atom' },
  { value: 'vue', label: 'Vue', icon: 'Layers' },
  { value: 'html', label: 'HTML', icon: 'Code' },
];

export const DESIGNER_TEMPLATES: DesignerTemplate[] = [
  {
    id: 'blank',
    name: 'Blank',
    description: 'Start from scratch',
    category: 'Basic',
    framework: 'react',
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
    framework: 'react',
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
    framework: 'react',
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
    framework: 'react',
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
    framework: 'react',
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
  {
    id: 'blog-post',
    name: 'Blog Post',
    description: 'Clean blog post layout with author info',
    category: 'Components',
    framework: 'react',
    code: `export default function App() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">Technology</span>
          <span>•</span>
          <span>5 min read</span>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          The Future of Web Development in 2024
        </h1>
        <p className="text-xl text-gray-600">
          Exploring the latest trends and technologies shaping the web development landscape.
        </p>
      </header>

      {/* Author */}
      <div className="flex items-center gap-4 mb-8 pb-8 border-b">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
        <div>
          <p className="font-medium text-gray-900">Sarah Johnson</p>
          <p className="text-sm text-gray-500">Published on Jan 15, 2024</p>
        </div>
      </div>

      {/* Content */}
      <div className="prose prose-lg max-w-none">
        <p className="text-gray-700 leading-relaxed mb-6">
          The web development landscape is constantly evolving, with new frameworks, 
          tools, and best practices emerging every year. In this article, we'll explore 
          the key trends that are shaping how we build for the web.
        </p>
        
        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
          1. AI-Powered Development
        </h2>
        <p className="text-gray-700 leading-relaxed mb-6">
          Artificial intelligence is revolutionizing how we write and debug code. 
          From intelligent code completion to automated testing, AI tools are becoming 
          essential parts of the developer toolkit.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
          2. Edge Computing
        </h2>
        <p className="text-gray-700 leading-relaxed mb-6">
          Moving computation closer to users through edge functions and CDNs 
          is becoming the norm, resulting in faster and more responsive applications.
        </p>

        <div className="bg-gray-50 border-l-4 border-blue-500 p-6 my-8">
          <p className="text-gray-700 italic">
            "The best developers are those who embrace change and continuously 
            adapt to new technologies while maintaining solid fundamentals."
          </p>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mt-8 pt-8 border-t">
        {['React', 'Next.js', 'AI', 'Web Development'].map((tag) => (
          <span key={tag} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
            #{tag}
          </span>
        ))}
      </div>
    </article>
  );
}`,
  },
  {
    id: 'product-card',
    name: 'Product Card',
    description: 'E-commerce product card with details',
    category: 'E-commerce',
    framework: 'react',
    code: `export default function App() {
  const product = {
    name: 'Premium Wireless Headphones',
    price: 299.99,
    originalPrice: 399.99,
    rating: 4.8,
    reviews: 2547,
    colors: ['#1a1a1a', '#f5f5f5', '#3b82f6'],
    features: ['Active Noise Cancellation', '40hr Battery Life', 'Hi-Res Audio'],
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-sm w-full">
        {/* Image */}
        <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 p-8">
          <span className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
            -25% OFF
          </span>
          <div className="w-48 h-48 mx-auto bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-6xl">🎧</span>
          </div>
        </div>

        {/* Details */}
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h2>
          
          {/* Rating */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex text-yellow-400">
              {'★'.repeat(5)}
            </div>
            <span className="text-sm text-gray-600">
              {product.rating} ({product.reviews.toLocaleString()} reviews)
            </span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-3xl font-bold text-gray-900">\${product.price}</span>
            <span className="text-lg text-gray-400 line-through">\${product.originalPrice}</span>
          </div>

          {/* Colors */}
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Color</p>
            <div className="flex gap-2">
              {product.colors.map((color, i) => (
                <button
                  key={i}
                  className={\`w-8 h-8 rounded-full border-2 \${i === 0 ? 'border-blue-500' : 'border-transparent'}\`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="flex flex-wrap gap-2 mb-6">
            {product.features.map((feature) => (
              <span key={feature} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                {feature}
              </span>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button className="flex-1 bg-black text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors">
              Add to Cart
            </button>
            <button className="w-12 h-12 border border-gray-200 rounded-xl flex items-center justify-center hover:bg-gray-50 transition-colors">
              ♡
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}`,
  },
  {
    id: 'profile-card',
    name: 'Profile Card',
    description: 'User profile card with stats',
    category: 'Components',
    framework: 'react',
    code: `export default function App() {
  const user = {
    name: 'Alex Chen',
    role: 'Senior Product Designer',
    location: 'San Francisco, CA',
    stats: [
      { label: 'Projects', value: '142' },
      { label: 'Followers', value: '12.5K' },
      { label: 'Following', value: '284' },
    ],
    skills: ['UI Design', 'Figma', 'Prototyping', 'User Research'],
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-sm w-full">
        {/* Cover */}
        <div className="h-24 bg-gradient-to-r from-blue-500 to-purple-600" />
        
        {/* Avatar */}
        <div className="relative px-6">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 border-4 border-white shadow-lg flex items-center justify-center">
              <span className="text-4xl">👤</span>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="pt-16 pb-6 px-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
          <p className="text-gray-500 mb-1">{user.role}</p>
          <p className="text-sm text-gray-400 flex items-center justify-center gap-1">
            📍 {user.location}
          </p>

          {/* Stats */}
          <div className="flex justify-around py-6 mt-6 border-y border-gray-100">
            {user.stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Skills */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {user.skills.map((skill) => (
              <span
                key={skill}
                className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
              >
                {skill}
              </span>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors">
              Follow
            </button>
            <button className="flex-1 border border-gray-200 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors">
              Message
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}`,
  },
  {
    id: 'login-form',
    name: 'Login Form',
    description: 'Modern login form with social options',
    category: 'Application',
    framework: 'react',
    code: `import { useState } from 'react';

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-white text-2xl">✦</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 mt-1">Sign in to your account</p>
        </div>

        {/* Social Login */}
        <div className="flex gap-3 mb-6">
          <button className="flex-1 flex items-center justify-center gap-2 border border-gray-200 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
            <span>G</span>
            <span className="text-sm font-medium">Google</span>
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 border border-gray-200 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
            <span>🍎</span>
            <span className="text-sm font-medium">Apple</span>
          </button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-sm text-gray-400">or continue with</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Form */}
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all pr-12"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
              <span className="text-sm text-gray-600">Remember me</span>
            </label>
            <a href="#" className="text-sm text-blue-600 hover:underline">
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Sign in
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{' '}
          <a href="#" className="text-blue-600 font-medium hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}`,
  },
  {
    id: 'newsletter',
    name: 'Newsletter Signup',
    description: 'Email subscription section',
    category: 'Marketing',
    framework: 'react',
    code: `import { useState } from 'react';

export default function App() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <div className="max-w-xl w-full text-center">
        {!subscribed ? (
          <>
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl mx-auto mb-6 flex items-center justify-center">
              <span className="text-4xl">✉️</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Stay in the loop
            </h1>
            <p className="text-lg text-white/80 mb-8">
              Subscribe to our newsletter for the latest updates, tips, and exclusive content delivered straight to your inbox.
            </p>

            <form onSubmit={handleSubmit} className="flex gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 px-5 py-4 rounded-xl bg-white/10 backdrop-blur border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
              <button
                type="submit"
                className="px-8 py-4 bg-white text-purple-600 rounded-xl font-semibold hover:bg-white/90 transition-colors"
              >
                Subscribe
              </button>
            </form>

            <p className="text-sm text-white/60 mt-4">
              Join 10,000+ subscribers. No spam, unsubscribe anytime.
            </p>
          </>
        ) : (
          <div className="bg-white/10 backdrop-blur rounded-3xl p-12">
            <div className="w-20 h-20 bg-green-500 rounded-full mx-auto mb-6 flex items-center justify-center">
              <span className="text-4xl">✓</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              You're all set!
            </h2>
            <p className="text-lg text-white/80">
              Thanks for subscribing. Check your inbox for a confirmation email.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}`,
  },
  {
    id: 'testimonials',
    name: 'Testimonials',
    description: 'Customer testimonials section',
    category: 'Marketing',
    framework: 'react',
    code: `export default function App() {
  const testimonials = [
    {
      content: "This product has completely transformed how our team works. The efficiency gains have been incredible.",
      author: "Sarah Chen",
      role: "CTO, TechCorp",
      avatar: "👩‍💼",
    },
    {
      content: "I've tried many solutions, but this is by far the best. The support team is also amazing!",
      author: "Michael Rodriguez",
      role: "Founder, StartupXYZ",
      avatar: "👨‍💻",
    },
    {
      content: "Game-changer for our business. We've seen a 40% increase in productivity since switching.",
      author: "Emily Johnson",
      role: "Product Manager, BigCo",
      avatar: "👩‍🔬",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-blue-600 font-medium mb-2 block">Testimonials</span>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Loved by thousands
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            See what our customers have to say about their experience
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-xl">★</span>
                ))}
              </div>
              <p className="text-gray-700 mb-6 leading-relaxed">
                "{testimonial.content}"
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center text-2xl">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.author}</p>
                  <p className="text-sm text-gray-500">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-2 mt-12">
          {[0, 1, 2].map((i) => (
            <button
              key={i}
              className={\`w-3 h-3 rounded-full transition-colors \${
                i === 0 ? 'bg-blue-600' : 'bg-gray-300 hover:bg-gray-400'
              }\`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}`,
  },
  {
    id: 'faq',
    name: 'FAQ Section',
    description: 'Frequently asked questions accordion',
    category: 'Components',
    framework: 'react',
    code: `import { useState } from 'react';

export default function App() {
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      question: "How do I get started?",
      answer: "Getting started is easy! Simply create an account, choose your plan, and you'll be up and running in minutes. Our onboarding wizard will guide you through the initial setup.",
    },
    {
      question: "Can I cancel my subscription anytime?",
      answer: "Yes, you can cancel your subscription at any time. There are no long-term contracts or cancellation fees. Your access will continue until the end of your billing period.",
    },
    {
      question: "Do you offer a free trial?",
      answer: "Absolutely! We offer a 14-day free trial with full access to all features. No credit card required to start your trial.",
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers for annual plans. All payments are processed securely.",
    },
    {
      question: "Is my data secure?",
      answer: "Security is our top priority. We use industry-standard encryption, regular security audits, and comply with GDPR and SOC 2 requirements to keep your data safe.",
    },
  ];

  return (
    <div className="min-h-screen bg-white py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-gray-600">
            Everything you need to know about our product
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? -1 : index)}
                className="w-full flex items-center justify-between p-6 text-left bg-white hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-900">{faq.question}</span>
                <span className={\`text-2xl text-gray-400 transition-transform \${
                  openIndex === index ? 'rotate-45' : ''
                }\`}>
                  +
                </span>
              </button>
              {openIndex === index && (
                <div className="px-6 pb-6 text-gray-600 leading-relaxed">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 text-center p-8 bg-gray-50 rounded-2xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Still have questions?
          </h3>
          <p className="text-gray-600 mb-4">
            Can't find the answer you're looking for? Our team is here to help.
          </p>
          <button className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors">
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}`,
  },
  {
    id: 'footer',
    name: 'Footer',
    description: 'Website footer with links and social',
    category: 'Components',
    framework: 'react',
    code: `export default function App() {
  const footerLinks = {
    Product: ['Features', 'Pricing', 'Integrations', 'Changelog', 'Docs'],
    Company: ['About', 'Blog', 'Careers', 'Press', 'Partners'],
    Resources: ['Community', 'Help Center', 'Templates', 'Tutorials'],
    Legal: ['Privacy', 'Terms', 'Cookie Policy', 'Licenses'],
  };

  const socialLinks = ['Twitter', 'GitHub', 'LinkedIn', 'YouTube'];

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Main footer content */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-gray-900 font-bold">✦</span>
              </div>
              <span className="text-xl font-bold text-white">Brand</span>
            </div>
            <p className="text-sm text-gray-400 mb-6 max-w-xs">
              Building the future of web development with powerful tools and seamless experiences.
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social}
                  href="#"
                  className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors"
                >
                  <span className="text-sm">{social[0]}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold text-white mb-4">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm hover:text-white transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-400">
            © 2024 Brand, Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <select className="bg-transparent text-sm text-gray-400 cursor-pointer">
              <option>English (US)</option>
              <option>中文</option>
              <option>日本語</option>
            </select>
          </div>
        </div>
      </div>
    </footer>
  );
}`,
  },
  {
    id: 'navbar',
    name: 'Navigation Bar',
    description: 'Responsive navigation header',
    category: 'Components',
    framework: 'react',
    code: `import { useState } from 'react';

export default function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = ['Products', 'Solutions', 'Resources', 'Pricing'];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <a href="#" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">✦</span>
                </div>
                <span className="font-bold text-xl text-gray-900">Brand</span>
              </a>

              {/* Desktop nav */}
              <div className="hidden md:flex items-center gap-6">
                {navItems.map((item) => (
                  <a
                    key={item}
                    href="#"
                    className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                  >
                    {item}
                  </a>
                ))}
              </div>
            </div>

            {/* Right side */}
            <div className="hidden md:flex items-center gap-4">
              <a href="#" className="text-gray-600 hover:text-gray-900 font-medium">
                Sign in
              </a>
              <a
                href="#"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Get Started
              </a>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100">
            <div className="px-4 py-4 space-y-3">
              {navItems.map((item) => (
                <a
                  key={item}
                  href="#"
                  className="block py-2 text-gray-600 hover:text-gray-900 font-medium"
                >
                  {item}
                </a>
              ))}
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <a href="#" className="block py-2 text-gray-600 font-medium">
                  Sign in
                </a>
                <a
                  href="#"
                  className="block w-full text-center bg-blue-600 text-white px-4 py-2 rounded-lg font-medium"
                >
                  Get Started
                </a>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Page content placeholder */}
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Page Content</h1>
        <p className="text-gray-600">Your main content goes here</p>
      </div>
    </div>
  );
}`,
  },
  {
    id: 'stats-section',
    name: 'Stats Section',
    description: 'Key metrics and statistics display',
    category: 'Marketing',
    framework: 'react',
    code: `export default function App() {
  const stats = [
    { value: '99.9%', label: 'Uptime SLA', description: 'Enterprise-grade reliability' },
    { value: '150+', label: 'Countries', description: 'Global infrastructure' },
    { value: '50M+', label: 'API Requests', description: 'Processed daily' },
    { value: '<50ms', label: 'Latency', description: 'Average response time' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Trusted by developers worldwide
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Built for scale, designed for performance
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="relative p-8 rounded-2xl bg-gradient-to-b from-gray-800 to-gray-800/50 border border-gray-700"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl" />
              <div className="relative">
                <p className="text-5xl font-bold text-white mb-2">{stat.value}</p>
                <p className="text-lg font-semibold text-blue-400 mb-1">{stat.label}</p>
                <p className="text-sm text-gray-400">{stat.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-8 mt-16 pt-16 border-t border-gray-800">
          {['Vercel', 'Stripe', 'Notion', 'Linear', 'Figma'].map((company) => (
            <div
              key={company}
              className="text-gray-500 font-semibold text-lg hover:text-gray-300 transition-colors cursor-pointer"
            >
              {company}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}`,
  },
  // Vue Templates
  {
    id: 'vue-blank',
    name: 'Vue Blank',
    description: 'Start from scratch with Vue',
    category: 'Basic',
    framework: 'vue',
    code: `<script setup>
import { ref } from 'vue'
const message = ref('Hello Vue!')
</script>

<template>
  <div class="min-h-screen bg-white p-8">
    <h1 class="text-2xl font-bold">{{ message }}</h1>
    <p class="text-gray-600 mt-2">Start editing to see your changes.</p>
  </div>
</template>`,
  },
  {
    id: 'vue-counter',
    name: 'Vue Counter',
    description: 'Interactive counter component',
    category: 'Components',
    framework: 'vue',
    code: `<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="bg-white rounded-xl shadow-lg p-8 text-center">
      <h1 class="text-3xl font-bold text-gray-900 mb-6">Vue Counter</h1>
      <div class="text-6xl font-bold text-blue-600 mb-8">{{ count }}</div>
      <div class="flex gap-4 justify-center">
        <button @click="count--" class="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600">
          -
        </button>
        <button @click="count = 0" class="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
          Reset
        </button>
        <button @click="count++" class="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600">
          +
        </button>
      </div>
    </div>
  </div>
</template>`,
  },
  {
    id: 'vue-todo',
    name: 'Vue Todo List',
    description: 'Simple todo list with Vue',
    category: 'Application',
    framework: 'vue',
    code: `<script setup>
import { ref } from 'vue'

const newTodo = ref('')
const todos = ref([
  { text: 'Learn Vue 3', done: false },
  { text: 'Build something awesome', done: false },
])

const addTodo = () => {
  if (newTodo.value.trim()) {
    todos.value.push({ text: newTodo.value, done: false })
    newTodo.value = ''
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-100 py-12 px-4">
    <div class="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      <div class="bg-purple-500 px-6 py-4">
        <h1 class="text-2xl font-bold text-white">Vue Todo List</h1>
      </div>
      <div class="p-6">
        <form @submit.prevent="addTodo" class="flex gap-2 mb-6">
          <input v-model="newTodo" type="text" placeholder="Add a task..."
            class="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
          <button type="submit" class="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600">
            Add
          </button>
        </form>
        <ul class="space-y-2">
          <li v-for="(todo, i) in todos" :key="i" class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <input type="checkbox" v-model="todo.done" class="w-5 h-5" />
            <span :class="{ 'line-through text-gray-400': todo.done }" class="flex-1">{{ todo.text }}</span>
            <button @click="todos.splice(i, 1)" class="text-red-500">✕</button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>`,
  },
  // HTML Templates
  {
    id: 'html-blank',
    name: 'HTML Blank',
    description: 'Start from scratch with HTML',
    category: 'Basic',
    framework: 'html',
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Page</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-white p-8">
  <h1 class="text-2xl font-bold">Hello HTML!</h1>
  <p class="text-gray-600 mt-2">Start editing to see your changes.</p>
</body>
</html>`,
  },
  {
    id: 'html-landing',
    name: 'HTML Landing',
    description: 'Simple landing page in HTML',
    category: 'Marketing',
    framework: 'html',
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Landing Page</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-gray-50">
  <nav class="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
    <div class="text-xl font-bold">Brand</div>
    <div class="flex items-center gap-6">
      <a href="#" class="text-gray-600 hover:text-gray-900">Features</a>
      <a href="#" class="text-gray-600 hover:text-gray-900">Pricing</a>
      <button class="bg-black text-white px-4 py-2 rounded-lg">Get Started</button>
    </div>
  </nav>
  <section class="max-w-7xl mx-auto px-6 py-24 text-center">
    <h1 class="text-5xl font-bold text-gray-900 mb-6">Build Something Amazing</h1>
    <p class="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">Create beautiful websites.</p>
    <button class="bg-black text-white px-6 py-3 rounded-lg font-medium">Start Free Trial</button>
  </section>
</body>
</html>`,
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
  'Add a navigation menu',
  'Create a hero section',
  'Add social media icons',
  'Make it more colorful',
];

/**
 * Get template by ID
 */
export function getTemplateById(id: string): DesignerTemplate | undefined {
  return DESIGNER_TEMPLATES.find((t) => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: TemplateCategory): DesignerTemplate[] {
  return DESIGNER_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Get templates by framework
 */
export function getTemplatesByFramework(framework: FrameworkType): DesignerTemplate[] {
  return DESIGNER_TEMPLATES.filter((t) => t.framework === framework);
}

/**
 * Get templates by category and framework
 */
export function getTemplatesByCategoryAndFramework(
  category: TemplateCategory,
  framework: FrameworkType
): DesignerTemplate[] {
  return DESIGNER_TEMPLATES.filter((t) => t.category === category && t.framework === framework);
}

/**
 * Get default/blank template
 */
export function getDefaultTemplate(): DesignerTemplate {
  return DESIGNER_TEMPLATES[0];
}

/**
 * Template icon mapping for UI
 */
export const TEMPLATE_ICONS: Record<string, string> = {
  blank: 'Box',
  landing: 'Layout',
  dashboard: 'LayoutDashboard',
  form: 'FormInput',
  pricing: 'CreditCard',
  'blog-post': 'FileText',
  'product-card': 'ShoppingBag',
  'profile-card': 'User',
  'login-form': 'LogIn',
  newsletter: 'Mail',
  testimonials: 'MessageSquare',
  faq: 'HelpCircle',
  footer: 'PanelBottom',
  navbar: 'Menu',
  'stats-section': 'BarChart3',
  'vue-blank': 'Box',
  'vue-counter': 'Hash',
  'vue-todo': 'CheckSquare',
  'html-blank': 'Code',
  'html-landing': 'Layout',
};

/**
 * Get random AI suggestions
 */
export function getRandomSuggestions(count: number = 4): string[] {
  const shuffled = [...AI_SUGGESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
