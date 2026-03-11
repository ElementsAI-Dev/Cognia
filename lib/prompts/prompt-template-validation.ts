import type {
  CreatePromptTemplateInput,
  PromptTemplateOperationError,
  TemplateVariable,
} from '@/types/content/prompt-template';

const VARIABLE_NAME_REGEX = /^[A-Za-z_][\w.-]*$/;

export interface PromptTemplateValidationOptions {
  allowPartial?: boolean;
}

export interface PromptTemplateValidationResult {
  isValid: boolean;
  errors: PromptTemplateOperationError[];
}

function validateVariable(variable: TemplateVariable, index: number): PromptTemplateOperationError[] {
  const errors: PromptTemplateOperationError[] = [];
  const variableName = variable.name?.trim() ?? '';
  if (!variableName) {
    errors.push({
      code: 'VALIDATION_FAILED',
      field: `variables.${index}.name`,
      message: 'Variable name is required.',
    });
    return errors;
  }

  if (!VARIABLE_NAME_REGEX.test(variableName)) {
    errors.push({
      code: 'VALIDATION_FAILED',
      field: `variables.${index}.name`,
      message: `Variable "${variableName}" has an invalid name.`,
    });
  }

  if (variable.type === 'select' && (!variable.options || variable.options.length === 0)) {
    errors.push({
      code: 'VALIDATION_FAILED',
      field: `variables.${index}.options`,
      message: `Variable "${variableName}" is select type but has no options.`,
    });
  }

  return errors;
}

export function validatePromptTemplateInput(
  input: Partial<CreatePromptTemplateInput>,
  options: PromptTemplateValidationOptions = {}
): PromptTemplateValidationResult {
  const errors: PromptTemplateOperationError[] = [];
  const { allowPartial = false } = options;

  if (!allowPartial || input.name !== undefined) {
    if (!input.name?.trim()) {
      errors.push({
        code: 'VALIDATION_FAILED',
        field: 'name',
        message: 'Template name is required.',
      });
    }
  }

  if (!allowPartial || input.content !== undefined) {
    if (!input.content?.trim()) {
      errors.push({
        code: 'VALIDATION_FAILED',
        field: 'content',
        message: 'Template content is required.',
      });
    } else if (input.content.length > 50000) {
      errors.push({
        code: 'VALIDATION_FAILED',
        field: 'content',
        message: 'Template content exceeds 50,000 characters.',
      });
    }
  }

  if (input.variables) {
    const seen = new Set<string>();
    input.variables.forEach((variable, index) => {
      validateVariable(variable, index).forEach((error) => errors.push(error));
      const normalizedName = variable.name.trim().toLowerCase();
      if (seen.has(normalizedName)) {
        errors.push({
          code: 'VALIDATION_FAILED',
          field: `variables.${index}.name`,
          message: `Duplicate variable name "${variable.name}" is not allowed.`,
        });
      }
      seen.add(normalizedName);
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
