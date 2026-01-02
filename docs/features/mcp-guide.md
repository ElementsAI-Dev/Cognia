# MCP (Model Context Protocol) Guide

Model Context Protocol (MCP) enables AI models to interact with external tools, data sources, and services through a standardized protocol.

## What is MCP?

MCP is an open protocol that allows AI assistants to:

- **Access external tools**: Execute commands and utilities
- **Read data sources**: Query databases, APIs, files
- **Perform actions**: Automate workflows
- **Extend capabilities**: Add custom functionality

### Key Concepts

**MCP Server**: Provides tools, resources, and prompts to AI models
**MCP Client**: Cognia's backend that communicates with servers
**Tools**: Actions the AI can execute (e.g., read file, search web)
**Resources**: Data sources the AI can access (e.g., database, files)
**Prompts**: Pre-configured prompts the AI can use

### Architecture

```
Cognia Frontend (React)
    ↓ JSON-RPC 2.0
Cognia Backend (Rust/Tauri)
    ↓ stdio / SSE
MCP Servers (Node.js, Python, etc.)
    ↓
External Services (Filesystem, GitHub, Database, etc.)
```

## MCP Server Installation

### Quick Install Wizard

1. Go to **Settings** > **MCP**
2. Click **Add Server** > **Quick Install**
3. Browse server templates
4. Click **Install** on desired server
5. Configure required environment variables
6. Click **Start Server**

### Manual Server Installation

1. Go to **Settings** > **MCP**
2. Click **Add Server** > **Custom Server**
3. Fill in server configuration:
   - **Name**: Display name
   - **Command**: npx (for Node.js servers)
   - **Args**: Server package name
   - **Environment Variables**: API keys, config
4. Click **Save & Start**

### Server Templates

Cognia includes pre-configured templates for popular MCP servers:

#### Filesystem Server

Access and manipulate local files.

**Purpose**: Read, write, and manage files on your local filesystem

**Installation**:

```bash
Command: npx
Args: -y @modelcontextprotocol/server-filesystem
```

**Environment Variables**: None required

**Tools Provided**:

- `read_file`: Read file contents
- `write_file`: Write content to file
- `create_directory`: Create directory
- `list_directory`: List directory contents
- `move_file`: Move/rename file
- `search_files`: Search for files by name/content

**Use Cases**:

- Reading configuration files
- Writing generated code to files
- Project file management
- Log file analysis

**Example Prompt**:

```
Read the package.json file and update the dependencies to their latest versions.
```

#### GitHub Server

Interact with GitHub repositories.

**Purpose**: Access GitHub repos, issues, pull requests

**Installation**:

```bash
Command: npx
Args: -y @modelcontextprotocol/server-github
```

**Environment Variables**:

- `GITHUB_PERSONAL_ACCESS_TOKEN`: Your GitHub PAT

**Tools Provided**:

- `create_issue`: Create GitHub issue
- `create_pull_request`: Create PR
- `fork_repository`: Fork a repository
- `push_files`: Push files to repo
- `read_repository`: Read repo contents
- `search_issues_and_prs`: Search issues and PRs

**Use Cases**:

- Create issues from bugs
- Generate pull requests
- Review code changes
- Search repositories

**Example Prompt**:

```
Search for open issues in the facebook/react repository related to hooks.
```

#### PostgreSQL Server

Query PostgreSQL databases.

**Purpose**: Execute SQL queries on PostgreSQL databases

**Installation**:

```bash
Command: npx
Args: -y @modelcontextprotocol/server-postgres
```

**Environment Variables**:

- `CONNECTION_STRING`: PostgreSQL connection string

**Tools Provided**:

- `query`: Execute SQL query
- `analyze_table`: Get table schema
- `list_tables`: List all tables

**Use Cases**:

- Query databases
- Analyze data
- Generate reports
- Database exploration

**Example Prompt**:

```
Connect to my database and find the top 10 customers by revenue.
```

#### SQLite Server

Query SQLite database files.

**Purpose**: Execute SQL on local SQLite files

**Installation**:

```bash
Command: npx
Args: -y @modelcontextprotocol/server-sqlite
```

**Environment Variables**: None (path provided in query)

**Tools Provided**:

- `query`: Execute SQL query
- `schema`: Get database schema

**Use Cases**:

- Analyze local databases
- Query app data
- Generate reports from SQLite

**Example Prompt**:

```
Open the database.db file and show me all users created this month.
```

#### Brave Search Server

Web search using Brave Search API.

