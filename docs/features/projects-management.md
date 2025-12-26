# Projects Management Guide

Cognia's Projects feature helps you organize related conversations, build knowledge bases, and maintain context across multiple sessions.

## What Are Projects?

Projects are organizational containers that group related chat sessions together, providing:

- **Session Grouping**: Organize conversations by topic or client
- **Knowledge Base**: Add reference documents and files
- **Custom Instructions**: Project-specific prompts and context
- **Persistent Settings**: Default model, provider, and mode
- **Visual Organization**: Custom icons and colors

## Creating Projects

### New Project Creation

1. Click **Projects** in sidebar navigation
2. Click **New Project** button
3. Fill in project details:
   - **Name**: Project title (required)
   - **Description**: What the project is about
   - **Icon**: Choose from 15 predefined icons
   - **Color**: Select from 10 color options
   - **Tags**: Add organizational tags
   - **Custom Instructions**: Project-specific context
4. Click **Create Project**

### Project Details

**Basic Information**:
- Name and description
- Icon and color for visual identification
- Creation and last access timestamps
- Session and message counts

**Default Settings**:
- Default provider (OpenAI, Anthropic, etc.)
- Default model
- Default mode (Chat, Agent, Research, Learning)
- Custom instructions

**Organization**:
- Tags for categorization
- Archive status
- Project color coding

### Project Templates

Quick-start with pre-configured templates:

**Software Development**:
- Icon: Code
- Color: Blue
- Instructions: "You are working on a software project. Focus on clean code, best practices, and documentation."

**Research Project**:
- Icon: GraduationCap
- Color: Purple
- Instructions: "This is a research project. Cite sources, provide evidence, and maintain academic rigor."

**Content Creation**:
- Icon: PenTool
- Color: Pink
- Instructions: "Focus on creating engaging, well-structured content with clear messaging."

**Client Work**:
- Icon: Briefcase
- Color: Green
- Instructions: "Professional communication for client work. Maintain business-appropriate tone."

**Personal Learning**:
- Icon: BookOpen
- Color: Orange
- Instructions: "Supportive tutor mode. Explain concepts clearly, provide examples, and encourage questions."

## Knowledge Bases

Knowledge bases store reference documents and files that provide context for AI conversations within a project.

### Supported File Types

**Documents**:
- PDF (.pdf)
- Microsoft Word (.docx)
- Plain text (.txt)
- Markdown (.md)
- Rich Text (.rtf)

**Spreadsheets & Data**:
- CSV (.csv)
- Microsoft Excel (.xlsx)
- JSON (.json)
- XML (.xml)

**Code**:
- All programming languages (.js, .py, .ts, etc.)
- Jupyter notebooks (.ipynb)
- Configuration files (.yaml, .toml, .env)

**Web**:
- HTML (.html)
- CSS (.css)
- JavaScript (.js)

### Adding Files to Knowledge Base

1. Open project detail view
2. Click **Knowledge Base** tab
3. Click **Add Files** button
4. Select files to upload
5. Wait for processing
6. Files appear in knowledge base

### File Processing

**Text Extraction**:
- PDF text extraction
- Word document parsing
- Spreadsheet data extraction
- Code syntax highlighting

**File Metadata**:
- Original filename
- File size
- Page count (for PDFs)
- Upload timestamp
- Content preview

**Storage**:
- Files stored in IndexedDB
- Compressed to save space
- Full-text search capability
- Version tracking

### Knowledge Base Features

**Search Knowledge Base**:
- Full-text search across all files
- Filter by file type
- Sort by name/date/size
- Preview file contents

**File Actions**:
- **View**: Open file in viewer
- **Download**: Save to local device
- **Delete**: Remove from knowledge base
- **Rename**: Change filename
- **Replace**: Upload new version

**RAG Integration**:
- Knowledge base files indexed for RAG search
- AI can reference uploaded documents
- Context-aware responses
- Source citations

### Best Practices for Knowledge Bases

**File Organization**:
- Group related documents
- Use descriptive filenames
- Keep files current
- Remove outdated content

**File Selection**:
- Add reference documentation
- Include style guides
- Upload code examples
- Add project specifications

**Size Management**:
- Compress large PDFs
- Split very large files
- Monitor storage usage
- Archive old projects

## Adding Sessions to Projects

Link existing or new sessions to projects.

### Adding Existing Sessions

1. Open project detail view
2. Click **Sessions** tab
3. Click **Add Sessions** button
4. Select sessions from list
5. Click **Add to Project**

Sessions can belong to multiple projects simultaneously.

### Creating Sessions in Projects

**From Project View**:
1. Open project
2. Click **New Chat in Project** button
3. Session automatically linked to project
4. Project context applied automatically

**From Chat Interface**:
1. Start new session
2. Click **More** menu
3. Select **Link to Project**
4. Choose project from list
5. Session linked

