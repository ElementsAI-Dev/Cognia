/**
 * A2UI App Detail Dialog Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppDetailDialog, type AppDetailDialogProps } from './app-detail-dialog';
import type { A2UIAppInstance } from '@/hooks/a2ui/use-app-builder';
import type { A2UIAppTemplate } from '@/lib/a2ui/templates';

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

const createMockApp = (overrides: Partial<A2UIAppInstance> = {}): A2UIAppInstance => ({
  id: 'test-app-1',
  templateId: 'template-1',
  name: 'Test Application',
  createdAt: Date.now() - 86400000,
  lastModified: Date.now() - 3600000,
  description: 'This is a test application',
  version: '1.0.0',
  category: 'productivity',
  tags: ['test', 'demo'],
  author: {
    name: 'Test Author',
    email: 'test@example.com',
    url: 'https://example.com',
  },
  stats: {
    views: 100,
    uses: 50,
    rating: 4.5,
    ratingCount: 10,
  },
  ...overrides,
});

const createMockTemplate = (overrides: Partial<A2UIAppTemplate> = {}): A2UIAppTemplate => ({
  id: 'template-1',
  name: 'Test Template',
  description: 'A test template',
  icon: 'CheckSquare',
  category: 'productivity',
  components: [],
  dataModel: {},
  tags: ['test'],
  ...overrides,
});

const renderDialog = (props: Partial<AppDetailDialogProps> = {}) => {
  const defaultProps: AppDetailDialogProps = {
    app: createMockApp(),
    template: createMockTemplate(),
    open: true,
    onOpenChange: jest.fn(),
    ...props,
  };
  return render(<AppDetailDialog {...defaultProps} />);
};

describe('AppDetailDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render dialog when open', () => {
      renderDialog();
      
      expect(screen.getByText('应用详情')).toBeInTheDocument();
    });

    it('should not render when app is null', () => {
      renderDialog({ app: null });
      
      expect(screen.queryByText('应用详情')).not.toBeInTheDocument();
    });

    it('should show app name', () => {
      renderDialog();
      
      expect(screen.getByText('Test Application')).toBeInTheDocument();
    });

    it('should show version badge', () => {
      renderDialog();
      
      expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    });

    it('should show template name badge', () => {
      renderDialog();
      
      expect(screen.getByText('Test Template')).toBeInTheDocument();
    });

    it('should show description', () => {
      renderDialog();
      
      expect(screen.getByText('This is a test application')).toBeInTheDocument();
    });

    it('should show "暂无描述" when no description', () => {
      renderDialog({
        app: createMockApp({ description: undefined }),
      });
      
      expect(screen.getByText('暂无描述')).toBeInTheDocument();
    });
  });

  describe('tabs', () => {
    it('should render all tabs', () => {
      renderDialog();
      
      expect(screen.getByText('基本信息')).toBeInTheDocument();
      expect(screen.getByText('元数据')).toBeInTheDocument();
      expect(screen.getByText('发布准备')).toBeInTheDocument();
    });

    it('should switch to metadata tab when clicked', async () => {
      renderDialog();
      
      fireEvent.click(screen.getByText('元数据'));
      
      await waitFor(() => {
        expect(screen.getByText('作者信息')).toBeInTheDocument();
      });
    });

    it('should switch to publish tab when clicked', async () => {
      renderDialog();
      
      fireEvent.click(screen.getByText('发布准备'));
      
      await waitFor(() => {
        expect(screen.getByText('发布准备检查')).toBeInTheDocument();
      });
    });
  });

  describe('basic info tab', () => {
    it('should show category', () => {
      renderDialog();
      
      expect(screen.getByText('效率工具')).toBeInTheDocument();
    });

    it('should show tags', () => {
      renderDialog();
      
      expect(screen.getByText('test')).toBeInTheDocument();
      expect(screen.getByText('demo')).toBeInTheDocument();
    });

    it('should show creation and modification dates', () => {
      renderDialog();
      
      expect(screen.getByText('创建时间')).toBeInTheDocument();
      expect(screen.getByText('最后修改')).toBeInTheDocument();
    });
  });

  describe('metadata tab', () => {
    it('should show author information', async () => {
      renderDialog();
      
      fireEvent.click(screen.getByText('元数据'));
      
      await waitFor(() => {
        expect(screen.getByText('名称: Test Author')).toBeInTheDocument();
        expect(screen.getByText('邮箱: test@example.com')).toBeInTheDocument();
        expect(screen.getByText('网站: https://example.com')).toBeInTheDocument();
      });
    });

    it('should show "暂无作者信息" when no author', async () => {
      renderDialog({
        app: createMockApp({ author: undefined }),
      });
      
      fireEvent.click(screen.getByText('元数据'));
      
      await waitFor(() => {
        expect(screen.getByText('暂无作者信息')).toBeInTheDocument();
      });
    });

    it('should show statistics', async () => {
      renderDialog();
      
      fireEvent.click(screen.getByText('元数据'));
      
      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument(); // views
        expect(screen.getByText('50')).toBeInTheDocument(); // uses
        expect(screen.getByText('4.5')).toBeInTheDocument(); // rating
        expect(screen.getByText('10')).toBeInTheDocument(); // ratingCount
      });
    });

    it('should show template info', async () => {
      renderDialog();
      
      fireEvent.click(screen.getByText('元数据'));
      
      await waitFor(() => {
        expect(screen.getByText('模板 ID: template-1')).toBeInTheDocument();
        expect(screen.getByText('模板名称: Test Template')).toBeInTheDocument();
      });
    });
  });

  describe('publish tab', () => {
    it('should show check publish button', async () => {
      renderDialog();
      
      fireEvent.click(screen.getByText('发布准备'));
      
      await waitFor(() => {
        expect(screen.getByText('检查发布要求')).toBeInTheDocument();
      });
    });

    it('should call onPreparePublish when check button clicked', async () => {
      const onPreparePublish = jest.fn(() => ({ valid: true, missing: [] }));
      renderDialog({ onPreparePublish });
      
      fireEvent.click(screen.getByText('发布准备'));
      
      await waitFor(() => {
        const checkButton = screen.getByText('检查发布要求');
        fireEvent.click(checkButton);
      });
      
      expect(onPreparePublish).toHaveBeenCalledWith('test-app-1');
    });

    it('should show success message when valid', async () => {
      const onPreparePublish = jest.fn(() => ({ valid: true, missing: [] }));
      renderDialog({ onPreparePublish });
      
      fireEvent.click(screen.getByText('发布准备'));
      
      await waitFor(() => {
        const checkButton = screen.getByText('检查发布要求');
        fireEvent.click(checkButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText('应用已准备好发布！')).toBeInTheDocument();
      });
    });

    it('should show missing fields when invalid', async () => {
      const onPreparePublish = jest.fn(() => ({
        valid: false,
        missing: ['description (at least 10 characters)', 'thumbnail'],
      }));
      renderDialog({ onPreparePublish });
      
      fireEvent.click(screen.getByText('发布准备'));
      
      await waitFor(() => {
        const checkButton = screen.getByText('检查发布要求');
        fireEvent.click(checkButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText('需要补充以下信息：')).toBeInTheDocument();
        expect(screen.getByText('description (at least 10 characters)')).toBeInTheDocument();
        expect(screen.getByText('thumbnail')).toBeInTheDocument();
      });
    });

    it('should show published status when app is published', async () => {
      renderDialog({
        app: createMockApp({
          isPublished: true,
          publishedAt: Date.now() - 86400000,
          storeId: 'store-123',
        }),
      });
      
      fireEvent.click(screen.getByText('发布准备'));
      
      await waitFor(() => {
        expect(screen.getByText('已发布')).toBeInTheDocument();
        expect(screen.getByText('商店 ID: store-123')).toBeInTheDocument();
      });
    });
  });

  describe('editing', () => {
    it('should enter edit mode when edit button clicked', async () => {
      renderDialog();
      
      const editButton = screen.getByText('编辑信息');
      fireEvent.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByText('取消')).toBeInTheDocument();
        expect(screen.getByText('保存')).toBeInTheDocument();
      });
    });

    it('should show input fields in edit mode', async () => {
      renderDialog();
      
      fireEvent.click(screen.getByText('编辑信息'));
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('应用名称')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('1.0.0')).toBeInTheDocument();
      });
    });

    it('should cancel edit mode', async () => {
      renderDialog();
      
      fireEvent.click(screen.getByText('编辑信息'));
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('取消'));
      });
      
      await waitFor(() => {
        expect(screen.getByText('编辑信息')).toBeInTheDocument();
      });
    });

    it('should call onSave when save is clicked', async () => {
      const onSave = jest.fn();
      renderDialog({ onSave });
      
      fireEvent.click(screen.getByText('编辑信息'));
      
      await waitFor(() => {
        const nameInput = screen.getByPlaceholderText('应用名称');
        fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
      });
      
      fireEvent.click(screen.getByText('保存'));
      
      expect(onSave).toHaveBeenCalledWith('test-app-1', expect.objectContaining({
        name: 'Updated Name',
      }));
    });
  });

  describe('thumbnail', () => {
    it('should show thumbnail when set', () => {
      renderDialog({
        app: createMockApp({ thumbnail: 'data:image/png;base64,test' }),
      });
      
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'data:image/png;base64,test');
    });

    it('should call onGenerateThumbnail when refresh button clicked', async () => {
      const onGenerateThumbnail = jest.fn();
      renderDialog({ onGenerateThumbnail });
      
      const refreshButton = screen.getByText('刷新缩略图');
      fireEvent.click(refreshButton);
      
      expect(onGenerateThumbnail).toHaveBeenCalledWith('test-app-1');
    });
  });

  describe('dialog controls', () => {
    it('should call onOpenChange when close button clicked', () => {
      const onOpenChange = jest.fn();
      renderDialog({ onOpenChange });
      
      const closeButton = screen.getByText('关闭');
      fireEvent.click(closeButton);
      
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('should call onOpenChange with false when closing', async () => {
      const onOpenChange = jest.fn();
      renderDialog({ onOpenChange });
      
      // Enter edit mode
      fireEvent.click(screen.getByText('编辑信息'));
      
      // Click cancel to exit edit mode
      await waitFor(() => {
        fireEvent.click(screen.getByText('取消'));
      });
      
      // Click close button
      await waitFor(() => {
        fireEvent.click(screen.getByText('关闭'));
      });
      
      // onOpenChange should have been called with false
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
