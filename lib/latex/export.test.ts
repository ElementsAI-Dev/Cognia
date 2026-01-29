/**
 * LaTeX Export - Unit Tests
 */

import latexExportApi, {
  latexToHtml,
  latexToMarkdown,
  latexToPlainText,
  createProjectStructure,
  generateExportFilename,
  DEFAULT_EXPORT_OPTIONS,
  DEFAULT_PROJECT_OPTIONS,
} from './export';

describe('LaTeX Export', () => {
  const sampleLatex = `\\documentclass{article}
\\title{Test Document}
\\author{Test Author}
\\begin{document}
\\maketitle
Hello World!
\\section{Introduction}
This is a test.
\\end{document}`;

  describe('default export API', () => {
    it('should export all functions', () => {
      expect(latexExportApi.latexToHtml).toBeDefined();
      expect(latexExportApi.latexToMarkdown).toBeDefined();
      expect(latexExportApi.latexToPlainText).toBeDefined();
      expect(latexExportApi.createProjectStructure).toBeDefined();
      expect(latexExportApi.exportLatex).toBeDefined();
      expect(latexExportApi.generateExportFilename).toBeDefined();
    });

    it('should export default options', () => {
      expect(DEFAULT_EXPORT_OPTIONS).toBeDefined();
      expect(DEFAULT_PROJECT_OPTIONS).toBeDefined();
    });
  });

  describe('latexToHtml', () => {
    it('should convert LaTeX to HTML', () => {
      const html = latexToHtml(sampleLatex);
      expect(html).toBeDefined();
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);
    });

    it('should handle empty input', () => {
      const html = latexToHtml('');
      expect(html).toBeDefined();
    });

    it('should preserve text content', () => {
      const html = latexToHtml('Hello World');
      expect(html).toContain('Hello World');
    });

    it('should convert sections', () => {
      const html = latexToHtml('\\section{Test}');
      expect(html).toContain('Test');
    });
  });

  describe('latexToMarkdown', () => {
    it('should convert LaTeX to Markdown', () => {
      const md = latexToMarkdown(sampleLatex);
      expect(md).toBeDefined();
      expect(typeof md).toBe('string');
    });

    it('should convert sections to headings', () => {
      const md = latexToMarkdown('\\section{Introduction}');
      expect(md).toContain('#');
      expect(md).toContain('Introduction');
    });

    it('should handle emphasis', () => {
      const md = latexToMarkdown('\\textbf{bold} and \\textit{italic}');
      expect(md).toContain('**');
      expect(md).toContain('*');
    });

    it('should handle lists', () => {
      const md = latexToMarkdown('\\begin{itemize}\\item One\\item Two\\end{itemize}');
      expect(md).toContain('-');
    });
  });

  describe('latexToPlainText', () => {
    it('should convert LaTeX to plain text', () => {
      const text = latexToPlainText(sampleLatex);
      expect(text).toBeDefined();
      expect(typeof text).toBe('string');
    });

    it('should remove LaTeX commands', () => {
      const text = latexToPlainText('\\textbf{bold text}');
      expect(text).toContain('bold text');
      expect(text).not.toContain('\\textbf');
    });

    it('should preserve actual content', () => {
      const text = latexToPlainText('Hello World');
      expect(text).toContain('Hello World');
    });
  });

  describe('createProjectStructure', () => {
    it('should create project structure', () => {
      const structure = createProjectStructure(sampleLatex, {
        projectName: 'test-project',
      });
      expect(structure).toBeDefined();
      expect(Array.isArray(structure)).toBe(true);
    });

    it('should include main file', () => {
      const structure = createProjectStructure(sampleLatex, {
        projectName: 'project',
      });
      expect(structure.some((f) => f.path.includes('main'))).toBe(true);
    });
  });

  describe('generateExportFilename', () => {
    it('should generate filename with extension', () => {
      const filename = generateExportFilename('document', 'pdf');
      expect(filename).toContain('document');
      expect(filename).toContain('.pdf');
    });

    it('should generate filename for different formats', () => {
      expect(generateExportFilename('doc', 'html')).toContain('.html');
      expect(generateExportFilename('doc', 'tex')).toContain('.tex');
      expect(generateExportFilename('doc', 'docx')).toContain('.docx');
    });
  });
});
