import type { PromptTemplate } from '@/types/content/prompt-template';

export type PromptTemplateIdentityKind = 'marketplace' | 'mcp' | 'normalized';

export interface PromptTemplateIdentity {
  kind: PromptTemplateIdentityKind;
  key: string;
}

type PromptTemplateLike = Partial<PromptTemplate> & {
  meta?: PromptTemplate['meta'];
};

function normalizeText(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function buildPromptTemplateIdentity(template: PromptTemplateLike): PromptTemplateIdentity | null {
  const marketplaceId = template.meta?.marketplace?.marketplaceId;
  if (marketplaceId) {
    return {
      kind: 'marketplace',
      key: `marketplace:${normalizeText(marketplaceId)}`,
    };
  }

  const mcpServerId = template.meta?.mcp?.serverId;
  const mcpPromptName = template.meta?.mcp?.promptName;
  if (mcpServerId && mcpPromptName) {
    return {
      kind: 'mcp',
      key: `mcp:${normalizeText(mcpServerId)}:${normalizeText(mcpPromptName)}`,
    };
  }

  const name = normalizeText(template.name);
  const content = normalizeText(template.content);
  if (!name || !content) {
    return null;
  }

  const category = normalizeText(template.category);
  const targets = (template.targets ?? []).map((target) => normalizeText(target)).sort().join(',');
  return {
    kind: 'normalized',
    key: `template:${name}:${category}:${targets}:${content}`,
  };
}
