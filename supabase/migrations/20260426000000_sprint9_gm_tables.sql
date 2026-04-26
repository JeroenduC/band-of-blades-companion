-- Sprint 9: GM Dashboard & Session Management

-- 1. Create broken_advances table
CREATE TABLE IF NOT EXISTS public.broken_advances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    broken_name text NOT NULL CHECK (broken_name IN ('BLIGHTER', 'BREAKER', 'RENDER')),
    ability_name text NOT NULL,
    unlocked boolean NOT NULL DEFAULT false,
    unlocked_at_phase integer,
    notes text DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Add chosen_broken to campaigns
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS chosen_broken text[] DEFAULT '{}';

-- 3. Update sessions table
-- We check if columns exist before adding/altering
DO $$ 
BEGIN
    -- Add title if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sessions' AND column_name='title') THEN
        ALTER TABLE public.sessions ADD COLUMN title text;
    END IF;

    -- Add linked_phases if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sessions' AND column_name='linked_phases') THEN
        ALTER TABLE public.sessions ADD COLUMN linked_phases integer[] DEFAULT '{}';
    END IF;
END $$;

-- Enable RLS on broken_advances
ALTER TABLE public.broken_advances ENABLE ROW LEVEL SECURITY;

-- RLS Policy for broken_advances: Campaign members can read
CREATE POLICY "Campaign members can read broken_advances" ON public.broken_advances
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.campaign_memberships
            WHERE campaign_memberships.campaign_id = broken_advances.campaign_id
            AND campaign_memberships.user_id = auth.uid()
        )
    );

-- RLS Policy for broken_advances: Service role can write (mutations via server actions)
-- Note: Project standard uses service role for most writes.

-- RLS Policy for sessions (if not already set or needs update)
-- Existing sessions table already has RLS, but let's ensure members can select.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'sessions' AND policyname = 'Campaign members can read sessions'
    ) THEN
        CREATE POLICY "Campaign members can read sessions" ON public.sessions
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM public.campaign_memberships
                    WHERE campaign_memberships.campaign_id = sessions.campaign_id
                    AND campaign_memberships.user_id = auth.uid()
                )
            );
    END IF;
END $$;
