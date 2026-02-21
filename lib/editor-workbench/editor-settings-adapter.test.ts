import { createEditorOptions } from '@/lib/monaco/config';

describe('editor-settings-adapter', () => {
  it('maps editor appearance settings into Monaco options', () => {
    const options = createEditorOptions('code', {}, {
      editorSettings: {
      appearance: {
        fontSize: 16,
        tabSize: 4,
        wordWrap: true,
        minimap: false,
      },
      },
    });
    expect(options.fontSize).toBe(16);
    expect(options.tabSize).toBe(4);
    expect(options.wordWrap).toBe('on');
    expect(typeof options.minimap === 'object' && options.minimap !== null).toBe(true);
    if (typeof options.minimap === 'object' && options.minimap !== null) {
      expect(options.minimap.enabled).toBe(false);
    }
  });

  it('lets explicit overrides win over mapped settings', () => {
    const options = createEditorOptions(
      'code',
      {
        wordWrap: 'off',
      },
      {
        editorSettings: {
          appearance: {
            wordWrap: true,
          },
        },
      }
    );

    expect(options.wordWrap).toBe('off');
  });
});
