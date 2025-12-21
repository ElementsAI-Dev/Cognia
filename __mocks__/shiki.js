// Mock for shiki syntax highlighter ESM module
module.exports = {
  codeToHast: jest.fn().mockResolvedValue({ type: 'root', children: [] }),
  codeToHtml: jest.fn().mockResolvedValue('<pre><code></code></pre>'),
  codeToTokens: jest.fn().mockResolvedValue([]),
  codeToTokensBase: jest.fn().mockResolvedValue([]),
  codeToTokensWithThemes: jest.fn().mockResolvedValue([]),
  createHighlighter: jest.fn().mockResolvedValue({
    codeToHtml: jest.fn().mockReturnValue('<pre><code></code></pre>'),
    codeToTokens: jest.fn().mockReturnValue([]),
    loadLanguage: jest.fn().mockResolvedValue(undefined),
    loadTheme: jest.fn().mockResolvedValue(undefined),
  }),
  getLastGrammarState: jest.fn(),
  getSingletonHighlighter: jest.fn().mockResolvedValue({
    codeToHtml: jest.fn().mockReturnValue('<pre><code></code></pre>'),
  }),
};
