/**
 * Monaco Editor Code Actions Provider
 * Provides quick-fix and refactoring code actions (lightbulb menu)
 */

import type * as Monaco from 'monaco-editor';

// ============================================================
// Code Action Definitions
// ============================================================

interface CodeActionDefinition {
  id: string;
  title: string;
  kind: string;
  /** Return true if this action applies to the given context */
  isApplicable: (context: CodeActionContext) => boolean;
  /** Generate the edit for this action */
  createEdit: (context: CodeActionContext, monaco: typeof Monaco) => Monaco.languages.WorkspaceEdit;
}

interface CodeActionContext {
  model: Monaco.editor.ITextModel;
  range: Monaco.Range;
  selectedText: string;
  lineContent: string;
  fullLineRange: Monaco.IRange;
  lineNumber: number;
}

// ============================================================
// Action: Wrap in try-catch
// ============================================================

const wrapInTryCatch: CodeActionDefinition = {
  id: 'refactor.wrapInTryCatch',
  title: 'Wrap in try-catch',
  kind: 'refactor.rewrite',
  isApplicable: (ctx) => {
    // Applicable when there's selected text or a non-empty line
    const text = ctx.selectedText || ctx.lineContent.trim();
    return text.length > 0 && !text.startsWith('try') && !text.startsWith('import');
  },
  createEdit: (ctx, monaco) => {
    const text = ctx.selectedText || ctx.lineContent;
    const indent = ctx.lineContent.match(/^(\s*)/)?.[1] || '';
    const innerIndent = indent + '  ';
    const indentedText = text.split('\n').map(line => innerIndent + line.trimStart()).join('\n');

    const newText = `${indent}try {\n${indentedText}\n${indent}} catch (error) {\n${innerIndent}console.error('Error:', error);\n${indent}}`;

    const range = ctx.selectedText
      ? ctx.range
      : new monaco.Range(ctx.lineNumber, 1, ctx.lineNumber, ctx.lineContent.length + 1);

    return {
      edits: [{
        resource: ctx.model.uri,
        textEdit: { range, text: newText },
        versionId: ctx.model.getVersionId(),
      }],
    };
  },
};

// ============================================================
// Action: Wrap in async/await try-catch
// ============================================================

const wrapInAsyncTryCatch: CodeActionDefinition = {
  id: 'refactor.wrapInAsyncTryCatch',
  title: 'Wrap in async try-catch',
  kind: 'refactor.rewrite',
  isApplicable: (ctx) => {
    const text = ctx.selectedText || ctx.lineContent.trim();
    return text.length > 0 && (text.includes('await') || text.includes('.then(')) && !text.startsWith('try');
  },
  createEdit: (ctx, monaco) => {
    const text = ctx.selectedText || ctx.lineContent;
    const indent = ctx.lineContent.match(/^(\s*)/)?.[1] || '';
    const innerIndent = indent + '  ';
    const indentedText = text.split('\n').map(line => innerIndent + line.trimStart()).join('\n');

    const newText = `${indent}try {\n${indentedText}\n${indent}} catch (error) {\n${innerIndent}console.error('Operation failed:', error);\n${innerIndent}throw error;\n${indent}}`;

    const range = ctx.selectedText
      ? ctx.range
      : new monaco.Range(ctx.lineNumber, 1, ctx.lineNumber, ctx.lineContent.length + 1);

    return {
      edits: [{
        resource: ctx.model.uri,
        textEdit: { range, text: newText },
        versionId: ctx.model.getVersionId(),
      }],
    };
  },
};

// ============================================================
// Action: Extract to variable
// ============================================================

