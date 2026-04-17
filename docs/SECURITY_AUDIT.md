# Band of Blades Companion — Security Audit Report

**Datum:** 17 april 2026
**Scope:** Next.js 15 App Router, Supabase (PostgreSQL + Auth), TypeScript, Tailwind CSS, Vercel deployment

---

## Systeemoverzicht

De Band of Blades Companion is een asynchrone, role-based web-applicatie die de campaign phase van het tabletop RPG *Band of Blades* digitaliseert. De applicatie gebruikt Next.js 15 server components en server actions voor alle mutaties, Supabase voor authenticatie en database (met Row-Level Security), en een 10-staps finite state machine voor de campaign workflow.

Alle schrijfoperaties verlopen via server actions met een service-role Supabase client. Clients schrijven nooit direct naar de database. Authenticatie is email/password via Supabase Auth.

---

## Samenvatting

| Ernst | Aantal |
|-------|--------|
| 🔴 Kritiek | 1 |
| 🟠 Hoog | 4 |
| 🟡 Medium | 6 |
| 🟢 Laag | 5 |

---

## 🔴 KRITIEKE Bevindingen

### C-01: Open Redirect in Auth Callback

**Component:** Auth callback route
**Bestand:** `src/app/auth/callback/route.ts` (regels 7–16)

**Beschrijving:**
De auth callback route accepteert een `next` query parameter en redirect de gebruiker naar die waarde zonder validatie:

```typescript
const next = searchParams.get('next') ?? '/dashboard';
// ...
return NextResponse.redirect(`${origin}${next}`);
```

Hoewel de redirect wordt gecombineerd met `origin`, kan een aanvaller een pad als `//evil.com` of `/..//evil.com` injecteren. Afhankelijk van de browser-parsing kan `${origin}//evil.com` worden geïnterpreteerd als een protocol-relative URL naar `evil.com`.

**Impact:** Een aanvaller kan een phishing-link construeren die via de legitieme auth callback redirect naar een kwaadaardige site, waardoor sessietokens of credentials gestolen kunnen worden.

