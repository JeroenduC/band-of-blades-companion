'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function signUp(_prevState: { error: string } | null, formData: FormData) {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const displayName = formData.get('display_name') as string;

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) return { error: error.message };

  if (data.user) {
    // The trigger already inserted the profile row. Update display_name using
    // the service role client because the user's session isn't in cookies yet
    // at this point in the sign-up flow.
    const serviceClient = createServiceClient();
    const { error: profileError } = await serviceClient
      .from('profiles')
      .update({ display_name: displayName.trim() })
      .eq('id', data.user.id);

    if (profileError) return { error: profileError.message };
  }

  revalidatePath('/', 'layout');
  redirect('/campaign/join');
}

export async function signIn(_prevState: { error: string } | null, formData: FormData) {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/sign-in');
}