**Purpose**: Search the web using Brave's search API

**Installation**:

```bash
Command: npx
Args: -y @modelcontextprotocol/server-brave-search
```

**Environment Variables**:

- `BRAVE_API_KEY`: Your Brave Search API key

**Tools Provided**:

- `brave_search`: Execute web search
- `brave_web_search`: Search with advanced options

**Use Cases**:

- Web search integration
- Current information retrieval
- Source gathering

**Example Prompt**:

```
Search for recent articles about TypeScript performance optimization.
```

#### Memory Server

Persistent memory storage across sessions.

**Purpose**: Store and retrieve information across conversations

**Installation**:

```bash
Command: npx
Args: -y @modelcontextprotocol/server-memory
```

**Environment Variables**: None

**Tools Provided**:

- `create_memory`: Create new memory
- `get_memory`: Retrieve memories
- `search_memories`: Search by keyword
- `delete_memory`: Remove memory

**Use Cases**:

- Cross-session memory
- User preferences
- Learning tracking
- Fact storage

**Example Prompt**:

```
Remember that I prefer TypeScript over JavaScript for all future projects.
```

#### Puppeteer Server

Browser automation and web scraping.

**Purpose**: Automate browser actions, scrape websites

**Installation**:

```bash
Command: npx
Args: -y @modelcontextprotocol/server-puppeteer
```

**Environment Variables**: None

**Tools Provided**:

- `navigate_to`: Navigate to URL
- `screenshot`: Capture page screenshot
- `click`: Click element
- `fill`: Fill form field
- `extract_text`: Extract page text
- `execute_script`: Run JavaScript

**Use Cases**:

- Web scraping
- Automated testing
- Screenshot capture
- Form automation

**Example Prompt**:

```
Navigate to example.com, take a screenshot, and extract the article text.
```

#### Slack Server

Interact with Slack workspaces.

**Purpose**: Send messages, read channels, manage Slack

**Installation**:

```bash
Command: npx
Args: -y @modelcontextprotocol/server-slack
```

**Environment Variables**:

- `SLACK_BOT_TOKEN`: Slack bot token
- `SLACK_TEAM_ID`: Team ID

**Tools Provided**:

- `post_message`: Post to channel
- `read_channel`: Read channel messages
- `list_channels`: List all channels
- `search_messages`: Search messages

**Use Cases**:

- Automated notifications
- Message analysis
- Channel monitoring

**Example Prompt**:

```
Read the last 50 messages from #general and summarize key points.
```

## MCP Configuration

### Server Connection Types

#### stdio (Standard Input/Output)

**How it works**: Server communicates via stdin/stdout

**Best for**: Local servers, Node.js scripts, Python scripts

**Configuration**:

```json
{
  "name": "my-server",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-xyz"],
  "connectionType": "stdio",
  "env": {
    "API_KEY": "your-key"
  }
}
```

**Pros**:

- Simple setup
- Good for local tools
- No network required

**Cons**:

- Server must be on same machine
- Can't access remote services

#### SSE (Server-Sent Events)

**How it works**: Server communicates via HTTP SSE

**Best for**: Remote servers, cloud services, web APIs

**Configuration**:

```json
{
  "name": "remote-server",
  "url": "https://api.example.com/mcp",
  "connectionType": "sse",
  "env": {
    "AUTH_TOKEN": "your-token"
  }
}
```

**Pros**:

- Remote server access
- Cloud integration
- Shared servers

**Cons**:

- Requires network
- More complex setup

### Environment Variables

Set environment variables for MCP servers:

**In Settings UI**:

1. Go to **Settings** > **MCP**
2. Edit server configuration
3. Add environment variables
4. Format: `KEY=value`

**Common Variables**:

- `API_KEY`: Authentication tokens
- `CONNECTION_STRING`: Database connections
- `GITHUB_PERSONAL_ACCESS_TOKEN`: GitHub access
- `BRAVE_API_KEY`: Brave Search key
- `SLACK_BOT_TOKEN`: Slack bot token

### Server Lifecycle

**Auto-Start**:

- Enable in server configuration
- Server starts when Cognia launches
- Faster access to tools

**Manual Start**:

- Click **Start** button in server list
- Server starts on demand
- Saves resources

**Auto-Restart**:

- Server crashes trigger auto-restart
- Configurable retry attempts
- Exponential backoff

**Stop Server**:

- Click **Stop** button
- Graceful shutdown
- Resources freed

## Using MCP Tools

### Tool Invocation

