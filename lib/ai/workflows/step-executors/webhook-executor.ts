/**
 * Webhook Step Executor
 * Makes HTTP requests to external services
 */

import type { WorkflowStepDefinition } from './types';

export async function executeWebhookStep(
  step: WorkflowStepDefinition,
  input: Record<string, unknown>
): Promise<unknown> {
  if (!step.webhookUrl) {
    throw new Error('Webhook step requires webhookUrl');
  }

  try {
    // Replace placeholders in URL and body
    let url = step.webhookUrl;
    let body = step.body || '';
    
    for (const [key, value] of Object.entries(input)) {
      url = url.replace(`{{${key}}}`, String(value));
      body = body.replace(`{{${key}}}`, String(value));
    }

    const response = await fetch(url, {
      method: step.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...step.headers,
      },
      body: step.method !== 'GET' ? body : undefined,
    });

    const responseText = await response.text();
    let responseData: unknown;
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    return {
      status: response.status,
      statusText: response.statusText,
      data: responseData,
      headers: Object.fromEntries(response.headers.entries()),
    };
  } catch (error) {
    throw new Error(`Webhook request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
