/**
 * Sample marketplace data for initial population
 * Separated from type definitions to keep types lean and allow lazy loading
 */

import type {
  MarketplacePrompt,
  PromptCollection,
} from '@/types/content/prompt-marketplace';

/**
 * Sample marketplace prompts for initial data
 */
export const SAMPLE_MARKETPLACE_PROMPTS: Omit<
  MarketplacePrompt,
  'id' | 'createdAt' | 'updatedAt'
>[] = [
  {
    name: 'Code Review Expert',
    description:
      'Comprehensive code review with security, performance, and best practices analysis',
    content: `You are an expert code reviewer. Analyze the provided code for:

1. **Security Issues**: SQL injection, XSS, authentication flaws
2. **Performance**: Bottlenecks, memory leaks, inefficient algorithms
3. **Best Practices**: Clean code, SOLID principles, design patterns
4. **Maintainability**: Readability, documentation, test coverage

Code to review:
{{code}}

Language: {{language}}
Context: {{context}}

Provide a structured review with severity levels (Critical/High/Medium/Low) and specific recommendations.`,
    category: 'coding',
    tags: ['code-review', 'security', 'performance', 'best-practices'],
    variables: [
      { name: 'code', description: 'The code to review', required: true, type: 'multiline' },
      {
        name: 'language',
        description: 'Programming language',
        required: true,
        type: 'text',
        defaultValue: 'TypeScript',
      },
      {
        name: 'context',
        description: 'Additional context about the codebase',
        required: false,
        type: 'multiline',
      },
    ],
    targets: ['chat', 'agent'],
    author: {
      id: 'cognia-official',
      name: 'Cognia Team',
      verified: true,
    },
    source: 'marketplace',
    qualityTier: 'official',
    version: '1.0.0',
    versions: [],
    stats: {
      downloads: 1250,
      weeklyDownloads: 180,
      favorites: 420,
      shares: 85,
      views: 5600,
      successRate: 0.94,
    },
    rating: {
      average: 4.7,
      count: 156,
      distribution: { 1: 2, 2: 4, 3: 12, 4: 38, 5: 100 },
    },
    reviewCount: 42,
    icon: '🔍',
    color: '#22c55e',
    isOfficial: true,
    isFeatured: true,
  },
  {
    name: 'Creative Story Writer',
    description: 'Generate engaging stories with vivid characters and compelling narratives',
    content: `You are a creative storyteller. Write a {{genre}} story with the following elements:

**Setting**: {{setting}}
**Main Character**: {{character}}
**Theme**: {{theme}}
**Tone**: {{tone}}
**Length**: {{length}}

Create an engaging narrative with:
- Rich, sensory descriptions
- Authentic dialogue
- Character development
- A satisfying story arc

Begin the story:`,
    category: 'creative',
    tags: ['storytelling', 'creative-writing', 'fiction', 'narrative'],
    variables: [
      {
        name: 'genre',
        description: 'Story genre',
        required: true,
        type: 'select',
        options: ['Fantasy', 'Sci-Fi', 'Mystery', 'Romance', 'Horror', 'Adventure'],
      },
      { name: 'setting', description: 'Where the story takes place', required: true, type: 'text' },
      {
        name: 'character',
        description: 'Main character description',
        required: true,
        type: 'text',
      },
      {
        name: 'theme',
        description: 'Central theme or message',
        required: false,
        type: 'text',
        defaultValue: 'Growth and discovery',
      },
      {
        name: 'tone',
        description: 'Story tone',
        required: false,
        type: 'select',
        options: ['Light', 'Dark', 'Humorous', 'Serious', 'Whimsical'],
        defaultValue: 'Engaging',
      },
      {
        name: 'length',
        description: 'Approximate length',
        required: false,
        type: 'select',
        options: [
          'Flash fiction (500 words)',
          'Short story (1500 words)',
          'Long story (3000+ words)',
        ],
        defaultValue: 'Short story (1500 words)',
      },
    ],
    targets: ['chat'],
    author: {
      id: 'cognia-official',
      name: 'Cognia Team',
      verified: true,
    },
    source: 'marketplace',
    qualityTier: 'official',
    version: '1.0.0',
    versions: [],
    stats: {
      downloads: 890,
      weeklyDownloads: 120,
      favorites: 310,
      shares: 65,
      views: 4200,
      successRate: 0.91,
    },
    rating: {
      average: 4.5,
      count: 98,
      distribution: { 1: 1, 2: 3, 3: 8, 4: 32, 5: 54 },
    },
    reviewCount: 28,
    icon: '📖',
    color: '#a855f7',
    isOfficial: true,
    isFeatured: true,
  },
  {
    name: 'Professional Email Composer',
    description: 'Craft polished, context-appropriate professional emails for any business situation',
    content: `You are an expert business communication specialist. Compose a professional email:

**Purpose**: {{purpose}}
**Recipient**: {{recipient}}
**Tone**: {{tone}}
**Key Points**: {{keyPoints}}
{{#if context}}**Additional Context**: {{context}}{{/if}}

Requirements:
- Clear, concise subject line
- Appropriate greeting and sign-off
- Well-structured body with clear call-to-action
- Professional yet approachable tone
- Proofread for grammar and clarity`,
    category: 'writing',
    tags: ['email', 'business-writing', 'communication', 'professional'],
    variables: [
      { name: 'purpose', description: 'Email purpose (e.g., follow-up, proposal, request)', required: true, type: 'text' },
      { name: 'recipient', description: 'Who is the email for (e.g., client, manager, team)', required: true, type: 'text' },
      {
        name: 'tone',
        description: 'Email tone',
        required: true,
        type: 'select',
        options: ['Formal', 'Semi-formal', 'Friendly Professional', 'Urgent', 'Apologetic'],
        defaultValue: 'Semi-formal',
      },
      { name: 'keyPoints', description: 'Main points to cover', required: true, type: 'multiline' },
      { name: 'context', description: 'Background context', required: false, type: 'multiline' },
    ],
    targets: ['chat'],
    author: { id: 'cognia-official', name: 'Cognia Team', verified: true },
    source: 'marketplace',
    qualityTier: 'official',
    version: '1.0.0',
    versions: [],
    stats: { downloads: 2100, weeklyDownloads: 310, favorites: 580, shares: 120, views: 8900, successRate: 0.96 },
    rating: { average: 4.8, count: 245, distribution: { 1: 1, 2: 3, 3: 10, 4: 45, 5: 186 } },
    reviewCount: 67,
    icon: '✉️',
    color: '#3b82f6',
    isOfficial: true,
    isFeatured: true,
  },
  {
    name: 'Meeting Notes Summarizer',
    description: 'Transform raw meeting notes into structured, actionable summaries with key decisions and follow-ups',
    content: `Summarize the following meeting notes into a structured format:

**Meeting Notes**:
{{notes}}

{{#if participants}}**Participants**: {{participants}}{{/if}}
{{#if meetingType}}**Meeting Type**: {{meetingType}}{{/if}}

Create a summary with:
1. **Meeting Overview** - Brief description and date/time
2. **Key Discussion Points** - Main topics covered
3. **Decisions Made** - Clear list of decisions
4. **Action Items** - Who, what, when (table format)
5. **Open Questions** - Unresolved items
6. **Next Steps** - Follow-up schedule`,
    category: 'productivity',
    tags: ['meeting-notes', 'summary', 'action-items', 'productivity'],
    variables: [
      { name: 'notes', description: 'Raw meeting notes or transcript', required: true, type: 'multiline' },
      { name: 'participants', description: 'Meeting participants', required: false, type: 'text' },
      {
        name: 'meetingType',
        description: 'Type of meeting',
        required: false,
        type: 'select',
        options: ['Standup', 'Sprint Planning', 'Retrospective', 'Brainstorming', 'Client Meeting', 'One-on-One', 'All Hands'],
      },
    ],
    targets: ['chat'],
    author: { id: 'productivity-lab', name: 'ProductivityLab', verified: true },
    source: 'marketplace',
    qualityTier: 'verified',
    version: '1.2.0',
    versions: [],
    stats: { downloads: 1800, weeklyDownloads: 250, favorites: 490, shares: 95, views: 7200, successRate: 0.93 },
    rating: { average: 4.6, count: 178, distribution: { 1: 2, 2: 5, 3: 15, 4: 52, 5: 104 } },
    reviewCount: 51,
    icon: '📝',
    color: '#10b981',
  },
  {
    name: 'Business Plan Generator',
    description: 'Create comprehensive business plan sections with market analysis and financial projections',
    content: `Generate a detailed business plan section for:

**Business Name**: {{businessName}}
**Industry**: {{industry}}
**Section**: {{section}}
**Target Market**: {{targetMarket}}
{{#if additionalInfo}}**Additional Info**: {{additionalInfo}}{{/if}}

Provide:
- Data-driven insights where applicable
- Industry-specific terminology
- Realistic projections and benchmarks
- Clear formatting with headings and bullet points`,
    category: 'business',
    tags: ['business-plan', 'entrepreneurship', 'strategy', 'market-analysis'],
    variables: [
      { name: 'businessName', description: 'Your business name', required: true, type: 'text' },
      { name: 'industry', description: 'Business industry', required: true, type: 'text' },
      {
        name: 'section',
        description: 'Business plan section',
        required: true,
        type: 'select',
        options: ['Executive Summary', 'Market Analysis', 'Marketing Strategy', 'Operations Plan', 'Financial Projections', 'Competitive Analysis'],
      },
      { name: 'targetMarket', description: 'Target customer demographics', required: true, type: 'text' },
      { name: 'additionalInfo', description: 'Any additional context', required: false, type: 'multiline' },
    ],
    targets: ['chat'],
    author: { id: 'biz-expert', name: 'BizStrategyPro', verified: true },
    source: 'marketplace',
    qualityTier: 'premium',
    version: '2.0.0',
    versions: [],
    stats: { downloads: 960, weeklyDownloads: 140, favorites: 280, shares: 55, views: 4500, successRate: 0.89 },
    rating: { average: 4.4, count: 112, distribution: { 1: 2, 2: 6, 3: 14, 4: 35, 5: 55 } },
    reviewCount: 32,
    icon: '💼',
    color: '#f59e0b',
  },
  {
    name: 'Lesson Plan Creator',
    description: 'Design engaging, standards-aligned lesson plans for any subject and grade level',
    content: `Create a detailed lesson plan:

**Subject**: {{subject}}
**Grade Level**: {{gradeLevel}}
**Topic**: {{topic}}
**Duration**: {{duration}}
**Learning Objectives**: {{objectives}}

Include:
1. **Warm-Up Activity** (5-10 min)
2. **Direct Instruction** with key concepts
3. **Guided Practice** with examples
4. **Independent Practice** activities
5. **Assessment** methods
6. **Differentiation** strategies for diverse learners
7. **Materials Needed**
8. **Homework/Extension** activities`,
    category: 'education',
    tags: ['lesson-plan', 'teaching', 'education', 'curriculum'],
    variables: [
      { name: 'subject', description: 'Subject area', required: true, type: 'text' },
      {
        name: 'gradeLevel',
        description: 'Grade level',
        required: true,
        type: 'select',
        options: ['K-2', '3-5', '6-8', '9-10', '11-12', 'College', 'Adult Education'],
      },
      { name: 'topic', description: 'Specific lesson topic', required: true, type: 'text' },
      {
        name: 'duration',
        description: 'Class duration',
        required: true,
        type: 'select',
        options: ['30 minutes', '45 minutes', '60 minutes', '90 minutes'],
        defaultValue: '45 minutes',
      },
      { name: 'objectives', description: 'Learning objectives', required: true, type: 'multiline' },
    ],
    targets: ['chat'],
    author: { id: 'edu-innovator', name: 'EduInnovator', verified: true },
    source: 'marketplace',
    qualityTier: 'verified',
    version: '1.1.0',
    versions: [],
    stats: { downloads: 720, weeklyDownloads: 95, favorites: 210, shares: 45, views: 3400, successRate: 0.92 },
    rating: { average: 4.5, count: 89, distribution: { 1: 1, 2: 3, 3: 8, 4: 28, 5: 49 } },
    reviewCount: 24,
    icon: '🎓',
    color: '#6366f1',
  },
  {
    name: 'Research Paper Analyzer',
    description: 'Analyze academic papers for key findings, methodology assessment, and literature review integration',
    content: `Analyze the following research paper/abstract:

{{paperContent}}

**Analysis Focus**: {{focus}}
{{#if field}}**Research Field**: {{field}}{{/if}}

Provide:
1. **Summary** - Core findings and contribution
2. **Methodology Assessment** - Strengths and limitations
3. **Key Data Points** - Important statistics and results
4. **Critical Analysis** - Potential biases, gaps, limitations
5. **Practical Implications** - Real-world applications
6. **Citation Suggestion** - How to reference this in your work`,
    category: 'research',
    tags: ['research', 'academic', 'paper-review', 'literature-review'],
    variables: [
      { name: 'paperContent', description: 'Paper content, abstract, or key excerpts', required: true, type: 'multiline' },
      {
        name: 'focus',
        description: 'Analysis focus area',
        required: true,
        type: 'select',
        options: ['General Overview', 'Methodology', 'Statistical Analysis', 'Literature Gap', 'Practical Applications', 'Replication Potential'],
      },
      { name: 'field', description: 'Research field or discipline', required: false, type: 'text' },
    ],
    targets: ['chat', 'agent'],
    author: { id: 'academic-hub', name: 'AcademicHub', verified: true },
    source: 'marketplace',
    qualityTier: 'premium',
    version: '1.0.0',
    versions: [],
    stats: { downloads: 540, weeklyDownloads: 78, favorites: 160, shares: 35, views: 2800, successRate: 0.90 },
    rating: { average: 4.6, count: 67, distribution: { 1: 0, 2: 2, 3: 6, 4: 22, 5: 37 } },
    reviewCount: 19,
    icon: '🔬',
    color: '#ec4899',
  },
  {
    name: 'Multi-Language Translator Pro',
    description: 'Context-aware translation with cultural adaptation, tone matching, and terminology glossaries',
    content: `Translate the following text with cultural adaptation:

**Source Language**: {{sourceLang}}
**Target Language**: {{targetLang}}
**Text**: {{text}}
**Context**: {{context}}
**Tone**: {{tone}}

Requirements:
- Preserve the original meaning and intent
- Adapt idioms and cultural references
- Maintain the specified tone
- Flag any untranslatable concepts with explanations
- Provide alternative translations for ambiguous phrases`,
    category: 'translation',
    tags: ['translation', 'localization', 'multilingual', 'cultural-adaptation'],
    variables: [
      { name: 'sourceLang', description: 'Source language', required: true, type: 'text', defaultValue: 'English' },
      { name: 'targetLang', description: 'Target language', required: true, type: 'text' },
      { name: 'text', description: 'Text to translate', required: true, type: 'multiline' },
      {
        name: 'context',
        description: 'Context for translation',
        required: false,
        type: 'select',
        options: ['Marketing Copy', 'Technical Documentation', 'Legal Document', 'Casual Conversation', 'Academic Paper', 'UI/UX Text'],
        defaultValue: 'Casual Conversation',
      },
      {
        name: 'tone',
        description: 'Desired tone',
        required: false,
        type: 'select',
        options: ['Formal', 'Informal', 'Professional', 'Friendly', 'Academic'],
        defaultValue: 'Professional',
      },
    ],
    targets: ['chat'],
    author: { id: 'lingua-ai', name: 'LinguaAI', verified: true },
    source: 'marketplace',
    qualityTier: 'verified',
    version: '2.1.0',
    versions: [],
    stats: { downloads: 1560, weeklyDownloads: 220, favorites: 430, shares: 88, views: 6100, successRate: 0.95 },
    rating: { average: 4.7, count: 198, distribution: { 1: 1, 2: 3, 3: 11, 4: 48, 5: 135 } },
    reviewCount: 55,
    icon: '🌐',
    color: '#14b8a6',
  },
  {
    name: 'Data Insights Extractor',
    description: 'Analyze datasets, identify patterns, and generate actionable insights with visualizations',
    content: `Analyze the following data and extract insights:

**Data**:
{{data}}

**Analysis Type**: {{analysisType}}
**Business Context**: {{businessContext}}
{{#if kpis}}**KPIs to Track**: {{kpis}}{{/if}}

Provide:
1. **Data Summary** - Key statistics and distributions
2. **Trends & Patterns** - Identified trends with confidence levels
3. **Anomalies** - Outliers and unexpected findings
4. **Actionable Insights** - Data-backed recommendations
5. **Visualization Suggestions** - Best chart types for key findings`,
    category: 'analysis',
    tags: ['data-analysis', 'insights', 'statistics', 'business-intelligence'],
    variables: [
      { name: 'data', description: 'Data to analyze (CSV, JSON, or description)', required: true, type: 'multiline' },
      {
        name: 'analysisType',
        description: 'Type of analysis',
        required: true,
        type: 'select',
        options: ['Exploratory', 'Trend Analysis', 'Comparative', 'Predictive', 'Diagnostic', 'Cohort Analysis'],
      },
      { name: 'businessContext', description: 'Business context and goals', required: true, type: 'text' },
      { name: 'kpis', description: 'Key performance indicators', required: false, type: 'text' },
    ],
    targets: ['chat', 'agent'],
    author: { id: 'data-wizard', name: 'DataWizard', verified: true },
    source: 'marketplace',
    qualityTier: 'premium',
    version: '1.3.0',
    versions: [],
    stats: { downloads: 680, weeklyDownloads: 95, favorites: 190, shares: 42, views: 3200, successRate: 0.88 },
    rating: { average: 4.3, count: 82, distribution: { 1: 1, 2: 4, 3: 10, 4: 30, 5: 37 } },
    reviewCount: 22,
    icon: '📊',
    color: '#f97316',
  },
  {
    name: 'Conversational AI Persona',
    description: 'Create rich, consistent AI personas with defined personality, knowledge base, and conversation style',
    content: `You are {{personaName}}, a {{personaRole}}.

**Personality**: {{personality}}
**Communication Style**: {{style}}
**Knowledge Areas**: {{expertise}}
{{#if backstory}}**Backstory**: {{backstory}}{{/if}}

Guidelines:
- Stay in character at all times
- Use vocabulary and expressions consistent with your persona
- Draw from your defined knowledge areas
- Be engaging and memorable in interactions
- Maintain conversation continuity`,
    category: 'chat',
    tags: ['persona', 'roleplay', 'chatbot', 'character'],
    variables: [
      { name: 'personaName', description: 'Name of the persona', required: true, type: 'text' },
      { name: 'personaRole', description: 'Role description (e.g., friendly barista, wise mentor)', required: true, type: 'text' },
      { name: 'personality', description: 'Personality traits and quirks', required: true, type: 'multiline' },
      {
        name: 'style',
        description: 'Communication style',
        required: true,
        type: 'select',
        options: ['Casual & Friendly', 'Professional & Formal', 'Witty & Humorous', 'Wise & Thoughtful', 'Energetic & Enthusiastic'],
      },
      { name: 'expertise', description: 'Areas of knowledge', required: true, type: 'text' },
      { name: 'backstory', description: 'Optional character backstory', required: false, type: 'multiline' },
    ],
    targets: ['chat'],
    author: { id: 'persona-lab', name: 'PersonaLab' },
    source: 'marketplace',
    qualityTier: 'community',
    version: '1.0.0',
    versions: [],
    stats: { downloads: 450, weeklyDownloads: 65, favorites: 140, shares: 30, views: 2200, successRate: 0.87 },
    rating: { average: 4.2, count: 56, distribution: { 1: 1, 2: 3, 3: 8, 4: 20, 5: 24 } },
    reviewCount: 15,
    icon: '🎭',
    color: '#8b5cf6',
  },
  {
    name: 'Autonomous Research Agent',
    description: 'Multi-step research agent that breaks down complex topics, searches for information, and synthesizes findings',
    content: `You are an autonomous research agent. Your task:

**Research Topic**: {{topic}}
**Depth Level**: {{depth}}
**Output Format**: {{format}}
{{#if constraints}}**Constraints**: {{constraints}}{{/if}}

Execution Plan:
1. Break the topic into sub-questions
2. Research each sub-question systematically
3. Cross-reference findings from multiple angles
4. Identify knowledge gaps and conflicting information
5. Synthesize findings into the requested format
6. Provide confidence levels for each finding
7. List sources and suggest further reading

Think step-by-step and show your reasoning.`,
    category: 'agent',
    tags: ['research', 'autonomous', 'agent', 'synthesis'],
    variables: [
      { name: 'topic', description: 'Research topic or question', required: true, type: 'text' },
      {
        name: 'depth',
        description: 'Research depth',
        required: true,
        type: 'select',
        options: ['Quick Overview (5 min)', 'Standard Analysis (15 min)', 'Deep Dive (30+ min)'],
        defaultValue: 'Standard Analysis (15 min)',
      },
      {
        name: 'format',
        description: 'Output format',
        required: true,
        type: 'select',
        options: ['Executive Brief', 'Detailed Report', 'Comparison Table', 'Mind Map Outline', 'Q&A Format'],
        defaultValue: 'Detailed Report',
      },
      { name: 'constraints', description: 'Any constraints or focus areas', required: false, type: 'multiline' },
    ],
    targets: ['agent'],
    author: { id: 'cognia-official', name: 'Cognia Team', verified: true },
    source: 'marketplace',
    qualityTier: 'official',
    version: '1.0.0',
    versions: [],
    stats: { downloads: 820, weeklyDownloads: 130, favorites: 250, shares: 60, views: 3800, successRate: 0.91 },
    rating: { average: 4.5, count: 94, distribution: { 1: 1, 2: 2, 3: 9, 4: 30, 5: 52 } },
    reviewCount: 26,
    icon: '🤖',
    color: '#06b6d4',
    isOfficial: true,
  },
  {
    name: 'Content Pipeline Workflow',
    description: 'Multi-step content creation workflow: ideation → outline → draft → edit → optimize for SEO',
    content: `Execute the content creation pipeline:

**Topic**: {{topic}}
**Content Type**: {{contentType}}
**Target Audience**: {{audience}}
**Tone**: {{tone}}
**SEO Keywords**: {{keywords}}

Pipeline Steps:
1. **Ideation** - Generate 5 unique angles for the topic
2. **Outline** - Create a detailed outline with H2/H3 headings
3. **Draft** - Write the full content following the outline
4. **Edit** - Proofread, improve clarity, check flow
5. **SEO Optimize** - Integrate keywords naturally, optimize meta description
6. **Final Review** - Readability score, word count, formatting check

Execute each step sequentially and present the final result.`,
    category: 'workflow',
    tags: ['content-creation', 'seo', 'workflow', 'writing-pipeline'],
    variables: [
      { name: 'topic', description: 'Content topic', required: true, type: 'text' },
      {
        name: 'contentType',
        description: 'Type of content',
        required: true,
        type: 'select',
        options: ['Blog Post', 'Landing Page', 'Newsletter', 'Social Media Series', 'Whitepaper', 'Case Study'],
      },
      { name: 'audience', description: 'Target audience description', required: true, type: 'text' },
      {
        name: 'tone',
        description: 'Content tone',
        required: true,
        type: 'select',
        options: ['Professional', 'Conversational', 'Academic', 'Persuasive', 'Educational'],
        defaultValue: 'Conversational',
      },
      { name: 'keywords', description: 'SEO keywords (comma-separated)', required: false, type: 'text' },
    ],
    targets: ['workflow', 'agent'],
    author: { id: 'content-factory', name: 'ContentFactory', verified: true },
    source: 'marketplace',
    qualityTier: 'verified',
    version: '1.5.0',
    versions: [],
    stats: { downloads: 620, weeklyDownloads: 85, favorites: 175, shares: 38, views: 2900, successRate: 0.90 },
    rating: { average: 4.4, count: 73, distribution: { 1: 1, 2: 2, 3: 7, 4: 25, 5: 38 } },
    reviewCount: 20,
    icon: '🔄',
    color: '#d946ef',
  },
  {
    name: 'API Documentation Writer',
    description: 'Generate clear, developer-friendly API documentation with examples, error codes, and SDKs',
    content: `Write comprehensive API documentation for:

**API Endpoint**: {{endpoint}}
**HTTP Method**: {{method}}
**Description**: {{description}}
**Request Parameters**: {{parameters}}
{{#if responseExample}}**Example Response**: {{responseExample}}{{/if}}

Generate:
1. **Endpoint Overview** with HTTP method badge
2. **Authentication** requirements
3. **Request** - Headers, query params, body schema
4. **Response** - Success and error response formats
5. **Code Examples** in cURL, JavaScript, and Python
6. **Error Codes** table with descriptions
7. **Rate Limits** and best practices`,
    category: 'coding',
    tags: ['api', 'documentation', 'developer', 'rest-api'],
    variables: [
      { name: 'endpoint', description: 'API endpoint path (e.g., /api/v1/users)', required: true, type: 'text' },
      {
        name: 'method',
        description: 'HTTP method',
        required: true,
        type: 'select',
        options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      },
      { name: 'description', description: 'What the endpoint does', required: true, type: 'text' },
      { name: 'parameters', description: 'Request parameters (name, type, required)', required: true, type: 'multiline' },
      { name: 'responseExample', description: 'Example response JSON', required: false, type: 'multiline' },
    ],
    targets: ['chat'],
    author: { id: 'dev-docs', name: 'DevDocs', verified: true },
    source: 'marketplace',
    qualityTier: 'verified',
    version: '1.0.0',
    versions: [],
    stats: { downloads: 430, weeklyDownloads: 60, favorites: 120, shares: 28, views: 2100, successRate: 0.93 },
    rating: { average: 4.6, count: 54, distribution: { 1: 0, 2: 1, 3: 5, 4: 18, 5: 30 } },
    reviewCount: 14,
    icon: '📡',
    color: '#059669',
  },
];

