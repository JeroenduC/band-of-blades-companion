'use client';

import React, { useState } from 'react';
import { type CampaignPhaseState, type LegionRole } from '@/lib/types';
import { LegionCard, LegionCardContent, LegionCardHeader, LegionCardTitle } from '@/components/legion';
import { cn } from '@/lib/utils';

// Lazy load the forms to keep the initial load light
import { PersonnelUpdateForm } from './personnel-update-form';
import { BackAtCampForm } from './back-at-camp-form';
import { TalesOfLegionForm } from './tales-of-legion-form';
import { QmCampaignActions } from './qm-campaign-actions';
import { AlchemistsLaborersForm } from './alchemists-laborers-form';
import { AdvanceDecisionForm } from './advance-decision-form';
import { MissionFocusForm } from './mission-focus-form';
import { MissionSelectionStep } from './mission-selection-step';
import { MissionDeploymentForm } from './mission-deployment-form';
import { SpyRoster } from './spy-roster';
import { SpyDispatch } from './spy-dispatch';
import { getUnlockedTiers } from '@/lib/intel-questions';

interface LegionOverrideProps {
  campaign: any;
  phaseState: CampaignPhaseState | null;
  // Data for the various forms
  backAtCampData?: any;
  qmData?: any;
  marshalData?: any;
  spymasterData?: any;
  missions?: any[];
}

const STEP_ROLES: Record<CampaignPhaseState, LegionRole[]> = {
  AWAITING_MISSION_RESOLUTION: ['GM'],
  AWAITING_PERSONNEL_UPDATE: ['MARSHAL'],
  AWAITING_BACK_AT_CAMP: ['LOREKEEPER'],
  AWAITING_TALES: ['LOREKEEPER'],
  TIME_PASSING: ['COMMANDER'],
  CAMPAIGN_ACTIONS: ['QUARTERMASTER', 'SPYMASTER'],
  AWAITING_LABORERS_ALCHEMISTS: ['QUARTERMASTER'],
  AWAITING_ADVANCE: ['COMMANDER'],
  AWAITING_MISSION_FOCUS: ['COMMANDER'],
  AWAITING_MISSION_GENERATION: ['GM'],
  AWAITING_MISSION_SELECTION: ['COMMANDER'],
  AWAITING_MISSION_DEPLOYMENT: ['MARSHAL'],
  PHASE_COMPLETE: [],
};

