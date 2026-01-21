'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RULE_TARGETS } from '../constants';

interface RulesEditorTabsProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function RulesEditorTabs({ activeTab, onTabChange }: RulesEditorTabsProps) {
  return (
    <div className="px-2 md:px-4 py-0 border-b bg-muted/30 shrink-0 overflow-x-auto">
      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList className="h-10 bg-transparent gap-1 md:gap-2 w-max">
          {RULE_TARGETS.map((target) => (
            <TabsTrigger
              key={target.id}
              value={target.id}
              className="data-[state=active]:bg-background data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-2 md:px-4 min-h-[44px]"
            >
              <div className="flex items-center gap-1 md:gap-2">
                {target.icon}
                <span className="text-[10px] md:text-xs font-medium">{target.label}</span>
                <span className="text-[9px] md:text-[10px] text-muted-foreground opacity-60 hidden sm:inline">
                  ({target.path})
                </span>
              </div>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