/**
 * Sample collections for initial data
 */
export const SAMPLE_MARKETPLACE_COLLECTIONS: Omit<
  PromptCollection,
  'id' | 'createdAt' | 'updatedAt'
>[] = [
  {
    name: 'Developer Essentials',
    description: 'Must-have prompts for software developers: code review, API docs, debugging, and more',
    promptIds: [],
    promptCount: 0,
    author: { id: 'cognia-official', name: 'Cognia Team', verified: true },
    tags: ['coding', 'developer', 'engineering'],
    followers: 850,
    isFeatured: true,
    categoryFilter: 'coding',
  },
  {
    name: 'Content Creator Toolkit',
    description: 'Everything you need for content creation: writing, SEO, social media, and email campaigns',
    promptIds: [],
    promptCount: 0,
    author: { id: 'content-factory', name: 'ContentFactory', verified: true },
    tags: ['writing', 'content', 'marketing'],
    followers: 620,
    isFeatured: true,
    categoryFilter: 'writing',
  },
  {
    name: 'Business Strategy Pack',
    description: 'Strategic prompts for entrepreneurs: business plans, market analysis, and competitive research',
    promptIds: [],
    promptCount: 0,
    author: { id: 'biz-expert', name: 'BizStrategyPro', verified: true },
    tags: ['business', 'strategy', 'entrepreneurship'],
    followers: 430,
    isFeatured: false,
    categoryFilter: 'business',
  },
];