const extractToVariable: CodeActionDefinition = {
  id: 'refactor.extractToVariable',
  title: 'Extract to variable',
  kind: 'refactor.extract',
  isApplicable: (ctx) => {
    // Applicable when text is selected and it looks like an expression
    const text = ctx.selectedText.trim();
    if (!text || text.length < 2) return false;
    // Don't extract if it's already a declaration or statement
    if (text.startsWith('const ') || text.startsWith('let ') || text.startsWith('var ') ||
        text.startsWith('function ') || text.startsWith('class ') || text.startsWith('import ') ||
        text.startsWith('export ') || text.startsWith('return ') || text.startsWith('if ') ||
        text.startsWith('for ') || text.startsWith('while ')) return false;
    return true;
  },
  createEdit: (ctx, monaco) => {
    const indent = ctx.lineContent.match(/^(\s*)/)?.[1] || '';
    const declaration = `${indent}const extracted = ${ctx.selectedText.trim()};\n`;

    return {
      edits: [
        // Insert declaration before current line
        {
          resource: ctx.model.uri,
          textEdit: {
            range: new monaco.Range(ctx.lineNumber, 1, ctx.lineNumber, 1),
            text: declaration,
          },
          versionId: ctx.model.getVersionId(),
        },
        // Replace selected text with variable name
        {
          resource: ctx.model.uri,
          textEdit: {
            range: ctx.range,
            text: 'extracted',
          },
          versionId: ctx.model.getVersionId(),
        },
      ],
    };
  },
};

// ============================================================
// Action: Extract to constant
// ============================================================

