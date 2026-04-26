'use client';

import React, { createContext, useContext, useState } from 'react';
import { cn } from '@/lib/utils';

interface TabsContextType {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export function LegionTabs({ 
  defaultValue, 
  children, 
  className 
}: { 
  defaultValue: string; 
  children: React.ReactNode;
  className?: string;
}) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn("space-y-4", className)}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function LegionTabsList({ 
  children, 
  className 
}: { 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-legion-bg-elevated p-1 text-legion-text-muted border border-border",
      className
    )}>
      {children}
    </div>
  );
}

export function LegionTabsTrigger({ 
  value, 
  children, 
  className 
}: { 
  value: string; 
  children: React.ReactNode;
  className?: string;
}) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("LegionTabsTrigger must be used within LegionTabs");

  const isActive = context.activeTab === value;

  return (
    <button
      type="button"
      onClick={() => context.setActiveTab(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-xs font-heading font-bold uppercase tracking-widest transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-legion-amber disabled:pointer-events-none disabled:opacity-50",
        isActive 
          ? "bg-legion-amber text-[var(--bob-amber-fg)] shadow-sm" 
          : "hover:bg-white/5 hover:text-legion-text",
        className
      )}
    >
      {children}
    </button>
  );
}

export function LegionTabsContent({ 
  value, 
  children, 
  className 
}: { 
  value: string; 
  children: React.ReactNode;
  className?: string;
}) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("LegionTabsContent must be used within LegionTabs");

  if (context.activeTab !== value) return null;

  return (
    <div className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)}>
      {children}
    </div>
  );
}
