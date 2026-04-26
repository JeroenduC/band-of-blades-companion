'use client';

import { useState, useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spy, SpyLongTermAssignment } from '@/lib/types';
import { IntelTier } from '@/lib/intel-questions';
import {
  LegionCard,
  LegionCardContent,
  LegionCardHeader,
  LegionCardTitle,
  LegionButton,
  LegionClock,
  LegionCardFooter,
} from '@/components/legion';
import { 
  dispatchSpy, 
  completeSpymasterActions,
  createLongTermAssignment,
  workOnLongTermAssignment,
  type SpymasterActionState
} from '@/server/actions/phase/spymaster';
import { cn } from '@/lib/utils';
import { LegionDice } from '@/components/legion';

interface SpyDispatchProps {
  campaignId: string;
  spies: Spy[];
  intelTiers: IntelTier[];
  longTermAssignments: SpyLongTermAssignment[];
}

export function SpyDispatch({ campaignId, spies, intelTiers, longTermAssignments }: SpyDispatchProps) {
  const availableSpies = spies.filter(s => s.status !== 'DEAD' && s.status !== 'ON_ASSIGNMENT');
  const allSpiesAssigned = availableSpies.length === 0;
  
  const [selectedSpyId, setSelectedSpyId] = useState<string | null>(
    availableSpies.length > 0 ? availableSpies[0].id : null
  );

  const [activeTab, setActiveTab] = useState<'simple' | 'longterm'>('simple');

  const selectedSpy = availableSpies.find(s => s.id === selectedSpyId);

  return (
    <div className="space-y-6">
      <LegionCard>
        <LegionCardHeader>
          <LegionCardTitle className="text-sm font-medium text-legion-text-muted uppercase tracking-widest">
            Step 5 — Spy Dispatch
          </LegionCardTitle>
        </LegionCardHeader>
        <LegionCardContent>
          {allSpiesAssigned ? (
            <div className="space-y-4 text-center py-4">
              <p className="text-sm text-legion-text-muted italic">
                All available spies have been dispatched or are currently on assignment.
              </p>
              <form action={completeSpymasterActions}>
                <input type="hidden" name="campaign_id" value={campaignId} />
                <LegionButton type="submit" variant="default" className="w-full sm:w-auto">
                  Mark Spy Dispatch Complete
                </LegionButton>
              </form>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Spy selection tabs */}
              <div className="flex flex-wrap gap-2 border-b border-border pb-4">
                {availableSpies.map((spy) => (
                  <button
                    key={spy.id}
                    onClick={() => setSelectedSpyId(spy.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-heading transition-colors border",
                      selectedSpyId === spy.id
                        ? "bg-legion-amber/10 border-legion-amber text-legion-amber"
                        : "border-border hover:border-legion-amber/50 text-legion-text-muted"
                    )}
                  >
                    {spy.name} {spy.status === 'WOUNDED' && ' (Wounded)'}
                  </button>
                ))}
              </div>

              {selectedSpy && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h4 className="font-heading text-lg text-legion-amber mb-1">
                        Dispatch {selectedSpy.name}
                      </h4>
                      <p className="text-xs text-legion-text-muted">
                        Rank: {selectedSpy.rank} • Specialty: {selectedSpy.specialty || 'None'}
                      </p>
                    </div>

                    <div className="flex rounded-md border border-border p-1 bg-legion-bg-overlay">
                      <button
                        onClick={() => setActiveTab('simple')}
                        className={cn(
                          "px-3 py-1 text-[10px] font-mono uppercase tracking-wider rounded transition-colors",
                          activeTab === 'simple' ? "bg-legion-amber text-legion-amber-fg" : "text-legion-text-muted hover:text-legion-text-primary"
                        )}
                      >
                        Simple
                      </button>
                      <button
                        onClick={() => setActiveTab('longterm')}
                        className={cn(
                          "px-3 py-1 text-[10px] font-mono uppercase tracking-wider rounded transition-colors",
                          activeTab === 'longterm' ? "bg-legion-amber text-legion-amber-fg" : "text-legion-text-muted hover:text-legion-text-primary"
                        )}
                      >
                        Long-Term
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {activeTab === 'simple' ? (
                      <SimpleAssignmentPanel 
                        campaignId={campaignId} 
                        spy={selectedSpy} 
                        intelTiers={intelTiers} 
                      />
                    ) : (
                      <LongTermAssignmentPanel
                        campaignId={campaignId}
                        spy={selectedSpy}
                        longTermAssignments={longTermAssignments}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </LegionCardContent>
      </LegionCard>
    </div>
  );
}

interface SimpleAssignmentPanelProps {
  campaignId: string;
  spy: Spy;
  intelTiers: IntelTier[];
}

function SimpleAssignmentPanel({ campaignId, spy, intelTiers }: SimpleAssignmentPanelProps) {
  const [selectedQuestion, setSelectedQuestion] = useState<string>('');

  return (
    <>
      {/* Recover */}
      <LegionCard className={cn(spy.status !== 'WOUNDED' && "opacity-50")}>
        <LegionCardHeader className="pb-2">
          <LegionCardTitle className="text-base">Recover</LegionCardTitle>
          <p className="text-xs text-legion-text-muted">Spy heals. Remove wounded condition. Takes no risk.</p>
        </LegionCardHeader>
        <LegionCardFooter>
          <form action={dispatchSpy} className="w-full">
            <input type="hidden" name="campaign_id" value={campaignId} />
            <input type="hidden" name="spy_id" value={spy.id} />
            <input type="hidden" name="assignment" value="RECOVER" />
            <LegionButton size="sm" variant="outline" className="w-full" disabled={spy.status !== 'WOUNDED'}>
              Heal Spy
            </LegionButton>
          </form>
        </LegionCardFooter>
      </LegionCard>

      {/* Interrogate */}
      <LegionCard>
        <LegionCardHeader className="pb-2">
          <LegionCardTitle className="text-base">Interrogate</LegionCardTitle>
          <p className="text-xs text-legion-text-muted">Spy answers one intel question from ANY list. No risk.</p>
        </LegionCardHeader>
        <LegionCardContent className="pb-2">
          <select
            name="intel_question_id_ui"
            required
            className="w-full bg-legion-bg-overlay border border-border rounded px-2 py-1.5 text-xs text-legion-text-primary focus:border-legion-amber outline-none"
            value={selectedQuestion}
            onChange={(e) => setSelectedQuestion(e.target.value)}
          >
            <option value="" disabled>Select a question...</option>
            {intelTiers.map(tier => (
              <optgroup key={tier.label} label={tier.label}>
                {tier.questions.map(q => (
                  <option key={q.id} value={q.id}>{q.text}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </LegionCardContent>
        <LegionCardFooter>
          <form action={dispatchSpy} className="w-full">
            <input type="hidden" name="campaign_id" value={campaignId} />
            <input type="hidden" name="spy_id" value={spy.id} />
            <input type="hidden" name="assignment" value="INTERROGATE" />
            <input type="hidden" name="intel_question_id" value={selectedQuestion} />
            <LegionButton size="sm" variant="outline" className="w-full" disabled={!selectedQuestion}>
              Interrogate
            </LegionButton>
          </form>
        </LegionCardFooter>
      </LegionCard>

      {/* Blackmail */}
      <LegionCard>
        <LegionCardHeader className="pb-2">
          <LegionCardTitle className="text-base">Blackmail</LegionCardTitle>
          <p className="text-xs text-legion-text-muted">Add +1d to an Acquire Assets roll this phase. No risk.</p>
        </LegionCardHeader>
        <LegionCardFooter>
          <form action={dispatchSpy} className="w-full">
            <input type="hidden" name="campaign_id" value={campaignId} />
            <input type="hidden" name="spy_id" value={spy.id} />
            <input type="hidden" name="assignment" value="BLACKMAIL" />
            <LegionButton size="sm" variant="outline" className="w-full">
              Support QM
            </LegionButton>
          </form>
        </LegionCardFooter>
      </LegionCard>

      {/* Help */}
      <LegionCard>
        <LegionCardHeader className="pb-2">
          <LegionCardTitle className="text-base">Help</LegionCardTitle>
          <p className="text-xs text-legion-text-muted">Add +1d to a QM's Long-Term Project roll this phase. No risk.</p>
        </LegionCardHeader>
        <LegionCardFooter>
          <form action={dispatchSpy} className="w-full">
            <input type="hidden" name="campaign_id" value={campaignId} />
            <input type="hidden" name="spy_id" value={spy.id} />
            <input type="hidden" name="assignment" value="HELP" />
            <LegionButton size="sm" variant="outline" className="w-full">
              Assist Project
            </LegionButton>
          </form>
        </LegionCardFooter>
      </LegionCard>
    </>
  );
}

interface LongTermPanelProps {
  campaignId: string;
  spy: Spy;
  longTermAssignments: SpyLongTermAssignment[];
}

function LongTermAssignmentPanel({ campaignId, spy, longTermAssignments }: LongTermPanelProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState<SpymasterActionState | null, FormData>(
    workOnLongTermAssignment, null,
  );
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  useEffect(() => {
    if (state?.result) router.refresh();
  }, [state?.result, router]);

  const activeAssignments = longTermAssignments.filter(a => !a.is_completed);

  return (
    <div className="col-span-full space-y-4">
      {state?.result ? (
        <LegionCard className="border-legion-amber/30 bg-legion-amber/5 animate-in zoom-in-95 duration-300">
          <LegionCardHeader className="pb-2">
            <LegionCardTitle className="text-sm font-bold uppercase tracking-widest text-legion-amber">
              Assignment Result
            </LegionCardTitle>
          </LegionCardHeader>
          <LegionCardContent className="space-y-6">
            <div className="flex flex-col gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-legion-text-muted uppercase">Dice Roll</span>
                <LegionDice 
                  results={state.result.dice} 
                  bestDieIndex={state.result.dice.indexOf(Math.max(...state.result.dice))} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded bg-white/5 border border-white/10">
                  <span className="block text-[9px] text-legion-text-muted uppercase tracking-tighter mb-1">Segments Added</span>
                  <span className="text-lg font-heading text-legion-text-primary">+{state.result.segments_added}</span>
                </div>
                {state.result.wounded && (
                  <div className="p-3 rounded bg-red-900/20 border border-red-500/50">
                    <span className="block text-[9px] text-red-300 uppercase tracking-tighter mb-1">Consequence</span>
                    <span className="text-sm font-bold text-red-400 uppercase">{state.result.died ? 'SPY KILLED' : 'SPY WOUNDED'}</span>
                  </div>
                )}
              </div>
            </div>
            <LegionButton size="sm" onClick={() => window.location.reload()} className="w-full">
              CONTINUE
            </LegionButton>
          </LegionCardContent>
        </LegionCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {activeAssignments.map((lta) => (
            <LegionCard key={lta.id}>
              <LegionCardHeader className="pb-2">
                <LegionCardTitle className="text-base">{lta.name}</LegionCardTitle>
                <p className="text-xs text-legion-text-muted uppercase tracking-tighter">{lta.type.replace(/_/g, ' ')}</p>
              </LegionCardHeader>
              <LegionCardContent className="flex justify-center py-4">
                <LegionClock total={lta.clock_segments} filled={lta.clock_filled} size="sm" />
              </LegionCardContent>
              <LegionCardFooter>
                <form action={action} className="w-full">
                  <input type="hidden" name="campaign_id" value={campaignId} />
                  <input type="hidden" name="spy_id" value={spy.id} />
                  <input type="hidden" name="lta_id" value={lta.id} />
                  <LegionButton type="submit" size="sm" variant="outline" className="w-full" disabled={pending}>
                    {pending ? 'ROLLING...' : 'Roll to Advance'}
                  </LegionButton>
                </form>
              </LegionCardFooter>
            </LegionCard>
          ))}

          {activeAssignments.length < 5 && !showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex h-full min-h-[140px] flex-col items-center justify-center rounded-lg border border-dashed border-border p-4 text-center hover:bg-legion-bg-overlay transition-colors"
            >
              <span className="text-2xl text-legion-amber mb-1">+</span>
              <p className="text-sm font-heading text-legion-amber">New Assignment</p>
              <p className="text-xs text-legion-text-muted mt-1">Start a new 8-clock project</p>
            </button>
          )}
        </div>
      )}

      {showCreateForm && (
        <LegionCard className="bg-legion-bg-overlay border-legion-amber/20">
          <LegionCardContent className="pt-6">
            <form action={async (formData) => {
              await createLongTermAssignment(formData);
              setShowCreateForm(false);
            }} className="space-y-4">
              <input type="hidden" name="campaign_id" value={campaignId} />
              
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-legion-text-muted font-semibold">
                  Assignment Name
                </label>
                <input
                  name="name"
                  required
                  placeholder="e.g. Infiltrate the Broken Pass"
                  className="w-full bg-legion-bg-surface border border-border rounded px-3 py-2 text-sm text-legion-text-primary focus:border-legion-amber outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-legion-text-muted font-semibold">
                  Type
                </label>
                <select
                  name="type"
                  required
                  className="w-full bg-legion-bg-surface border border-border rounded px-3 py-2 text-sm text-legion-text-primary focus:border-legion-amber outline-none"
                >
                  <option value="AUGMENT">Augment Mission (+1 rewards/penalties)</option>
                  <option value="EXPAND">Expand Network (unlock upgrade)</option>
                  <option value="LAY_TRAP">Lay Trap (unlock assault mission)</option>
                  <option value="RECRUIT">Recruit (gain new spy)</option>
                  <option value="RESEARCH">Research (reveal special missions)</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end">
                <LegionButton type="button" variant="ghost" size="sm" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </LegionButton>
                <LegionButton type="submit" variant="default" size="sm">
                  Create Assignment
                </LegionButton>
              </div>
            </form>
          </LegionCardContent>
        </LegionCard>
      )}
    </div>
  );
}
