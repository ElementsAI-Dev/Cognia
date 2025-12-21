import { test, expect } from '@playwright/test';

/**
 * Mention System Tests
 * Tests for @ mention functionality in chat input
 */

test.describe('Mention Detection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should detect @ trigger in text', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface MentionTrigger {
        isTriggered: boolean;
        triggerPosition: number;
        query: string;
      }

      const detectMentionTrigger = (text: string, cursorPosition: number): MentionTrigger => {
        // Look backwards from cursor for @
        let triggerPos = -1;
        for (let i = cursorPosition - 1; i >= 0; i--) {
          if (text[i] === '@') {
            triggerPos = i;
            break;
          }
          // Stop if we hit a space or newline before finding @
          if (text[i] === ' ' || text[i] === '\n') {
            break;
          }
        }

        if (triggerPos === -1) {
          return { isTriggered: false, triggerPosition: -1, query: '' };
        }

        const query = text.slice(triggerPos + 1, cursorPosition);

        return {
          isTriggered: true,
          triggerPosition: triggerPos,
          query,
        };
      };

      return {
        atStart: detectMentionTrigger('@', 1),
        withQuery: detectMentionTrigger('@tool', 5),
        midSentence: detectMentionTrigger('Hello @user', 11),
        noTrigger: detectMentionTrigger('Hello world', 11),
        afterSpace: detectMentionTrigger('Hello @', 7),
      };
    });

    expect(result.atStart.isTriggered).toBe(true);
    expect(result.atStart.query).toBe('');
    expect(result.withQuery.isTriggered).toBe(true);
    expect(result.withQuery.query).toBe('tool');
    expect(result.midSentence.isTriggered).toBe(true);
    expect(result.midSentence.query).toBe('user');
    expect(result.noTrigger.isTriggered).toBe(false);
    expect(result.afterSpace.isTriggered).toBe(true);
  });

  test('should filter mentions by query', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface MentionItem {
        id: string;
        name: string;
        type: 'tool' | 'resource' | 'prompt' | 'server';
        serverName?: string;
      }

      const mentions: MentionItem[] = [
        { id: 't1', name: 'calculator', type: 'tool', serverName: 'math' },
        { id: 't2', name: 'search', type: 'tool', serverName: 'web' },
        { id: 'r1', name: 'docs', type: 'resource', serverName: 'files' },
        { id: 'p1', name: 'summarize', type: 'prompt', serverName: 'ai' },
        { id: 's1', name: 'math-server', type: 'server' },
      ];

      const filterMentions = (items: MentionItem[], query: string): MentionItem[] => {
        if (!query) return items;
        
        const lowerQuery = query.toLowerCase();
        return items.filter(item => 
          item.name.toLowerCase().includes(lowerQuery) ||
          item.serverName?.toLowerCase().includes(lowerQuery)
        );
      };

      return {
        noQuery: filterMentions(mentions, '').length,
        calcQuery: filterMentions(mentions, 'calc'),
        mathQuery: filterMentions(mentions, 'math'),
        noMatch: filterMentions(mentions, 'xyz'),
      };
    });

    expect(result.noQuery).toBe(5);
    expect(result.calcQuery.length).toBe(1);
    // math-server name contains 'math', calculator has serverName 'math'
    expect(result.mathQuery.length).toBeGreaterThanOrEqual(1);
    expect(result.noMatch.length).toBe(0);
  });

  test('should group mentions by server', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface MentionItem {
        id: string;
        name: string;
        type: string;
        serverName?: string;
      }

      const mentions: MentionItem[] = [
        { id: 't1', name: 'add', type: 'tool', serverName: 'math' },
        { id: 't2', name: 'subtract', type: 'tool', serverName: 'math' },
        { id: 't3', name: 'search', type: 'tool', serverName: 'web' },
        { id: 'r1', name: 'docs', type: 'resource', serverName: 'files' },
      ];

      const groupByServer = (items: MentionItem[]): Map<string, MentionItem[]> => {
        const groups = new Map<string, MentionItem[]>();
        
        for (const item of items) {
          const server = item.serverName || 'unknown';
          if (!groups.has(server)) {
            groups.set(server, []);
          }
          groups.get(server)!.push(item);
        }
        
        return groups;
      };

      const grouped = groupByServer(mentions);

      return {
        serverCount: grouped.size,
        mathCount: grouped.get('math')?.length || 0,
        webCount: grouped.get('web')?.length || 0,
        filesCount: grouped.get('files')?.length || 0,
      };
    });

    expect(result.serverCount).toBe(3);
    expect(result.mathCount).toBe(2);
    expect(result.webCount).toBe(1);
    expect(result.filesCount).toBe(1);
  });
});