**Remediatie:**
```typescript
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  // Valideer dat next een relatief pad is en geen open redirect
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth_callback_failed`);
}
```

---

## 🟠 HOGE Bevindingen

### H-01: Middleware Faalt Open bij Supabase-uitval

**Component:** Auth middleware
**Bestand:** `src/middleware.ts` (regels 36–38)

**Beschrijving:**
De middleware vangt alle fouten op en laat het request door wanneer Supabase onbereikbaar is:

```typescript
} catch {
  // If Supabase is unreachable, fail open — let the page render and handle auth itself.
  return supabaseResponse;
}
```

Dit betekent dat als Supabase tijdelijk onbereikbaar is (netwerk-issue, DDoS, configuratiefout), alle beschermde routes toegankelijk worden voor niet-geauthenticeerde gebruikers.

**Impact:** Tijdelijke Supabase-uitval leidt tot volledige bypass van de authenticatie-guard. Alle dashboard-pagina's en server actions worden bereikbaar.

**Remediatie:**
Verander de fail-open strategie naar fail-closed. Redirect naar een foutpagina of sign-in bij connectiefouten:

```typescript
} catch {
  // Fail closed — redirect to sign-in when auth cannot be verified
  const url = request.nextUrl.clone();
  url.pathname = '/sign-in';
  url.searchParams.set('error', 'service_unavailable');
  return NextResponse.redirect(url);
}
```

**Opmerking:** Server actions hebben hun eigen auth-checks (`getUser()`), dus de impact is beperkt tot het renderen van pagina's. Maar server components die data laden via loaders zullen ook falen, wat onvoorspelbaar gedrag kan veroorzaken.

---

### H-02: Ontbrekende Security Headers

**Component:** Next.js configuratie
**Bestand:** `next.config.ts`

**Beschrijving:**
De Next.js configuratie bevat geen security headers:

```typescript
const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
};
```

De volgende headers ontbreken:
- **Content-Security-Policy (CSP)** — geen bescherming tegen XSS via inline scripts
- **Strict-Transport-Security (HSTS)** — geen afdwinging van HTTPS
- **X-Frame-Options** — geen bescherming tegen clickjacking
- **X-Content-Type-Options** — geen bescherming tegen MIME-sniffing
- **Referrer-Policy** — geen controle over referrer-informatie
- **Permissions-Policy** — geen beperking van browser-features

**Impact:** De applicatie is kwetsbaar voor clickjacking-aanvallen, MIME-type verwarring, en mist defense-in-depth tegen XSS.

**Remediatie:**
```typescript
const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co;",
          },
        ],
      },
    ];
  },
};
```

---

### H-03: Geen Rate Limiting op Authenticatie-endpoints

**Component:** Auth server actions
**Bestand:** `src/server/actions/auth.ts`

**Beschrijving:**
De `signIn` en `signUp` server actions hebben geen rate limiting. Een aanvaller kan onbeperkt inlogpogingen doen:

```typescript
export async function signIn(_prevState: { error: string } | null, formData: FormData) {
  const supabase = await createClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  // Geen rate limiting, geen brute-force bescherming
}
```

Supabase heeft ingebouwde rate limiting op auth-endpoints, maar deze is generiek en niet per-IP of per-account geconfigureerd.

**Impact:** Brute-force aanvallen op wachtwoorden, credential stuffing, en account enumeration zijn mogelijk.

**Remediatie:**
Implementeer rate limiting op applicatieniveau. Opties:
1. Gebruik Vercel's Edge Middleware met `@vercel/kv` voor een sliding window rate limiter
2. Configureer Supabase's ingebouwde rate limits strikter via het dashboard
3. Voeg een CAPTCHA toe na N mislukte pogingen (Supabase ondersteunt hCaptcha/Turnstile)

---

### H-04: Ontbrekende Input-validatie op Campaign Name

**Component:** Campaign creation
**Bestand:** `src/server/actions/campaign.ts` (regels 28–30)

**Beschrijving:**
De campaign name wordt alleen gecontroleerd op leegte, maar niet op lengte of inhoud:

```typescript
const name = (formData.get('name') as string)?.trim();
if (!name) return { error: 'Campaign name is required' };
```

Er is geen maximale lengte, geen sanitizatie, en geen Zod-schema validatie (in tegenstelling tot andere server actions die Zod wel gebruiken).

**Impact:** Een aanvaller kan extreem lange campaign names invoeren (potentieel megabytes), wat kan leiden tot:
- Database storage abuse
- UI-rendering problemen
- Denial of service bij het laden van campaign data

**Remediatie:**
```typescript
import { z } from 'zod';

const CreateCampaignSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Campaign name is required')
    .max(100, 'Campaign name must be under 100 characters')
    .regex(/^[a-zA-Z0-9\s\-'.,!?:—]+$/, 'Campaign name contains invalid characters'),
});
```

---

## 🟡 MEDIUM Bevindingen

### M-01: Server Action Errors Lekken Interne Details

**Component:** Campaign phase server actions
**Bestand:** `src/server/actions/campaign-phase.ts` (meerdere locaties)

**Beschrijving:**
Veel server actions gebruiken `throw new Error()` met interne foutmeldingen die database-details bevatten:

```typescript
if (error) throw new Error(`Failed to log campaign action: ${error.message}`);
// ...
if (updateError) throw new Error(`Failed to update campaign state: ${updateError.message}`);
// ...
if (updateError) throw new Error(updateError.message);
```

Next.js server actions propageren `throw`-fouten naar de client als error boundaries. De `error.message` van Supabase kan tabel-namen, kolom-namen, constraint-namen en SQL-details bevatten.

**Impact:** Informatie-lekkage die een aanvaller helpt bij het in kaart brengen van de database-structuur.

**Remediatie:**
Gebruik het return-patroon (zoals `resolveMission` al doet) in plaats van `throw`:
```typescript
// Goed patroon (al gebruikt in resolveMission):
if (updateError) {
  return { errors: { _form: ['Something went wrong. Please try again.'] } };
}

