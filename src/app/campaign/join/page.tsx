import { JoinCampaignForm } from '@/components/features/campaign/join-campaign-form';
import { PageShell } from '@/components/features/auth/page-shell';

export const metadata = { title: 'Join campaign — Band of Blades' };

export default function JoinCampaignPage() {
  return (
    <PageShell
      overline="338th Legion · Enlistment"
      heading="Join a Campaign"
      description="Enter the invite code your GM shared with you."
      stamp={{ label: 'New recruit', color: 'amber' }}
    >
      <JoinCampaignForm />
    </PageShell>
  );
}
