/**
 * Pre-defined Mode Templates for TypeScript Plugin SDK
 *
 * @description Ready-to-use mode templates for common use cases.
 */

import { ModeBuilder, type ModeDefinition } from './builder';

/**
 * Pre-defined mode templates for common use cases
 */
export const ModeTemplates = {
  /**
   * Code assistant mode template
   */
  codeAssistant(modeId = 'code-assistant'): ModeDefinition {
    return new ModeBuilder(modeId)
      .name('Code Assistant')
      .description('AI-powered coding assistant for development tasks')
      .icon('code')
      .systemPrompt(
        'You are an expert programmer. Help the user with coding tasks. ' +
          'Write clean, efficient, and well-documented code. ' +
          'Explain your code when asked.'
      )
      .tools(['read_file', 'write_file', 'run_command', 'grep_search'])
      .outputFormat('code')
      .temperature(0.3)
      .category('development')
      .build();
  },

  /**
   * Creative writer mode template
   */
  creativeWriter(modeId = 'creative-writer'): ModeDefinition {
    return new ModeBuilder(modeId)
      .name('Creative Writer')
      .description('Creative writing and storytelling mode')
      .icon('pen-tool')
      .systemPrompt(
        'You are a creative writer. Help the user with creative writing tasks. ' +
          'Be imaginative, expressive, and engaging. ' +
          'Adapt your style to match the requested genre or tone.'
      )
      .outputFormat('markdown')
      .temperature(0.9)
      .category('writing')
      .build();
  },

  /**
   * Data analyst mode template
   */
  dataAnalyst(modeId = 'data-analyst'): ModeDefinition {
    return new ModeBuilder(modeId)
      .name('Data Analyst')
      .description('Data analysis and visualization mode')
      .icon('bar-chart')
      .systemPrompt(
        'You are a data analyst. Help the user analyze data, ' +
          'create visualizations, and derive insights. ' +
          'Be precise and use statistical methods when appropriate.'
      )
      .tools(['read_file', 'run_command'])
      .outputFormat('structured')
      .temperature(0.2)
      .category('analysis')
      .build();
  },

  /**
   * Researcher mode template
   */
  researcher(modeId = 'researcher'): ModeDefinition {
    return new ModeBuilder(modeId)
      .name('Researcher')
      .description('Research and fact-finding mode')
      .icon('search')
      .systemPrompt(
        'You are a researcher. Help the user find information, ' +
          'synthesize sources, and provide well-cited answers. ' +
          'Be thorough and objective.'
      )
      .tools(['web_search', 'read_url'])
      .outputFormat('markdown')
      .temperature(0.4)
      .category('research')
      .build();
  },

  /**
   * Code reviewer mode template
   */
  codeReviewer(modeId = 'code-reviewer'): ModeDefinition {
    return new ModeBuilder(modeId)
      .name('Code Reviewer')
      .description('Expert code review and analysis')
      .icon('git-pull-request')
      .systemPrompt(
        'You are an expert code reviewer. Analyze code for bugs, security issues, ' +
          'performance problems, and best practices violations. ' +
          'Provide actionable feedback with specific line references.'
      )
      .tools(['read_file', 'grep_search'])
      .outputFormat('markdown')
      .temperature(0.3)
      .category('development')
      .build();
  },

  /**
   * Technical writer mode template
   */
  technicalWriter(modeId = 'technical-writer'): ModeDefinition {
    return new ModeBuilder(modeId)
      .name('Technical Writer')
      .description('Technical documentation and API docs')
      .icon('file-text')
      .systemPrompt(
        'You are a technical writer. Help create clear, accurate, and ' +
          'well-structured technical documentation. Follow best practices ' +
          'for API documentation, user guides, and README files.'
      )
      .tools(['read_file', 'write_file'])
      .outputFormat('markdown')
      .temperature(0.4)
      .category('writing')
      .build();
  },
};

export type ModeTemplateKey = keyof typeof ModeTemplates;
