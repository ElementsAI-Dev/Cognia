import {
  MIGRATED_ROUTING_GUARDRAILS,
  validateMigratedRoutingFiles,
  validateRoutingContent,
} from './migration-guardrails';

describe('migration-guardrails', () => {
  it('detects forbidden legacy routing patterns in content', () => {
    const violations = validateRoutingContent(
      [
        'getProviderModel(',
        'const key = providerSettings.openai?.apiKey;',
        'throw new Error(`No API key configured for ${provider}`);',
      ].join('\n'),
      {
        filePath: 'sample.ts',
        patterns: MIGRATED_ROUTING_GUARDRAILS,
      }
    );

    expect(violations).toHaveLength(3);
    expect(violations.map((violation) => violation.patternId)).toEqual([
      'legacy-model-helper',
      'hardcoded-openai-key',
      'inline-no-api-key-message',
    ]);
  });

  it('passes migrated routing files without forbidden patterns', () => {
    const result = validateMigratedRoutingFiles();

    expect(result.violations).toEqual([]);
  });
});
