/**
 * Slash Command Registry
 *
 * Central registry for all slash commands with:
 * - Command registration
 * - Alias management
 * - Command lookup and execution
 * - Built-in commands
 */

import type {
  SlashCommandDefinition,
  SlashCommandGroup,
  ParsedSlashCommand,
  SlashCommandContext,
  SlashCommandResult,
} from '@/types/chat/slash-commands';
import type { SlashCommandCategory } from '@/types/chat/input-completion';
import { SLASH_COMMAND_CATEGORY_INFO } from '@/types/chat/slash-commands';
import { getPluginLifecycleHooks } from '@/lib/plugin';

/** Singleton registry instance */
class SlashCommandRegistry {
  private commands: Map<string, SlashCommandDefinition> = new Map();
  private aliases: Map<string, string> = new Map();

  /** Register a command */
  register(command: SlashCommandDefinition): void {
    this.commands.set(command.command.toLowerCase(), command);

    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliases.set(alias.toLowerCase(), command.command.toLowerCase());
      }
    }
  }

  /** Register multiple commands */
  registerAll(commands: SlashCommandDefinition[]): void {
    for (const command of commands) {
      this.register(command);
    }
  }

  /** Unregister a command */
  unregister(commandName: string): void {
    const command = this.commands.get(commandName.toLowerCase());
    if (command) {
      this.commands.delete(commandName.toLowerCase());
      if (command.aliases) {
        for (const alias of command.aliases) {
          this.aliases.delete(alias.toLowerCase());
        }
      }
    }
  }

  /** Get a command by name or alias */
  get(commandName: string): SlashCommandDefinition | undefined {
    const normalizedName = commandName.toLowerCase();
    const actualCommand = this.aliases.get(normalizedName) || normalizedName;
    return this.commands.get(actualCommand);
  }

  /** Get all commands */
  getAll(): SlashCommandDefinition[] {
    return Array.from(this.commands.values()).filter((cmd) => !cmd.hidden);
  }

  /** Get commands by category */
  getByCategory(category: SlashCommandCategory): SlashCommandDefinition[] {
    return this.getAll().filter((cmd) => cmd.category === category);
  }

  /** Get commands grouped by category */
  getGrouped(): SlashCommandGroup[] {
    const groups: SlashCommandGroup[] = [];
    const categories = Object.keys(SLASH_COMMAND_CATEGORY_INFO) as SlashCommandCategory[];

    for (const category of categories) {
      const commands = this.getByCategory(category);
      if (commands.length > 0) {
        groups.push({
          category,
          label: SLASH_COMMAND_CATEGORY_INFO[category].label,
          commands,
        });
      }
    }

    return groups.sort(
      (a, b) =>
        SLASH_COMMAND_CATEGORY_INFO[a.category].order -
        SLASH_COMMAND_CATEGORY_INFO[b.category].order
    );
  }

  /** Search commands by query */
  search(query: string): SlashCommandDefinition[] {
    if (!query) return this.getAll();

    const normalizedQuery = query.toLowerCase();
    return this.getAll().filter((cmd) => {
      if (cmd.command.toLowerCase().includes(normalizedQuery)) return true;
      if (cmd.description.toLowerCase().includes(normalizedQuery)) return true;
      if (cmd.aliases?.some((a) => a.toLowerCase().includes(normalizedQuery))) return true;
      return false;
    });
  }

  /** Parse a slash command from input text */
  parse(input: string, cursorPosition?: number): ParsedSlashCommand | null {
    const pos = cursorPosition ?? input.length;
    const textBeforeCursor = input.slice(0, pos);

    // Find the last / before cursor
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/');
    if (lastSlashIndex === -1) return null;

    // Check if / is at start or after whitespace
    if (lastSlashIndex > 0 && !/\s/.test(input[lastSlashIndex - 1])) {
      return null;
    }

    // Extract command and args
    const afterSlash = input.slice(lastSlashIndex + 1);
    const spaceIndex = afterSlash.indexOf(' ');
    const commandEnd = spaceIndex === -1 ? afterSlash.length : spaceIndex;
    const command = afterSlash.slice(0, commandEnd);
    const rawArgs = spaceIndex === -1 ? '' : afterSlash.slice(spaceIndex + 1).trim();

    // Don't match if there's a newline in the command (means command is complete)
    if (command.includes('\n')) return null;

    // Parse arguments (simple key=value or positional)
    const args: Record<string, string> = {};
    if (rawArgs) {
      const argParts = rawArgs.split(/\s+/);
      let positionalIndex = 0;

      for (const part of argParts) {
        if (part.includes('=')) {
          const [key, ...valueParts] = part.split('=');
          args[key] = valueParts.join('=');
        } else {
          args[`arg${positionalIndex}`] = part;
          positionalIndex++;
        }
      }
    }

    return {
      matchedText: input.slice(lastSlashIndex, lastSlashIndex + 1 + commandEnd),
      command,
      startIndex: lastSlashIndex,
      endIndex: lastSlashIndex + 1 + commandEnd + (rawArgs ? 1 + rawArgs.length : 0),
      args,
      rawArgs,
    };
  }

  /** Execute a command */
  async execute(
    commandName: string,
    args: Record<string, string>,
    context: SlashCommandContext
  ): Promise<SlashCommandResult> {
    const command = this.get(commandName);
    if (!command) {
      return {
        success: false,
        message: `Unknown command: /${commandName}`,
      };
    }

    try {
      // Dispatch to plugin command hooks first
      try {
        const handled = await getPluginLifecycleHooks().dispatchOnCommand(commandName, Object.values(args));
        if (handled) {
          return { success: true, message: `Command handled by plugin: /${commandName}` };
        }
      } catch { /* plugin system may not be initialized */ }

      return await command.handler(args, context);
    } catch (error) {
      return {
        success: false,
        message: `Command failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /** Check if a command exists */
  has(commandName: string): boolean {
    return this.get(commandName) !== undefined;
  }

  /** Clear all commands */
  clear(): void {
    this.commands.clear();
    this.aliases.clear();
  }
}

/** Global registry instance */
export const slashCommandRegistry = new SlashCommandRegistry();

/** Built-in commands */
const BUILT_IN_COMMANDS: SlashCommandDefinition[] = [
  {
    id: 'clear',
    command: 'clear',
    description: 'Clear the current conversation',
    category: 'chat',
    aliases: ['cls', 'reset'],
    examples: ['/clear'],
    handler: () => ({
      success: true,
      message: 'Conversation cleared',
      clearInput: true,
      data: { action: 'clear-conversation' },
    }),
  },
  {
    id: 'new',
    command: 'new',
    description: 'Start a new conversation',
    category: 'chat',
    aliases: ['newchat'],
    examples: ['/new'],
    handler: () => ({
      success: true,
      message: 'New conversation started',
      clearInput: true,
      data: { action: 'new-conversation' },
    }),
  },
  {
    id: 'image',
    command: 'image',
    description: 'Generate an image from a prompt',
    category: 'media',
    params: [
      {
        name: 'prompt',
        type: 'string',
        required: true,
        description: 'Image generation prompt',
      },
    ],
    examples: ['/image a sunset over mountains', '/image prompt="cute cat"'],
    handler: (args) => ({
      success: true,
      newInput: `Generate an image: ${args.arg0 || args.prompt || ''}`,
      submit: true,
    }),
  },
  {
    id: 'summarize',
    command: 'summarize',
    description: 'Summarize the current conversation',
    category: 'chat',
    aliases: ['sum', 'summary'],
    examples: ['/summarize'],
    handler: () => ({
      success: true,
      newInput: 'Please provide a concise summary of our conversation so far.',
      submit: true,
    }),
  },
  {
    id: 'mode',
    command: 'mode',
    description: 'Switch chat mode',
    category: 'system',
    params: [
      {
        name: 'mode',
        type: 'enum',
        required: false,
        enumValues: ['chat', 'agent', 'research'],
        description: 'Mode to switch to',
      },
    ],
    examples: ['/mode agent', '/mode chat'],
    handler: (args) => ({
      success: true,
      message: args.arg0 ? `Switched to ${args.arg0} mode` : 'Mode selection required',
      data: { action: 'switch-mode', mode: args.arg0 },
    }),
  },
  {
    id: 'model',
    command: 'model',
    description: 'Switch AI model',
    category: 'system',
    aliases: ['provider'],
    params: [
      {
        name: 'model',
        type: 'string',
        required: false,
        description: 'Model name to switch to',
      },
    ],
    examples: ['/model gpt-4', '/model claude-3'],
    handler: (args) => ({
      success: true,
      message: args.arg0 ? `Switching to ${args.arg0}` : 'Opening model selector',
      data: { action: 'switch-model', model: args.arg0 },
    }),
  },
  {
    id: 'help',
    command: 'help',
    description: 'Show available commands',
    category: 'system',
    aliases: ['?', 'commands'],
    examples: ['/help', '/help image'],
    handler: (args) => {
      const commandName = args.arg0;
      if (commandName) {
        const cmd = slashCommandRegistry.get(commandName);
        if (cmd) {
          return {
            success: true,
            message: `/${cmd.command}: ${cmd.description}${cmd.examples ? `\nExamples: ${cmd.examples.join(', ')}` : ''}`,
          };
        }
        return {
          success: false,
          message: `Unknown command: ${commandName}`,
        };
      }
      return {
        success: true,
        message: 'Available commands:\n' + slashCommandRegistry.getAll().map((c) => `/${c.command} - ${c.description}`).join('\n'),
        data: { action: 'show-help' },
      };
    },
  },
  {
    id: 'code',
    command: 'code',
    description: 'Insert a code block template',
    category: 'chat',
    params: [
      {
        name: 'language',
        type: 'string',
        required: false,
        description: 'Programming language',
      },
    ],
    examples: ['/code python', '/code javascript'],
    handler: (args) => ({
      success: true,
      newInput: `\`\`\`${args.arg0 || ''}\n\n\`\`\``,
      clearInput: false,
    }),
  },
  {
    id: 'web',
    command: 'web',
    description: 'Search the web for information',
    category: 'agent',
    aliases: ['search', 'google'],
    params: [
      {
        name: 'query',
        type: 'string',
        required: true,
        description: 'Search query',
      },
    ],
    examples: ['/web latest AI news', '/search weather today'],
    handler: (args) => ({
      success: true,
      newInput: `Search the web for: ${args.arg0 || args.rawArgs || ''}`,
      submit: true,
      data: { action: 'web-search', query: args.arg0 || args.rawArgs },
    }),
  },
  {
    id: 'translate',
    command: 'translate',
    description: 'Translate text to another language',
    category: 'chat',
    aliases: ['tr'],
    params: [
      {
        name: 'language',
        type: 'string',
        required: true,
        description: 'Target language',
      },
      {
        name: 'text',
        type: 'string',
        required: false,
        description: 'Text to translate',
      },
    ],
    examples: ['/translate chinese Hello world', '/tr spanish How are you?'],
    handler: (args) => ({
      success: true,
      newInput: `Translate to ${args.arg0 || 'English'}: ${args.rawArgs?.replace(args.arg0 || '', '').trim() || '[paste text here]'}`,
      submit: args.rawArgs ? true : false,
    }),
  },
  {
    id: 'explain',
    command: 'explain',
    description: 'Explain a concept or code',
    category: 'chat',
    params: [
      {
        name: 'topic',
        type: 'string',
        required: false,
        description: 'Topic to explain',
      },
    ],
    examples: ['/explain async/await', '/explain quantum computing'],
    handler: (args) => ({
      success: true,
      newInput: args.arg0
        ? `Please explain ${args.arg0}${args.rawArgs ? ` ${args.rawArgs}` : ''} in simple terms.`
        : 'Please explain this in simple terms: ',
      submit: !!args.arg0,
    }),
  },
  {
    id: 'settings',
    command: 'settings',
    description: 'Open settings panel',
    category: 'navigation',
    aliases: ['config', 'preferences'],
    examples: ['/settings'],
    handler: () => ({
      success: true,
      data: { action: 'open-settings' },
    }),
  },
];

