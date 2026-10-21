'use client';

import { cn } from '@/lib/utils';

export interface TabItem {
  key: string;
  label: string;
  count?: number;
}

export function Tabs({
  tabs,
  activeKey,
  onChange,
}: {
  tabs: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
}) {
  const move = (index: number, delta: number): void => {
    const next = tabs[(index + delta + tabs.length) % tabs.length];
    if (next) onChange(next.key);
  };
  return (
    <div role="tablist" className="border-border flex gap-1 border-b">
      {tabs.map((tab, index) => {
        const active = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.key)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') move(index, 1);
              if (e.key === 'ArrowLeft') move(index, -1);
            }}
            className={cn(
              '-mb-px min-h-12 border-b-2 px-4 font-medium transition-colors',
              active
                ? 'border-primary-dark text-primary-dark'
                : 'text-content-muted hover:text-content border-transparent',
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="bg-background ml-2 rounded-full px-2 text-xs">{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