// Slecht patroon (huidige situatie in andere actions):
if (updateError) throw new Error(updateError.message);
```

Log de originele fout server-side en retourneer een generieke melding naar de client.

---

### M-02: Ontbrekende Campaign-scoped Autorisatie in `assignRole`

**Component:** Role assignment
**Bestand:** `src/server/actions/campaign.ts` (regels 107–130)

**Beschrijving:**
De `assignRole` functie verifieert dat de caller GM is van de campaign, maar valideert niet dat de `membership_id` daadwerkelijk bij dezelfde campaign hoort:

```typescript
// Verify the caller is the GM of this campaign
const { data: gmMembership } = await db
  .from('campaign_memberships')
  .select('id')
  .eq('campaign_id', campaignId)
  .eq('user_id', user.id)
  .eq('role', 'GM')
  .maybeSingle();

if (!gmMembership) return { error: 'Only the GM can assign roles' };

// Update zonder te verifiëren dat membership_id bij campaignId hoort
const { error } = await db
  .from('campaign_memberships')
  .update({ role, rank })
  .eq('id', membershipId);  // ← geen .eq('campaign_id', campaignId)
```

Een GM van campaign A kan theoretisch de `membership_id` van een speler in campaign B meesturen en diens rol wijzigen.

**Impact:** Cross-campaign privilege escalation — een GM kan rollen toewijzen in campaigns waar zij geen GM zijn.

**Remediatie:**
```typescript
const { error } = await db
  .from('campaign_memberships')
  .update({ role, rank })
  .eq('id', membershipId)
  .eq('campaign_id', campaignId);  // ← scope naar de juiste campaign
```

---

### M-03: Race Condition bij Parallelle Campaign Actions

**Component:** QM/Spymaster parallel completion
**Bestand:** `src/server/actions/campaign-phase.ts` (regels 920–980)

**Beschrijving:**
De `completeQmActions` en `completeSpymasterActions` functies lezen de status van de andere partij en schrijven hun eigen status in aparte queries zonder transactie:

```typescript
// In completeQmActions:
const bothDone = campaign.spymaster_actions_complete;  // READ
await db.from('campaigns').update({                     // WRITE
  qm_actions_complete: true,
  campaign_phase_state: newState
}).eq('id', campaignId);
```

Als QM en Spymaster exact tegelijk hun actie voltooien, kunnen beide `bothDone = false` lezen, waardoor geen van beiden de state naar `AWAITING_LABORERS_ALCHEMISTS` transitieert.

**Impact:** De campaign kan vastlopen in `CAMPAIGN_ACTIONS` state, ook al hebben beide rollen hun acties voltooid.

**Remediatie:**
Gebruik een Supabase RPC-functie met een `SELECT ... FOR UPDATE` lock:

```sql
CREATE OR REPLACE FUNCTION complete_parallel_action(
  p_campaign_id uuid,
  p_role text  -- 'QM' of 'SPYMASTER'
) RETURNS text AS $$
DECLARE
  v_campaign campaigns%ROWTYPE;
BEGIN
  SELECT * INTO v_campaign FROM campaigns
    WHERE id = p_campaign_id FOR UPDATE;

  IF p_role = 'QM' THEN
    v_campaign.qm_actions_complete := true;
  ELSE
    v_campaign.spymaster_actions_complete := true;
  END IF;

  IF v_campaign.qm_actions_complete AND v_campaign.spymaster_actions_complete THEN
    v_campaign.campaign_phase_state := 'AWAITING_LABORERS_ALCHEMISTS';
  END IF;

  UPDATE campaigns SET
    qm_actions_complete = v_campaign.qm_actions_complete,
    spymaster_actions_complete = v_campaign.spymaster_actions_complete,
    campaign_phase_state = v_campaign.campaign_phase_state
  WHERE id = p_campaign_id;

  RETURN v_campaign.campaign_phase_state;
