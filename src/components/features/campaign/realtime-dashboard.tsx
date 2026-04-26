'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { type CampaignPhaseState, type LegionRole } from '@/lib/types';
import { isRoleActive, getStepForState } from '@/lib/state-machine';
import { toast } from '@/components/legion';

interface RealtimeDashboardProps {
  campaignId: string;
  userRole: LegionRole | null;
  currentState: CampaignPhaseState | null;
}

/**
 * RealtimeDashboard — Invisible component that handles Supabase real-time 
 * subscriptions and turn notifications.
 * 
 * Dashboards include this to:
 * 1. Automatically refresh when anyone else in the campaign makes a change.
 * 2. Automatically refresh when the user's role is assigned (if pending).
 * 3. Notify the player with a toast when it's their turn to act.
 */
export function RealtimeDashboard({ campaignId, userRole, currentState }: RealtimeDashboardProps) {
  const router = useRouter();
  const supabase = createClient();
  const lastStateRef = useRef<CampaignPhaseState | null>(currentState);
  
  useEffect(() => {
    // 1. Subscribe to changes on the campaigns table for this specific ID
    const campaignChannel = supabase
      .channel(`campaign-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'campaigns',
          filter: `id=eq.${campaignId}`,
        },
        (payload) => {
          const newState = payload.new.campaign_phase_state as CampaignPhaseState | null;
          
          // Only trigger if the phase state actually changed
          if (newState !== lastStateRef.current) {
            lastStateRef.current = newState;
            
            // Refresh the server component data
            router.refresh();

            // Notify if it's now this role's turn (or if they are the GM)
            if (newState && userRole) {
              const step = getStepForState(newState);
              const isActive = isRoleActive(userRole, newState);
              
              if (isActive || userRole === 'GM') {
                const roleLabel = userRole === 'GM' ? 'Campaign Progress' : userRole;
                toast(`${roleLabel}: It's time to act!`, {
                  description: step?.label ? `Current Step: ${step.label}` : 'The campaign phase has transitioned.',
                  duration: 8000,
                  action: {
                    label: 'Refresh Page',
                    onClick: () => window.location.reload()
                  }
                });
              }
            }
          }
        }
      )
      .subscribe();

    // 2. Subscribe to membership changes for this campaign
    // This allows /dashboard/pending to auto-redirect when a role is assigned.
    const membershipChannel = supabase
      .channel(`membership-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'campaign_memberships',
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(campaignChannel);
      supabase.removeChannel(membershipChannel);
    };
  }, [campaignId, userRole, supabase, router]);

  return null; // Invisible utility component
}