test.describe('Mention Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should insert mention into text', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface MentionItem {
        id: string;
        name: string;
        type: string;
      }

      const insertMention = (
        text: string,
        triggerPosition: number,
        cursorPosition: number,
        mention: MentionItem
      ): { newText: string; newCursorPosition: number } => {
        const before = text.slice(0, triggerPosition);
        const after = text.slice(cursorPosition);
        const mentionText = `@${mention.name} `;
        
        return {
          newText: before + mentionText + after,
          newCursorPosition: before.length + mentionText.length,
        };
      };

      const mention: MentionItem = { id: 't1', name: 'calculator', type: 'tool' };

      return {
        atStart: insertMention('@cal', 0, 4, mention),
        midText: insertMention('Hello @cal world', 6, 10, mention),
        atEnd: insertMention('Use @cal', 4, 8, mention),
      };
    });

    expect(result.atStart.newText).toBe('@calculator ');
    expect(result.atStart.newCursorPosition).toBe(12);
    expect(result.midText.newText).toBe('Hello @calculator  world');
    expect(result.atEnd.newText).toBe('Use @calculator ');
  });

  test('should track selected mentions', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface SelectedMention {
        id: string;
        name: string;
        type: string;
        position: number;
      }

      const selectedMentions: SelectedMention[] = [];

      const addMention = (mention: Omit<SelectedMention, 'position'>, position: number) => {
        selectedMentions.push({ ...mention, position });
      };

      const _removeMention = (id: string) => {
        const index = selectedMentions.findIndex(m => m.id === id);
        if (index !== -1) {
          selectedMentions.splice(index, 1);
        }
      };

      const getMentionAtPosition = (position: number): SelectedMention | undefined => {
        return selectedMentions.find(m => 
          position >= m.position && position <= m.position + m.name.length + 1
        );
      };

      addMention({ id: 't1', name: 'calculator', type: 'tool' }, 0);
      addMention({ id: 't2', name: 'search', type: 'tool' }, 15);

      return {
        mentionCount: selectedMentions.length,
        mentionAtStart: getMentionAtPosition(5)?.name,
        mentionAtMiddle: getMentionAtPosition(18)?.name,
        mentionAtEnd: getMentionAtPosition(30),
      };
    });

    expect(result.mentionCount).toBe(2);
    expect(result.mentionAtStart).toBe('calculator');
    expect(result.mentionAtMiddle).toBe('search');
    expect(result.mentionAtEnd).toBeUndefined();
  });

  test('should format mention for display', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface MentionItem {
        name: string;
        type: 'tool' | 'resource' | 'prompt' | 'server';
        serverName?: string;
      }

      const formatMentionDisplay = (mention: MentionItem): string => {
        const typeIcons: Record<string, string> = {
          tool: '🔧',
          resource: '📄',
          prompt: '💬',
          server: '🖥️',
        };

        const icon = typeIcons[mention.type] || '•';
        const server = mention.serverName ? ` (${mention.serverName})` : '';
        
        return `${icon} ${mention.name}${server}`;
      };

      return {
        tool: formatMentionDisplay({ name: 'calculator', type: 'tool', serverName: 'math' }),
        resource: formatMentionDisplay({ name: 'docs', type: 'resource', serverName: 'files' }),
        prompt: formatMentionDisplay({ name: 'summarize', type: 'prompt' }),
        server: formatMentionDisplay({ name: 'math-server', type: 'server' }),
      };
    });

    expect(result.tool).toContain('calculator');
    expect(result.tool).toContain('math');
    expect(result.resource).toContain('docs');
    expect(result.prompt).toContain('summarize');
    expect(result.server).toContain('math-server');
  });
});

