/**
 * Skill Templates Library
 * 
 * Pre-built skill templates based on official Claude Skills examples.
 * These templates provide starting points for common skill types.
 */

import type { SkillTemplate, SkillCategory } from '@/types/skill';

/**
 * Skill Creator - Meta skill for creating other skills
 */
export const SKILL_CREATOR_TEMPLATE: SkillTemplate = {
  id: 'skill-creator',
  name: 'Skill Creator',
  description: 'A meta skill that helps create effective skills following the Claude Skills specification.',
  category: 'meta',
  icon: '🛠️',
  tags: ['meta', 'generator', 'template'],
  defaultContent: `# Skill Creator

This skill provides guidance for creating effective skills.

## About Skills

Skills are modular, self-contained packages that extend Claude's capabilities by providing specialized knowledge, workflows, and tools. Think of them as "onboarding guides" for specific domains or tasks.

### What Skills Provide

1. **Specialized workflows** - Multi-step procedures for specific domains
2. **Tool integrations** - Instructions for working with specific file formats or APIs
3. **Domain expertise** - Company-specific knowledge, schemas, business logic
4. **Bundled resources** - Scripts, references, and assets for complex tasks

## Skill Creation Process

### Step 1: Understanding the Skill with Concrete Examples

To create an effective skill, clearly understand concrete examples of how the skill will be used.

Ask questions like:
- "What functionality should this skill support?"
- "Can you give some examples of how this skill would be used?"
- "What would a user say that should trigger this skill?"

### Step 2: Planning the Reusable Skill Contents

Analyze each example by:
1. Considering how to execute on the example from scratch
2. Identifying what scripts, references, and assets would be helpful

### Step 3: Create the SKILL.md File

Every skill needs a SKILL.md file with:

\`\`\`yaml
---
name: skill-name-in-hyphen-case
description: Brief description of what this skill does and when to use it.
---
\`\`\`

### Step 4: Write Clear Instructions

Structure the skill content with:
- Purpose explanation
- When to use this skill
- Step-by-step instructions
- Examples

### Best Practices

- Write in third person for descriptions
- Use imperative form for instructions
- Keep SKILL.md under 500 lines
- Use progressive disclosure with reference files
- Test with real use cases
`,
};

/**
 * MCP Builder - For building MCP servers
 */
export const MCP_BUILDER_TEMPLATE: SkillTemplate = {
  id: 'mcp-builder',
  name: 'MCP Builder',
  description: 'Creates high-quality MCP (Model Context Protocol) servers that enable LLMs to interact with external services.',
  category: 'development',
  icon: '🔌',
  tags: ['mcp', 'api', 'development', 'integration'],
  defaultContent: `# MCP Builder

This skill provides guidance for building Model Context Protocol (MCP) servers.

## Overview

MCP servers provide tools that allow LLMs to access external services and APIs. Quality is measured by how well the server enables LLMs to accomplish real-world tasks.

## High-Level Workflow

### Phase 1: Research and Planning

1. **Understand Agent-Centric Design Principles**
   - Build for workflows, not just API endpoints
   - Optimize for limited context
   - Design actionable error messages
   - Follow natural task subdivisions

2. **Study API Documentation**
   - Official API reference
   - Authentication requirements
   - Rate limiting patterns
   - Error responses

3. **Create Implementation Plan**
   - List valuable endpoints
   - Plan shared utilities
   - Design input/output schemas
   - Plan error handling

### Phase 2: Implementation

1. **Set Up Project Structure**
   - For Python: Use MCP Python SDK with Pydantic
   - For TypeScript: Use MCP TypeScript SDK with Zod

2. **Implement Core Infrastructure**
   - API request helpers
   - Error handling utilities
   - Response formatting
   - Pagination helpers

3. **Implement Tools Systematically**
   - Define input schemas with validation
   - Write comprehensive docstrings
   - Add tool annotations (readOnlyHint, etc.)

### Phase 3: Review and Testing

- Review for DRY principle
- Ensure type safety
- Add comprehensive documentation
- Create evaluation suites

## Tool Design Best Practices

- Return high-signal information, not data dumps
- Provide concise vs detailed response options
- Use human-readable identifiers over technical codes
- Make error messages educational
`,
};

/**
 * Artifacts Builder - For creating interactive artifacts
 */
