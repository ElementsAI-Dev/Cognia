import { fireEvent, screen } from '@testing-library/react';
import { IOSchemaEditor } from './io-schema-editor';
import { render } from '@testing-library/react';

jest.mock('@/components/ui/select', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').selectMock);
jest.mock('@/components/ui/switch', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').switchMock);

describe('IOSchemaEditor', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(123456);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('adds new parameter rows', () => {
    const onChange = jest.fn();
    render(<IOSchemaEditor schema={{}} onChange={onChange} type="input" />);

    fireEvent.click(screen.getByText('Add'));
    expect(onChange).toHaveBeenCalledWith({
      input_123456: { type: 'string', description: '', required: false },
    });
  });

  it('renames and updates existing parameters', () => {
    const onChange = jest.fn();
    render(
      <IOSchemaEditor
        schema={{ foo: { type: 'string', description: 'desc', required: false } }}
        onChange={onChange}
        type="output"
      />
    );

    fireEvent.change(screen.getByDisplayValue('foo'), { target: { value: 'bar' } });
    fireEvent.change(screen.getByDisplayValue('desc'), { target: { value: 'updated' } });
    fireEvent.click(screen.getByText('Number'));
    fireEvent.click(screen.getByRole('switch'));

    expect(onChange).toHaveBeenCalledWith({
      bar: { type: 'string', description: 'desc', required: false },
    });
    expect(onChange).toHaveBeenCalledWith({
      foo: { type: 'string', description: 'updated', required: false },
    });
    expect(onChange).toHaveBeenCalledWith({
      foo: { type: 'number', description: 'desc', required: false },
    });
    expect(onChange).toHaveBeenCalledWith({
      foo: { type: 'string', description: 'desc', required: true },
    });
  });
});
