/**
 * Shared AI JSON Parsing Utility
 *
 * Safely parse JSON from AI responses that may be wrapped in markdown code blocks
 * or contain extra text around the JSON payload.
 *
 * Consolidates duplicate implementations from:
 * - hooks/designer/use-ppt-ai.ts (parseAIJSON)
 * - hooks/ppt/use-ppt-generation.ts (parseJSONResponse)
 * - stores/tools/ppt-editor-store.ts (inline parsing)
 */

/**
 * Parse JSON from an AI response string.
 *
 * Handles common AI output patterns:
 * 1. JSON wrapped in ```json ... ``` code blocks
 * 2. Raw JSON objects `{ ... }`
 * 3. Raw JSON arrays `[ ... ]`
 * 4. JSON mixed with surrounding prose
 *
 * @param response - Raw text response from AI
 * @returns Parsed JSON value
 * @throws Error if no valid JSON can be extracted
 */
export function parseAIJSON(response: string): unknown {
  // Try to extract JSON from markdown code blocks
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : response.trim();

  try {
    return JSON.parse(jsonStr);
  } catch {
    // Try to find JSON object in the response
    const objectMatch = response.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        // ignore, fall through to array match
      }
    }
    // Try to find JSON array in the response
    const arrayMatch = response.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch {
        // ignore
      }
    }
    throw new Error('Failed to parse AI response as JSON');
  }
}
