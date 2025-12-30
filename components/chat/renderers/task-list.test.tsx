import { render, screen, fireEvent } from '@testing-library/react';
import { TaskList, TaskListItem } from './task-list';

describe('TaskList', () => {
  const mockItems = [
    { id: '1', text: 'Task 1', checked: false },
    { id: '2', text: 'Task 2', checked: true },
    { id: '3', text: 'Task 3', checked: false },
  ];

  describe('Rendering', () => {
    it('renders all task items', () => {
      render(<TaskList items={mockItems} />);
      
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Task 2')).toBeInTheDocument();
      expect(screen.getByText('Task 3')).toBeInTheDocument();
    });

    it('renders checked items with line-through', () => {
      render(<TaskList items={mockItems} />);
      
      const checkedItem = screen.getByText('Task 2');
      expect(checkedItem).toHaveClass('line-through');
    });

    it('renders unchecked items without line-through', () => {
      render(<TaskList items={mockItems} />);
      
      const uncheckedItem = screen.getByText('Task 1');
      expect(uncheckedItem).not.toHaveClass('line-through');
    });

    it('applies custom className', () => {
      const { container } = render(
        <TaskList items={mockItems} className="custom-class" />
      );
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Progress', () => {
    it('shows progress when showProgress is true', () => {
      render(<TaskList items={mockItems} showProgress />);
      
      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.getByText('1 / 3 (33%)')).toBeInTheDocument();
    });

    it('hides progress when showProgress is false', () => {
      render(<TaskList items={mockItems} showProgress={false} />);
      
      expect(screen.queryByText('Progress')).not.toBeInTheDocument();
    });

    it('calculates correct progress percentage', () => {
      const allCheckedItems = [
        { id: '1', text: 'Task 1', checked: true },
        { id: '2', text: 'Task 2', checked: true },
      ];
      render(<TaskList items={allCheckedItems} showProgress />);
      
      expect(screen.getByText('2 / 2 (100%)')).toBeInTheDocument();
    });
  });

  describe('Interactivity', () => {
    it('calls onToggle when item is clicked in interactive mode', () => {
      const onToggle = jest.fn();
      render(
        <TaskList items={mockItems} interactive onToggle={onToggle} />
      );
      
      const firstTask = screen.getByText('Task 1').closest('div');
      if (firstTask) {
        fireEvent.click(firstTask);
      }
      
      // onToggle receives (id, newCheckedState) - toggling unchecked item to checked
      expect(onToggle).toHaveBeenCalledWith('1', true);
    });

    it('does not call onToggle when not interactive', () => {
      const onToggle = jest.fn();
      render(<TaskList items={mockItems} onToggle={onToggle} />);
      
      const firstTask = screen.getByText('Task 1').closest('div');
      if (firstTask) {
        fireEvent.click(firstTask);
      }
      
      expect(onToggle).not.toHaveBeenCalled();
    });
  });

  describe('Nested tasks', () => {
    it('renders nested task items', () => {
      const nestedItems = [
        {
          id: '1',
          text: 'Parent task',
          checked: false,
          children: [
            { id: '1.1', text: 'Child task 1', checked: true },
            { id: '1.2', text: 'Child task 2', checked: false },
          ],
        },
      ];
      render(<TaskList items={nestedItems} />);
      
      expect(screen.getByText('Parent task')).toBeInTheDocument();
      expect(screen.getByText('Child task 1')).toBeInTheDocument();
      expect(screen.getByText('Child task 2')).toBeInTheDocument();
    });

    it('includes nested items in progress calculation', () => {
      const nestedItems = [
        {
          id: '1',
          text: 'Parent',
          checked: true,
          children: [
            { id: '1.1', text: 'Child 1', checked: true },
            { id: '1.2', text: 'Child 2', checked: false },
          ],
        },
      ];
      render(<TaskList items={nestedItems} showProgress />);
      
      // 2 checked out of 3 total
      expect(screen.getByText('2 / 3 (67%)')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('renders checkbox variant by default', () => {
      const { container } = render(<TaskList items={mockItems} />);
      // Should have square icons for checkbox variant
      expect(container.querySelectorAll('svg').length).toBeGreaterThan(0);
    });

    it('renders circle variant when specified', () => {
      const { container } = render(
        <TaskList items={mockItems} variant="circle" />
      );
      expect(container.querySelectorAll('svg').length).toBeGreaterThan(0);
    });
  });
});

describe('TaskListItem', () => {
  describe('Rendering', () => {
    it('renders checked item', () => {
      render(<TaskListItem checked>Checked item</TaskListItem>);
      
      expect(screen.getByText('Checked item')).toBeInTheDocument();
      expect(screen.getByText('Checked item')).toHaveClass('line-through');
    });

    it('renders unchecked item', () => {
      render(<TaskListItem checked={false}>Unchecked item</TaskListItem>);
      
      expect(screen.getByText('Unchecked item')).toBeInTheDocument();
      expect(screen.getByText('Unchecked item')).not.toHaveClass('line-through');
    });

    it('renders as list item', () => {
      render(<TaskListItem checked={false}>Item</TaskListItem>);
      
      expect(screen.getByRole('listitem')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <TaskListItem checked={false} className="custom-class">
          Item
        </TaskListItem>
      );
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('renders check icon for checked items', () => {
      const { container } = render(
        <TaskListItem checked>Checked</TaskListItem>
      );
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders unchecked icon for unchecked items', () => {
      const { container } = render(
        <TaskListItem checked={false}>Unchecked</TaskListItem>
      );
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });
});
