import { CardInteraction, CardInteractionResponse } from '../types/CardInteraction';

/**
 * Result of validation
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates a user's interaction response against the interaction requirements
 * Centralized validation logic to ensure consistency
 */
export function validateInteractionResponse(
  interaction: CardInteraction,
  response: CardInteractionResponse
): ValidationResult {
  const errors: string[] = [];

  // Type mismatch check
  if (interaction.type !== response.type) {
    errors.push(`Interaction type mismatch: expected ${interaction.type}, got ${response.type}`);
    return { valid: false, errors };
  }

  // Check minimum selections
  const minSelections = interaction.minSelections || 0;
  if (response.selections.length < minSelections) {
    if (minSelections === 1) {
      errors.push('Please select an option');
    } else {
      errors.push(`Please select at least ${minSelections} options`);
    }
  }

  // Check maximum selections
  const maxSelections = interaction.maxSelections || Infinity;
  if (response.selections.length > maxSelections) {
    if (maxSelections === 1) {
      errors.push('Please select only one option');
    } else {
      errors.push(`Please select at most ${maxSelections} options`);
    }
  }

  // Check that all selections are valid options (if options are provided)
  if (interaction.options && interaction.options.length > 0) {
    const validIds = new Set(interaction.options.map((o) => o.id));
    for (const selection of response.selections) {
      if (!validIds.has(selection)) {
        errors.push(`Invalid selection: ${selection}`);
      }
    }
  }

  // Check that disabled options are not selected
  if (interaction.options) {
    const disabledIds = new Set(
      interaction.options.filter((o) => o.disabled).map((o) => o.id)
    );
    for (const selection of response.selections) {
      if (disabledIds.has(selection)) {
        const option = interaction.options.find((o) => o.id === selection);
        errors.push(
          option?.disabledReason || `Option ${selection} is not available`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Quick validation check - returns true if valid, false otherwise
 */
export function isValidInteractionResponse(
  interaction: CardInteraction,
  response: CardInteractionResponse
): boolean {
  return validateInteractionResponse(interaction, response).valid;
}
