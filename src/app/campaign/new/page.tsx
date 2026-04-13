import Link from 'next/link';
import { CreateCampaignForm } from '@/components/features/campaign/create-campaign-form';
import { PageShell } from '@/components/features/auth/page-shell';

export const metadata = { title: 'New campaign — Band of Blades' };

export default function NewCampaignPage() {
  return (
    <PageShell
      overline="338th Legion · Setup"
      heading="New Campaign"
      description="Name your Legion's campaign. You'll receive an invite code to share with your players."
    >
      <div className="space-y-5">
        <CreateCampaignForm />
        <p className="text-center text-sm text-legion-text-muted">
          Already have a code?{' '}
          <Link
            href="/campaign/join"
            className="text-legion-amber underline underline-offset-4 hover:text-legion-amber-muted transition-colors"
          >
            Join a campaign
          </Link>
        </p>
      </div>
    </PageShell>
  );
}
