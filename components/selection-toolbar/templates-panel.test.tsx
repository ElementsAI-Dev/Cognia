import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TemplatesPanel } from "./templates-panel";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      title: "Templates",
      templateNamePlaceholder: "Template name",
      briefDescPlaceholder: "Brief description",
      promptPlaceholder: "Use {{text}} to insert selected text",
      categoryPlaceholder: "Category",
      createNewTemplate: "Create New Template",
      createTemplate: "Create Template",
      name: "Name",
      descriptionOptional: "Description (optional)",
      promptTemplate: "Prompt Template",
      category: "Category",
      cancel: "Cancel",
      edit: "Edit",
      delete: "Delete",
      favorite: "Favorite",
      unfavorite: "Unfavorite",
      copyPrompt: "Copy Prompt",
      selectedText: "Selected text",
      footerHint: "Click a template to apply it",
      editTemplate: "Edit Template",
      saveChanges: "Save Changes",
      description: "Description",
    };
    return translations[key] || key;
  },
}));

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
