/**
 * Code Parser - Extract structure and content from code files
 */

export interface CodeFunction {
  name: string;
  startLine: number;
  endLine: number;
  signature: string;
  docstring?: string;
}

export interface CodeClass {
  name: string;
  startLine: number;
  endLine: number;
  methods: CodeFunction[];
  docstring?: string;
}

export interface CodeImport {
  module: string;
  items?: string[];
  line: number;
}

export interface CodeParseResult {
  language: string;
  imports: CodeImport[];
  functions: CodeFunction[];
  classes: CodeClass[];
  comments: string[];
  content: string;
}

/**
 * Detect programming language from file extension
 */
export function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'rb': 'ruby',
    'java': 'java',
    'kt': 'kotlin',
    'go': 'go',
    'rs': 'rust',
    'cpp': 'cpp',
    'c': 'c',
    'h': 'c',
    'hpp': 'cpp',
    'cs': 'csharp',
    'php': 'php',
    'swift': 'swift',
    'scala': 'scala',
    'r': 'r',
    'sql': 'sql',
    'sh': 'bash',
    'bash': 'bash',
    'zsh': 'bash',
    'ps1': 'powershell',
    'yaml': 'yaml',
    'yml': 'yaml',
    'json': 'json',
    'xml': 'xml',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'less': 'less',
    'md': 'markdown',
    'vue': 'vue',
    'svelte': 'svelte',
  };

  return languageMap[ext] || 'text';
}

/**
 * Extract imports from JavaScript/TypeScript
 */
function extractJSImports(content: string): CodeImport[] {
  const imports: CodeImport[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // import { x } from 'module'
    const namedImportMatch = line.match(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/);
    if (namedImportMatch) {
      imports.push({
        module: namedImportMatch[2],
        items: namedImportMatch[1].split(',').map(s => s.trim()),
        line: i + 1,
      });
      continue;
    }

    // import x from 'module'
    const defaultImportMatch = line.match(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/);
    if (defaultImportMatch) {
      imports.push({
        module: defaultImportMatch[2],
        items: [defaultImportMatch[1]],
        line: i + 1,
      });
      continue;
    }

    // import 'module'
    const sideEffectMatch = line.match(/import\s+['"]([^'"]+)['"]/);
    if (sideEffectMatch) {
      imports.push({
        module: sideEffectMatch[1],
        line: i + 1,
      });
    }
  }

  return imports;
}

/**
 * Extract imports from Python
 */
function extractPythonImports(content: string): CodeImport[] {
  const imports: CodeImport[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // from module import x, y
    const fromImportMatch = line.match(/from\s+(\S+)\s+import\s+(.+)/);
    if (fromImportMatch) {
      imports.push({
        module: fromImportMatch[1],
        items: fromImportMatch[2].split(',').map(s => s.trim()),
        line: i + 1,
      });
      continue;
    }

    // import module
    const importMatch = line.match(/^import\s+(.+)/);
    if (importMatch) {
      const modules = importMatch[1].split(',').map(s => s.trim());
      for (const mod of modules) {
        imports.push({
          module: mod.split(' as ')[0],
          line: i + 1,
        });
      }
    }
  }

  return imports;
}

/**
 * Extract functions from JavaScript/TypeScript
 */
