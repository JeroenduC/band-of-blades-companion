'use client';

import { useState } from 'react';
import { Squad, SquadMember, SquadRank, SquadMemberStatus } from '@/lib/types';
import { renameSquadMember, transferSquadMember } from '@/server/actions/phase/marshal';
import { LegionCard, LegionCardContent, LegionCardHeader, LegionCardTitle, LegionBadge, LegionDialog, LegionDialogContent, LegionDialogHeader, LegionDialogTitle, LegionButton, LegionInput } from '@/components/legion';
import { cn } from '@/lib/utils';

interface SquadManagementProps {
  squads: (Squad & { members: SquadMember[] })[];
  isMarshal: boolean;
  totalRookiesSoldiers: number;
}

export function SquadManagement({ squads, isMarshal, totalRookiesSoldiers }: SquadManagementProps) {
  const showWarning = totalRookiesSoldiers < 15;
  const [selectedMember, setSelectedMember] = useState<SquadMember | null>(null);
  const [isNamingOpen, setIsNamingOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [targetSquadId, setTargetSquadId] = useState('');

  const handleRename = async () => {
    if (selectedMember && newName) {
      await renameSquadMember(selectedMember.id, newName);
      setIsNamingOpen(false);
      setSelectedMember(null);
    }
  };

  const handleTransfer = async () => {
    if (selectedMember && targetSquadId) {
      try {
        await transferSquadMember(selectedMember.id, targetSquadId);
        setIsTransferOpen(false);
        setSelectedMember(null);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Transfer failed');
      }
    }
  };

  return (
    <div className="space-y-6">
      {showWarning && (
        <div className="bg-red-900/20 border border-red-500 p-4 rounded-lg animate-pulse">
          <p className="text-red-500 font-bold text-center uppercase tracking-widest">
            Critical Warning: Total Rookies + Soldiers ({totalRookiesSoldiers}) below 15. Game Over imminent.
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {squads.map((squad) => (
          <SquadCard
            key={squad.id}
            squad={squad}
            isMarshal={isMarshal}
            onAction={(member, action) => {
              setSelectedMember(member);
              if (action === 'rename') {
                setNewName(member.name);
                setIsNamingOpen(true);
              } else {
                setTargetSquadId('');
                setIsTransferOpen(true);
              }
            }}
          />
        ))}
      </div>

      {/* Rename Dialog */}
      <LegionDialog open={isNamingOpen} onOpenChange={setIsNamingOpen}>
        <LegionDialogContent>
          <LegionDialogHeader>
            <LegionDialogTitle className="font-heading text-xl">Rename Legionnaire</LegionDialogTitle>
          </LegionDialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-legion-text-muted">New Name</label>
              <LegionInput 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter name..."
              />
            </div>
            <LegionButton className="w-full" onClick={handleRename}>Confirm Change</LegionButton>
          </div>
        </LegionDialogContent>
      </LegionDialog>

      {/* Transfer Dialog */}
      <LegionDialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <LegionDialogContent>
          <LegionDialogHeader>
            <LegionDialogTitle className="font-heading text-xl">Transfer Personnel</LegionDialogTitle>
          </LegionDialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-legion-text-muted">Target Squad</label>
              <select 
                className="w-full bg-legion-bg-elevated border border-legion-border rounded p-2 text-sm text-legion-text"
                value={targetSquadId}
                onChange={(e) => setTargetSquadId(e.target.value)}
              >
                <option value="">Select a squad...</option>
                {squads.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <LegionButton className="w-full" onClick={handleTransfer}>Confirm Transfer</LegionButton>
          </div>
        </LegionDialogContent>
      </LegionDialog>
    </div>
  );
}

function SquadCard({ 
  squad, 
  isMarshal, 
  onAction 
}: { 
  squad: Squad & { members: SquadMember[] }; 
  isMarshal: boolean;
  onAction: (member: SquadMember, action: 'rename' | 'transfer') => void;
}) {
  const members = squad.members || [];
  const maxMembers = 5;
  const slots = Array.from({ length: maxMembers });

  return (
    <LegionCard>
      <LegionCardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <LegionCardTitle className="text-xl font-heading">
              {squad.name}
            </LegionCardTitle>
            <div className="text-xs text-legion-text-muted italic">
              &quot;{squad.motto}&quot;
            </div>
          </div>
          <LegionBadge variant="outline">
            {squad.type}
          </LegionBadge>
        </div>
      </LegionCardHeader>

      <LegionCardContent className="space-y-4">
        <div className="space-y-2">
          {slots.map((_, i) => {
            const member = members[i];
            if (member) {
              return (
                <MemberRow 
                  key={member.id} 
                  member={member} 
                  isMarshal={isMarshal} 
                  onRename={() => onAction(member, 'rename')}
                  onTransfer={() => onAction(member, 'transfer')}
                />
              );
            }
            return <VacantRow key={`vacant-${i}`} />;
          })}
        </div>
      </LegionCardContent>
    </LegionCard>
  );
}

function MemberRow({ 
  member, 
  isMarshal,
  onRename,
  onTransfer
}: { 
  member: SquadMember; 
  isMarshal: boolean;
  onRename: () => void;
  onTransfer: () => void;
}) {
  const isDead = member.status === 'DEAD';

  return (
    <div className={cn(
      "flex items-center justify-between p-2 rounded border border-legion-border bg-legion-bg-elevated",
      isDead && "opacity-50 line-through grayscale"
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border",
          member.rank === 'SOLDIER' ? "border-[var(--bob-amber)] text-[var(--bob-amber)]" : "border-legion-text-muted text-legion-text-muted"
        )}>
          {member.rank === 'SOLDIER' ? 'SLD' : 'ROO'}
        </div>
        <div>
          <div className="text-sm font-medium">{member.name}</div>
          <div className="text-[10px] text-legion-text-muted uppercase tracking-tighter">
            {member.heritage} {member.status !== 'ALIVE' && `— ${member.status}`}
          </div>
        </div>
      </div>

      <div className="flex gap-2 items-center">
        {isMarshal && !isDead && (
          <>
            <button 
              onClick={onRename}
              className="text-legion-text-muted hover:text-[var(--bob-amber)] transition-colors p-1"
              title="Rename"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
            </button>
            <button 
              onClick={onTransfer}
              className="text-legion-text-muted hover:text-[var(--bob-amber)] transition-colors p-1"
              title="Transfer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function VacantRow() {
  return (
    <div className="flex items-center justify-center p-2 rounded border border-dashed border-legion-border/50 text-[10px] uppercase tracking-widest text-legion-text-muted/50 font-medium h-[46px]">
      Vacant Slot
    </div>
  );
}
