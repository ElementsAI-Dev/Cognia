import { NextRequest, NextResponse } from 'next/server';

import { executeWorkflow } from '@/lib/ai/workflows/executor';
import { getGlobalWorkflowRegistry } from '@/lib/ai/workflows/registry';
import type { ProviderName } from '@/types/provider';
import type { WorkflowDefinition } from '@/types/workflow';

export const dynamic = 'force-dynamic';

type WebhookBody = {
  input?: Record<string, unknown>;
  secret?: string;
  definition?: WorkflowDefinition;
};

const WORKFLOW_WEBHOOK_SECRET_ENV_KEYS = [
  'WORKFLOW_WEBHOOK_SECRET',
  'COGNIA_WORKFLOW_WEBHOOK_SECRET',
] as const;

function normalizeSecret(secret: string | null | undefined): string | undefined {
  if (typeof secret !== 'string') {
    return undefined;
  }
  const trimmed = secret.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function resolveExpectedWebhookSecret(): string | undefined {
  for (const key of WORKFLOW_WEBHOOK_SECRET_ENV_KEYS) {
    const value = normalizeSecret(process.env[key]);
    if (value) {
      return value;
    }
  }
  return undefined;
}

function resolveProvidedWebhookSecret(
  request: NextRequest,
  body: WebhookBody
): { secret?: string; mismatch: boolean } {
  const headerSecret = normalizeSecret(request.headers.get('x-cognia-webhook-secret'));
  const bodySecret = normalizeSecret(body.secret);

  if (headerSecret && bodySecret && headerSecret !== bodySecret) {
    return { mismatch: true };
  }

  return {
    secret: headerSecret ?? bodySecret,
    mismatch: false,
  };
}

function getProviderApiKey(provider: ProviderName): string {
  switch (provider) {
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY || '';
    case 'google':
      return process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
    case 'deepseek':
      return process.env.DEEPSEEK_API_KEY || '';
    case 'groq':
      return process.env.GROQ_API_KEY || '';
    case 'mistral':
      return process.env.MISTRAL_API_KEY || '';
    case 'openai':
    default:
      return process.env.OPENAI_API_KEY || '';
  }
}

function parseDefinition(
  request: NextRequest,
  body: WebhookBody
): WorkflowDefinition | undefined {
  if (body.definition) {
    return body.definition;
  }

  const encoded = request.headers.get('x-workflow-definition');
  if (!encoded) {
    return undefined;
  }

  try {
    const json = Buffer.from(encoded, 'base64').toString('utf-8');
    return JSON.parse(json) as WorkflowDefinition;
  } catch {
    return undefined;
  }
}

async function runWebhookExecution(
  request: NextRequest,
  workflowId: string,
  body: WebhookBody
): Promise<NextResponse> {
  const { secret: providedSecret, mismatch } = resolveProvidedWebhookSecret(request, body);
  if (mismatch) {
    return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 });
  }

  const expectedSecret = resolveExpectedWebhookSecret();
  if (expectedSecret && providedSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 });
  }

  const definition = parseDefinition(request, body);
  if (!definition) {
    return NextResponse.json(
      {
        accepted: true,
        workflowId,
        executed: false,
        reason:
          'No workflow definition provided. Supply `definition` in body or `x-workflow-definition` header.',
      },
      { status: 202 }
    );
  }

  const provider = (process.env.WORKFLOW_WEBHOOK_PROVIDER || 'openai') as ProviderName;
  const apiKey = getProviderApiKey(provider);
  if (!apiKey) {
    return NextResponse.json(
      {
        error: `Missing API key for provider ${provider}.`,
      },
      { status: 500 }
    );
  }

  const model = process.env.WORKFLOW_WEBHOOK_MODEL || 'gpt-4o-mini';
  const registry = getGlobalWorkflowRegistry();
  registry.register(definition);

  const result = await executeWorkflow(
    definition.id,
    `webhook-${workflowId}-${Date.now()}`,
    body.input || {},
    {
      provider,
      model,
      apiKey,
      baseURL: process.env.WORKFLOW_WEBHOOK_BASE_URL,
      temperature: 0.7,
      maxRetries: 1,
      stepTimeout: 300000,
    }
  );

  return NextResponse.json({
    accepted: true,
    workflowId,
    executionId: result.execution.id,
    status: result.execution.status,
    success: result.success,
    output: result.output,
    error: result.error,
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ workflowId: string }> }
) {
  const params = await context.params;
  const { workflowId } = params;
  return NextResponse.json({
    ok: true,
    workflowId,
    method: request.method,
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ workflowId: string }> }
) {
  const params = await context.params;
  const { workflowId } = params;
  const body = ((await request.json().catch(() => ({}))) || {}) as WebhookBody;
  return runWebhookExecution(request, workflowId, body);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ workflowId: string }> }
) {
  const params = await context.params;
  const { workflowId } = params;
  const body = ((await request.json().catch(() => ({}))) || {}) as WebhookBody;
  return runWebhookExecution(request, workflowId, body);
}
