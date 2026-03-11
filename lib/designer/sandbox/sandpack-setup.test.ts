import {
  buildFrameworkSandboxConfig,
  getFrameworkDefaultCode,
  sandpackTemplateToFramework,
} from './sandpack-setup';

describe('sandbox setup', () => {
  it('builds react runtime setup', () => {
    const config = buildFrameworkSandboxConfig({
      framework: 'react',
      code: 'export default function App() { return <div>Hi</div>; }',
      enableBridge: true,
    });

    expect(config).not.toBeNull();
    expect(config?.template).toBe('react-ts');
    expect(config?.mainFile).toBe('/App.tsx');
    expect(config?.files['/App.tsx']).toBeDefined();
    expect(config?.files['/designer-bridge.ts']).toBeDefined();
  });

  it('builds html runtime setup with bridge injection', () => {
    const config = buildFrameworkSandboxConfig({
      framework: 'html',
      code: '<html><body><div>Hello</div></body></html>',
      enableBridge: true,
    });

    expect(config).not.toBeNull();
    expect(config?.template).toBe('vanilla');
    expect(config?.files['/index.html']?.code).toContain('preview-ready');
  });

  it('returns default code for supported framework', () => {
    expect(getFrameworkDefaultCode('react')).toContain('export default function App');
    expect(getFrameworkDefaultCode('vue')).toContain('<template>');
  });

  it('maps sandpack templates to framework', () => {
    expect(sandpackTemplateToFramework('react')).toBe('react');
    expect(sandpackTemplateToFramework('react-ts')).toBe('react');
    expect(sandpackTemplateToFramework('vue')).toBe('vue');
    expect(sandpackTemplateToFramework('static')).toBe('html');
    expect(sandpackTemplateToFramework('unknown')).toBeNull();
  });
});
