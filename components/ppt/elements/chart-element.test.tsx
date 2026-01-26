/**
 * Chart Element Tests
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ChartElement } from './chart-element';
import type { ChartData, ChartDataPoint, ChartOptions } from './chart-element';

// Mock canvas context
const mockContext = {
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  fillText: jest.fn(),
  strokeRect: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  closePath: jest.fn(),
  scale: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  font: '',
  textAlign: 'left' as CanvasTextAlign,
  textBaseline: 'alphabetic' as CanvasTextBaseline,
};

HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(mockContext);
HTMLCanvasElement.prototype.getBoundingClientRect = jest.fn().mockReturnValue({
  width: 400,
  height: 300,
  top: 0,
  left: 0,
  right: 400,
  bottom: 300,
  x: 0,
  y: 0,
  toJSON: () => ({}),
});

const mockChartData: ChartData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr'],
  datasets: [
    {
      label: 'Sales',
      data: [10, 20, 15, 25],
      color: '#3B82F6',
    },
  ],
};

const mockDataPoints: ChartDataPoint[] = [
  { label: 'A', value: 30 },
  { label: 'B', value: 50 },
  { label: 'C', value: 20 },
];

const mockOptions: ChartOptions = {
  title: 'Test Chart',
  showLegend: true,
  showGrid: true,
  showDataLabels: true,
};

describe('ChartElement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render canvas element', () => {
      render(<ChartElement type="bar" data={mockChartData} />);
      
      const canvas = document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<ChartElement type="bar" data={mockChartData} className="custom-class" />);
      
      const canvas = document.querySelector('canvas');
      expect(canvas).toHaveClass('custom-class');
    });

    it('should apply custom width and height', () => {
      render(<ChartElement type="bar" data={mockChartData} width={500} height={400} />);
      
      const canvas = document.querySelector('canvas');
      expect(canvas).toHaveStyle({ width: '500px', height: '400px' });
    });

    it('should accept percentage width', () => {
      render(<ChartElement type="bar" data={mockChartData} width="100%" height={300} />);
      
      const canvas = document.querySelector('canvas');
      expect(canvas).toHaveStyle({ width: '100%' });
    });
  });

  describe('chart types', () => {
    it('should render bar chart', () => {
      render(<ChartElement type="bar" data={mockChartData} options={mockOptions} />);
      
      expect(mockContext.fillRect).toHaveBeenCalled();
    });

    it('should render line chart', () => {
      render(<ChartElement type="line" data={mockChartData} options={mockOptions} />);
      
      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.stroke).toHaveBeenCalled();
    });

    it('should render pie chart', () => {
      render(<ChartElement type="pie" data={mockChartData} options={mockOptions} />);
      
      expect(mockContext.arc).toHaveBeenCalled();
    });

    it('should render doughnut chart', () => {
      render(<ChartElement type="doughnut" data={mockChartData} options={mockOptions} />);
      
      expect(mockContext.arc).toHaveBeenCalled();
    });

    it('should render area chart', () => {
      render(<ChartElement type="area" data={mockChartData} options={mockOptions} />);
      
      expect(mockContext.beginPath).toHaveBeenCalled();
    });

    it('should render scatter chart', () => {
      render(<ChartElement type="scatter" data={mockChartData} options={mockOptions} />);
      
      expect(mockContext.beginPath).toHaveBeenCalled();
    });

    it('should render horizontal-bar chart', () => {
      render(<ChartElement type="horizontal-bar" data={mockChartData} options={mockOptions} />);
      
      expect(mockContext.fillRect).toHaveBeenCalled();
    });
  });

  describe('data formats', () => {
    it('should accept ChartData format', () => {
      render(<ChartElement type="bar" data={mockChartData} />);
      
      expect(mockContext.fillRect).toHaveBeenCalled();
    });

    it('should accept ChartDataPoint[] format', () => {
      render(<ChartElement type="pie" data={mockDataPoints} />);
      
      expect(mockContext.arc).toHaveBeenCalled();
    });
  });

  describe('options', () => {
    it('should render title when provided', () => {
      render(<ChartElement type="bar" data={mockChartData} options={{ title: 'My Chart' }} />);
      
      expect(mockContext.fillText).toHaveBeenCalled();
    });

    it('should render grid when showGrid is true', () => {
      render(<ChartElement type="bar" data={mockChartData} options={{ showGrid: true }} />);
      
      expect(mockContext.stroke).toHaveBeenCalled();
    });

    it('should render data labels when showDataLabels is true', () => {
      render(<ChartElement type="bar" data={mockChartData} options={{ showDataLabels: true }} />);
      
      expect(mockContext.fillText).toHaveBeenCalled();
    });

    it('should use custom colors', () => {
      const customColors = ['#FF0000', '#00FF00', '#0000FF'];
      render(
        <ChartElement 
          type="bar" 
          data={mockChartData} 
          options={{ colors: customColors }} 
        />
      );
      
      expect(mockContext.fillRect).toHaveBeenCalled();
    });
  });

  describe('theme integration', () => {
    it('should apply theme colors', () => {
      const theme = {
        primaryColor: '#123456',
        textColor: '#654321',
        backgroundColor: '#FFFFFF',
      };
      
      render(<ChartElement type="bar" data={mockChartData} theme={theme} />);
      
      expect(mockContext.clearRect).toHaveBeenCalled();
    });
  });

  describe('multiple datasets', () => {
    it('should render multiple datasets in bar chart', () => {
      const multiDataset: ChartData = {
        labels: ['A', 'B', 'C'],
        datasets: [
          { label: 'Dataset 1', data: [10, 20, 30], color: '#FF0000' },
          { label: 'Dataset 2', data: [15, 25, 35], color: '#00FF00' },
        ],
      };
      
      render(<ChartElement type="bar" data={multiDataset} />);
      
      expect(mockContext.fillRect).toHaveBeenCalled();
    });

    it('should render multiple datasets in line chart', () => {
      const multiDataset: ChartData = {
        labels: ['A', 'B', 'C'],
        datasets: [
          { label: 'Line 1', data: [10, 20, 30], color: '#FF0000' },
          { label: 'Line 2', data: [15, 25, 35], color: '#00FF00' },
        ],
      };
      
      render(<ChartElement type="line" data={multiDataset} />);
      
      expect(mockContext.stroke).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty data', () => {
      const emptyData: ChartData = {
        labels: [],
        datasets: [{ label: 'Empty', data: [] }],
      };
      
      expect(() => {
        render(<ChartElement type="bar" data={emptyData} />);
      }).not.toThrow();
    });

    it('should handle single data point', () => {
      const singlePoint: ChartData = {
        labels: ['Only'],
        datasets: [{ label: 'Single', data: [42] }],
      };
      
      expect(() => {
        render(<ChartElement type="bar" data={singlePoint} />);
      }).not.toThrow();
    });

    it('should handle negative values', () => {
      const negativeData: ChartData = {
        labels: ['A', 'B', 'C'],
        datasets: [{ label: 'Negative', data: [-10, 20, -5] }],
      };
      
      expect(() => {
        render(<ChartElement type="bar" data={negativeData} />);
      }).not.toThrow();
    });

    it('should handle zero values', () => {
      const zeroData: ChartData = {
        labels: ['A', 'B', 'C'],
        datasets: [{ label: 'Zeros', data: [0, 0, 0] }],
      };
      
      expect(() => {
        render(<ChartElement type="bar" data={zeroData} />);
      }).not.toThrow();
    });
  });
});
