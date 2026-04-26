'use client';

import React, { useState } from 'react';
import { type Campaign, type CampaignPhaseState } from '@/lib/types';
import { gmOverride, gmTransitionState } from '@/server/actions/phase/gm';
import { PHASE_STEPS } from '@/lib/state-machine';
import { LegionCard, LegionCardContent, LegionCardHeader, LegionCardTitle } from '@/components/legion';
import { AlertTriangleIcon, SaveIcon, FastForwardIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GmOverrideFormProps {
  campaign: Campaign;
}

export function GmOverrideForm({ campaign }: GmOverrideFormProps) {
  const [reason, setReason] = useState('');
  const [updates, setUpdates] = useState<Record<string, number>>({});
  const [targetState, setTargetState] = useState<CampaignPhaseState | ''>('');
  const [isPending, setIsPending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const fields = [
    { key: 'morale', label: 'Morale', min: 0, max: 12 },
    { key: 'pressure', label: 'Pressure', min: 0, max: 10 },
    { key: 'intel', label: 'Intel', min: 0 },
    { key: 'supply', label: 'Supply', min: 0 },
    { key: 'food_uses', label: 'Food', min: 0 },
    { key: 'horse_uses', label: 'Horses', min: 0 },
    { key: 'black_shot_uses', label: 'Black Shot', min: 0 },
    { key: 'religious_supply_uses', label: 'Relig. Supply', min: 0 },
    { key: 'time_clock_1', label: 'Clock 1', min: 0, max: 10 },
    { key: 'time_clock_2', label: 'Clock 2', min: 0, max: 10 },
    { key: 'time_clock_3', label: 'Clock 3', min: 0, max: 10 },
  ];

  const handleValueChange = (key: string, value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) return;
    setUpdates({ ...updates, [key]: num });
  };

  const handleSave = async () => {
    if (!reason.trim()) {
      alert('Reason is required for GM override');
      return;
    }
    setIsPending(true);
    try {
      await gmOverride(campaign.id, updates, reason);
      setUpdates({});
      setReason('');
      setShowConfirm(false);
    } catch (err) {
      console.error(err);
      alert('Override failed');
    } finally {
      setIsPending(false);
    }
  };

  const hasChanges = Object.keys(updates).length > 0;

  const handleStateTransition = async () => {
    if (!targetState || !reason.trim()) return;
    setIsPending(true);
    try {
      await gmTransitionState(campaign.id, targetState, reason);
      setTargetState('');
      setReason('');
      setShowConfirm(false);
    } catch (err) {
      console.error(err);
      alert('State transition failed');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* ─── Numeric Overrides ─── */}
      <section className="space-y-4">
        <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-legion-text-muted border-b border-white/5 pb-1">Numeric Resources</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1">
              <label className="text-[10px] font-mono text-legion-text-muted uppercase tracking-widest">{f.label}</label>
              <input 
                type="number"
                min={f.min}
                max={f.max}
                value={updates[f.key] !== undefined ? updates[f.key] : (campaign as any)[f.key] || 0}
                onChange={(e) => handleValueChange(f.key, e.target.value)}
                className={cn(
                  "w-full bg-black/40 border rounded px-3 py-2 text-sm transition-colors",
                  updates[f.key] !== undefined ? "border-legion-amber text-legion-amber" : "border-white/10 text-legion-text-primary"
                )}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ─── State Machine Overrides ─── */}
      <section className="space-y-4">
        <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-legion-text-muted border-b border-white/5 pb-1">Phase State Override</h4>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-mono text-legion-text-muted uppercase tracking-widest flex items-center gap-2">
              <FastForwardIcon className="w-3 h-3" /> Jump to State
            </label>
            <select 
              value={targetState}
              onChange={(e) => setTargetState(e.target.value as any)}
              className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-legion-text-primary focus:outline-none focus:border-legion-amber/50"
            >
              <option value="">Select a phase step...</option>
              {PHASE_STEPS.map((step) => (
                <option key={step.state} value={step.state}>
                  Step {step.stepNumber}: {step.label}
                </option>
              ))}
            </select>
          </div>
          <div className="p-3 rounded bg-red-950/20 border border-red-900/30 text-[10px] text-red-400 italic max-w-xs">
            Warning: Manually changing state skips normal game logic and validations.
          </div>
        </div>
      </section>

      {(hasChanges || targetState) && (
        <div className="space-y-4 p-4 rounded-lg bg-legion-amber/5 border border-legion-amber/20 animate-in fade-in slide-in-from-bottom-2">
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-legion-amber uppercase tracking-widest flex items-center gap-2">
              <AlertTriangleIcon className="w-3 h-3" />
              Reason for Override (Required)
            </label>
            <textarea 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Narrative adjustment after scene 4, fixed miscalc from session 2..."
              className="w-full bg-black/40 border border-legion-amber/30 rounded p-3 text-sm text-legion-text-primary focus:outline-none focus:border-legion-amber"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3">
            <button 
              onClick={() => { setUpdates({}); setTargetState(''); setReason(''); setShowConfirm(false); }}
              className="px-4 py-2 rounded text-xs font-bold uppercase tracking-widest text-legion-text-muted hover:text-white transition-colors"
            >
              Reset
            </button>
            
            {!showConfirm ? (
              <button 
                onClick={() => setShowConfirm(true)}
                disabled={!reason.trim()}
                className="px-6 py-2 rounded bg-legion-amber text-black font-heading text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-30"
              >
                Apply Override
              </button>
            ) : (
              <div className="flex items-center gap-4 animate-in fade-in zoom-in-95">
                <span className="text-[10px] text-red-400 font-bold uppercase animate-pulse">Confirming Permanent Change</span>
                <button 
                  onClick={targetState ? handleStateTransition : handleSave}
                  disabled={isPending}
                  className="px-6 py-2 rounded bg-red-600 text-white font-heading text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition-colors shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                >
                  {isPending ? 'Applying...' : 'Confirm'}
                </button>
                <button onClick={() => setShowConfirm(false)} className="text-xs text-legion-text-muted">Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
