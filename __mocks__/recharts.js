/**
 * Mock for recharts library
 * Provides stub components for testing
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const React = require('react');

const createMockComponent = (name) => {
  const Component = ({ children, ...props }) => {
    return React.createElement('div', { 'data-testid': `mock-${name.toLowerCase()}`, ...props }, children);
  };
  Component.displayName = name;
  return Component;
};

module.exports = {
  LineChart: createMockComponent('LineChart'),
  Line: createMockComponent('Line'),
  BarChart: createMockComponent('BarChart'),
  Bar: createMockComponent('Bar'),
  AreaChart: createMockComponent('AreaChart'),
  Area: createMockComponent('Area'),
  PieChart: createMockComponent('PieChart'),
  Pie: createMockComponent('Pie'),
  ScatterChart: createMockComponent('ScatterChart'),
  Scatter: createMockComponent('Scatter'),
  RadarChart: createMockComponent('RadarChart'),
  Radar: createMockComponent('Radar'),
  PolarGrid: createMockComponent('PolarGrid'),
  PolarAngleAxis: createMockComponent('PolarAngleAxis'),
  PolarRadiusAxis: createMockComponent('PolarRadiusAxis'),
  XAxis: createMockComponent('XAxis'),
  YAxis: createMockComponent('YAxis'),
  CartesianGrid: createMockComponent('CartesianGrid'),
  Tooltip: createMockComponent('Tooltip'),
  Legend: createMockComponent('Legend'),
  ResponsiveContainer: ({ children }) => React.createElement('div', { 'data-testid': 'mock-responsive-container', style: { width: '100%', height: '100%' } }, children),
  Cell: createMockComponent('Cell'),
};
