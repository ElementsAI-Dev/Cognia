import { htmlSandboxAdapter } from './adapters/html-adapter';
import { reactSandboxAdapter } from './adapters/react-adapter';
import { vueSandboxAdapter } from './adapters/vue-adapter';
import {
  clearSandboxAdapters,
  getSandboxAdapter,
  listSandboxAdapters,
  registerSandboxAdapter,
} from './registry';

describe('sandbox adapter registry', () => {
  afterEach(() => {
    clearSandboxAdapters();
    registerSandboxAdapter(reactSandboxAdapter);
    registerSandboxAdapter(vueSandboxAdapter);
    registerSandboxAdapter(htmlSandboxAdapter);
  });

  it('has default adapters registered', () => {
    expect(getSandboxAdapter('react')?.framework).toBe('react');
    expect(getSandboxAdapter('vue')?.framework).toBe('vue');
    expect(getSandboxAdapter('html')?.framework).toBe('html');
  });

  it('can override adapters by framework key', () => {
    registerSandboxAdapter({
      framework: 'react',
      template: 'react-ts',
      mainFile: '/App.tsx',
      defaultCode: 'export default function App(){ return null; }',
      buildConfig: () => ({
        template: 'react-ts',
        mainFile: '/App.tsx',
        files: {
          '/App.tsx': { code: 'export default function App(){ return null; }', active: true },
        },
      }),
    });

    expect(getSandboxAdapter('react')?.defaultCode).toContain('return null');
    expect(listSandboxAdapters().length).toBeGreaterThanOrEqual(3);
  });
});