export const ARTIFACTS_BUILDER_TEMPLATE: SkillTemplate = {
  id: 'artifacts-builder',
  name: 'Artifacts Builder',
  description: 'Creates interactive React artifacts with proper structure, styling, and functionality.',
  category: 'development',
  icon: '📦',
  tags: ['artifacts', 'react', 'interactive', 'ui'],
  defaultContent: `# Artifacts Builder

This skill helps create high-quality interactive React artifacts.

## When to Use

Use this skill when asked to create:
- Interactive UI components
- Data visualizations
- Mini applications
- Games or interactive experiences
- Forms and calculators

## Artifact Structure

\`\`\`tsx
import React, { useState } from 'react';

export default function ArtifactName() {
  const [state, setState] = useState(initialValue);
  
  return (
    <div className="p-4">
      {/* Your component content */}
    </div>
  );
}
\`\`\`

## Best Practices

### Styling
- Use Tailwind CSS classes for styling
- Ensure responsive design with responsive breakpoints
- Use consistent spacing and typography

### Interactivity
- Use React hooks for state management
- Handle loading and error states
- Provide clear user feedback

### Accessibility
- Use semantic HTML elements
- Include proper ARIA labels
- Ensure keyboard navigation works

### Performance
- Avoid unnecessary re-renders
- Use React.memo for expensive components
- Lazy load heavy dependencies

## Common Patterns

### Form with Validation
\`\`\`tsx
const [value, setValue] = useState('');
const [error, setError] = useState('');

const handleSubmit = () => {
  if (!value) {
    setError('Value is required');
    return;
  }
  // Process form
};
\`\`\`

### Data Fetching Pattern
\`\`\`tsx
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetchData().then(setData).finally(() => setLoading(false));
}, []);
\`\`\`
`,
};

/**
 * Canvas Design - For creating design assets
 */
export const CANVAS_DESIGN_TEMPLATE: SkillTemplate = {
  id: 'canvas-design',
  name: 'Canvas Design',
  description: 'Creates marketing canvases and design assets with curated fonts, palettes, and templates.',
  category: 'creative-design',
  icon: '🎨',
  tags: ['design', 'canvas', 'creative', 'marketing'],
  defaultContent: `# Canvas Design

This skill creates design philosophies expressed visually on a canvas.

## Process

### Step 1: Design Philosophy Creation

Create a visual philosophy that will be interpreted through:
- Form, space, color, composition
- Images, graphics, shapes, patterns
- Minimal text as visual accent

### Step 2: Express on Canvas

Use the philosophy to create visual output (PDF or PNG).

## Philosophy Guidelines

### Name the Movement (1-2 words)
Examples: "Brutalist Joy", "Chromatic Silence", "Metabolist Dreams"

### Articulate the Philosophy (4-6 paragraphs)

Express how the philosophy manifests through:
- Space and form
- Color and material
- Scale and rhythm
- Composition and balance
- Visual hierarchy

### Critical Principles

1. **Avoid redundancy** - Each design aspect mentioned once
2. **Emphasize craftsmanship** - The work should appear meticulously crafted
3. **Leave creative space** - Specific but concise direction

## Example Philosophies

### "Concrete Poetry"
Communication through monumental form and bold geometry. Massive color blocks, sculptural typography, Brutalist spatial divisions.

### "Chromatic Language"
Color as the primary information system. Geometric precision where color zones create meaning.

### "Analog Meditation"
Quiet visual contemplation through texture and breathing room. Paper grain, ink bleeds, vast negative space.

## Canvas Creation Guidelines

- Create museum or magazine quality work
- Use repeating patterns and perfect shapes
- Add sparse, clinical typography
- Use a limited, cohesive color palette
- Ensure all elements have proper margins
`,
};

/**
 * Internal Comms - For internal communications
 */
export const INTERNAL_COMMS_TEMPLATE: SkillTemplate = {
  id: 'internal-comms',
  name: 'Internal Communications',
  description: 'Writes internal communications following company formats for status reports, updates, newsletters, and FAQs.',
  category: 'communication',
  icon: '📝',
  tags: ['communication', 'internal', 'writing', 'business'],
  defaultContent: `# Internal Communications

This skill helps write internal communications using standard formats.

## Supported Communication Types

- **3P Updates** - Progress, Plans, Problems
- **Company Newsletters** - Company-wide announcements
- **FAQ Responses** - Answers to common questions
- **Status Reports** - Project or team status
- **Leadership Updates** - Executive communications
- **Project Updates** - Milestone and progress updates
- **Incident Reports** - Issue documentation

## How to Use

1. **Identify the communication type** from the request
2. **Gather required information** for that type
3. **Follow the appropriate template** below
4. **Review for clarity and completeness**

## Templates

### 3P Update Template

\`\`\`
## Progress
- [Completed item 1]
- [Completed item 2]

## Plans
- [Upcoming task 1]
- [Upcoming task 2]

## Problems
- [Blocker or issue] - [Proposed resolution]
\`\`\`

### Status Report Template

\`\`\`
# [Project Name] Status Report
Date: [Date]
Author: [Name]

## Executive Summary
[1-2 sentence overview]

## Key Metrics
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|

## Accomplishments
- [Item 1]

## Next Steps
- [Item 1]

## Risks and Issues
- [Risk/Issue]: [Mitigation]
\`\`\`

### FAQ Response Template

\`\`\`
**Q: [Question]**

A: [Clear, concise answer]

Additional resources:
- [Link or reference]
\`\`\`

## Writing Guidelines

- Be clear and concise
- Use bullet points for readability
- Include relevant metrics and data
- End with clear action items
- Proofread for accuracy
`,
};