AI automatically calls MCP tools when needed:

```
User: "Read the config.yml file and show me the database settings."

AI: [Invokes filesystem.read_file tool]
"I found the database settings in config.yml..."
```

### Manual Tool Usage

Reference tools directly in prompts:

```
User: "@filesystem:read_file the package.json file"
```

Mention format: `@server_name:tool_name`

### Available Tools

View all available tools:

1. Go to **Settings** > **MCP**
2. Click on server name
3. **Tools** tab shows all available tools
4. Click tool for details

### Tool Parameters

Each tool has defined parameters:

**Example**: `read_file` tool

```json
{
  "path": {
    "type": "string",
    "description": "Path to file to read",
    "required": true
  }
}
```

AI automatically provides required parameters based on context.

### Tool Results

Tool results appear in conversation:

```
[Tool: filesystem.read_file]
Result: File contents here...

AI Response: Based on the file contents, I can see...
```

## MCP Resources

Resources are data sources that AI can query:

### Types of Resources

**Static Resources**:

- Files (file://)
- Configuration data
- Documentation

**Dynamic Resources**:

- Database queries
- API responses
- Live data

**Subscribable Resources**:

- Real-time updates
- Change notifications
- Event streams

### Accessing Resources

AI can read resources when needed:

```
User: "What repositories do I have on GitHub?"

AI: [Accesses github://repositories resource]
"You have the following repositories..."
```

### Resource Templates

Common resource URIs:

- `file:///path/to/file`: Local file
- `github://user/repo`: GitHub repository
- `postgres://database`: Database table
- `memory://key`: Stored memory

## MCP Prompts

Prompts are pre-configured templates that AI can use:

### Using Prompts

```
User: "Use the memory prompt to save my preferences."

AI: [Invokes memory.create_prompt]
"Saving your preferences to memory..."
```

### Prompt Templates

Common prompt templates:

**Summarization Prompt**:

```
Summarize the following text:
{content}
```

**Code Review Prompt**:

```
Review this code for issues:
{code}
```

**Documentation Prompt**:

```
Generate documentation for:
{code}
```

### Custom Prompts

Create custom prompts in server configuration:

1. Edit server in MCP settings
2. Go to **Prompts** tab
3. Click **Add Prompt**
4. Define prompt template
5. Specify arguments

## MCP Settings

### Server Management

**View All Servers**:

- Settings > MCP
- Server list with status
- Tools, resources, prompts count

**Server Status**:

- Green: Connected and running
- Yellow: Connecting
- Red: Error
- Gray: Disconnected

**Server Actions**:

- Start/Stop
- Restart
- Edit configuration
- Delete server
- View logs

### Server Configuration Options

**General Settings**:

- Name: Display name
- Command: Executable command
- Args: Command arguments
- Connection Type: stdio or SSE

**Environment Variables**:

- Key-value pairs
- Auto-populated for templates
- Secure storage

**Behavior**:

- Auto-start: Start with Cognia
- Auto-restart: Restart on failure
- Retry attempts: Number of retries
- Timeout: Request timeout

### MCP Permissions

**Filesystem Access**:

- Allowed directories
- File operations (read/write)
- Path restrictions

**Network Access**:

- Allowed domains
- API rate limits
- Request timeout

**Data Access**:

- Database connections
- Query restrictions
- Data retention

### Logging and Debugging

**Enable Logging**:

- Settings > MCP > Logging
- Choose log level (debug, info, error)
- View logs in console

**Debug Mode**:

- Detailed request/response logging
- Error stack traces
- Performance metrics

## Troubleshooting

### Server Won't Start

**Check**:

- Command is correct
- Package is installed (`npx -y @package/name`)
- Environment variables set
- Port not in use (for SSE)

**Solutions**:

- Run command manually to test
- Check npm package exists
- Verify environment variables
- Check error logs

### Tools Not Available

**Check**:

- Server is connected (green status)
- Tools initialized properly
- Server capabilities include tools

**Solutions**:

- Restart server
- Refresh MCP connection
- Check server logs
- Verify server implementation

### Permission Errors

**Common Issues**:

- Filesystem access denied
- Invalid API key
- Insufficient permissions

**Solutions**:

- Check file permissions
- Verify API keys
- Update allowed directories
- Check account permissions

### Connection Issues (SSE)

**Check**:

- URL is correct and reachable
- Network connectivity
- Firewall settings
- SSL certificate valid

**Solutions**:

- Test URL in browser
- Check network connection
- Disable firewall temporarily
- Use HTTP instead of HTTPS (local)

### Performance Issues

**Symptoms**:

- Slow tool responses
- High memory usage
- CPU spikes

**Solutions**:

- Reduce tool call frequency
- Limit concurrent requests
- Increase timeout values
- Use faster servers

## Best Practices

### Server Management

1. **Auto-Start Essential Servers**: Enable for frequently used tools
2. **Monitor Server Health**: Check status indicator regularly
3. **Update Servers**: Keep packages up to date
4. **Remove Unused Servers**: Delete to free resources
5. **Test Before Relying**: Verify tools work in critical workflows

### Security

1. **Limit Access**: Only enable required tools
2. **Use Environment Variables**: Never hardcode keys
3. **Rotate API Keys**: Change regularly
4. **Review Permissions**: Check what servers can access
5. **Audit Logs**: Review tool usage periodically

### Performance

1. **Cache Results**: Store frequently accessed data
2. **Batch Operations**: Group multiple operations
3. **Use Efficient Tools**: Choose optimized servers
4. **Monitor Resources**: Track memory and CPU
5. **Set Timeouts**: Prevent hanging requests

### Tool Selection

1. **Match Tool to Task**: Use appropriate tools
2. **Check Capabilities**: Verify tool supports your needs
3. **Test Tools**: Try before relying on them
4. **Have Fallbacks**: Alternative tools if primary fails
5. **Read Documentation**: Understand tool behavior

## Advanced Usage

### Custom MCP Servers

Create your own MCP server:

**Node.js Server Template**:

```javascript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({
  name: 'my-custom-server',
  version: '1.0.0'
});

// Add tool
server.setRequestHandler('tools/list', async () => ({
  tools: [{
    name: 'my_tool',
    description: 'Does something useful',
    inputSchema: {
      type: 'object',
      properties: {
        param: { type: 'string' }
      },
      required: ['param']
    }
  }]
}));

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

**Python Server Template**:

```python
from mcp.server import Server
import asyncio

server = Server("my-custom-server")

@server.tool()
async def my_tool(param: str) -> str:
    """Does something useful"""
    return f"Result: {param}"

async def main():
    await server.run()

asyncio.run(main())
```

### Server Development

1. **Install MCP SDK**: `npm install @modelcontextprotocol/sdk`
2. **Define Tools**: Create tool schemas
3. **Implement Handlers**: Write tool logic
4. **Test Locally**: Use stdio transport
5. **Deploy**: Publish to npm or host

### Integration Patterns

**Multi-Tool Workflows**:

- Chain multiple tools
- Pass results between tools
- Handle tool failures
- Retry logic

**Error Handling**:

- Graceful degradation
- Fallback options
- User notifications
- Logging errors

**Caching Strategy**:

- Cache tool results
- Invalidate on changes
- Respect TTL
- Share cache across sessions

## Security Considerations

### Risk Assessment

**Filesystem Server**:

- Risk: Data loss, unauthorized access
- Mitigation: Limit directories, read-only when possible

**GitHub Server**:

- Risk: Repo modifications, exposure
- Mitigation: Use PAT with limited scope

**Database Servers**:

- Risk: Data leaks, modification
- Mitigation: Read-only user, query limits

**Puppeteer**:

- Risk: Malicious sites, data exposure
- Mitigation: Block domains, sandbox

### Best Practices

1. **Least Privilege**: Minimum required permissions
2. **API Key Scope**: Limit key capabilities
3. **Audit Logs**: Review tool usage
4. **Network Isolation**: Restrict external access
5. **Data Encryption**: Encrypt sensitive data

### Data Privacy

- **Local Processing**: Process data locally when possible
- **No Logging**: Disable logging for sensitive data
- **Clear Data**: Clear cached data after use
- **Secure Storage**: Encrypt environment variables
- **Compliance**: Follow GDPR, SOC2, etc.

## Resources

### Official Documentation

- [MCP Specification](https://spec.modelcontextprotocol.io)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol)
- [Server Templates](https://github.com/modelcontextprotocol/servers)

### Community

- [MCP Discord](https://discord.gg/modelcontextprotocol)
- [GitHub Discussions](https://github.com/modelcontextprotocol)
- [Reddit r/MCP](https://reddit.com/r/mcp)

### Example Servers

- [Official MCP Servers](https://github.com/modelcontextprotocol/servers)
- [Community Servers](https://github.com/topics/mcp-server)
- [Server Templates](https://mcp-template-gallery.dev)
