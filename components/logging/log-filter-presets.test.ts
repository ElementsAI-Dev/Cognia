import {
  createLogFilterPreset,
  loadLogFilterPresets,
  serializeLogFilterPresets,
} from './log-filter-presets';

describe('log-filter-presets', () => {
  it('loads empty list when payload is invalid', () => {
    expect(loadLogFilterPresets('{bad json')).toEqual([]);
    expect(loadLogFilterPresets('{"foo":true}')).toEqual([]);
  });

  it('creates and serializes valid presets', () => {
    const preset = createLogFilterPreset('Preset 1', {
      levelFilter: 'error',
      moduleFilter: 'all',
      timeRange: '1h',
      searchQuery: 'network',
      useRegex: false,
      highSeverityOnly: true,
    });

    const raw = serializeLogFilterPresets([preset]);
    const parsed = loadLogFilterPresets(raw);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe('Preset 1');
    expect(parsed[0].filters.timeRange).toBe('1h');
  });
});