END;
$$ LANGUAGE plpgsql;
```

---

### M-04: `advancePlaceholderStep` Accepteert Willekeurige State Transities

**Component:** Placeholder step advancement
**Bestand:** `src/server/actions/campaign-phase.ts` (regels 1050–1120)

**Beschrijving:**
De `advancePlaceholderStep` functie leest `next_state`, `role`, en `action_type` uit hidden form fields:

```typescript
const nextState = formData.get('next_state') as CampaignPhaseState;
const role = formData.get('role') as LegionRole;
const actionType = formData.get('action_type') as CampaignPhaseLogActionType;
const dashboardPath = formData.get('dashboard_path') as string;
```

Hoewel de FSM-transitie wordt gevalideerd via `assertValidTransition`, kan een aanvaller:
1. Een willekeurige `role` meesturen en zo de audit log vervuilen
2. Een willekeurige `dashboardPath` meesturen (open redirect na actie)
3. Een willekeurige `action_type` meesturen

**Impact:** Audit log manipulatie en potentiële open redirect via `dashboardPath`.

**Remediatie:**
Valideer alle form fields tegen whitelists:
```typescript
const VALID_DASHBOARD_PATHS = [
  '/dashboard/gm', '/dashboard/commander', '/dashboard/marshal',
  '/dashboard/quartermaster', '/dashboard/lorekeeper', '/dashboard/spymaster',
];

if (!VALID_DASHBOARD_PATHS.includes(dashboardPath)) {
  throw new Error('Invalid dashboard path');
}

// Valideer role en actionType tegen de TypeScript types
const validRoles: LegionRole[] = ['GM', 'COMMANDER', 'MARSHAL', 'QUARTERMASTER', 'LOREKEEPER', 'SPYMASTER', 'SOLDIER'];
if (!validRoles.includes(role)) throw new Error('Invalid role');
```

---

### M-05: Ontbrekende SUPABASE_SERVICE_ROLE_KEY in .env.local.example

**Component:** Environment configuratie
**Bestand:** `.env.local.example`

**Beschrijving:**
Het voorbeeld-bestand bevat alleen de publieke keys:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

De `SUPABASE_SERVICE_ROLE_KEY` ontbreekt, terwijl deze essentieel is voor alle server actions. Ontwikkelaars die het project opzetten zullen runtime-fouten krijgen zonder duidelijke indicatie.

**Impact:** Slechte developer experience en risico dat ontwikkelaars de service role key op onveilige manieren delen of hardcoden.

**Remediatie:**
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
# ⚠ NOOIT committen naar git. De service role key bypassed Row-Level Security.
```

---

### M-06: Dependency Versions Gebruiken Caret Ranges

**Component:** Package management
**Bestand:** `package.json`

**Beschrijving:**
Alle dependencies gebruiken caret ranges (`^`), wat automatische minor/patch updates toestaat:

```json
"@supabase/ssr": "^0.10.2",
"@supabase/supabase-js": "^2.103.0",
"next": "15.5.15",
"zod": "^4.3.6"
```

Opvallend: `@supabase/ssr` is op versie `0.x`, wat betekent dat caret ranges breaking changes kunnen introduceren (semver beschouwt alle `0.x` releases als potentieel breaking).

**Impact:** Supply chain risico — een gecompromitteerde minor release kan automatisch worden geïnstalleerd. De `0.x` versie van `@supabase/ssr` is extra kwetsbaar voor onverwachte breaking changes.

**Remediatie:**
Pin kritieke dependencies op exacte versies, met name `@supabase/ssr` en `@supabase/supabase-js`:
```json
"@supabase/ssr": "0.10.2",
"@supabase/supabase-js": "2.103.0"
```

Gebruik `npm audit` en Dependabot/Renovate voor gecontroleerde updates.

---

## 🟢 LAGE Bevindingen

### L-01: ESLint Uitgeschakeld Tijdens Builds