/**
 * Brand Guidelines - For maintaining brand consistency
 */
export const BRAND_GUIDELINES_TEMPLATE: SkillTemplate = {
  id: 'brand-guidelines',
  name: 'Brand Guidelines',
  description: 'Applies brand guidelines and preferred formats to documents, meeting notes, and communications.',
  category: 'enterprise',
  icon: '🏢',
  tags: ['brand', 'guidelines', 'enterprise', 'consistency'],
  defaultContent: `# Brand Guidelines

This skill ensures all outputs follow brand guidelines.

## Brand Voice

### Tone Characteristics
- Professional yet approachable
- Clear and direct
- Helpful and supportive
- Confident but not arrogant

### Writing Style
- Active voice preferred
- Short sentences for clarity
- Avoid jargon unless necessary
- Define technical terms when used

## Visual Guidelines

### Colors
Define your brand colors here:
- Primary: [Color]
- Secondary: [Color]
- Accent: [Color]
- Background: [Color]

### Typography
- Headings: [Font family]
- Body text: [Font family]
- Code: [Monospace font]

### Logo Usage
- Minimum clear space requirements
- Approved color variations
- Minimum size requirements

## Document Templates

### Reports
- Title page with logo
- Table of contents for documents > 5 pages
- Consistent heading hierarchy
- Page numbers and date

### Presentations
- Title slide with branding
- Consistent slide layouts
- Approved chart styles
- Speaker notes template

### Emails
- Professional greeting
- Clear subject lines
- Signature block format

## Quality Checklist

Before finalizing any output:
- [ ] Follows brand voice guidelines
- [ ] Uses approved colors and fonts
- [ ] Includes required branding elements
- [ ] Reviewed for spelling and grammar
- [ ] Meets accessibility standards
`,
};

/**
 * Webapp Testing - For testing web applications
 */
export const WEBAPP_TESTING_TEMPLATE: SkillTemplate = {
  id: 'webapp-testing',
  name: 'Webapp Testing',
  description: 'Creates comprehensive test suites for web applications including unit, integration, and E2E tests.',
  category: 'development',
  icon: '🧪',
  tags: ['testing', 'qa', 'development', 'automation'],
  defaultContent: `# Webapp Testing

This skill helps create comprehensive test suites for web applications.

## Testing Pyramid

### Unit Tests
Test individual functions and components in isolation.

\`\`\`typescript
describe('Component', () => {
  it('should render correctly', () => {
    render(<Component />);
    expect(screen.getByText('Expected')).toBeInTheDocument();
  });
});
\`\`\`

### Integration Tests
Test interactions between components.

\`\`\`typescript
describe('Feature', () => {
  it('should complete workflow', async () => {
    // Setup
    render(<App />);
    
    // Actions
    await userEvent.click(screen.getByRole('button'));
    
    // Assertions
    expect(screen.getByText('Success')).toBeVisible();
  });
});
\`\`\`

### E2E Tests
Test complete user flows with Playwright.

\`\`\`typescript
test('user can complete purchase', async ({ page }) => {
  await page.goto('/products');
  await page.click('[data-testid="add-to-cart"]');
  await page.click('[data-testid="checkout"]');
  await expect(page.locator('.success')).toBeVisible();
});
\`\`\`

## Best Practices

### Test Organization
- Group tests by feature or component
- Use descriptive test names
- Follow AAA pattern: Arrange, Act, Assert

### Test Data
- Use factories for test data
- Avoid hardcoded values
- Clean up after tests

### Mocking
- Mock external dependencies
- Use MSW for API mocking
- Keep mocks close to tests

### Coverage
- Aim for meaningful coverage, not 100%
- Focus on critical paths
- Test edge cases and errors

## Common Patterns

### Testing Forms
\`\`\`typescript
it('validates required fields', async () => {
  render(<Form />);
  await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
  expect(screen.getByText('Required')).toBeVisible();
});
\`\`\`

### Testing Async Operations
\`\`\`typescript
it('loads data', async () => {
  render(<DataComponent />);
  expect(screen.getByText('Loading')).toBeVisible();
  await waitFor(() => {
    expect(screen.getByText('Data')).toBeVisible();
  });
});
\`\`\`
`,
};

