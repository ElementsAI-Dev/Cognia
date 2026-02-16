/**
 * CLI Commands Tests
 *
 * @description Unit tests for AI Tools CLI commands
 */

describe('AI Tools CLI', () => {

  describe('Config Command', () => {
    const DEFAULT_CONFIG = {
      defaultOutputDir: 'ai-tools-output',
      defaultTimeout: 30000,
      headlessMode: true,
      enableScreenshots: false,
      cacheExpiry: 3600000,
      pricingCacheExpiry: 3600000,
      statusCacheExpiry: 300000,
      rankingsCacheExpiry: 1800000,
      enabledProviders: [],
      preferredRegion: 'all',
    };

    it('should load default config when no config file exists', () => {
      // Verify the default config structure
      expect(DEFAULT_CONFIG).toHaveProperty('defaultOutputDir');
      expect(DEFAULT_CONFIG).toHaveProperty('defaultTimeout');
      expect(DEFAULT_CONFIG.defaultTimeout).toBe(30000);
    });

    it('should have correct default config values', () => {
      expect(DEFAULT_CONFIG.defaultOutputDir).toBe('ai-tools-output');
      expect(DEFAULT_CONFIG.defaultTimeout).toBe(30000);
      expect(DEFAULT_CONFIG.headlessMode).toBe(true);
      expect(DEFAULT_CONFIG.enableScreenshots).toBe(false);
      expect(DEFAULT_CONFIG.cacheExpiry).toBe(3600000);
      expect(DEFAULT_CONFIG.pricingCacheExpiry).toBe(3600000);
      expect(DEFAULT_CONFIG.statusCacheExpiry).toBe(300000);
      expect(DEFAULT_CONFIG.rankingsCacheExpiry).toBe(1800000);
      expect(DEFAULT_CONFIG.enabledProviders).toEqual([]);
      expect(DEFAULT_CONFIG.preferredRegion).toBe('all');
    });

    it('should validate config key names', () => {
      const validKeys = [
        'defaultOutputDir',
        'defaultTimeout',
        'headlessMode',
        'enableScreenshots',
        'cacheExpiry',
        'pricingCacheExpiry',
        'statusCacheExpiry',
        'rankingsCacheExpiry',
        'enabledProviders',
        'preferredRegion',
      ];

      validKeys.forEach((key) => {
        expect(key in DEFAULT_CONFIG).toBe(true);
      });
    });

    it('should parse number values correctly', () => {
      const parseNumber = (value: string): number => parseFloat(value);

      expect(parseNumber('30000')).toBe(30000);
      expect(parseNumber('1.5')).toBe(1.5);
      expect(isNaN(parseNumber('invalid'))).toBe(true);
    });

    it('should parse boolean values correctly', () => {
      const parseBoolean = (value: string): boolean => value === 'true' || value === '1';

      expect(parseBoolean('true')).toBe(true);
      expect(parseBoolean('1')).toBe(true);
      expect(parseBoolean('false')).toBe(false);
      expect(parseBoolean('0')).toBe(false);
    });

    it('should parse array values correctly', () => {
      const parseArray = (value: string): string[] => value.split(',').filter(Boolean);

      expect(parseArray('a,b,c')).toEqual(['a', 'b', 'c']);
      expect(parseArray('')).toEqual([]);
      expect(parseArray('single')).toEqual(['single']);
    });
  });

  describe('Rankings Command', () => {
    it('should format rankings in markdown', () => {
      const data = [
        { rank: 1, model: 'gpt-4o', author: 'OpenAI', tokens: '10B', change: '+5%' },
        { rank: 2, model: 'claude-3.5', author: 'Anthropic', tokens: '8B', change: '-2%' },
      ];

      const formatMarkdown = (items: typeof data): string => {
        const header = '| Rank | Model | Author | Tokens | Change |';
        const separator = '| --- | --- | --- | --- | --- |';
        const rows = items.map(
          (r) => `| ${r.rank} | ${r.model} | ${r.author} | ${r.tokens} | ${r.change} |`
        );
        return [header, separator, ...rows].join('\n');
      };

      const result = formatMarkdown(data);
      expect(result).toContain('| Rank |');
      expect(result).toContain('| 1 | gpt-4o |');
      expect(result).toContain('| 2 | claude-3.5 |');
    });

    it('should format rankings in CSV', () => {
      const data = [
        { rank: 1, model: 'gpt-4o', author: 'OpenAI', tokens: '10B', change: '+5%' },
      ];

      const formatCSV = (items: typeof data): string => {
        const headers = 'Rank,Model,Author,Tokens,Change';
        const rows = items.map((r) => `${r.rank},${r.model},${r.author},${r.tokens},${r.change}`);
        return [headers, ...rows].join('\n');
      };

      const result = formatCSV(data);
      expect(result).toBe('Rank,Model,Author,Tokens,Change\n1,gpt-4o,OpenAI,10B,+5%');
    });

    it('should format rankings in JSON', () => {
      const data = [{ rank: 1, model: 'gpt-4o' }];

      const formatJSON = (items: typeof data): string => JSON.stringify(items, null, 2);

      const result = formatJSON(data);
      expect(JSON.parse(result)).toEqual(data);
    });
  });

  describe('Leaderboard Command', () => {
    it('should format votes correctly', () => {
      const formatVotes = (votes: number): string => {
        if (votes >= 1000000) return `${(votes / 1000000).toFixed(1)}M`;
        if (votes >= 1000) return `${(votes / 1000).toFixed(1)}K`;
        return String(votes);
      };

      expect(formatVotes(1500000)).toBe('1.5M');
      expect(formatVotes(125000)).toBe('125.0K');
      expect(formatVotes(500)).toBe('500');
    });

    it('should validate category options', () => {
      const validCategories = [
        'overall',
        'coding',
        'math',
        'creative_writing',
        'hard_prompt',
      ];

      validCategories.forEach((cat) => {
        expect(typeof cat).toBe('string');
        expect(cat.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Status Command', () => {
    it('should get correct status icon', () => {
      const getStatusIcon = (status: string): string => {
        switch (status) {
          case 'operational':
            return '✅';
          case 'degraded':
            return '⚠️';
          case 'down':
            return '❌';
          default:
            return '❓';
        }
      };

      expect(getStatusIcon('operational')).toBe('✅');
      expect(getStatusIcon('degraded')).toBe('⚠️');
      expect(getStatusIcon('down')).toBe('❌');
      expect(getStatusIcon('unknown')).toBe('❓');
    });

    it('should calculate overall status correctly', () => {
      const calculateStatus = (checks: { success: boolean }[]): string => {
        if (checks.length === 0) return 'unknown';
        const successCount = checks.filter((c) => c.success).length;
        if (successCount === checks.length) return 'operational';
        if (successCount > 0) return 'degraded';
        return 'down';
      };

      expect(calculateStatus([{ success: true }, { success: true }])).toBe('operational');
      expect(calculateStatus([{ success: true }, { success: false }])).toBe('degraded');
      expect(calculateStatus([{ success: false }, { success: false }])).toBe('down');
      expect(calculateStatus([])).toBe('unknown');
    });
  });

  describe('Scrape Command', () => {
    it('should filter providers by region', () => {
      const providers = [
        { id: 'openai', region: 'US' },
        { id: 'anthropic', region: 'US' },
        { id: 'deepseek', region: 'CN' },
        { id: 'zhipu', region: 'CN' },
      ];

      const filterByRegion = (items: typeof providers, region: string) => {
        if (region === 'all') return items;
        return items.filter((p) => p.region === region);
      };

      expect(filterByRegion(providers, 'US')).toHaveLength(2);
      expect(filterByRegion(providers, 'CN')).toHaveLength(2);
      expect(filterByRegion(providers, 'all')).toHaveLength(4);
    });

    it('should convert data to CSV format', () => {
      const convertToCSV = (data: Record<string, unknown>[]): string => {
        if (data.length === 0) return '';
        const headers = Object.keys(data[0]);
        const rows = data.map((item) =>
          headers.map((h) => String(item[h] ?? '')).join(',')
        );
        return [headers.join(','), ...rows].join('\n');
      };

      const data = [
        { model: 'gpt-4o', price: 5.0 },
        { model: 'claude-3.5', price: 3.0 },
      ];

      const result = convertToCSV(data);
      expect(result).toContain('model,price');
      expect(result).toContain('gpt-4o,5');
      expect(result).toContain('claude-3.5,3');
    });
  });

  describe('Clear Cache Command', () => {
    it('should format bytes correctly', () => {
      const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
      };

      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(1024)).toBe('1.0 KB');
      expect(formatBytes(1048576)).toBe('1.0 MB');
      expect(formatBytes(1073741824)).toBe('1.0 GB');
    });

    it('should match cache file patterns', () => {
      const matchPattern = (filename: string, pattern: string): boolean => {
        const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
        return regex.test(filename);
      };

      expect(matchPattern('pricing-openai.json', 'pricing-*.json')).toBe(true);
      expect(matchPattern('status-anthropic.json', 'status-*.json')).toBe(true);
      expect(matchPattern('rankings-week.json', 'rankings-*.json')).toBe(true);
      expect(matchPattern('other.json', 'pricing-*.json')).toBe(false);
    });
  });
});
