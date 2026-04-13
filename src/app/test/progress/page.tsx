/**
 * Test page for PhaseProgressIndicator — not linked from the app.
 * Remove before shipping to production.
 */
import { PhaseProgressIndicator } from '@/components/features/campaign/phase-progress-indicator';

export default function TestProgressPage() {
  return (
    <div className="min-h-screen bg-legion-bg-base p-8">
      <h1 className="font-heading text-2xl text-legion-amber mb-8 tracking-wide uppercase">
        Phase Progress — Test
      </h1>
      <div className="max-w-sm">
        <PhaseProgressIndicator currentState="CAMPAIGN_ACTIONS" />
      </div>
    </div>
  );
}
