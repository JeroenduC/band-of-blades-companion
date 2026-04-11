import { CreateCampaignForm } from '@/components/features/campaign/create-campaign-form';

export const metadata = { title: 'New campaign — Band of Blades' };

export default function NewCampaignPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">New campaign</h1>
          <p className="text-sm text-muted-foreground">
            Name your Legion&apos;s campaign. You&apos;ll receive an invite code to share with your players.
          </p>
        </div>
        <CreateCampaignForm />
      </div>
    </main>
  );
}