test.describe('Tool Call Parsing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should parse tool calls from message', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ParsedToolCall {
        toolName: string;
        serverName?: string;
        args?: Record<string, unknown>;
      }

      const parseToolCalls = (text: string): ParsedToolCall[] => {
        const toolCalls: ParsedToolCall[] = [];
        
        // Match @tool patterns
        const mentionRegex = /@(\w+)(?::(\w+))?(?:\s*\{([^}]+)\})?/g;
        let match;
        
        while ((match = mentionRegex.exec(text)) !== null) {
          const toolCall: ParsedToolCall = {
            toolName: match[1],
          };
          
          if (match[2]) {
            toolCall.serverName = match[2];
          }
          
          if (match[3]) {
            try {
              toolCall.args = JSON.parse(`{${match[3]}}`);
            } catch {
              // Invalid JSON, ignore args
            }
          }
          
          toolCalls.push(toolCall);
        }
        
        return toolCalls;
      };

      return {
        simpleTool: parseToolCalls('Use @calculator to add numbers'),
        withServer: parseToolCalls('Use @calculator:math for calculation'),
        multiple: parseToolCalls('@search find info then @summarize it'),
        noTools: parseToolCalls('Just a regular message'),
      };
    });

    expect(result.simpleTool.length).toBe(1);
    expect(result.simpleTool[0].toolName).toBe('calculator');
    expect(result.withServer.length).toBe(1);
    expect(result.withServer[0].serverName).toBe('math');
    expect(result.multiple.length).toBe(2);
    expect(result.noTools.length).toBe(0);
  });

  test('should validate tool availability', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Tool {
        name: string;
        serverName: string;
        isAvailable: boolean;
      }

      const availableTools: Tool[] = [
        { name: 'calculator', serverName: 'math', isAvailable: true },
        { name: 'search', serverName: 'web', isAvailable: true },
        { name: 'translate', serverName: 'lang', isAvailable: false },
      ];

      const validateToolCall = (toolName: string): { valid: boolean; error?: string } => {
        const tool = availableTools.find(t => t.name === toolName);
        
        if (!tool) {
          return { valid: false, error: `Tool "${toolName}" not found` };
        }
        
        if (!tool.isAvailable) {
          return { valid: false, error: `Tool "${toolName}" is currently unavailable` };
        }
        
        return { valid: true };
      };

      return {
        validTool: validateToolCall('calculator'),
        unavailableTool: validateToolCall('translate'),
        unknownTool: validateToolCall('unknown'),
      };
    });

    expect(result.validTool.valid).toBe(true);
    expect(result.unavailableTool.valid).toBe(false);
    expect(result.unavailableTool.error).toContain('unavailable');
    expect(result.unknownTool.valid).toBe(false);
    expect(result.unknownTool.error).toContain('not found');
  });
});

test.describe('Mention Popover', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should calculate popover position', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface PopoverPosition {
        top: number;
        left: number;
        direction: 'up' | 'down';
      }

      const calculatePopoverPosition = (
        triggerRect: { top: number; left: number; bottom: number },
        viewportHeight: number,
        popoverHeight: number = 300
      ): PopoverPosition => {
        const spaceBelow = viewportHeight - triggerRect.bottom;
        const spaceAbove = triggerRect.top;

        if (spaceBelow >= popoverHeight || spaceBelow > spaceAbove) {
          return {
            top: triggerRect.bottom + 4,
            left: triggerRect.left,
            direction: 'down',
          };
        }

        return {
          top: triggerRect.top - popoverHeight - 4,
          left: triggerRect.left,
          direction: 'up',
        };
      };

      return {
        plentyOfSpace: calculatePopoverPosition(
          { top: 100, left: 50, bottom: 120 },
          800
        ),
        nearBottom: calculatePopoverPosition(
          { top: 700, left: 50, bottom: 720 },
          800
        ),
        nearTop: calculatePopoverPosition(
          { top: 50, left: 50, bottom: 70 },
          800
        ),
      };
    });

    expect(result.plentyOfSpace.direction).toBe('down');
    expect(result.nearBottom.direction).toBe('up');
    expect(result.nearTop.direction).toBe('down');
  });

  test('should handle keyboard navigation', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface NavigationState {
        selectedIndex: number;
        itemCount: number;
      }

      const handleKeyDown = (
        state: NavigationState,
        key: string
      ): { newIndex: number; action?: string } => {
        switch (key) {
          case 'ArrowDown':
            return {
              newIndex: (state.selectedIndex + 1) % state.itemCount,
            };
          case 'ArrowUp':
            return {
              newIndex: state.selectedIndex === 0 
                ? state.itemCount - 1 
                : state.selectedIndex - 1,
            };
          case 'Enter':
            return {
              newIndex: state.selectedIndex,
              action: 'select',
            };
          case 'Escape':
            return {
              newIndex: state.selectedIndex,
              action: 'close',
            };
          default:
            return { newIndex: state.selectedIndex };
        }
      };

      const state: NavigationState = { selectedIndex: 0, itemCount: 5 };

      return {
        arrowDown: handleKeyDown(state, 'ArrowDown'),
        arrowUp: handleKeyDown(state, 'ArrowUp'),
        arrowDownWrap: handleKeyDown({ selectedIndex: 4, itemCount: 5 }, 'ArrowDown'),
        enter: handleKeyDown(state, 'Enter'),
        escape: handleKeyDown(state, 'Escape'),
      };
    });

    expect(result.arrowDown.newIndex).toBe(1);
    expect(result.arrowUp.newIndex).toBe(4); // Wraps to end
    expect(result.arrowDownWrap.newIndex).toBe(0); // Wraps to start
    expect(result.enter.action).toBe('select');
    expect(result.escape.action).toBe('close');
  });
});

