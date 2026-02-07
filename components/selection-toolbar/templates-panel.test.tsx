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

// Mock useSelectionStore - templates are now persisted in the store
const mockIncrementTemplateUsage = jest.fn();
const mockAddTemplate = jest.fn();
const mockUpdateTemplate = jest.fn();
const mockRemoveTemplate = jest.fn();
const mockToggleTemplateFavorite = jest.fn();
const mockImportTemplates = jest.fn();
const mockExportTemplates = jest.fn().mockReturnValue("[]");

const mockStoreTemplates = [
  {
    id: "tpl-translate-zh",
    name: "Translate to Chinese",
    description: "Translate text to Simplified Chinese",
    prompt: "Translate the following text to Simplified Chinese:\n\n{{text}}",
    category: "Translation",
    icon: "languages",
    isFavorite: false,
    isBuiltIn: false,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

jest.mock("@/stores/context", () => ({
  useSelectionStore: jest.fn(() => ({
    config: {
      templates: mockStoreTemplates,
    },
    addTemplate: mockAddTemplate,
    updateTemplate: mockUpdateTemplate,
    removeTemplate: mockRemoveTemplate,
    toggleTemplateFavorite: mockToggleTemplateFavorite,
    incrementTemplateUsage: mockIncrementTemplateUsage,
    importTemplates: mockImportTemplates,
    exportTemplates: mockExportTemplates,
  })),
}));

const onApplyTemplate = jest.fn();

describe("TemplatesPanel", () => {
  beforeEach(() => {
    onApplyTemplate.mockClear();
    mockAddTemplate.mockClear();
    mockIncrementTemplateUsage.mockClear();
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
      expect.objectContaining({ name: "Translate to Chinese" }),
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
      expect(mockAddTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ name: "My Template" })
      );
    });
  });
});
