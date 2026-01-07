import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TemplatesPanel } from "./templates-panel";

const onApplyTemplate = jest.fn();

describe("TemplatesPanel", () => {
  beforeEach(() => {
    onApplyTemplate.mockClear();
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn(),
      },
    });
  });

  it("calls onApplyTemplate when a template is clicked", async () => {
    render(
      <TemplatesPanel
        isOpen
        onClose={jest.fn()}
        onApplyTemplate={onApplyTemplate}
        selectedText="hello"
      />
    );

    await userEvent.click(screen.getByText("Translate to Chinese"));

    expect(onApplyTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "translate-zh" }),
      "hello"
    );
  });

  it("creates a new custom template via dialog", async () => {
    render(
      <TemplatesPanel
        isOpen
        onClose={jest.fn()}
        onApplyTemplate={onApplyTemplate}
      />
    );

    await userEvent.click(screen.getByText("New"));

    await userEvent.type(screen.getByPlaceholderText("Template name"), "My Template");
    await userEvent.type(screen.getByPlaceholderText("Brief description"), "desc");
    await userEvent.type(
      screen.getByPlaceholderText("Use {{text}} to insert selected text"),
      "Prompt with {{text}}"
    );
    await userEvent.type(screen.getByPlaceholderText("Category"), "Custom");

    await userEvent.click(screen.getByText("Create Template"));

    await waitFor(() => {
      expect(screen.getByText("My Template")).toBeInTheDocument();
    });
  });
});
