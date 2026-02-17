import { WORKFLOW_TOOL_CATALOG } from './tool-catalog';

describe('WORKFLOW_TOOL_CATALOG', () => {
  it('contains non-empty unique tool names with required fields', () => {
    expect(WORKFLOW_TOOL_CATALOG.length).toBeGreaterThan(0);

    const names = WORKFLOW_TOOL_CATALOG.map((tool) => tool.name);
    expect(new Set(names).size).toBe(names.length);

    for (const tool of WORKFLOW_TOOL_CATALOG) {
      expect(tool.label).toBeTruthy();
      expect(tool.category).toBeTruthy();
      expect(tool.description).toBeTruthy();
    }
  });

  it('contains key tools and expected category spread', () => {
    const names = WORKFLOW_TOOL_CATALOG.map((tool) => tool.name);
    const categories = new Set(WORKFLOW_TOOL_CATALOG.map((tool) => tool.category));

    expect(names).toContain('web_search');
    expect(names).toContain('recording_stop');
    expect(categories.has('search')).toBe(true);
    expect(categories.has('file')).toBe(true);
    expect(categories.has('recording')).toBe(true);
  });
});
