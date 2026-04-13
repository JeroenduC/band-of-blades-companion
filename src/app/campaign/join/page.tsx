import Link from 'next/link';
import { JoinCampaignForm } from '@/components/features/campaign/join-campaign-form';
import { PageShell } from '@/components/features/auth/page-shell';

export const metadata = { title: 'Join campaign — Band of Blades' };

export default function JoinCampaignPage() {
  return (
    <PageShell
      overline="338th Legion · Setup"
      heading="Join a Campaign"
      description="Enter the invite code your GM shared with you."
    >
      <div className="space-y-5">
        <JoinCampaignForm />
        <p className="text-center text-sm text-legion-text-muted">
          Are you the GM?{' '}
          <Link
            href="/campaign/new"
            className="text-legion-amber underline underline-offset-4 hover:text-legion-amber-muted transition-colors"
          >
            Create a campaign
          </Link>
        </p>
      </div>
    </PageShell>
  );
}
