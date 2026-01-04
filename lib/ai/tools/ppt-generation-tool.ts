/**
 * PPT Generation Tool for Agent
 * Registers PPT generation as an agent tool that can be invoked from chat
 */

import { z } from 'zod';
import type { AgentTool } from '../agent/agent-executor';

// Input schema for PPT generation
export const pptGenerationInputSchema = z.object({
  topic: z.string().describe('The main topic or title for the presentation'),
  description: z.string().optional().describe('Additional details or context for the presentation'),
  audience: z.string().optional().default('General Public').describe('Target audience for the presentation'),
  purpose: z.enum(['informative', 'persuasive', 'educational', 'pitch', 'report'])
    .optional()
    .default('informative')
    .describe('The purpose of the presentation'),
  tone: z.enum(['formal', 'casual', 'professional', 'creative'])
    .optional()
    .default('professional')
    .describe('The tone/style of the presentation'),
  slideCount: z.number().min(3).max(50).optional().default(10)
    .describe('Number of slides to generate'),
  language: z.string().optional().default('zh-CN')
    .describe('Language for the presentation content'),
  includeImages: z.boolean().optional().default(true)
    .describe('Whether to suggest images for slides'),
  includeCharts: z.boolean().optional().default(false)
    .describe('Whether to include data charts'),
});

export type PPTGenerationInput = z.infer<typeof pptGenerationInputSchema>;

// Result type
export interface PPTGenerationResult {
  success: boolean;
  presentationId?: string;
  title?: string;
  slideCount?: number;
  message: string;
  error?: string;
}

// Tool execution callback type
export type PPTGenerationCallback = (input: PPTGenerationInput) => Promise<PPTGenerationResult>;

/**
 * Create the PPT generation agent tool
 * @param onGenerate Callback function to handle the actual generation
 */
export function createPPTGenerationTool(onGenerate: PPTGenerationCallback): AgentTool {
  return {
    name: 'generate_ppt',
    description: `Generate a professional PowerPoint presentation using AI. 
Use this tool when the user wants to create a presentation, PPT, slideshow, or deck.
The tool will create a complete presentation with title slides, content slides, and proper formatting.

Examples of when to use:
- "帮我做一个关于人工智能的PPT"
- "Create a presentation about climate change"
- "生成一份产品发布的演示文稿"
- "Make a 10-slide deck for my business pitch"`,
    parameters: pptGenerationInputSchema,
    execute: async (args) => {
      const input = args as PPTGenerationInput;
      try {
        const result = await onGenerate(input);
        if (result.success) {
          return `✅ 演示文稿已成功生成！
- 标题: ${result.title}
- 幻灯片数量: ${result.slideCount}
- ID: ${result.presentationId}

${result.message}`;
        } else {
          return `❌ 生成失败: ${result.error || result.message}`;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return `❌ 生成过程中发生错误: ${message}`;
      }
    },
    requiresApproval: false,
  };
}

/**
 * Detect if a message contains PPT generation intent
 */
export function detectPPTGenerationIntent(message: string): {
  hasPPTIntent: boolean;
  topic?: string;
  slideCount?: number;
} {
  // Chinese patterns
  const chinesePatterns = [
    /(?:帮我|请|给我|生成|创建|做|制作).*?(?:ppt|演示文稿|幻灯片|slides)/i,
    /(?:ppt|演示文稿|幻灯片).*?(?:关于|主题|内容)/i,
    /(?:一个|一份).*?(?:ppt|演示文稿|幻灯片)/i,
  ];
  
  // English patterns
  const englishPatterns = [
    /(?:create|make|generate|build|prepare).*?(?:ppt|presentation|slides|deck|slideshow)/i,
    /(?:ppt|presentation|slides|deck|slideshow).*?(?:about|on|for|regarding)/i,
    /(?:a|an|the).*?(?:ppt|presentation|slides|deck|slideshow)/i,
  ];
  
  const allPatterns = [...chinesePatterns, ...englishPatterns];
  const hasPPTIntent = allPatterns.some(pattern => pattern.test(message));
  
  if (!hasPPTIntent) {
    return { hasPPTIntent: false };
  }
  
  // Try to extract topic
  let topic: string | undefined;
  
  // Chinese topic extraction
  const chineseTopicMatch = message.match(/(?:关于|主题是?|内容是?)[:：]?\s*(.+?)(?:的|。|$)/);
  if (chineseTopicMatch) {
    topic = chineseTopicMatch[1].trim();
  }
  
  // English topic extraction
  const englishTopicMatch = message.match(/(?:about|on|regarding|for)\s+(.+?)(?:\.|$|,|\s+with|\s+using)/i);
  if (!topic && englishTopicMatch) {
    topic = englishTopicMatch[1].trim();
  }
  
  // Extract slide count
  let slideCount: number | undefined;
  const slideCountMatch = message.match(/(\d+)\s*(?:张|页|slides?|页?幻灯片)/i);
  if (slideCountMatch) {
    slideCount = parseInt(slideCountMatch[1], 10);
  }
  
  return {
    hasPPTIntent,
    topic,
    slideCount,
  };
}

/**
 * Build a response suggesting PPT generation
 */
export function buildPPTSuggestionResponse(topic?: string): string {
  if (topic) {
    return `我可以帮您生成一个关于"${topic}"的演示文稿。请问您希望：
1. 演示文稿的目的是什么？（信息传递/说服/教育/商业推介/报告）
2. 目标受众是谁？
3. 需要多少张幻灯片？
4. 有什么特殊要求吗？

或者，我可以直接用默认设置为您生成一个专业的演示文稿。`;
  }
  
  return `我可以帮您生成专业的演示文稿。请告诉我：
1. 演示文稿的主题是什么？
2. 目标受众是谁？
3. 需要多少张幻灯片？

您可以直接说"帮我做一个关于[主题]的PPT"。`;
}

const pptGenerationToolExports = {
  createPPTGenerationTool,
  detectPPTGenerationIntent,
  buildPPTSuggestionResponse,
  pptGenerationInputSchema,
};

export default pptGenerationToolExports;