### Project Context in Sessions

When a session is linked to a project:

**Automatic Context**:
- Project custom instructions applied
- Knowledge base files accessible
- Project settings used (provider, model)
- Project icon shown in chat header

**AI Awareness**:
- AI knows about project context
- References knowledge base files
- Follows project instructions
- Maintains project consistency

**Visual Indicators**:
- Project badge in chat header
- Project name in session list
- Color-coded project indicator
- Icon displayed next to session

## Managing Projects

### Project List View

**All Projects Page**:
- Grid or list view toggle
- Search and filter projects
- Sort by name/date/accessed
- Quick actions menu

**Project Cards Display**:
- Project icon and color
- Name and description
- Session count
- Last accessed timestamp
- Tags display

**Project Actions**:
- Open project
- Edit project
- Archive project
- Delete project
- Pin important projects

### Editing Projects

1. Open project detail view
2. Click **Edit** button
3. Modify project details:
   - Update name/description
   - Change icon/color
   - Add/remove tags
   - Update custom instructions
   - Change default settings
4. Click **Save Changes**

### Project Tags

**Predefined Tags**:
- Work, Personal, Learning
- Research, Development
- Writing, Design
- Important, Urgent

**Custom Tags**:
- Create project-specific tags
- Color-coded tags
- Multi-tag support
- Filter by tags

**Tag Management**:
- Add tags when creating/editing project
- Remove tags from edit view
- Filter projects by tag in list view

### Archiving Projects

Archive completed or inactive projects:

1. Open project list
2. Click archive icon on project card
3. Confirm archive action
4. Project moved to archive

**Archived Projects**:
- Not shown in main list
- Accessible from "Archived" filter
- Can be restored anytime
- Data preserved

**Restore Archive**:
1. Filter by "Archived"
2. Click restore icon
3. Project moved back to active list

### Deleting Projects

**Soft Delete** (Recommended):
1. Open project
2. Click **More** menu
3. Select **Archive**
4. Project preserved but hidden

**Permanent Delete**:
1. Open project
2. Click **More** menu
3. Select **Delete Project**
4. Confirm deletion
5. Project and all data removed

**Warning**: Permanent delete cannot be undone. All sessions, knowledge base files, and project data are lost.

### Project Statistics

Track project activity:

**Session Count**:
- Total sessions in project
- Active sessions
- Archived sessions

**Message Count**:
- Total messages across all sessions
- User messages
- AI responses

**Activity Timeline**:
- Project creation date
- Last session created
- Last message sent
- Time since last access

## Project Templates

### Built-in Templates

Cognia includes several project templates:

#### Software Development Template

**Purpose**: Build and maintain software projects

