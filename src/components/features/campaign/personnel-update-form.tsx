'use client';

import { useState } from 'react';
import { Specialist, Squad, SquadMember, SpecialistStatus, SquadMemberStatus, SquadRank } from '@/lib/types';
import { updatePersonnelPostMission } from '@/server/actions/phase/marshal';
import { LegionCard, LegionCardContent, LegionCardHeader, LegionCardTitle, LegionButton } from '@/components/legion';
import { cn } from '@/lib/utils';

interface PersonnelUpdateFormProps {
  campaignId: string;
  deployedSpecialists: Specialist[];
  deployedSquads: (Squad & { members: SquadMember[] })[];
}

export function PersonnelUpdateForm({
  campaignId,
  deployedSpecialists,
  deployedSquads,
}: PersonnelUpdateFormProps) {
  const [specialistUpdates, setSpecialistUpdates] = useState<any[]>(
    deployedSpecialists.map(s => ({
      id: s.id,
      name: s.name,
      class: s.class,
      harm: {
        level_1_a: s.harm_level_1_a,
        level_1_b: s.harm_level_1_b,
        level_2_a: s.harm_level_2_a,
        level_2_b: s.harm_level_2_b,
        level_3: s.harm_level_3,
      },
      stress: s.stress,
      xp: 2, // Default 2 xp for secondary mission, primary usually gets more per playbook but we'll use a picker
      status: 'AVAILABLE' as SpecialistStatus
    }))
  );

  const [squadMemberUpdates, setSquadMemberUpdates] = useState<any[]>(
    deployedSquads.flatMap(s => s.members).map(m => ({
      id: m.id,
      name: m.name,
      status: m.status as SquadMemberStatus,
      rank: m.rank as SquadRank,
      harm: m.harm,
      stress: m.stress,
      xp: m.xp
    }))
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdateSpecialist = (index: number, field: string, value: any) => {
    const newUpdates = [...specialistUpdates];
    if (field.startsWith('harm.')) {
      const harmField = field.split('.')[1];
      newUpdates[index].harm = { ...newUpdates[index].harm, [harmField]: value };
    } else {
      newUpdates[index][field] = value;
    }
    setSpecialistUpdates(newUpdates);
  };

  const handleUpdateSquadMember = (index: number, field: string, value: any) => {
    const newUpdates = [...squadMemberUpdates];
    newUpdates[index][field] = value;
    setSquadMemberUpdates(newUpdates);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await updatePersonnelPostMission(campaignId, specialistUpdates, squadMemberUpdates);
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-legion-text-muted">Specialist Updates</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {specialistUpdates.map((s, i) => (
            <LegionCard key={s.id}>
              <LegionCardHeader className="pb-2">
                <LegionCardTitle className="text-lg font-heading">{s.name} ({s.class})</LegionCardTitle>
              </LegionCardHeader>
              <LegionCardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-tighter text-legion-text-muted">Status</label>
                    <select 
                      className="w-full bg-legion-bg-elevated border border-legion-border rounded p-1 text-xs"
                      value={s.status}
                      onChange={(e) => handleUpdateSpecialist(i, 'status', e.target.value)}
                    >
                      <option value="AVAILABLE">Available</option>
                      <option value="DEAD">Dead</option>
                      <option value="RETIRED">Retired</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-tighter text-legion-text-muted">XP Gained</label>
                    <input 
                      type="number"
                      className="w-full bg-legion-bg-elevated border border-legion-border rounded p-1 text-xs"
                      value={s.xp}
                      onChange={(e) => handleUpdateSpecialist(i, 'xp', parseInt(e.target.value))}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-tighter text-legion-text-muted">Stress (0-9)</label>
                  <input 
                    type="range" min="0" max="9"
                    className="w-full accent-[var(--bob-amber)]"
                    value={s.stress}
                    onChange={(e) => handleUpdateSpecialist(i, 'stress', parseInt(e.target.value))}
                  />
                </div>
                {/* Harm Row Lvl 3 only for simplicity in this proto */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-tighter text-legion-text-muted">Severe Harm (Lvl 3)</label>
                  <input 
                    type="text"
                    placeholder="None"
                    className="w-full bg-legion-bg-elevated border border-legion-border rounded p-1 text-xs"
                    value={s.harm.level_3 || ''}
                    onChange={(e) => handleUpdateSpecialist(i, 'harm.level_3', e.target.value)}
                  />
                </div>
              </LegionCardContent>
            </LegionCard>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-legion-text-muted">Squad Member Updates</h3>
        <LegionCard>
          <LegionCardContent className="p-0">
            <div className="divide-y divide-legion-border">
              {squadMemberUpdates.map((m, i) => (
                <div key={m.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{m.name}</div>
                    <div className="text-[10px] text-legion-text-muted uppercase tracking-tighter">{m.rank}</div>
                  </div>
                  <div className="flex gap-4">
                    <select 
                      className="bg-legion-bg-elevated border border-legion-border rounded p-1 text-xs"
                      value={m.status}
                      onChange={(e) => handleUpdateSquadMember(i, 'status', e.target.value)}
                    >
                      <option value="ALIVE">Alive</option>
                      <option value="WOUNDED">Wounded</option>
                      <option value="DEAD">Dead</option>
                    </select>
                    <select 
                      className="bg-legion-bg-elevated border border-legion-border rounded p-1 text-xs"
                      value={m.rank}
                      onChange={(e) => handleUpdateSquadMember(i, 'rank', e.target.value)}
                    >
                      <option value="ROOKIE">Rookie</option>
                      <option value="SOLDIER">Soldier</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </LegionCardContent>
        </LegionCard>
      </section>

      <div className="flex justify-center pb-8">
        <LegionButton size="lg" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'UPDATING...' : 'FINISH UPDATES & ADVANCE TO CAMP'}
        </LegionButton>
      </div>
    </div>
  );
}