**Component:** Build configuratie
**Bestand:** `next.config.ts`

**Beschrijving:**
```typescript
eslint: {
  ignoreDuringBuilds: true,
},
```

ESLint wordt overgeslagen tijdens production builds, waardoor potentiële code-kwaliteits- en security-gerelateerde lint-regels niet worden afgedwongen in CI/CD.

**Impact:** Security-gerelateerde lint-regels (zoals het detecteren van `eval()` of onveilige patterns) worden niet afgedwongen.

**Remediatie:** Verwijder `ignoreDuringBuilds: true` en fix eventuele lint-fouten. Voeg security-specifieke ESLint plugins toe zoals `eslint-plugin-security`.

---

### L-02: Invite Code Brute-force Mogelijk

**Component:** Campaign join flow
**Bestand:** `src/server/actions/campaign.ts` (regels 65–80)

**Beschrijving:**
Invite codes zijn 8 karakters uit een alfabet van 31 tekens (31^8 ≈ 8.5 × 10^11 combinaties). Dit is voldoende entropie, maar er is geen rate limiting op de `joinCampaign` action.

**Impact:** Theoretisch brute-forceable, maar de keyspace is groot genoeg dat dit in de praktijk onhaalbaar is zonder rate limiting op Supabase-niveau.

**Remediatie:** Voeg rate limiting toe op de join-actie (max 10 pogingen per minuut per IP). Overweeg invite codes te laten verlopen na een configureerbare periode.

---

### L-03: Geen Wachtwoord-complexiteitsvalidatie op Applicatieniveau

**Component:** Sign-up flow
**Bestand:** `src/server/actions/auth.ts` (regels 9–14)

**Beschrijving:**
De sign-up action valideert het wachtwoord niet op applicatieniveau:

```typescript
const password = formData.get('password') as string;
const { data, error } = await supabase.auth.signUp({ email, password });
```

De HTML-form heeft `minLength={8}`, maar dit is client-side en eenvoudig te omzeilen. Supabase heeft een standaard minimum van 6 karakters.

**Impact:** Gebruikers kunnen zwakke wachtwoorden instellen.

**Remediatie:**
Valideer server-side met Zod:
```typescript
const SignUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Wachtwoord moet minimaal 8 karakters zijn'),
  display_name: z.string().trim().min(1).max(50),
});
```

---

### L-04: Display Name Niet Gevalideerd op Lengte

**Component:** Sign-up flow
**Bestand:** `src/server/actions/auth.ts` (regels 9–25)

**Beschrijving:**
De display name wordt alleen getrimd maar niet gevalideerd op lengte:

```typescript
const displayName = formData.get('display_name') as string;
// ...
.update({ display_name: displayName.trim() })
```

**Impact:** Extreem lange display names kunnen UI-problemen veroorzaken.

**Remediatie:** Voeg lengte-validatie toe (max 50 karakters) via Zod-schema.

---

### L-05: Seed Script Bevat Hardcoded Test-wachtwoord

**Component:** Test seeding
**Bestand:** `scripts/seed-test-users.ts`

**Beschrijving:**
Het seed script logt test-wachtwoorden naar de console:

```
console.log('Test accounts (password: testtest)');
```

Dit is acceptabel voor een development-only script, maar het wachtwoord `testtest` is zwak.

**Impact:** Minimaal — alleen relevant als het seed script per ongeluk in productie wordt uitgevoerd.

**Remediatie:** Voeg een environment check toe aan het begin van het script:
```typescript
if (process.env.NODE_ENV === 'production') {
  console.error('Seed script mag niet in productie worden uitgevoerd.');
  process.exit(1);
}
```

---

## Positieve Bevindingen