const extractToConstant: CodeActionDefinition = {
  id: 'refactor.extractToConstant',
  title: 'Extract to named constant',
  kind: 'refactor.extract',
  isApplicable: (ctx) => {
    const text = ctx.selectedText.trim();
    if (!text || text.length < 2) return false;
    // Good for string literals, numbers, or simple expressions
    return /^['"`].*['"`]$/.test(text) || /^\d+(\.\d+)?$/.test(text) || /^[A-Z_]+$/.test(text);
  },
  createEdit: (ctx, monaco) => {
    const text = ctx.selectedText.trim();
    // Generate a name from the value
    let constName = 'CONSTANT_VALUE';
    if (/^['"`](.*?)['"`]$/.test(text)) {
      const inner = text.slice(1, -1);
      constName = inner.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '') || 'STRING_VALUE';
    }

    return {
      edits: [
        // Insert constant at top of current scope (simplified: before current line)
        {
          resource: ctx.model.uri,
          textEdit: {
            range: new monaco.Range(ctx.lineNumber, 1, ctx.lineNumber, 1),
            text: `const ${constName} = ${text};\n`,
          },
          versionId: ctx.model.getVersionId(),
        },
        // Replace selected text with constant name
        {
          resource: ctx.model.uri,
          textEdit: {
            range: ctx.range,
            text: constName,
          },
          versionId: ctx.model.getVersionId(),
        },
      ],
    };
  },
};

// ============================================================
// Action: Convert function declaration to arrow function
// ============================================================

const convertToArrowFunction: CodeActionDefinition = {
  id: 'refactor.convertToArrowFunction',
  title: 'Convert to arrow function',
  kind: 'refactor.rewrite',
  isApplicable: (ctx) => {
    const text = ctx.selectedText || ctx.lineContent.trim();
    return /^(export\s+)?(async\s+)?function\s+\w+/.test(text);
  },
  createEdit: (ctx, monaco) => {
    const text = ctx.selectedText || ctx.lineContent;
    const match = text.match(/^(\s*)(export\s+)?(async\s+)?function\s+(\w+)\s*(\([^)]*\))\s*(?::\s*([^{]+))?\s*\{?/);
    if (!match) return { edits: [] };

    const [, indent = '', exportKw = '', asyncKw = '', name, params, returnType = ''] = match;
    const typeAnnotation = returnType.trim() ? `: ${returnType.trim()}` : '';
    const arrowDecl = `${indent}${exportKw}const ${name} = ${asyncKw}${params}${typeAnnotation} => {`;

    const range = ctx.selectedText
      ? new monaco.Range(ctx.range.startLineNumber, 1, ctx.range.startLineNumber, ctx.model.getLineContent(ctx.range.startLineNumber).length + 1)
      : new monaco.Range(ctx.lineNumber, 1, ctx.lineNumber, ctx.lineContent.length + 1);

    return {
      edits: [{
        resource: ctx.model.uri,
        textEdit: { range, text: arrowDecl },
        versionId: ctx.model.getVersionId(),
      }],
    };
  },
};

// ============================================================
// Action: Surround with JSX fragment
// ============================================================

const surroundWithFragment: CodeActionDefinition = {
  id: 'refactor.surroundWithFragment',
  title: 'Surround with <>...</>',
  kind: 'refactor.rewrite',
  isApplicable: (ctx) => {
    const text = ctx.selectedText.trim();
    // Applicable to JSX elements
    return text.length > 0 && (text.startsWith('<') || text.includes('/>') || text.includes('</'));
  },
  createEdit: (ctx, _monaco) => {
    const indent = ctx.lineContent.match(/^(\s*)/)?.[1] || '';
    const innerIndent = indent + '  ';
    const indentedText = ctx.selectedText.split('\n').map(line => {
      const trimmed = line.trimStart();
      return trimmed ? innerIndent + trimmed : line;
    }).join('\n');

    return {
      edits: [{
        resource: ctx.model.uri,
        textEdit: {
          range: ctx.range,
          text: `${indent}<>\n${indentedText}\n${indent}</>`,
        },
        versionId: ctx.model.getVersionId(),
      }],
    };
  },
};

// ============================================================
// Action: Surround with div
// ============================================================

const surroundWithDiv: CodeActionDefinition = {
  id: 'refactor.surroundWithDiv',
  title: 'Surround with <div>...</div>',
  kind: 'refactor.rewrite',
  isApplicable: (ctx) => {
    const text = ctx.selectedText.trim();
    return text.length > 0 && (text.startsWith('<') || text.includes('/>') || text.includes('</'));
  },
  createEdit: (ctx, _monaco) => {
    const indent = ctx.lineContent.match(/^(\s*)/)?.[1] || '';
    const innerIndent = indent + '  ';
    const indentedText = ctx.selectedText.split('\n').map(line => {
      const trimmed = line.trimStart();
      return trimmed ? innerIndent + trimmed : line;
    }).join('\n');

    return {
      edits: [{
        resource: ctx.model.uri,
        textEdit: {
          range: ctx.range,
          text: `${indent}<div className="">\n${indentedText}\n${indent}</div>`,
        },
        versionId: ctx.model.getVersionId(),
      }],
    };
  },
};

// ============================================================
// Action: Add optional chaining
// ============================================================

const addOptionalChaining: CodeActionDefinition = {
  id: 'refactor.addOptionalChaining',
  title: 'Add optional chaining (?.) ',
  kind: 'refactor.rewrite',
  isApplicable: (ctx) => {
    const text = ctx.selectedText || ctx.lineContent.trim();
    // Has property access without optional chaining
    return /\w+\.\w+/.test(text) && !text.includes('?.') && !text.startsWith('import') && !text.startsWith('from');
  },
  createEdit: (ctx, monaco) => {
    const text = ctx.selectedText || ctx.lineContent;
    // Replace . with ?. in property access chains (but not in numbers like 1.5)
    const newText = text.replace(/(\w)\.(\w)/g, '$1?.$2');

    const range = ctx.selectedText
      ? ctx.range
      : new monaco.Range(ctx.lineNumber, 1, ctx.lineNumber, ctx.lineContent.length + 1);

    return {
      edits: [{
        resource: ctx.model.uri,
        textEdit: { range, text: newText },
        versionId: ctx.model.getVersionId(),
      }],
    };
  },
};

// ============================================================
// Action: Remove optional chaining
// ============================================================

const removeOptionalChaining: CodeActionDefinition = {
  id: 'refactor.removeOptionalChaining',
  title: 'Remove optional chaining (?.)',
  kind: 'refactor.rewrite',
  isApplicable: (ctx) => {
    const text = ctx.selectedText || ctx.lineContent.trim();
    return text.includes('?.');
  },
  createEdit: (ctx, monaco) => {
    const text = ctx.selectedText || ctx.lineContent;
    const newText = text.replace(/\?\./g, '.');

    const range = ctx.selectedText
      ? ctx.range
      : new monaco.Range(ctx.lineNumber, 1, ctx.lineNumber, ctx.lineContent.length + 1);

    return {
      edits: [{
        resource: ctx.model.uri,
        textEdit: { range, text: newText },
        versionId: ctx.model.getVersionId(),
      }],
    };
  },
};

// ============================================================
// Action: Convert string concatenation to template literal
// ============================================================

const convertToTemplateLiteral: CodeActionDefinition = {
  id: 'refactor.convertToTemplateLiteral',
  title: 'Convert to template literal',
  kind: 'refactor.rewrite',
  isApplicable: (ctx) => {
    const text = ctx.selectedText || ctx.lineContent.trim();
    // Has string concatenation with +
    return /['"][^'"]*['"]\s*\+/.test(text) || /\+\s*['"][^'"]*['"]/.test(text);
  },
  createEdit: (ctx, monaco) => {
    const text = ctx.selectedText || ctx.lineContent;
    // Simple conversion: replace 'a' + b + 'c' with `a${b}c`
    let result = text;
    // Replace pattern: 'string' + expr → `string${expr}`
    result = result.replace(/['"]([^'"]*)['"]\s*\+\s*(\w+)/g, '`$1${$2}');
    result = result.replace(/(\w+)\s*\+\s*['"]([^'"]*)['"]/g, '${$1}$2`');
    // Ensure it starts and ends with backtick
    if (!result.startsWith('`')) result = '`' + result;
    if (!result.endsWith('`')) result = result + '`';

    const range = ctx.selectedText
      ? ctx.range
      : new monaco.Range(ctx.lineNumber, 1, ctx.lineNumber, ctx.lineContent.length + 1);

    return {
      edits: [{
        resource: ctx.model.uri,
        textEdit: { range, text: result },
        versionId: ctx.model.getVersionId(),
      }],
    };
  },
};

// ============================================================
// Action: Add console.log for variable
// ============================================================

const addConsoleLog: CodeActionDefinition = {
  id: 'refactor.addConsoleLog',
  title: 'Add console.log below',
  kind: 'refactor.rewrite',
  isApplicable: (ctx) => {
    const text = (ctx.selectedText || ctx.lineContent).trim();
    // Applicable to variable declarations, assignments, or identifiers
    return (
      /^(const|let|var)\s+\w+/.test(text) ||
      /^\w+\s*=/.test(text) ||
      (ctx.selectedText.trim().length > 0 && /^\w+$/.test(ctx.selectedText.trim()))
    );
  },
  createEdit: (ctx, monaco) => {
    const text = (ctx.selectedText || ctx.lineContent).trim();
    const indent = ctx.lineContent.match(/^(\s*)/)?.[1] || '';
    
    let varName = ctx.selectedText.trim();
    if (!varName || !/^\w+$/.test(varName)) {
      // Extract variable name from declaration
      const match = text.match(/^(?:const|let|var)\s+(\w+)/);
      varName = match?.[1] || 'value';
    }

    const insertLine = ctx.selectedText
      ? ctx.range.endLineNumber
      : ctx.lineNumber;

    return {
      edits: [{
        resource: ctx.model.uri,
        textEdit: {
          range: new monaco.Range(insertLine + 1, 1, insertLine + 1, 1),
          text: `${indent}console.log('${varName}:', ${varName});\n`,
        },
        versionId: ctx.model.getVersionId(),
      }],
    };
  },
};

// ============================================================
// Action: Wrap with React.memo
// ============================================================

const wrapWithMemo: CodeActionDefinition = {
  id: 'refactor.wrapWithMemo',
  title: 'Wrap component with React.memo()',
  kind: 'refactor.rewrite',
  isApplicable: (ctx) => {
    const text = ctx.selectedText || ctx.lineContent.trim();
    // Matches: export const MyComponent = (...) => { or function MyComponent
    return /^export\s+(const|function)\s+[A-Z]\w*/.test(text) && !text.includes('memo(');
  },
  createEdit: (ctx, monaco) => {
    const text = ctx.selectedText || ctx.lineContent;
    
    // For arrow function: export const X = (...) => → export const X = memo((...) =>
    let newText = text;
    const arrowMatch = text.match(/^(\s*export\s+const\s+\w+\s*=\s*)(.*)/);
    if (arrowMatch) {
      newText = `${arrowMatch[1]}memo(${arrowMatch[2]}`;
    }

    const range = ctx.selectedText
      ? ctx.range
      : new monaco.Range(ctx.lineNumber, 1, ctx.lineNumber, ctx.lineContent.length + 1);

    return {
      edits: [{
        resource: ctx.model.uri,
        textEdit: { range, text: newText },
        versionId: ctx.model.getVersionId(),
      }],
    };
  },
};

// ============================================================
// Action: Convert to named export
// ============================================================

const convertToNamedExport: CodeActionDefinition = {
  id: 'refactor.convertToNamedExport',
  title: 'Convert to named export',
  kind: 'refactor.rewrite',
  isApplicable: (ctx) => {
    const text = ctx.lineContent.trim();
    return text.startsWith('export default ');
  },
  createEdit: (ctx, monaco) => {
    const text = ctx.lineContent;
    const newText = text.replace('export default ', 'export ');

    return {
      edits: [{
        resource: ctx.model.uri,
        textEdit: {
          range: new monaco.Range(ctx.lineNumber, 1, ctx.lineNumber, ctx.lineContent.length + 1),
          text: newText,
        },
        versionId: ctx.model.getVersionId(),
      }],
    };
  },
};

// ============================================================
// All Actions
// ============================================================

const ALL_CODE_ACTIONS: CodeActionDefinition[] = [
  wrapInTryCatch,
  wrapInAsyncTryCatch,
  extractToVariable,
  extractToConstant,
  convertToArrowFunction,
  surroundWithFragment,
  surroundWithDiv,
  addOptionalChaining,
  removeOptionalChaining,
  convertToTemplateLiteral,
  addConsoleLog,
  wrapWithMemo,
  convertToNamedExport,
];

// ============================================================
// Registration
// ============================================================

/**
 * Register code action provider for Monaco
 */
export function registerCodeActionProvider(
  monaco: typeof Monaco,
  languages: string[] = ['typescript', 'typescriptreact', 'javascript', 'javascriptreact']
): Monaco.IDisposable[] {
  const disposables: Monaco.IDisposable[] = [];

  for (const lang of languages) {
    const disposable = monaco.languages.registerCodeActionProvider(lang, {
      provideCodeActions: (model, range, _context) => {
        const lineNumber = range.startLineNumber;
        const lineContent = model.getLineContent(lineNumber);
        const selectedText = model.getValueInRange(range);
        const fullLineRange: Monaco.IRange = {
          startLineNumber: lineNumber,
          endLineNumber: lineNumber,
          startColumn: 1,
          endColumn: lineContent.length + 1,
        };

        const ctx: CodeActionContext = {
          model,
          range: range as Monaco.Range,
          selectedText,
          lineContent,
          fullLineRange,
          lineNumber,
        };

        const actions: Monaco.languages.CodeAction[] = [];

        for (const actionDef of ALL_CODE_ACTIONS) {
          if (actionDef.isApplicable(ctx)) {
            const edit = actionDef.createEdit(ctx, monaco);
            actions.push({
              title: actionDef.title,
              kind: actionDef.kind,
              edit,
              isPreferred: false,
            });
          }
        }

        return {
          actions,
          dispose: () => {},
        };
      },
    });
    disposables.push(disposable);
  }

  return disposables;
}

// Export for testing
export { ALL_CODE_ACTIONS, type CodeActionDefinition, type CodeActionContext };
