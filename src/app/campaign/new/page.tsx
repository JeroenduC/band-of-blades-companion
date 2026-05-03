import { CreateCampaignForm } from '@/components/features/campaign/create-campaign-form';
import { PageShell } from '@/components/features/auth/page-shell';

export const metadata = { title: 'New campaign — Band of Blades' };

export default function NewCampaignPage() {
  return (
    <PageShell
      overline="338th Legion · Setup"
      heading="New Campaign"
      description="Name your Legion's campaign. You'll receive an invite code to share with your players."
      stamp={{ label: 'GM orders', color: 'red' }}
    >
      <CreateCampaignForm />
    </PageShell>
  );
}
