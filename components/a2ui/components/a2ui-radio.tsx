'use client';

/**
 * A2UI RadioGroup Component
 * Maps to shadcn/ui RadioGroup
 */

import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { A2UIComponentProps, A2UIRadioGroupComponent } from '@/types/a2ui';
import { useA2UIContext } from '../a2ui-context';
import { getBindingPath } from '@/lib/a2ui/data-model';

export function A2UIRadioGroup({ component, onDataChange }: A2UIComponentProps<A2UIRadioGroupComponent>) {
  const { resolveString, resolveBoolean } = useA2UIContext();

  const value = resolveString(component.value, '');
  const isDisabled = component.disabled ? resolveBoolean(component.disabled, false) : false;
  const bindingPath = getBindingPath(component.value);
  const orientation = component.orientation || 'vertical';

  const handleChange = useCallback(
    (newValue: string) => {
      if (bindingPath) {
        onDataChange(bindingPath, newValue);
      }
    },
    [bindingPath, onDataChange]
  );

  return (
    <div className={cn('space-y-2', component.className)} style={component.style as React.CSSProperties}>
      {component.label && (
        <Label className="text-sm font-medium">{component.label}</Label>
      )}
      <RadioGroup
        value={value}
        onValueChange={handleChange}
        disabled={isDisabled}
        className={cn(
          orientation === 'horizontal' ? 'flex flex-row gap-4' : 'flex flex-col gap-2'
        )}
      >
        {component.options.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <RadioGroupItem
              value={option.value}
              id={`${component.id}-${option.value}`}
              disabled={option.disabled}
            />
            <Label
              htmlFor={`${component.id}-${option.value}`}
              className="text-sm font-normal"
            >
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