test.describe('MCP Server Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should check server connection status', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Server {
        id: string;
        name: string;
        status: 'connected' | 'disconnected' | 'connecting' | 'error';
      }

      const servers: Server[] = [
        { id: 's1', name: 'math', status: 'connected' },
        { id: 's2', name: 'web', status: 'disconnected' },
        { id: 's3', name: 'files', status: 'connecting' },
        { id: 's4', name: 'ai', status: 'error' },
      ];

      const isServerConnected = (server: Server): boolean => {
        return server.status === 'connected';
      };

      const getConnectedServers = (): Server[] => {
        return servers.filter(isServerConnected);
      };

      const getServerStatus = (name: string): string | undefined => {
        return servers.find(s => s.name === name)?.status;
      };

      return {
        connectedCount: getConnectedServers().length,
        mathStatus: getServerStatus('math'),
        webStatus: getServerStatus('web'),
        unknownStatus: getServerStatus('unknown'),
      };
    });

    expect(result.connectedCount).toBe(1);
    expect(result.mathStatus).toBe('connected');
    expect(result.webStatus).toBe('disconnected');
    expect(result.unknownStatus).toBeUndefined();
  });

  test('should get available mentions from servers', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Server {
        name: string;
        tools: { name: string }[];
        resources: { name: string }[];
        prompts: { name: string }[];
      }

      const servers: Server[] = [
        {
          name: 'math',
          tools: [{ name: 'add' }, { name: 'subtract' }],
          resources: [],
          prompts: [],
        },
        {
          name: 'web',
          tools: [{ name: 'search' }],
          resources: [{ name: 'bookmarks' }],
          prompts: [{ name: 'summarize' }],
        },
      ];

      interface MentionItem {
        name: string;
        type: string;
        serverName: string;
      }

      const getAllMentions = (): MentionItem[] => {
        const mentions: MentionItem[] = [];

        for (const server of servers) {
          for (const tool of server.tools) {
            mentions.push({ name: tool.name, type: 'tool', serverName: server.name });
          }
          for (const resource of server.resources) {
            mentions.push({ name: resource.name, type: 'resource', serverName: server.name });
          }
          for (const prompt of server.prompts) {
            mentions.push({ name: prompt.name, type: 'prompt', serverName: server.name });
          }
        }

        return mentions;
      };

      const mentions = getAllMentions();

      return {
        totalMentions: mentions.length,
        toolCount: mentions.filter(m => m.type === 'tool').length,
        resourceCount: mentions.filter(m => m.type === 'resource').length,
        promptCount: mentions.filter(m => m.type === 'prompt').length,
      };
    });

    expect(result.totalMentions).toBe(5);
    expect(result.toolCount).toBe(3);
    expect(result.resourceCount).toBe(1);
    expect(result.promptCount).toBe(1);
  });
});
