/**
 * Arena prompt templates — curated prompts for quick arena battles
 * Organized by task category with difficulty levels
 */

import type { TaskCategory } from '@/types/provider/auto-router';
import type { ArenaBattle } from '@/types/arena';

/**
 * Arena prompt template
 */
export interface ArenaPrompt {
  id: string;
  category: TaskCategory;
  title: string;
  titleKey: string;
  prompt: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

/**
 * Curated arena prompts across all categories
 */
export const ARENA_PROMPTS: ArenaPrompt[] = [
  // Coding
  {
    id: 'coding-1',
    category: 'coding',
    title: 'FizzBuzz Variant',
    titleKey: 'prompts.coding.1',
    prompt: 'Write a function that prints numbers from 1 to 100. For multiples of 3, print "Fizz". For multiples of 5, print "Buzz". For multiples of both 3 and 5, print "FizzBuzz". For multiples of 7, print "Boom". For multiples of both 3 and 7, print "FizzBoom". Handle all overlapping cases.',
    difficulty: 'easy',
  },
  {
    id: 'coding-2',
    category: 'coding',
    title: 'Binary Search Bug Fix',
    titleKey: 'prompts.coding.2',
    prompt: 'The following binary search has a subtle bug. Find and fix it, then explain what was wrong:\n\n```python\ndef binary_search(arr, target):\n    left, right = 0, len(arr)\n    while left < right:\n        mid = (left + right) / 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1\n```',
    difficulty: 'medium',
  },
  {
    id: 'coding-3',
    category: 'coding',
    title: 'React Custom Hook',
    titleKey: 'prompts.coding.3',
    prompt: 'Write a React custom hook called `useDebounce` that debounces a value with a configurable delay. It should support TypeScript generics, cleanup on unmount, and an optional `immediate` flag that triggers on the leading edge instead of trailing edge. Include usage examples.',
    difficulty: 'medium',
  },
  {
    id: 'coding-4',
    category: 'coding',
    title: 'SQL Query Optimization',
    titleKey: 'prompts.coding.4',
    prompt: 'Optimize this slow SQL query and explain your changes:\n\n```sql\nSELECT u.name, COUNT(o.id) as order_count, SUM(o.total) as total_spent\nFROM users u\nLEFT JOIN orders o ON u.id = o.user_id\nWHERE o.created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)\nAND u.id IN (SELECT user_id FROM user_segments WHERE segment = \'premium\')\nGROUP BY u.name\nHAVING total_spent > 1000\nORDER BY total_spent DESC;\n```',
    difficulty: 'hard',
  },

  // Math
  {
    id: 'math-1',
    category: 'math',
    title: 'Probability Puzzle',
    titleKey: 'prompts.math.1',
    prompt: 'You have two children. One of them is a boy born on a Tuesday. What is the probability that both children are boys? Explain your reasoning step by step.',
    difficulty: 'medium',
  },
  {
    id: 'math-2',
    category: 'math',
    title: 'Calculus Word Problem',
    titleKey: 'prompts.math.2',
    prompt: 'A rectangular box with an open top is to be made from a 12×12 inch piece of cardboard by cutting equal squares from each corner and folding up the sides. Find the dimensions that maximize the volume. Show all work.',
    difficulty: 'medium',
  },
  {
    id: 'math-3',
    category: 'math',
    title: 'Combinatorics Challenge',
    titleKey: 'prompts.math.3',
    prompt: 'How many ways can you tile a 2×n rectangle with 1×2 dominoes? Derive a recurrence relation, solve it to get a closed-form expression, and verify for n=1,2,3,4.',
    difficulty: 'hard',
  },
  {
    id: 'math-4',
    category: 'math',
    title: 'Statistics Interpretation',
    titleKey: 'prompts.math.4',
    prompt: 'A medical test for a disease has 99% sensitivity and 95% specificity. The disease prevalence is 1%. If a person tests positive, what is the probability they actually have the disease? Explain why this result surprises most people.',
    difficulty: 'easy',
  },

  // Analysis
  {
    id: 'analysis-1',
    category: 'analysis',
    title: 'Pros and Cons Comparison',
    titleKey: 'prompts.analysis.1',
    prompt: 'Compare microservices vs monolithic architecture for a startup building a SaaS product. Analyze from technical, organizational, and business perspectives. Consider team size of 5-10 engineers, timeline of 6 months to MVP.',
    difficulty: 'medium',
  },
  {
    id: 'analysis-2',
    category: 'analysis',
    title: 'Data Summarization',
    titleKey: 'prompts.analysis.2',
    prompt: 'Summarize the key differences between REST, GraphQL, and gRPC APIs. Create a comparison table covering: use cases, performance characteristics, learning curve, tooling ecosystem, and when to choose each one.',
    difficulty: 'easy',
  },
  {
    id: 'analysis-3',
    category: 'analysis',
    title: 'Argument Evaluation',
    titleKey: 'prompts.analysis.3',
    prompt: 'Evaluate this argument: "AI will replace all programmers within 10 years because AI can already write code faster than humans." Identify logical fallacies, missing evidence, and provide a nuanced counter-analysis.',
    difficulty: 'medium',
  },
  {
    id: 'analysis-4',
    category: 'analysis',
    title: 'Trend Analysis',
    titleKey: 'prompts.analysis.4',
    prompt: 'Analyze the trend of open-source AI models catching up to proprietary ones. Consider: performance benchmarks, cost efficiency, adoption rates, and implications for the AI industry. Support your analysis with specific examples.',
    difficulty: 'hard',
  },

  // Creative
  {
    id: 'creative-1',
    category: 'creative',
    title: 'Short Story',
    titleKey: 'prompts.creative.1',
    prompt: 'Write a 300-word short story about a programmer who discovers their code has become sentient. The tone should be humorous but with a philosophical undertone.',
    difficulty: 'medium',
  },
  {
    id: 'creative-2',
    category: 'creative',
    title: 'Haiku Collection',
    titleKey: 'prompts.creative.2',
    prompt: 'Write 5 haiku poems about different aspects of technology: one about debugging, one about machine learning, one about the internet, one about smartphones, and one about artificial intelligence. Each should follow the 5-7-5 syllable structure precisely.',
    difficulty: 'easy',
  },
  {
    id: 'creative-3',
    category: 'creative',
    title: 'Marketing Tagline',
    titleKey: 'prompts.creative.3',
    prompt: 'Create 10 creative marketing taglines for a new AI-powered note-taking app that learns your writing style. Each tagline should be under 10 words, memorable, and highlight a different benefit. Rank them from most to least impactful.',
    difficulty: 'easy',
  },
  {
    id: 'creative-4',
    category: 'creative',
    title: 'Dialogue Writing',
    titleKey: 'prompts.creative.4',
    prompt: 'Write a dialogue between Albert Einstein and a modern AI researcher meeting at a café. They discuss the nature of intelligence, creativity, and whether machines can truly think. Make it intellectually stimulating yet accessible.',
    difficulty: 'hard',
  },

  // Research
  {
    id: 'research-1',
    category: 'research',
    title: 'Explain Quantum Computing',
    titleKey: 'prompts.research.1',
    prompt: 'Explain quantum computing to someone with a computer science background but no physics knowledge. Cover: qubits vs bits, superposition, entanglement, quantum gates, and why quantum computers are better for certain problems. Include specific examples.',
    difficulty: 'medium',
  },
  {
    id: 'research-2',
    category: 'research',
    title: 'Framework Comparison',
    titleKey: 'prompts.research.2',
    prompt: 'Compare Next.js, Nuxt.js, and SvelteKit as full-stack web frameworks. Evaluate: performance, developer experience, ecosystem maturity, learning curve, deployment options, and community support. Which would you recommend for different project types?',
    difficulty: 'medium',
  },
  {
    id: 'research-3',
    category: 'research',
    title: 'Topic Deep Dive',
    titleKey: 'prompts.research.3',
    prompt: 'Explain the Transformer architecture in detail. Cover: attention mechanism, multi-head attention, positional encoding, encoder-decoder structure, and why it revolutionized NLP. Include the key equations and intuitions behind them.',
    difficulty: 'hard',
  },
  {
    id: 'research-4',
    category: 'research',
    title: 'Fact Check Analysis',
    titleKey: 'prompts.research.4',
    prompt: 'Fact-check and explain: "Rust is memory-safe, so programs written in Rust can never have memory bugs." Provide a nuanced analysis of what Rust\'s memory safety guarantees actually cover and what they don\'t.',
    difficulty: 'easy',
  },

  // Translation
  {
    id: 'translation-1',
    category: 'translation',
    title: 'Technical EN→ZH',
    titleKey: 'prompts.translation.1',
    prompt: 'Translate the following technical documentation to Chinese, maintaining technical accuracy and natural flow:\n\n"The garbage collector uses a generational approach with three generations. Young objects are allocated in generation 0. When a collection is triggered, surviving objects are promoted to generation 1. Objects that survive multiple collections in generation 1 are promoted to generation 2, which is collected less frequently."',
    difficulty: 'medium',
  },
  {
    id: 'translation-2',
    category: 'translation',
    title: 'Literary ZH→EN',
    titleKey: 'prompts.translation.2',
    prompt: '将以下中文诗句翻译成英文，保持诗意和韵律感：\n\n"落霞与孤鹜齐飞，秋水共长天一色。渔舟唱晚，响穷彭蠡之滨；雁阵惊寒，声断衡阳之浦。"\n\n请提供两个版本：一个注重直译准确性，一个注重文学美感。',
    difficulty: 'hard',
  },
  {
    id: 'translation-3',
    category: 'translation',
    title: 'Multilingual Idioms',
    titleKey: 'prompts.translation.3',
    prompt: 'Translate these English idioms into Chinese, Japanese, and Spanish. For each, provide: literal translation, equivalent native idiom (if one exists), and cultural context explanation.\n\n1. "Break a leg"\n2. "It\'s raining cats and dogs"\n3. "The elephant in the room"\n4. "Burning the midnight oil"',
    difficulty: 'medium',
  },
  {
    id: 'translation-4',
    category: 'translation',
    title: 'UI Localization',
    titleKey: 'prompts.translation.4',
    prompt: 'Localize these UI strings for a Chinese audience. Consider cultural context, character length constraints, and UX conventions:\n\n1. "Sign up for free — no credit card required"\n2. "Your session has expired. Please log in again."\n3. "Undo (Ctrl+Z)"\n4. "3 items in your cart • Checkout"\n5. "Last edited 2 hours ago by John"',
    difficulty: 'easy',
  },
];

/**
 * Get a random prompt, optionally filtered by category
 */
export function getRandomPrompt(category?: TaskCategory): ArenaPrompt {
  const pool = category
    ? ARENA_PROMPTS.filter((p) => p.category === category)
    : ARENA_PROMPTS;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Get all prompts for a specific category
 */
export function getPromptsByCategory(category: TaskCategory): ArenaPrompt[] {
  return ARENA_PROMPTS.filter((p) => p.category === category);
}

/**
 * Get recent unique prompts from battle history
 */
export function getRecentBattlePrompts(battles: ArenaBattle[], limit: number = 5): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  for (const battle of battles) {
    if (results.length >= limit) break;
    const trimmed = battle.prompt.trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      results.push(trimmed);
    }
  }

  return results;
}

/**
 * Get N random prompts, optionally from a specific category
 */
export function getRandomPrompts(count: number, category?: TaskCategory): ArenaPrompt[] {
  const pool = category
    ? ARENA_PROMPTS.filter((p) => p.category === category)
    : [...ARENA_PROMPTS];

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
