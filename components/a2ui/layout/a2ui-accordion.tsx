'use client';

/**
 * A2UI Accordion Component
 * Maps to shadcn/ui Accordion for collapsible content sections
 */

import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { A2UIComponentProps, A2UIAccordionComponent } from '@/types/artifact/a2ui';
import { A2UIChildRenderer } from '../a2ui-renderer';

export const A2UIAccordion = memo(function A2UIAccordion({ component }: A2UIComponentProps<A2UIAccordionComponent>) {
  const defaultOpenItems = component.items
    .filter((item) => item.defaultOpen)
    .map((item) => item.id);

  if (component.multiple) {
    return (
      <Accordion
        type="multiple"
        defaultValue={defaultOpenItems}
        className={cn('w-full', component.className)}
        style={component.style as React.CSSProperties}
      >
        {component.items.map((item) => (
          <AccordionItem key={item.id} value={item.id}>
            <AccordionTrigger>{item.title}</AccordionTrigger>
            <AccordionContent>
              <A2UIChildRenderer childIds={item.children} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    );
  }

  return (
    <Accordion
      type="single"
      collapsible={component.collapsible !== false}
      defaultValue={defaultOpenItems[0]}
      className={cn('w-full', component.className)}
      style={component.style as React.CSSProperties}
    >
      {component.items.map((item) => (
        <AccordionItem key={item.id} value={item.id}>
          <AccordionTrigger>{item.title}</AccordionTrigger>
          <AccordionContent>
            <A2UIChildRenderer childIds={item.children} />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
});