**Configuration**:
- Icon: Code
- Color: Blue (#3B82F6)
- Mode: Chat
- Provider: Auto
- Instructions:
```
You are working on a software development project. Focus on:
- Writing clean, maintainable code
- Following best practices and design patterns
- Including comprehensive documentation
- Writing tests for critical functionality
- Considering performance and scalability
- Explaining trade-offs in design decisions
```

**Recommended Knowledge Base**:
- Coding style guides
- API documentation
- Architecture diagrams
- Database schemas

#### Research Project Template

**Purpose**: Conduct academic or professional research

**Configuration**:
- Icon: GraduationCap
- Color: Purple (#8B5CF6)
- Mode: Research
- Provider: Auto
- Instructions:
```
This is a research project. When helping:
- Find and cite credible sources
- Provide evidence-based answers
- Consider multiple perspectives
- Highlight limitations in current knowledge
- Maintain academic rigor
- Format citations consistently
```

**Recommended Knowledge Base**:
- Research papers
- Reference materials
- Citation style guides
- Literature review notes

#### Content Creation Template

**Purpose**: Write articles, blog posts, marketing copy

**Configuration**:
- Icon: PenTool
- Color: Pink (#EC4899)
- Mode: Chat
- Provider: Auto
- Instructions:
```
You are assisting with content creation. Focus on:
- Creating engaging, clear content
- Maintaining consistent tone and voice
- Structuring content logically
- Using compelling headlines
- Optimizing for target audience
- Including calls-to-action when appropriate
```

**Recommended Knowledge Base**:
- Style guides
- Brand guidelines
- Target audience profiles
- Content examples

#### Client Work Template

**Purpose**: Manage client projects and communications

**Configuration**:
- Icon: Briefcase
- Color: Green (#22C55E)
- Mode: Chat
- Provider: Auto
- Instructions:
```
This is client work. Maintain professionalism by:
- Using formal, business-appropriate language
- Being clear and concise
- Focusing on client objectives
- Providing deliverables in agreed formats
- Maintaining client confidentiality
- Tracking time and scope carefully
```

**Recommended Knowledge Base**:
- Contracts and agreements
- Client requirements
- Project timelines
- Communication logs

#### Learning Template

**Purpose**: Learn new skills or subjects

**Configuration**:
- Icon: BookOpen
- Color: Orange (#F97316)
- Mode: Learning
- Provider: Auto
- Instructions:
```
You are supporting learning. When teaching:
- Explain concepts clearly and gradually
- Use examples and analogies
- Check understanding before moving on
- Encourage questions
- Provide practice exercises
- Build confidence with positive reinforcement
```

**Recommended Knowledge Base**:
- Learning materials
- Practice problems
- Reference sheets
- Progress notes

### Creating Custom Templates

Save project configurations as templates:

1. Configure project with desired settings
2. Click **More** menu
3. Select **Save as Template**
4. Enter template name
5. Template available for future projects

Templates include:
- Icon and color
- Custom instructions
- Default settings
- Tags
- Knowledge base structure (without files)

## Import and Export

### Export Projects

1. Open project
2. Click **More** menu
3. Select **Export Project**
4. Choose export format:
   - **JSON**: Full project data with sessions
   - **Markdown**: Text summary
   - **PDF**: Formatted report
5. Include options:
   - Knowledge base files
   - Session transcripts
   - Statistics
6. Click **Export**

Export includes:
- Project metadata
- Custom instructions
- All linked sessions
- Knowledge base files
- Tags and settings

### Import Projects

1. Go to Projects page
2. Click **Import** button
3. Select project file (.json)
4. Review imported data
5. Click **Import Project**

Import supports:
- Previously exported Cognia projects
- Compatible JSON formats
- Session data
- Knowledge base files

### Backup and Restore

**Full Backup**:
- Export all projects
- Download as archive
- Store safely

**Restore from Backup**:
1. Click **Import** on Projects page
2. Select backup archive
3. Choose projects to restore
4. Confirm import

## Best Practices

### Project Organization

**By Client**:
- Create one project per client
- All client work in one place
- Easy client handoff

**By Technology**:
- React projects
- Python projects
- Infrastructure projects

**By Domain**:
- Machine learning
- Web development
- Data analysis

**By Lifecycle**:
- Active development
- Maintenance mode
- Completed projects

### Naming Conventions

**Use Clear Names**:
- "Client X - Website Redesign"
- "Personal - Learning TypeScript"
- "Research - AI Trends 2024"

**Include Identifiers**:
- Client names
- Technology stack
- Year or quarter
- Project phase

**Avoid Vague Names**:
- Instead of "My Project"
- Use "E-commerce Platform - Frontend"

### Knowledge Base Management

**Keep Focused**:
- Only relevant documents
- Remove outdated files
- Update regularly

**Organize Files**:
- Descriptive filenames
- Logical grouping
- Version control

**Monitor Size**:
- Check storage usage
- Archive old projects
- Compress large files

### Session Management

**Link Relevant Sessions**:
- All related work in one project
- Easy context switching
- Better organization

**Remove Orphaned Sessions**:
- Sessions not linked to projects
- Create appropriate projects
- Or archive individually

**Use Branches**:
- Experiment within sessions
- Don't create new sessions for variations
- Keep related work together

## Tips and Tricks

### Quick Project Creation

- From chat: Click project badge in header, select "Create Project"
- From sidebar: Right-click on "Projects", select "New Project"
- Keyboard: `Ctrl/Cmd+Shift+P` (when in Projects view)

### Project Navigation

- Click project badge in chat header to go to project
- Use project dropdown to switch projects
- Pin frequently accessed projects

### Search Across Projects

- Use global search (Ctrl/Cmd+K)
- Filter by project name
- Search within project knowledge base
- Find sessions across projects

### Project Shortcuts

- `Ctrl/Cmd+Shift+N`: New project
- `Ctrl/Cmd+P`: Go to projects
- `P`: Toggle projects panel
- `G then P`: Navigate to projects (vim-style)

## Troubleshooting

### Project Not Showing in List

**Check**:
- Not archived (check archived filter)
- Not deleted
- Proper permissions

**Solutions**:
- Clear archive filter
- Check "All Projects" view
- Refresh page

### Knowledge Base File Not Processing

**Check**:
- File size within limits
- Supported file format
- Browser storage available

**Solutions**:
- Compress large files
- Convert to supported format
- Clear browser storage

### Sessions Not Linking

**Check**:
- Session exists
- Project not archived
- Sufficient permissions

**Solutions**:
- Create new session in project
- Unarchive project
- Check error messages

### Storage Quota Exceeded

**Check**:
- Project storage usage
- Knowledge base file sizes
- IndexedDB limits

**Solutions**:
- Remove old knowledge base files
- Archive old projects
- Compress files before upload
- Use desktop app for higher limits

### Import Failing

**Check**:
- Correct file format (.json)
- Valid Cognia export
- File not corrupted

**Solutions**:
- Verify file format
- Re-export from source
- Check file size
- Use desktop app if web fails
