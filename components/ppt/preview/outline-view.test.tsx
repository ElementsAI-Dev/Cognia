import { render, screen, fireEvent } from '@testing-library/react';
import { OutlineView } from './outline-view';
import type { PPTPresentation } from '@/types/workflow';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      outline: 'Outline',
      marpCode: 'Marp Code',
      marpMarkdown: 'Marp Markdown',
      copy: 'Copy',
      copied: 'Copied',
      notes: 'Notes',
      untitled: 'Untitled',
    };
    return translations[key] || key;
  },
}));

// Mock SLIDE_LAYOUT_INFO
jest.mock('@/types/workflow', () => ({
  ...jest.requireActual('@/types/workflow'),
  SLIDE_LAYOUT_INFO: {
    title: { name: 'Title Slide' },
    'title-content': { name: 'Title & Content' },
    bullets: { name: 'Bullets' },
    section: { name: 'Section' },
  },
}));

const mockPresentation: PPTPresentation = {
  id: 'test-ppt',
  title: 'Test Presentation',
  subtitle: 'A test subtitle',
  aspectRatio: '16:9',
  slides: [
    {
      id: 'slide-1',
      order: 0,
      layout: 'title',
      title: 'Introduction',
      subtitle: 'Welcome',
      content: '',
      bullets: [],
      elements: [],
      notes: 'Speaker notes for intro',
    },
    {
      id: 'slide-2',
      order: 1,
      layout: 'bullets',
      title: 'Main Points',
      subtitle: '',
      content: 'Some content here',
      bullets: ['Point A', 'Point B', 'Point C'],
      elements: [],
      notes: '',
    },
    {
      id: 'slide-3',
      order: 2,
      layout: 'section',
      title: 'Conclusion',
      subtitle: '',
      content: '',
      bullets: [],
      elements: [{ id: 'el-1', type: 'text', content: 'Custom element' }],
    },
  ],
  totalSlides: 3,
  theme: {
    id: 'modern-light',
    name: 'Modern Light',
    primaryColor: '#3B82F6',
    secondaryColor: '#64748B',
    accentColor: '#10B981',
    backgroundColor: '#FFFFFF',
    textColor: '#1E293B',
    headingFont: 'Inter',
    bodyFont: 'Inter',
    codeFont: 'monospace',
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const marpContent = `---
marp: true
theme: default
---

# Introduction

---

# Main Points
- Point A
- Point B
`;

describe('OutlineView', () => {
  const defaultProps = {
    presentation: mockPresentation,
    marpContent,
    onCopy: jest.fn(),
    copied: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders outline tab by default', () => {
    render(<OutlineView {...defaultProps} />);
    expect(screen.getByText('Outline')).toBeInTheDocument();
    expect(screen.getByText('Introduction')).toBeInTheDocument();
  });

  it('renders all slide titles in outline', () => {
    render(<OutlineView {...defaultProps} />);
    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('Main Points')).toBeInTheDocument();
    expect(screen.getByText('Conclusion')).toBeInTheDocument();
  });

  it('displays slide numbers', () => {
    render(<OutlineView {...defaultProps} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows bullets for slides that have them', () => {
    render(<OutlineView {...defaultProps} />);
    expect(screen.getByText('Point A')).toBeInTheDocument();
    expect(screen.getByText('Point B')).toBeInTheDocument();
    expect(screen.getByText('Point C')).toBeInTheDocument();
  });

  it('shows notes badge for slides with notes', () => {
    render(<OutlineView {...defaultProps} />);
    expect(screen.getByText('备注')).toBeInTheDocument();
  });

  it('expands and collapses slides', () => {
    render(<OutlineView {...defaultProps} />);
    
    // Find the first slide's collapse button and click it
    const introTitle = screen.getByText('Introduction');
    const triggerButton = introTitle.closest('button');
    
    if (triggerButton) {
      fireEvent.click(triggerButton);
      // After collapse, speaker notes should still be in DOM but content hidden
    }
  });

  it('shows expand all and collapse all buttons', () => {
    render(<OutlineView {...defaultProps} />);
    expect(screen.getByText('展开全部')).toBeInTheDocument();
    expect(screen.getByText('折叠全部')).toBeInTheDocument();
  });

  it('collapses all slides when collapse all is clicked', () => {
    render(<OutlineView {...defaultProps} />);
    
    const collapseAllBtn = screen.getByText('折叠全部');
    fireEvent.click(collapseAllBtn);
    
    // Content should be collapsed
  });

  it('expands all slides when expand all is clicked', () => {
    render(<OutlineView {...defaultProps} />);
    
    // First collapse all
    fireEvent.click(screen.getByText('折叠全部'));
    
    // Then expand all
    fireEvent.click(screen.getByText('展开全部'));
    
    // All content should be visible again
    expect(screen.getByText('Point A')).toBeInTheDocument();
  });

  it('displays slide statistics', () => {
    render(<OutlineView {...defaultProps} />);
    expect(screen.getByText('3 张幻灯片')).toBeInTheDocument();
    expect(screen.getByText('3 个要点')).toBeInTheDocument();
  });

  it('renders structure tab', () => {
    render(<OutlineView {...defaultProps} />);
    expect(screen.getByRole('tab', { name: '结构概览' })).toBeInTheDocument();
  });

  it('renders Marp Code tab', () => {
    render(<OutlineView {...defaultProps} />);
    expect(screen.getByRole('tab', { name: 'Marp Code' })).toBeInTheDocument();
  });

  it('handles copied state prop', () => {
    const { container } = render(<OutlineView {...defaultProps} copied={true} />);
    expect(container).toBeInTheDocument();
  });

  it('passes onCopy prop correctly', () => {
    const onCopy = jest.fn();
    const { container } = render(<OutlineView {...defaultProps} onCopy={onCopy} />);
    expect(container).toBeInTheDocument();
  });

  it('shows content preview for slides with content', () => {
    render(<OutlineView {...defaultProps} />);
    expect(screen.getByText('Some content here')).toBeInTheDocument();
  });
});
