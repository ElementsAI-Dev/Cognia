/**
 * Built-in Skills - Initialize default skills from templates
 * 
 * This module provides pre-built skills that are loaded when the app starts.
 */

import type { CreateSkillInput, SkillCategory } from '@/types/system/skill';
import {
  SKILL_CREATOR_TEMPLATE,
  MCP_BUILDER_TEMPLATE,
  ARTIFACTS_BUILDER_TEMPLATE,
  CANVAS_DESIGN_TEMPLATE,
  INTERNAL_COMMS_TEMPLATE,
  BRAND_GUIDELINES_TEMPLATE,
  WEBAPP_TESTING_TEMPLATE,
  DATA_ANALYSIS_TEMPLATE,
} from './templates';

/**
 * Convert a template to CreateSkillInput format
 */
function templateToSkillInput(
  template: {
    id: string;
    name: string;
    description: string;
    category: SkillCategory;
    defaultContent: string;
    tags?: string[];
  }
): CreateSkillInput {
  return {
    name: template.id,
    description: template.description,
    content: template.defaultContent,
    category: template.category,
    tags: template.tags || [],
    version: '1.0.0',
    author: 'Cognia',
  };
}

/**
 * All built-in skills from templates
 */
export const BUILTIN_SKILLS: CreateSkillInput[] = [
  templateToSkillInput(SKILL_CREATOR_TEMPLATE),
  templateToSkillInput(MCP_BUILDER_TEMPLATE),
  templateToSkillInput(ARTIFACTS_BUILDER_TEMPLATE),
  templateToSkillInput(CANVAS_DESIGN_TEMPLATE),
  templateToSkillInput(INTERNAL_COMMS_TEMPLATE),
  templateToSkillInput(BRAND_GUIDELINES_TEMPLATE),
  templateToSkillInput(WEBAPP_TESTING_TEMPLATE),
  templateToSkillInput(DATA_ANALYSIS_TEMPLATE),
];

/**
 * Additional high-quality skills based on best practices
 */
