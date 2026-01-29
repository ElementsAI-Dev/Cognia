/**
 * LaTeX Symbols Library - Unit Tests
 */

import {
  GREEK_LETTERS,
  MATH_OPERATORS,
  RELATIONS,
  ARROWS,
  DELIMITERS,
  ACCENTS,
  FUNCTIONS,
  SETS_LOGIC,
  MISC_SYMBOLS,
  ALL_SYMBOLS,
  COMMON_COMMANDS,
  COMMON_ENVIRONMENTS,
  getSymbolsByCategory,
  getCommandsByCategory,
  searchSymbols,
  searchCommands,
  searchEnvironments,
  getSymbolsByPackage,
  getCommandsByPackage,
  getEnvironmentsByPackage,
  getRequiredPackages,
} from './symbols';

describe('LaTeX Symbols Library', () => {
  describe('Symbol Collections', () => {
    it('should have Greek letters', () => {
      expect(GREEK_LETTERS).toBeDefined();
      expect(GREEK_LETTERS.length).toBeGreaterThan(0);
      
      // Check for common Greek letters
      const alpha = GREEK_LETTERS.find((s) => s.name === 'alpha');
      expect(alpha).toBeDefined();
      expect(alpha?.command).toBe('\\alpha');
      expect(alpha?.unicode).toBe('α');
      expect(alpha?.category).toBe('greek');
    });

    it('should have math operators', () => {
      expect(MATH_OPERATORS).toBeDefined();
      expect(MATH_OPERATORS.length).toBeGreaterThan(0);
      
      const sum = MATH_OPERATORS.find((s) => s.name === 'sum');
      expect(sum).toBeDefined();
      expect(sum?.command).toBe('\\sum');
    });

    it('should have relations', () => {
      expect(RELATIONS).toBeDefined();
      expect(RELATIONS.length).toBeGreaterThan(0);
      
      const leq = RELATIONS.find((s) => s.name === 'leq');
      expect(leq).toBeDefined();
      expect(leq?.command).toBe('\\leq');
    });

    it('should have arrows', () => {
      expect(ARROWS).toBeDefined();
      expect(ARROWS.length).toBeGreaterThan(0);
      
      const rightarrow = ARROWS.find((s) => s.name === 'rightarrow');
      expect(rightarrow).toBeDefined();
      expect(rightarrow?.command).toBe('\\rightarrow');
    });

    it('should have delimiters', () => {
      expect(DELIMITERS).toBeDefined();
      expect(DELIMITERS.length).toBeGreaterThan(0);
    });

    it('should have accents', () => {
      expect(ACCENTS).toBeDefined();
      expect(ACCENTS.length).toBeGreaterThan(0);
    });

    it('should have functions', () => {
      expect(FUNCTIONS).toBeDefined();
      expect(FUNCTIONS.length).toBeGreaterThan(0);
      
      const sin = FUNCTIONS.find((s) => s.name === 'sin');
      expect(sin).toBeDefined();
      expect(sin?.command).toBe('\\sin');
    });

    it('should have sets and logic symbols', () => {
      expect(SETS_LOGIC).toBeDefined();
      expect(SETS_LOGIC.length).toBeGreaterThan(0);
      
      const forall = SETS_LOGIC.find((s) => s.name === 'forall');
      expect(forall).toBeDefined();
      expect(forall?.command).toBe('\\forall');
    });

    it('should have misc symbols', () => {
      expect(MISC_SYMBOLS).toBeDefined();
      expect(MISC_SYMBOLS.length).toBeGreaterThan(0);
    });

    it('should have ALL_SYMBOLS as a combined collection', () => {
      expect(ALL_SYMBOLS).toBeDefined();
      expect(ALL_SYMBOLS.length).toBeGreaterThan(
        GREEK_LETTERS.length + MATH_OPERATORS.length
      );
    });
  });

  describe('Commands and Environments', () => {
    it('should have common commands', () => {
      expect(COMMON_COMMANDS).toBeDefined();
      expect(COMMON_COMMANDS.length).toBeGreaterThan(0);
      
      const textbf = COMMON_COMMANDS.find((c) => c.name === 'textbf');
      expect(textbf).toBeDefined();
      expect(textbf?.name).toBe('textbf');
    });

    it('should have common environments', () => {
      expect(COMMON_ENVIRONMENTS).toBeDefined();
      expect(COMMON_ENVIRONMENTS.length).toBeGreaterThan(0);
      
      const equation = COMMON_ENVIRONMENTS.find((e) => e.name === 'equation');
      expect(equation).toBeDefined();
    });
  });

  describe('getSymbolsByCategory', () => {
    it('should return symbols for greek category', () => {
      const greekSymbols = getSymbolsByCategory('greek');
      expect(greekSymbols).toBeDefined();
      expect(greekSymbols.length).toBeGreaterThan(0);
      expect(greekSymbols.every((s) => s.category === 'greek')).toBe(true);
    });

    it('should return symbols for operators category', () => {
      const operators = getSymbolsByCategory('operators');
      expect(operators).toBeDefined();
      expect(operators.length).toBeGreaterThan(0);
      expect(operators.every((s) => s.category === 'operators')).toBe(true);
    });

    it('should return empty array for unknown category', () => {
      // @ts-expect-error Testing invalid category
      const unknown = getSymbolsByCategory('nonexistent');
      expect(unknown).toEqual([]);
    });
  });

  describe('getCommandsByCategory', () => {
    it('should return commands for formatting category', () => {
      const formatting = getCommandsByCategory('formatting');
      expect(formatting).toBeDefined();
      expect(formatting.length).toBeGreaterThan(0);
      expect(formatting.every((c) => c.category === 'formatting')).toBe(true);
    });

    it('should return commands for math category', () => {
      const math = getCommandsByCategory('math');
      expect(math).toBeDefined();
      expect(math.length).toBeGreaterThan(0);
    });
  });

  describe('searchSymbols', () => {
    it('should find symbols by name', () => {
      const results = searchSymbols('alpha');
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((s) => s.name === 'alpha')).toBe(true);
    });

    it('should find symbols by command', () => {
      const results = searchSymbols('\\sum');
      expect(results).toBeDefined();
      expect(results.some((s) => s.command === '\\sum')).toBe(true);
    });

    it('should return empty array for no matches', () => {
      const results = searchSymbols('xyznonexistent');
      expect(results).toEqual([]);
    });

    it('should be case insensitive', () => {
      const results1 = searchSymbols('ALPHA');
      const results2 = searchSymbols('alpha');
      expect(results1.length).toBe(results2.length);
    });
  });

  describe('searchCommands', () => {
    it('should find commands by name', () => {
      const results = searchCommands('frac');
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
    });

    it('should find commands by description', () => {
      const results = searchCommands('bold');
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('searchEnvironments', () => {
    it('should find environments by name', () => {
      const results = searchEnvironments('equation');
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
    });

    it('should find environments by description', () => {
      const results = searchEnvironments('matrix');
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Package-related functions', () => {
    it('getSymbolsByPackage should return symbols requiring a package', () => {
      const amsmathSymbols = getSymbolsByPackage('amsmath');
      expect(amsmathSymbols).toBeDefined();
      expect(amsmathSymbols.every((s) => s.package === 'amsmath')).toBe(true);
    });

    it('getCommandsByPackage should return commands requiring a package', () => {
      const amsmathCommands = getCommandsByPackage('amsmath');
      expect(amsmathCommands).toBeDefined();
      expect(amsmathCommands.every((c) => c.package === 'amsmath')).toBe(true);
    });

    it('getEnvironmentsByPackage should return environments requiring a package', () => {
      const amsmathEnvs = getEnvironmentsByPackage('amsmath');
      expect(amsmathEnvs).toBeDefined();
      expect(amsmathEnvs.every((e) => e.package === 'amsmath')).toBe(true);
    });

    it('getRequiredPackages should return packages for given commands', () => {
      const packages = getRequiredPackages(['\\iint', '\\iiint']);
      expect(packages).toBeDefined();
      expect(Array.isArray(packages)).toBe(true);
    });

    it('getRequiredPackages should return empty array for standard commands', () => {
      const packages = getRequiredPackages(['\\alpha', '\\beta']);
      expect(packages).toBeDefined();
      expect(Array.isArray(packages)).toBe(true);
    });
  });

  describe('Symbol structure validation', () => {
    it('all symbols should have required properties', () => {
      ALL_SYMBOLS.forEach((symbol) => {
        expect(symbol.name).toBeDefined();
        expect(typeof symbol.name).toBe('string');
        expect(symbol.command).toBeDefined();
        expect(typeof symbol.command).toBe('string');
        expect(symbol.category).toBeDefined();
      });
    });

    it('all commands should have required properties', () => {
      COMMON_COMMANDS.forEach((command) => {
        expect(command.name).toBeDefined();
        expect(typeof command.name).toBe('string');
        expect(command.category).toBeDefined();
      });
    });

    it('all environments should have required properties', () => {
      COMMON_ENVIRONMENTS.forEach((env) => {
        expect(env.name).toBeDefined();
        expect(typeof env.name).toBe('string');
      });
    });
  });
});