- ✅ **Server-side state machine** — Alle state transities worden server-side gevalideerd via `assertValidTransition()`. Clients kunnen de campaign state niet direct manipuleren.
- ✅ **Service role isolatie** — De service role client (`createServiceClient`) wordt alleen in server-side code gebruikt. De browser client gebruikt uitsluitend de anon key.
- ✅ **Zod-validatie op kritieke actions** — `resolveMission`, `makeAdvanceDecision`, en andere complexe actions gebruiken Zod-schema's voor input-validatie.
- ✅ **Append-only audit log** — Alle campaign phase acties worden gelogd in `campaign_phase_log`. De tabel heeft geen UPDATE/DELETE policies.
- ✅ **Cryptografisch veilige random generatie** — Invite codes en dobbelsteenworpen gebruiken `crypto.getRandomValues()`.
- ✅ **Geen XSS-vectoren** — Geen gebruik van `dangerouslySetInnerHTML`, `eval()`, of andere onveilige patterns. React's standaard escaping beschermt tegen XSS.
- ✅ **Row-Level Security** — Alle tabellen hebben RLS-policies die data-isolatie per campaign afdwingen.
- ✅ **Geen hardcoded secrets** — Alle credentials worden via environment variables geladen.
- ✅ **CSRF-bescherming** — Next.js server actions hebben ingebouwde CSRF-bescherming via de `Origin` header check.
- ✅ **Correcte .gitignore** — `.env.local` en andere gevoelige bestanden zijn uitgesloten van version control.
- ✅ **Autorisatie-checks op elke server action** — Elke mutatie verifieert de rol van de caller (GM, Commander, QM, etc.).
- ✅ **Generieke foutmeldingen voor gebruikers** — De `joinCampaign` action toont generieke fouten en logt details server-side.

---

## Prioriteit Remediatie Roadmap

| Prioriteit | Actie | Inspanning | Bevinding |
|------------|-------|------------|-----------|
| **P0** | Valideer `next` parameter in auth callback | 15 minuten | C-01 |
| **P0** | Scope `assignRole` update naar campaign_id | 5 minuten | M-02 |
| **P1** | Voeg security headers toe aan next.config.ts | 30 minuten | H-02 |
| **P1** | Verander middleware naar fail-closed | 15 minuten | H-01 |
| **P1** | Voeg Zod-validatie toe aan campaign creation | 20 minuten | H-04 |
| **P1** | Valideer placeholder step form fields | 20 minuten | M-04 |
| **P2** | Implementeer rate limiting op auth endpoints | 2–4 uur | H-03 |
| **P2** | Vervang `throw` door return-patroon in server actions | 1–2 uur | M-01 |
| **P2** | Gebruik database-level locking voor parallelle actions | 1–2 uur | M-03 |
| **P2** | Pin kritieke dependency versies | 15 minuten | M-06 |
| **P2** | Voeg SUPABASE_SERVICE_ROLE_KEY toe aan .env.local.example | 5 minuten | M-05 |
| **P3** | Activeer ESLint tijdens builds | 30 minuten | L-01 |
| **P3** | Voeg server-side wachtwoord-validatie toe | 20 minuten | L-03 |
| **P3** | Valideer display name lengte | 10 minuten | L-04 |
| **P3** | Voeg rate limiting toe aan invite code join | 1 uur | L-02 |
| **P3** | Voeg environment check toe aan seed script | 5 minuten | L-05 |

---

## Methodologie

Deze audit is uitgevoerd door statische analyse van alle bronbestanden in de repository, met focus op:

1. **Authenticatie & autorisatie** — Elke server action en loader gecontroleerd op auth-checks en role-verificatie
2. **Input-validatie** — Alle FormData-verwerking gecontroleerd op Zod-validatie en sanitizatie
3. **Data-toegang** — Alle Supabase queries gecontroleerd op campaign-scoping en RLS-compliance
4. **Configuratie** — Next.js config, middleware, en environment setup gecontroleerd op security best practices
5. **Dependencies** — Package.json gecontroleerd op bekende kwetsbaarheden en versie-pinning
6. **Informatie-lekkage** — Error handling en logging gecontroleerd op het lekken van interne details

**Buiten scope:** Supabase dashboard-configuratie (RLS policies, auth settings), Vercel deployment settings, en runtime penetration testing.
