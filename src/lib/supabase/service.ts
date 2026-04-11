import { createClient } from '@supabase/supabase-js';

// Service role client — bypasses RLS. Never expose to the browser.
// Only import this in server-side code (server actions, route handlers).
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
