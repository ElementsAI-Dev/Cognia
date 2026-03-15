import { collectPluginExtensionReadiness } from './plugin-extension-readiness-check';

describe('collectPluginExtensionReadiness', () => {
  it('collects capability parity, manifest integrity, and dev extension flow checks', () => {
    const report = collectPluginExtensionReadiness(process.cwd());

    expect(report.checks.capabilityParity.checked).toBe(true);
    expect(report.checks.catalogSourceIntegrity.checked).toBe(true);
    expect(report.checks.devExtensionFlow.checked).toBe(true);
    expect(Array.isArray(report.checks.capabilityParity.issues)).toBe(true);
  });
});