export function LegionOverride({
  campaign,
  phaseState,
  backAtCampData,
  qmData,
  marshalData,
  spymasterData,
  missions,
}: LegionOverrideProps) {
  const [isActive, setIsActive] = useState(false);
  
  if (!phaseState) return null;

  const targetRoles = STEP_ROLES[phaseState] || [];
  const isGmTurn = targetRoles.includes('GM');

  if (isGmTurn || targetRoles.length === 0) return null;

  const roleLabel = targetRoles.join(' or ');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-heading font-semibold text-legion-text-muted uppercase tracking-widest">
          Override Authority
        </h3>
        <button
          onClick={() => setIsActive(!isActive)}
          className={cn(
            "text-[10px] font-bold uppercase tracking-tighter px-2 py-1 rounded transition-colors border",
            isActive 
              ? "bg-legion-amber text-[var(--bob-amber-fg)] border-legion-amber" 
              : "text-legion-text-muted border-border hover:border-legion-amber/50 hover:text-legion-text"
          )}
        >
          {isActive ? 'Cancel Override' : `Act as ${roleLabel}`}
        </button>
      </div>

      {isActive && (
        <LegionCard className="border-legion-amber/50 bg-legion-amber/5 shadow-lg shadow-legion-amber/5 animate-in fade-in slide-in-from-top-2 duration-300">
          <LegionCardHeader className="border-b border-legion-amber/10">
            <LegionCardTitle className="text-sm font-heading font-bold text-legion-amber uppercase tracking-tight flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-legion-amber animate-pulse" />
              GM Override: Step {phaseState.replace(/_/g, ' ')}
            </LegionCardTitle>
          </LegionCardHeader>
          <LegionCardContent className="pt-6">
            <div className="mb-6 p-3 bg-legion-amber/10 rounded border border-legion-amber/20 text-[11px] text-legion-amber italic">
              You are acting on behalf of the {roleLabel}. This action will be recorded in the campaign logs as a GM override.
            </div>

            {/* Render the appropriate form based on state */}
            {phaseState === 'AWAITING_PERSONNEL_UPDATE' && marshalData && (
              <PersonnelUpdateForm
                campaignId={campaign.id}
                deployedSpecialists={marshalData.specialists}
                deployedSquads={marshalData.squads}
              />
            )}

            {phaseState === 'AWAITING_BACK_AT_CAMP' && backAtCampData && (
              <BackAtCampForm
                campaignId={campaign.id}
                morale={campaign.morale}
                scenes={backAtCampData.scenes}
                activeLevel={backAtCampData.activeLevel}
                fallback={backAtCampData.fallback}
              />
            )}

            {phaseState === 'AWAITING_TALES' && qmData && (
              <TalesOfLegionForm
                campaignId={campaign.id}
                talesToldIds={campaign.tales_told || []}
                activeProjects={qmData.longTermProjects.filter((p: any) => !p.completed_at) || []}
              />
            )}

            {phaseState === 'TIME_PASSING' && (
              <div className="text-center py-8">
                <p className="text-sm text-legion-text mb-4 italic">Confirm that time has passed and resources are consumed.</p>
                <form action={async (fd) => {
                  const { confirmTimePasses } = await import('@/server/actions/phase/commander');
                  await confirmTimePasses(fd);
                }}>
                  <input type="hidden" name="campaign_id" value={campaign.id} />
                  <button type="submit" className="bg-legion-amber text-[var(--bob-amber-fg)] px-6 py-2 rounded font-bold uppercase text-xs tracking-widest">
                    Confirm Time Passes
                  </button>
                </form>
              </div>
            )}

            {phaseState === 'CAMPAIGN_ACTIONS' && qmData && spymasterData && (
              <div className="space-y-12">
                <section className="space-y-4">
                  <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-legion-text-muted border-b border-border pb-1">Spymaster Actions</h4>
                  
                  <div className="space-y-8">
                    <SpyRoster 
                      spies={spymasterData.spies}
                      maxSpies={spymasterData.maxSpies}
                    />
                    
                    <SpyDispatch
                      campaignId={campaign.id}
                      spies={spymasterData.spies}
                      intelTiers={getUnlockedTiers(campaign.intel)}
                      longTermAssignments={spymasterData.longTermAssignments}
                    />
                  </div>

                  <form action={async (fd) => {
                    const { completeSpymasterActions } = await import('@/server/actions/phase/spymaster');
                    await completeSpymasterActions(fd);
                  }} className="mt-4 pt-4 border-t border-border">
                    <input type="hidden" name="campaign_id" value={campaign.id} />
                    <button type="submit" className="w-full border border-border hover:border-legion-amber/50 py-3 rounded font-heading text-[11px] font-bold uppercase tracking-widest transition-colors text-legion-text-muted hover:text-legion-text">
                      Complete Spy Dispatch Step
                    </button>
                  </form>
                </section>
                
                <section className="space-y-4 pt-4 border-t-2 border-border/30">
                  <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-legion-text-muted border-b border-border pb-1">Quartermaster Actions</h4>
                  <QmCampaignActions
                    campaign={campaign}
                    mercies={qmData.mercies}
                    longTermProjects={qmData.longTermProjects}
                    acquiredAssetTypes={qmData.acquiredAssetTypes}
                  />
                </section>
              </div>
            )}

            {phaseState === 'AWAITING_LABORERS_ALCHEMISTS' && qmData && (
              <AlchemistsLaborersForm
                campaignId={campaign.id}
                laborers={qmData.laborers}
                alchemists={qmData.alchemists}
                longTermProjects={qmData.longTermProjects}
              />
            )}

            {phaseState === 'AWAITING_ADVANCE' && (
              <AdvanceDecisionForm
                campaign={campaign}
              />
            )}

            {phaseState === 'AWAITING_MISSION_FOCUS' && (
              <MissionFocusForm
                campaign={campaign}
              />
            )}

            {phaseState === 'AWAITING_MISSION_SELECTION' && (
              <MissionSelectionStep
                campaignId={campaign.id}
                intel={campaign.intel}
                missions={missions || []}
              />
            )}

            {phaseState === 'AWAITING_MISSION_DEPLOYMENT' && marshalData && (
              <MissionDeploymentForm
                campaignId={campaign.id}
                specialists={marshalData.specialists}
                squads={marshalData.squads}
                missions={missions || []}
              />
            )}
          </LegionCardContent>
        </LegionCard>
      )}
    </div>
  );
}