// Register built-in commands
slashCommandRegistry.registerAll(BUILT_IN_COMMANDS);

/** Export registry functions for convenience */
export const registerCommand = (cmd: SlashCommandDefinition) => slashCommandRegistry.register(cmd);
export const unregisterCommand = (name: string) => slashCommandRegistry.unregister(name);
export const getCommand = (name: string) => slashCommandRegistry.get(name);
export const getAllCommands = () => slashCommandRegistry.getAll();
export const getGroupedCommands = () => slashCommandRegistry.getGrouped();
export const searchCommands = (query: string) => slashCommandRegistry.search(query);
export const parseSlashCommand = (input: string, pos?: number) => slashCommandRegistry.parse(input, pos);
export const executeCommand = (
  name: string,
  args: Record<string, string>,
  ctx: SlashCommandContext
) => slashCommandRegistry.execute(name, args, ctx);

// ============================================================================
// External Agent Command Integration
// ============================================================================

/**
 * ACP Available Command type (inline to avoid circular imports)
 */
interface AcpAvailableCommandInput {
  name: string;
  description?: string;
  inputHint?: string;
}

/**
 * Register external agent slash commands from ACP available_commands_update
 * These commands are prefixed with the agent name to avoid conflicts
 *
 * @param agentId Unique identifier for the agent
 * @param agentName Display name of the agent
 * @param commands Available commands from the agent
 * @param onExecute Callback when command is executed
 */
