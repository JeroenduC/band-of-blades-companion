# Seed & Testing Reference

## `npm run seed:test`

Resets the entire database to a clean, known state for local testing. Safe to run as many times as you like.

**What it does:**
1. Deletes all rows from every table (FK order: `campaign_phase_log` → `back_at_camp_scenes` → `recruit_pool` → `laborers` → `long_term_projects` → `alchemists` → `mercies` → `siege_weapons` → `campaign_memberships` → `campaigns` → `profiles`)
2. Deletes all auth users via the Supabase Admin API
3. Creates 8 test users (pre-confirmed, no email required)
4. Creates a campaign called **"Test Campaign"**
5. Assigns 7 users to the campaign with their matching role (all PRIMARY)
6. Seeds the Back at Camp scene pool
7. Seeds QM materiel: 2 Laborers, 2 Alchemists (Sister Vantia with 3 corruption, Aldric the Grey clean), 1 Mercy (Healer Maren), and a sample long-term project "Field Fortifications" (3/8 segments)
8. Prints the campaign **invite code** — use it to test the join flow with `newplayer@test.nl`

---

## Test Accounts

Password for all accounts: **`testtest`**

| Email | Display name | Role in campaign |
|---|---|---|
| gm@test.nl | GM | GM (PRIMARY) |
| commander@test.nl | Commander | COMMANDER (PRIMARY) |
| marshal@test.nl | Marshal | MARSHAL (PRIMARY) |
| quartermaster@test.nl | Quartermaster | QUARTERMASTER (PRIMARY) |
| lorekeeper@test.nl | Lorekeeper | LOREKEEPER (PRIMARY) |
| spymaster@test.nl | Spymaster | SPYMASTER (PRIMARY) |
| soldier@test.nl | Soldier | SOLDIER (PRIMARY) |
| newplayer@test.nl | New Player | _(no membership — use invite code to join)_ |

---

## Legion Roles

| Role | Responsibilities |
|---|---|
| **GM** | Starts campaign phases, resolves mission outcomes (Step 1), generates missions (Step 8). The only role that can start/end a phase. |
| **Commander** | Reviews Time Passes changes and confirms (Step 3), makes the Advance/Stay decision (Step 6), selects mission focus (Step 7), selects the final mission (Step 9). |
| **Lorekeeper** | Selects the Back at Camp scene (Step 2). Keeper of Legion history and morale rituals. |
| **Quartermaster** | Runs campaign actions — Liberty, Laborers, Alchemists (Steps 4–5). Controls Legion resources. |
| **Spymaster** | Dispatches spies in parallel with QM campaign actions (Step 4). Controls intelligence and hidden operations. |
| **Marshal** | Observes the mission selection step (Step 9). Full responsibilities arrive in Epic 5/6. |
| **Soldier** | Observer role — no active steps currently. Catches players who haven't been assigned a specialist role yet. |

### Role ranks

Each role can be held by one **PRIMARY** and one **DEPUTY**. The PRIMARY holder is the decision-maker; the DEPUTY is a backup (for when a player can't act). Currently the app only routes to the PRIMARY holder's dashboard.

### Pending membership

When a player joins via invite code they have no role (`role = NULL`). They land on the **Pending** dashboard until the GM assigns them a role from the Manage Roles page (`/campaign/{id}/members`).

---

## Useful URLs (local)

| URL | What it is |
|---|---|
| `http://localhost:3000/sign-in` | Sign in |
| `http://localhost:3000/dashboard/gm` | GM dashboard |
| `http://localhost:3000/dashboard/commander` | Commander dashboard |
| `http://localhost:3000/dashboard/lorekeeper` | Lorekeeper dashboard |
| `http://localhost:3000/dashboard/quartermaster` | Quartermaster dashboard |
| `http://localhost:3000/dashboard/spymaster` | Spymaster dashboard |
| `http://localhost:3000/dashboard/marshal` | Marshal dashboard |
| `http://localhost:3000/dashboard/pending` | Pending dashboard (no role assigned) |
| `http://localhost:3000/campaign/join` | Join a campaign with an invite code |
| `http://localhost:3000/campaign/{id}/members` | GM: manage roles & remove players |