export const ADDITIONAL_SKILLS: CreateSkillInput[] = [
  {
    name: 'code-reviewer',
    description: 'Reviews code for quality, bugs, security issues, and best practices. Provides actionable feedback.',
    category: 'development',
    tags: ['code', 'review', 'quality', 'security'],
    version: '1.0.0',
    author: 'Cognia',
    content: `# Code Reviewer

This skill provides comprehensive code review capabilities.

## When to Use

Use this skill when:
- Reviewing pull requests or code changes
- Checking code quality before merging
- Looking for security vulnerabilities
- Ensuring best practices are followed

## Review Process

### Step 1: Understand Context
- What is the purpose of this code?
- What problem does it solve?
- How does it fit into the larger codebase?

### Step 2: Check for Issues

#### Correctness
- Does the code do what it's supposed to?
- Are there edge cases not handled?
- Are there potential runtime errors?

#### Security
- Input validation present?
- SQL injection risks?
- XSS vulnerabilities?
- Sensitive data exposure?
- Authentication/authorization checks?

#### Performance
- Unnecessary computations?
- N+1 query problems?
- Memory leaks?
- Missing caching opportunities?

#### Code Quality
- DRY principle followed?
- Single responsibility?
- Clear naming conventions?
- Proper error handling?
- Adequate comments for complex logic?

### Step 3: Provide Feedback

Format feedback as:
\`\`\`
**[Severity: Critical/Warning/Suggestion]** [Category]
Line: [line number]
Issue: [description]
Suggestion: [how to fix]
\`\`\`

### Step 4: Summary

Provide an overall assessment:
- Approve / Request Changes / Comment
- Key strengths
- Key areas for improvement
- Estimated risk level

## Keywords
code, review, quality, security, best-practices
`,
  },
  {
    name: 'api-designer',
    description: 'Designs RESTful and GraphQL APIs following best practices for consistency, security, and usability.',
    category: 'development',
    tags: ['api', 'rest', 'graphql', 'design'],
    version: '1.0.0',
    author: 'Cognia',
    content: `# API Designer

This skill helps design high-quality APIs.

## When to Use

Use this skill when:
- Designing new API endpoints
- Refactoring existing APIs
- Creating API documentation
- Reviewing API designs

## Design Principles

### RESTful API Guidelines

#### Resource Naming
- Use nouns, not verbs: \`/users\` not \`/getUsers\`
- Use plural forms: \`/users\` not \`/user\`
- Use hyphen-case: \`/user-profiles\`
- Nest for relationships: \`/users/{id}/orders\`

#### HTTP Methods
- GET: Retrieve resources (idempotent)
- POST: Create resources
- PUT: Full update (idempotent)
- PATCH: Partial update
- DELETE: Remove resources (idempotent)

#### Status Codes
- 200: Success
- 201: Created
- 204: No Content
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 422: Validation Error
- 500: Server Error

#### Response Format
\`\`\`json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  },
  "links": {
    "self": "/users?page=1",
    "next": "/users?page=2"
  }
}
\`\`\`

#### Error Format
\`\`\`json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable message",
    "details": [
      { "field": "email", "message": "Invalid format" }
    ]
  }
}
\`\`\`

### Security Considerations
- Always use HTTPS
- Implement rate limiting
- Use API keys or OAuth 2.0
- Validate all inputs
- Don't expose internal IDs
- Log all requests

### Documentation
Include for each endpoint:
- Description
- Request parameters
- Request body schema
- Response schema
- Error responses
- Example requests/responses

## Keywords
api, rest, graphql, design, documentation
`,
  },
  {
    name: 'technical-writer',
    description: 'Creates clear technical documentation, tutorials, and guides for developers and users.',
    category: 'communication',
    tags: ['documentation', 'writing', 'technical', 'tutorial'],
    version: '1.0.0',
    author: 'Cognia',
    content: `# Technical Writer

This skill helps create clear, effective technical documentation.

## When to Use

Use this skill when:
- Writing API documentation
- Creating user guides
- Writing tutorials and how-to guides
- Documenting code or systems
- Creating README files

## Documentation Types

### README Files
Structure:
1. Project name and description
2. Features / What it does
3. Installation
4. Quick start
5. Usage examples
6. Configuration
7. Contributing
8. License

### API Documentation
For each endpoint:
- Method and URL
- Description
- Parameters (path, query, body)
- Response format
- Error codes
- Example requests

### Tutorials
Structure:
1. What you'll learn
2. Prerequisites
3. Step-by-step instructions
4. Code examples at each step
5. Expected outcomes
6. Troubleshooting

## Writing Guidelines

### Be Clear
- Use simple words
- One idea per sentence
- Define acronyms on first use
- Use active voice

### Be Concise
- Remove unnecessary words
- Use bullet points for lists
- Keep paragraphs short
- Get to the point quickly

### Be Consistent
- Use same terms throughout
- Follow style guide
- Consistent formatting
- Consistent code style

### Be Helpful
- Anticipate questions
- Provide examples
- Include troubleshooting
- Link to related docs

### Code Examples
- Use realistic examples
- Show complete, runnable code
- Include expected output
- Add comments for clarity

## Keywords
documentation, writing, technical, tutorial, guide
`,
  },
  {
    name: 'prompt-engineer',
    description: 'Crafts effective prompts for AI models to achieve desired outputs with clarity and precision.',
    category: 'meta',
    tags: ['prompt', 'ai', 'engineering', 'optimization'],
    version: '1.0.0',
    author: 'Cognia',
    content: `# Prompt Engineer

This skill helps craft effective prompts for AI models.

## When to Use

Use this skill when:
- Creating system prompts
- Optimizing AI interactions
- Designing chatbot personalities
- Building AI-powered features

## Prompt Engineering Principles

### Be Specific
Bad: "Write something about dogs"
Good: "Write a 200-word informative paragraph about the history of dog domestication"

### Provide Context
- Who is the audience?
- What is the purpose?
- What format is needed?
- What constraints exist?

### Use Examples (Few-shot)
\`\`\`
Convert the following to JSON:

Input: John, 25, Engineer
Output: {"name": "John", "age": 25, "job": "Engineer"}

Input: Jane, 30, Designer
Output:
\`\`\`

### Chain of Thought
Ask the model to think step by step:
"Let's solve this step by step:
1. First, identify...
2. Then, analyze...
3. Finally, conclude..."

### Role Assignment
"You are an expert [role] with 20 years of experience in [domain]."

## Prompt Patterns

### Output Format Control
"Respond in the following JSON format:
{
  "summary": "...",
  "key_points": ["...", "..."],
  "recommendation": "..."
}"

### Constraint Setting
"Requirements:
- Maximum 100 words
- Professional tone
- No technical jargon
- Include one example"

### Self-Consistency
"Think through this problem from three different perspectives, then provide your final answer based on the most common conclusion."

### Iterative Refinement
1. Start with basic prompt
2. Test with various inputs
3. Identify failure modes
4. Add constraints/examples
5. Repeat

## Common Mistakes to Avoid

- Vague instructions
- Missing context
- No output format
- Conflicting requirements
- Too many instructions at once

## Keywords
prompt, ai, engineering, optimization, llm
`,
  },
  {
    name: 'database-designer',
    description: 'Designs efficient database schemas, relationships, and queries for relational and NoSQL databases.',
    category: 'development',
    tags: ['database', 'sql', 'schema', 'nosql'],
    version: '1.0.0',
    author: 'Cognia',
    content: `# Database Designer

This skill helps design efficient database schemas.

## When to Use

Use this skill when:
- Designing new database schemas
- Optimizing existing databases
- Choosing between SQL and NoSQL
- Writing complex queries
- Planning data migrations

## Schema Design Process

### Step 1: Understand Requirements
- What data needs to be stored?
- What queries will be common?
- What is the expected scale?
- What are the consistency requirements?

### Step 2: Identify Entities
- List all entities (nouns)
- Identify attributes for each
- Determine primary keys
- Find natural vs surrogate keys

### Step 3: Define Relationships
- One-to-One (1:1)
- One-to-Many (1:N)
- Many-to-Many (M:N)

### Step 4: Normalize (for SQL)
- 1NF: Atomic values, no repeating groups
- 2NF: No partial dependencies
- 3NF: No transitive dependencies
- Consider denormalization for read performance

## SQL Best Practices

### Table Design
\`\`\`sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
\`\`\`

### Query Optimization
- Use appropriate indexes
- Avoid SELECT *
- Use EXPLAIN ANALYZE
- Batch operations
- Use prepared statements

## NoSQL Considerations

### When to Use NoSQL
- Flexible schema needed
- Horizontal scaling required
- High write throughput
- Document-oriented data

### Document Design
- Embed for 1:1 and 1:few
- Reference for 1:many and many:many
- Consider query patterns
- Avoid unbounded arrays

## Keywords
database, sql, schema, nosql, design
`,
  },
  {
    name: 'accessibility-expert',
    description: 'Ensures web applications meet WCAG accessibility standards for all users.',
    category: 'development',
    tags: ['accessibility', 'a11y', 'wcag', 'inclusive'],
    version: '1.0.0',
    author: 'Cognia',
    content: `# Accessibility Expert

This skill ensures web applications are accessible to all users.

## When to Use

Use this skill when:
- Building user interfaces
- Reviewing existing UIs for accessibility
- Creating forms and interactive elements
- Designing navigation

## WCAG Principles (POUR)

### Perceivable
- Text alternatives for images
- Captions for videos
- Sufficient color contrast
- Resizable text

### Operable
- Keyboard accessible
- No seizure-inducing content
- Skip navigation links
- Clear focus indicators

### Understandable
- Readable text
- Predictable behavior
- Input assistance
- Error identification

### Robust
- Valid HTML
- ARIA where needed
- Compatible with assistive tech

## Common Issues and Fixes

### Images
\`\`\`html
<!-- Bad -->
<img src="chart.png">

<!-- Good -->
<img src="chart.png" alt="Sales increased 25% in Q4 2024">
\`\`\`

### Forms
\`\`\`html
<!-- Bad -->
<input type="text" placeholder="Email">

<!-- Good -->
<label for="email">Email</label>
<input type="email" id="email" aria-describedby="email-hint">
<span id="email-hint">We'll never share your email</span>
\`\`\`

### Buttons
\`\`\`html
<!-- Bad -->
<div onclick="submit()">Submit</div>

<!-- Good -->
<button type="submit">Submit</button>
\`\`\`

### Color Contrast
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum
- Use tools to verify

### Keyboard Navigation
- All interactive elements focusable
- Logical tab order
- Visible focus indicator
- Skip links for main content

## Testing Checklist

- [ ] Keyboard-only navigation works
- [ ] Screen reader announces correctly
- [ ] Color contrast passes
- [ ] Focus visible on all elements
- [ ] Forms have labels
- [ ] Images have alt text
- [ ] Videos have captions
- [ ] No content flashes

## Keywords
accessibility, a11y, wcag, inclusive, aria
`,
  },
];

