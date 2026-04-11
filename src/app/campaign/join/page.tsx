import Link from 'next/link';
import { JoinCampaignForm } from '@/components/features/campaign/join-campaign-form';

export const metadata = { title: 'Join campaign — Band of Blades' };

export default function JoinCampaignPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Join a campaign</h1>
          <p className="text-sm text-muted-foreground">
            Enter the invite code your GM shared with you.
          </p>
        </div>
        <JoinCampaignForm />
        <p className="text-center text-sm text-muted-foreground">
          Are you the GM?{' '}
          <Link href="/campaign/new" className="underline underline-offset-4">
            Create a campaign
          </Link>
        </p>
      </div>
    </main>
  );
}