function extractJSFunctions(content: string): CodeFunction[] {
  const functions: CodeFunction[] = [];
  const lines = content.split('\n');

  const functionPatterns = [
    // function name() {}
    /^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/,
    // const name = () => {}
    /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/,
    // const name = function() {}
    /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function\s*\(/,
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    for (const pattern of functionPatterns) {
      const match = line.match(pattern);
      if (match) {
        // Find end of function (simplified - counts braces)
        let braceCount = 0;
        let endLine = i;
        let started = false;

        for (let j = i; j < lines.length; j++) {
          const l = lines[j];
          for (const char of l) {
            if (char === '{') {
              braceCount++;
              started = true;
            } else if (char === '}') {
              braceCount--;
            }
          }
          if (started && braceCount === 0) {
            endLine = j;
            break;
          }
        }

        // Check for JSDoc comment above
        let docstring: string | undefined;
        if (i > 0 && lines[i - 1].trim().endsWith('*/')) {
          let docStart = i - 1;
          while (docStart > 0 && !lines[docStart].includes('/**')) {
            docStart--;
          }
          docstring = lines.slice(docStart, i).join('\n');
        }

        functions.push({
          name: match[1],
          startLine: i + 1,
          endLine: endLine + 1,
          signature: line,
          docstring,
        });
        break;
      }
    }
  }

  return functions;
}

/**
 * Extract functions from Python
 */
function extractPythonFunctions(content: string): CodeFunction[] {
  const functions: CodeFunction[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)/);
    
    if (match) {
      // Find end of function (by indentation)
      const indent = line.search(/\S/);
      let endLine = i;

      for (let j = i + 1; j < lines.length; j++) {
        const l = lines[j];
        if (l.trim() === '') continue;
        const currentIndent = l.search(/\S/);
        if (currentIndent <= indent && l.trim() !== '') {
          endLine = j - 1;
          break;
        }
        endLine = j;
      }

      // Check for docstring
      let docstring: string | undefined;
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine.startsWith('"""') || nextLine.startsWith("'''")) {
          const quote = nextLine.slice(0, 3);
          let docEnd = i + 1;
          if (!nextLine.slice(3).includes(quote)) {
            for (let j = i + 2; j < lines.length; j++) {
              if (lines[j].includes(quote)) {
                docEnd = j;
                break;
              }
            }
          }
          docstring = lines.slice(i + 1, docEnd + 1).join('\n');
        }
      }

      functions.push({
        name: match[1],
        startLine: i + 1,
        endLine: endLine + 1,
        signature: line.trim(),
        docstring,
      });
    }
  }

  return functions;
}

/**
 * Extract comments from code
 */
function extractComments(content: string, language: string): string[] {
  const comments: string[] = [];

  if (['javascript', 'typescript', 'java', 'cpp', 'c', 'csharp', 'go', 'rust', 'swift', 'kotlin'].includes(language)) {
    // Single-line comments
    const singleLineMatches = content.match(/\/\/.*$/gm) || [];
    comments.push(...singleLineMatches.map(c => c.replace(/^\/\/\s*/, '')));

    // Multi-line comments
    const multiLineMatches = content.match(/\/\*[\s\S]*?\*\//g) || [];
    comments.push(...multiLineMatches.map(c => 
      c.replace(/^\/\*\s*/, '').replace(/\s*\*\/$/, '').replace(/^\s*\*\s*/gm, '')
    ));
  } else if (language === 'python') {
    // Single-line comments
    const singleLineMatches = content.match(/#.*$/gm) || [];
    comments.push(...singleLineMatches.map(c => c.replace(/^#\s*/, '')));

    // Docstrings
    const docstringMatches = content.match(/"""[\s\S]*?"""|'''[\s\S]*?'''/g) || [];
    comments.push(...docstringMatches.map(c => 
      c.replace(/^["']{3}/, '').replace(/["']{3}$/, '').trim()
    ));
  }

  return comments.filter(c => c.trim().length > 0);
}

/**
 * Parse code content
 */
export function parseCode(content: string, filename: string): CodeParseResult {
  const language = detectLanguage(filename);
  
  let imports: CodeImport[] = [];
  let functions: CodeFunction[] = [];
  const classes: CodeClass[] = []; // TODO: Implement class extraction

  if (['javascript', 'typescript'].includes(language)) {
    imports = extractJSImports(content);
    functions = extractJSFunctions(content);
  } else if (language === 'python') {
    imports = extractPythonImports(content);
    functions = extractPythonFunctions(content);
  }

  const comments = extractComments(content, language);

  return {
    language,
    imports,
    functions,
    classes,
    comments,
    content,
  };
}

/**
 * Extract text content suitable for embedding
 */
export function extractCodeEmbeddableContent(content: string, filename: string): string {
  const result = parseCode(content, filename);
  
  const parts: string[] = [];
  
  // Add comments
  if (result.comments.length > 0) {
    parts.push(result.comments.join('\n'));
  }

  // Add function signatures and docstrings
  for (const func of result.functions) {
    parts.push(func.signature);
    if (func.docstring) {
      parts.push(func.docstring);
    }
  }

  return parts.join('\n\n');
}