/**
 * Expert-level skills based on best practices from Claude Skills documentation
 */
export const EXPERT_SKILLS: CreateSkillInput[] = [
  {
    name: 'pdf-processor',
    description: 'Comprehensive PDF manipulation toolkit for extracting text and tables, creating new PDFs, merging/splitting documents, and handling forms. Use when filling PDF forms or programmatically processing, generating, or analyzing PDF documents at scale. For document workflows and batch operations.',
    category: 'productivity',
    tags: ['pdf', 'document', 'extraction', 'processing'],
    version: '1.0.0',
    author: 'Cognia',
    content: `# PDF Processor

This skill provides comprehensive PDF document processing capabilities.

## When to Use

Use this skill when:
- Extracting text or tables from PDF documents
- Creating or generating new PDF documents
- Merging multiple PDFs into one
- Splitting PDFs into separate pages/sections
- Filling out PDF forms programmatically
- Batch processing multiple PDF files

## Capabilities

### Text Extraction
- Extract all text content from PDF pages
- Preserve formatting where possible
- Handle multi-column layouts
- Extract text from specific page ranges

### Table Extraction
- Identify and extract tabular data
- Convert tables to CSV or JSON format
- Handle complex table structures
- Merge split tables across pages

### PDF Generation
- Create PDFs from text/markdown
- Add headers, footers, page numbers
- Include images and charts
- Apply consistent styling

### Form Handling
- Identify form fields
- Fill form fields programmatically
- Validate field values
- Flatten filled forms

## Output Format

For extraction tasks, return structured data:
\`\`\`json
{
  "success": true,
  "pages": [
    {
      "pageNumber": 1,
      "text": "...",
      "tables": [...]
    }
  ],
  "metadata": {
    "totalPages": 10,
    "author": "...",
    "created": "..."
  }
}
\`\`\`

## Limitations

- Cannot process password-protected PDFs without the password
- Image-based PDFs require OCR (may reduce accuracy)
- Complex layouts may require manual verification
- Maximum file size: 50MB

## Keywords
pdf, document, extraction, tables, forms, processing
`,
  },
  {
    name: 'financial-analyst',
    description: 'Analyzes financial documents, earnings reports, and market data to extract key metrics, identify trends, and generate comprehensive financial summaries. Use for 10-K/10-Q analysis, earnings analysis, and financial comparisons.',
    category: 'data-analysis',
    tags: ['finance', 'analysis', 'earnings', 'metrics'],
    version: '1.0.0',
    author: 'Cognia',
    content: `# Financial Analyst

This skill provides comprehensive financial analysis capabilities.

## When to Use

Use this skill when:
- Analyzing 10-K, 10-Q, or annual reports
- Reviewing earnings releases
- Comparing financial metrics across periods
- Building financial models or projections
- Extracting key financial data points

## Analysis Framework

### Step 1: Document Classification
Identify the document type:
- Annual Report (10-K)
- Quarterly Report (10-Q)
- Earnings Release
- Investor Presentation
- SEC Filing

### Step 2: Key Metrics Extraction

#### Income Statement
- Revenue / Net Sales
- Cost of Revenue
- Gross Profit & Margin
- Operating Expenses (R&D, SG&A)
- Operating Income & Margin
- Net Income & EPS

#### Balance Sheet
- Total Assets
- Cash & Equivalents
- Total Debt
- Shareholders' Equity
- Working Capital

#### Cash Flow
- Operating Cash Flow
- Free Cash Flow
- CapEx
- Dividends & Buybacks

### Step 3: Ratio Analysis

**Profitability**
- Gross Margin = Gross Profit / Revenue
- Operating Margin = Operating Income / Revenue
- Net Margin = Net Income / Revenue
- ROE = Net Income / Shareholders' Equity

**Liquidity**
- Current Ratio = Current Assets / Current Liabilities
- Quick Ratio = (Current Assets - Inventory) / Current Liabilities

**Leverage**
- Debt/Equity = Total Debt / Shareholders' Equity
- Interest Coverage = EBIT / Interest Expense

### Step 4: Trend Analysis
- Compare YoY and QoQ changes
- Identify growth patterns
- Note significant variances
- Highlight guidance vs actuals

## Output Format

\`\`\`markdown
## Executive Summary
[Key findings in 2-3 sentences]

## Key Metrics
| Metric | Current | Prior | Change |
|--------|---------|-------|--------|

## Notable Items
- [Significant finding 1]
- [Significant finding 2]

## Risks & Concerns
- [Risk 1]

## Outlook
[Forward-looking commentary]
\`\`\`

## Keywords
finance, analysis, earnings, 10-K, metrics, ratios
`,
  },
  {
    name: 'meeting-summarizer',
    description: 'Transforms meeting transcripts, notes, and recordings into structured summaries with action items, decisions, and key discussion points. Use after meetings to create shareable notes and track follow-ups.',
    category: 'productivity',
    tags: ['meeting', 'summary', 'notes', 'action-items'],
    version: '1.0.0',
    author: 'Cognia',
    content: `# Meeting Summarizer

This skill transforms meeting content into actionable summaries.

## When to Use

Use this skill when:
- Processing meeting transcripts
- Creating notes from recordings
- Extracting action items from discussions
- Generating meeting minutes
- Tracking decisions and follow-ups

## Processing Steps

### Step 1: Identify Meeting Context
- Meeting type (standup, planning, review, etc.)
- Participants
- Date and duration
- Agenda items

### Step 2: Extract Key Elements

#### Decisions Made
- What was decided
- Who made the decision
- Rationale if discussed
- Any dissenting views

#### Action Items
- Task description
- Owner/assignee
- Due date if mentioned
- Dependencies

#### Discussion Points
- Topics covered
- Key arguments/perspectives
- Unresolved questions
- Parking lot items

### Step 3: Generate Summary

## Output Template

\`\`\`markdown
# Meeting Summary: [Title]

**Date:** [Date]
**Attendees:** [Names]
**Duration:** [Time]

## TL;DR
[2-3 sentence summary of the meeting outcome]

## Decisions
1. **[Decision]** - [Brief context]
   - Owner: [Name]
   - Timeline: [Date]

## Action Items
| # | Task | Owner | Due Date | Status |
|---|------|-------|----------|--------|
| 1 | [Task] | [Name] | [Date] | Pending |

## Discussion Highlights
### [Topic 1]
- Key point
- Key point

### [Topic 2]
- Key point

## Open Questions
- [Question 1]
- [Question 2]

## Next Steps
- [Next meeting date/topic]
- [Follow-up required]
\`\`\`

## Best Practices

- Prioritize action items over general discussion
- Be specific about owners and dates
- Capture decisions, not just discussions
- Flag items needing follow-up
- Keep summaries concise but complete

## Keywords
meeting, summary, notes, action-items, minutes
`,
  },
  {
    name: 'contract-reviewer',
    description: 'Reviews legal contracts and agreements to identify key terms, obligations, risks, and non-standard clauses. Use for NDA review, vendor agreements, service contracts, and employment agreements.',
    category: 'enterprise',
    tags: ['contract', 'legal', 'review', 'compliance'],
    version: '1.0.0',
    author: 'Cognia',
    content: `# Contract Reviewer

This skill provides contract analysis and risk identification.

## When to Use

Use this skill when:
- Reviewing NDAs or confidentiality agreements
- Analyzing vendor/supplier contracts
- Evaluating service level agreements (SLAs)
- Reviewing employment contracts
- Comparing contract versions

## Review Framework

### Step 1: Document Overview
- Contract type
- Parties involved
- Effective date
- Term/duration
- Governing law

### Step 2: Key Terms Extraction

#### Financial Terms
- Pricing/fees
- Payment terms
- Penalties/late fees
- Price adjustment clauses

#### Obligations
- Your obligations
- Counterparty obligations
- Performance requirements
- Reporting requirements

#### Rights
- Termination rights
- Renewal options
- IP ownership
- Data rights

#### Protections
- Limitation of liability
- Indemnification
- Insurance requirements
- Warranties

### Step 3: Risk Assessment

**High Risk Flags**
- Unlimited liability
- One-sided indemnification
- Broad IP assignment
- Auto-renewal without notice
- Non-compete restrictions

**Medium Risk Flags**
- Ambiguous terms
- Missing standard protections
- Unusual governing law
- Short cure periods

### Step 4: Comparison Analysis
- Industry standard terms
- Your standard positions
- Previous agreements

## Output Format

\`\`\`markdown
# Contract Review Summary

## Document Details
- Type: [Contract Type]
- Parties: [Party A] and [Party B]
- Term: [Duration]
- Value: [If applicable]

## Key Terms Summary
| Category | Term | Risk Level |
|----------|------|------------|

## Risk Assessment
### High Priority Issues
1. **[Issue]** - [Clause reference]
   - Risk: [Description]
   - Recommendation: [Action]

### Medium Priority Issues
...

## Recommended Negotiations
1. [Specific change request]
2. [Specific change request]

## Approval Recommendation
[ ] Ready to sign
[ ] Sign with noted risks
[ ] Requires negotiation
[ ] Do not sign
\`\`\`

## Disclaimers

- This is not legal advice
- Consult legal counsel for binding decisions
- Review local regulations

## Keywords
contract, legal, review, NDA, agreement, risk
`,
  },
];

/**
 * Get all built-in skills (templates + additional + expert)
 */
export function getAllBuiltinSkills(): CreateSkillInput[] {
  return [...BUILTIN_SKILLS, ...ADDITIONAL_SKILLS, ...EXPERT_SKILLS];
}

/**
 * Initialize built-in skills in the store
 * Call this on app startup
 */
export function initializeBuiltinSkills(
  importFn: (skills: CreateSkillInput[]) => void
): void {
  const allSkills = getAllBuiltinSkills();
  importFn(allSkills);
}

const builtinSkills = {
  BUILTIN_SKILLS,
  ADDITIONAL_SKILLS,
  EXPERT_SKILLS,
  getAllBuiltinSkills,
  initializeBuiltinSkills,
};

export default builtinSkills;
