'use client';

import React, { useState } from 'react';
import { type CampaignPhaseLog, type LegionRole } from '@/lib/types';
import { LegionCard, LegionCardContent, LegionCardHeader, LegionCardTitle } from '@/components/legion';
import { ChevronDownIcon, ChevronUpIcon, SearchIcon, FilterIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuditTrailProps {
  logs: CampaignPhaseLog[];
}

export function AuditTrail({ logs }: AuditTrailProps) {
  const [searchTerm, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedIds(newSet);
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = searchTerm === '' || 
      JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'ALL' || log.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // Group by phase
  const groupedLogs: Record<number, CampaignPhaseLog[]> = {};
  filteredLogs.forEach((log) => {
    if (!groupedLogs[log.phase_number]) groupedLogs[log.phase_number] = [];
    groupedLogs[log.phase_number].push(log);
  });

  const phases = Object.keys(groupedLogs).map(Number).sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-white/5 p-4 rounded-lg border border-white/10">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-legion-text-muted" />
          <input 
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-md pl-10 pr-4 py-2 text-sm text-legion-text-primary focus:outline-none focus:border-legion-amber/50 transition-colors"
          />
        </div>
        <div className="flex items-center gap-3">
          <FilterIcon className="w-4 h-4 text-legion-text-muted" />
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-md px-3 py-2 text-sm text-legion-text-primary focus:outline-none focus:border-legion-amber/50 transition-colors"
          >
            <option value="ALL">All Roles</option>
            <option value="GM">GM</option>
            <option value="COMMANDER">Commander</option>
            <option value="MARSHAL">Marshal</option>
            <option value="QUARTERMASTER">Quartermaster</option>
            <option value="SPYMASTER">Spymaster</option>
            <option value="LOREKEEPER">Lorekeeper</option>
            <option value="SYSTEM">System</option>
          </select>
        </div>
      </div>

      {/* Log List */}
      <div className="space-y-8">
        {phases.length > 0 ? (
          phases.map((phaseNum) => (
            <section key={phaseNum} className="space-y-4">
              <div className="flex items-center gap-4">
                <h3 className="font-heading text-sm text-legion-amber uppercase tracking-widest bg-legion-amber/10 px-3 py-1 rounded border border-legion-amber/20">
                  Phase {phaseNum}
                </h3>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div className="space-y-2">
                {groupedLogs[phaseNum].map((log) => (
                  <div key={log.id} className="group">
                    <div 
                      className={cn(
                        "flex items-center gap-4 p-3 rounded-md border transition-all cursor-pointer",
                        expandedIds.has(log.id) 
                          ? "bg-white/10 border-white/20" 
                          : "bg-white/5 border-white/5 hover:border-white/10"
                      )}
                      onClick={() => toggleExpand(log.id)}
                    >
                      <div className="w-24 shrink-0 font-mono text-[10px] text-legion-text-muted">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      
                      <div className="w-32 shrink-0">
                        <span className={cn(
                          "px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-tight",
                          log.role === 'GM' ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" :
                          log.role === 'SYSTEM' ? "bg-white/10 text-legion-text-muted" :
                          "bg-legion-amber/20 text-legion-amber border border-legion-amber/30"
                        )}>
                          {log.role}
                        </span>
                      </div>

                      <div className="flex-1 font-medium text-xs text-legion-text-primary uppercase tracking-wide">
                        {log.action_type.replace(/_/g, ' ')}
                      </div>

                      <div className="w-32 shrink-0 text-right font-mono text-[10px] text-legion-text-muted italic">
                        {log.step.replace(/_/g, ' ')}
                      </div>

                      <div className="text-legion-text-muted group-hover:text-legion-amber transition-colors">
                        {expandedIds.has(log.id) ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                      </div>
                    </div>

                    {expandedIds.has(log.id) && (
                      <div className="mt-1 ml-10 p-4 rounded-md bg-black/40 border border-white/10 animate-in fade-in slide-in-from-top-1 duration-200">
                        <h4 className="text-[10px] font-mono uppercase tracking-widest text-legion-text-muted mb-3 border-b border-white/5 pb-1">
                          Action Details
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                          {Object.entries(log.details).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-[11px] py-1 border-b border-white/5 last:border-0">
                              <span className="text-legion-text-muted capitalize">{key.replace(/_/g, ' ')}</span>
                              <span className="text-legion-text-primary font-mono font-medium">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-xl">
            <p className="text-legion-text-muted italic">No logs found matching your filters.</p>
          </div>
        )}
      </div>

    </div>
  );
}