export function registerExternalAgentCommands(
  agentId: string,
  agentName: string,
  commands: AcpAvailableCommandInput[],
  onExecute: (commandName: string, args: string) => void
): void {
  for (const cmd of commands) {
    const commandId = `external-${agentId}-${cmd.name}`;
    const commandName = cmd.name.toLowerCase();

    slashCommandRegistry.register({
      id: commandId,
      command: commandName,
      description: cmd.description || `${agentName} command: ${cmd.name}`,
      longDescription: cmd.inputHint,
      category: 'agent',
      examples: cmd.inputHint ? [`/${commandName} ${cmd.inputHint}`] : [`/${commandName}`],
      handler: (args) => {
        onExecute(cmd.name, args.rawArgs || '');
        return {
          success: true,
          newInput: `/${cmd.name} ${args.rawArgs || ''}`.trim(),
          submit: true,
        };
      },
    });
  }
}

/**
 * Unregister all commands for an external agent
 *
 * @param agentId Unique identifier for the agent
 */
export function unregisterExternalAgentCommands(agentId: string): void {
  const prefix = `external-${agentId}-`;
  const commandsToRemove = slashCommandRegistry
    .getAll()
    .filter((cmd) => cmd.id.startsWith(prefix));

  for (const cmd of commandsToRemove) {
    slashCommandRegistry.unregister(cmd.command);
  }
}

/**
 * Check if external agent commands are registered
 *
 * @param agentId Unique identifier for the agent
 */
export function hasExternalAgentCommands(agentId: string): boolean {
  const prefix = `external-${agentId}-`;
  return slashCommandRegistry.getAll().some((cmd) => cmd.id.startsWith(prefix));
}