/**
 * Data Analysis - For data analysis tasks
 */
export const DATA_ANALYSIS_TEMPLATE: SkillTemplate = {
  id: 'data-analysis',
  name: 'Data Analysis',
  description: 'Analyzes data, creates visualizations, and generates insights from datasets.',
  category: 'data-analysis',
  icon: '📊',
  tags: ['data', 'analysis', 'visualization', 'insights'],
  defaultContent: `# Data Analysis

This skill helps analyze data and generate insights.

## Analysis Process

### Step 1: Understand the Data

- Identify data types and structures
- Check for missing values
- Understand the domain context
- Clarify analysis objectives

### Step 2: Clean and Prepare

- Handle missing values
- Remove duplicates
- Fix data types
- Normalize if needed

### Step 3: Explore and Analyze

- Calculate summary statistics
- Identify patterns and trends
- Find correlations
- Segment data as needed

### Step 4: Visualize

Choose appropriate charts:
- **Line charts** - Trends over time
- **Bar charts** - Comparisons
- **Scatter plots** - Relationships
- **Pie charts** - Proportions (use sparingly)
- **Heatmaps** - Correlations

### Step 5: Generate Insights

- Summarize key findings
- Highlight anomalies
- Provide recommendations
- Note limitations

## Output Format

\`\`\`markdown
## Executive Summary
[Key findings in 2-3 sentences]

## Data Overview
- Records: [count]
- Time period: [range]
- Key variables: [list]

## Key Findings

### Finding 1: [Title]
[Description with supporting data]

### Finding 2: [Title]
[Description with supporting data]

## Recommendations
1. [Recommendation with rationale]

## Appendix
[Detailed tables and charts]
\`\`\`

## Best Practices

- Always validate data quality first
- Use appropriate statistical methods
- Visualize to confirm patterns
- Be transparent about limitations
- Provide actionable insights
`,
};

/**
 * Template Skill - Minimal skeleton for new skills
 */
export const TEMPLATE_SKILL: SkillTemplate = {
  id: 'template-skill',
  name: 'Template Skill',
  description: 'A minimal skill skeleton to bootstrap new skills quickly.',
  category: 'meta',
  icon: '📄',
  tags: ['template', 'starter', 'minimal'],
  defaultContent: `# [Skill Name]

[Brief description of what this skill does]

## When to Use

Use this skill when:
- [Trigger condition 1]
- [Trigger condition 2]

## Instructions

### Step 1: [First Step]

[Instructions for the first step]

### Step 2: [Second Step]

[Instructions for the second step]

### Step 3: [Third Step]

[Instructions for the third step]

## Examples

### Example 1: [Example Name]

**Input:** [Example input]

**Output:** [Example output]

## Best Practices

- [Best practice 1]
- [Best practice 2]
- [Best practice 3]

## Keywords

[keyword1], [keyword2], [keyword3]
`,
};

/**
 * All available skill templates
 */
export const SKILL_TEMPLATES: SkillTemplate[] = [
  SKILL_CREATOR_TEMPLATE,
  MCP_BUILDER_TEMPLATE,
  ARTIFACTS_BUILDER_TEMPLATE,
  CANVAS_DESIGN_TEMPLATE,
  INTERNAL_COMMS_TEMPLATE,
  BRAND_GUIDELINES_TEMPLATE,
  WEBAPP_TESTING_TEMPLATE,
  DATA_ANALYSIS_TEMPLATE,
  TEMPLATE_SKILL,
];

/**
 * Get all templates
 */
export function getAllTemplates(): SkillTemplate[] {
  return SKILL_TEMPLATES;
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): SkillTemplate | undefined {
  return SKILL_TEMPLATES.find(t => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: SkillCategory): SkillTemplate[] {
  return SKILL_TEMPLATES.filter(t => t.category === category);
}

/**
 * Search templates by query
 */
export function searchTemplates(query: string): SkillTemplate[] {
  const lowerQuery = query.toLowerCase();
  return SKILL_TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery) ||
    t.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get template categories with counts
 */
export function getTemplateCategoriesWithCounts(): Array<{ category: SkillCategory; count: number }> {
  const counts = new Map<SkillCategory, number>();
  
  for (const template of SKILL_TEMPLATES) {
    counts.set(template.category, (counts.get(template.category) || 0) + 1);
  }
  
  return Array.from(counts.entries()).map(([category, count]) => ({
    category,
    count,
  }));
}

const skillTemplates = {
  SKILL_TEMPLATES,
  getAllTemplates,
  getTemplateById,
  getTemplatesByCategory,
  searchTemplates,
  getTemplateCategoriesWithCounts,
};

export default skillTemplates;
