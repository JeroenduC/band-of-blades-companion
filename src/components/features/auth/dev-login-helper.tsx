'use client';

import { useState } from 'react';

// Only rendered in development — see usage in sign-in-form.tsx.
// This file is safe to ship; it never renders in production builds.

interface TestAccount {
  role: string;
  email: string;
}

interface TestCampaign {
  name: string;
  accounts: TestAccount[];
}

const PASSWORD = 'testtest';

const TEST_CAMPAIGNS: TestCampaign[] = [
  {
    name: 'Test Campaign Alpha',
    accounts: [
      { role: 'GM',             email: 'gm1@test.nl'            },
      { role: 'Commander',      email: 'commander1@test.nl'     },
      { role: 'Marshal',        email: 'marshal1@test.nl'       },
      { role: 'Quartermaster',  email: 'quartermaster1@test.nl' },
      { role: 'Lorekeeper',     email: 'lorekeeper1@test.nl'    },
      { role: 'Spymaster',      email: 'spymaster1@test.nl'     },
      { role: 'Soldier',        email: 'soldier1@test.nl'       },
      { role: 'New Player',     email: 'newplayer1@test.nl'     },
    ],
  },
  {
    name: 'Test Campaign Beta',
    accounts: [
      { role: 'GM',             email: 'gm2@test.nl'            },
      { role: 'Commander',      email: 'commander2@test.nl'     },
      { role: 'Marshal',        email: 'marshal2@test.nl'       },
      { role: 'Quartermaster',  email: 'quartermaster2@test.nl' },
      { role: 'Lorekeeper',     email: 'lorekeeper2@test.nl'    },
      { role: 'Spymaster',      email: 'spymaster2@test.nl'     },
      { role: 'Soldier',        email: 'soldier2@test.nl'       },
      { role: 'New Player',     email: 'newplayer2@test.nl'     },
    ],
  },
  {
    name: 'Test Campaign Gamma',
    accounts: [
      { role: 'GM',             email: 'gm3@test.nl'            },
      { role: 'Commander',      email: 'commander3@test.nl'     },
      { role: 'Marshal',        email: 'marshal3@test.nl'       },
      { role: 'Quartermaster',  email: 'quartermaster3@test.nl' },
      { role: 'Lorekeeper',     email: 'lorekeeper3@test.nl'    },
      { role: 'Spymaster',      email: 'spymaster3@test.nl'     },
      { role: 'Soldier',        email: 'soldier3@test.nl'       },
      { role: 'New Player',     email: 'newplayer3@test.nl'     },
    ],
  },
];

function fillAndSubmit(email: string) {
  const emailInput = document.getElementById('email') as HTMLInputElement | null;
  const passwordInput = document.getElementById('password') as HTMLInputElement | null;
  if (!emailInput || !passwordInput) return;

  // Set values directly — the server action reads FormData from the DOM,
  // not React state, so this is sufficient.
  emailInput.value = email;
  passwordInput.value = PASSWORD;

  const form = emailInput.closest('form');
  form?.requestSubmit();
}

export function DevLoginHelper() {
  const [open, setOpen] = useState(false);
  const [openCampaign, setOpenCampaign] = useState<number | null>(null);

  return (
    <div className="mt-6 rounded-md border border-dashed border-legion-text-muted/30 bg-legion-bg-elevated/50 text-xs">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left text-legion-text-muted hover:text-legion-text-primary transition-colors min-h-[44px]"
        aria-expanded={open}
      >
        <span className="font-mono tracking-widest uppercase text-[10px]">
          🧪 Test Accounts
        </span>
        <span aria-hidden="true" className="text-legion-text-muted/60">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div className="border-t border-legion-text-muted/20 px-3 pb-3 pt-2 space-y-3">
          {TEST_CAMPAIGNS.map((campaign, ci) => (
            <div key={ci}>
              {/* Campaign section toggle */}
              <button
                type="button"
                onClick={() => setOpenCampaign(openCampaign === ci ? null : ci)}
                className="flex w-full items-center justify-between py-1 text-left text-legion-text-muted hover:text-legion-text-primary transition-colors"
                aria-expanded={openCampaign === ci}
              >
                <span className="font-medium text-[11px] text-legion-amber/80">
                  {campaign.name}
                </span>
                <span aria-hidden="true" className="text-legion-text-muted/50 text-[10px]">
                  {openCampaign === ci ? '▲' : '▼'}
                </span>
              </button>

              {openCampaign === ci && (
                <div className="mt-1 space-y-0.5">
                  {campaign.accounts.map((account) => (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => fillAndSubmit(account.email)}
                      className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left hover:bg-legion-amber/10 transition-colors min-h-[36px] group"
                    >
                      <span className="text-legion-text-muted group-hover:text-legion-text-primary transition-colors w-28 shrink-0">
                        {account.role}
                      </span>
                      <span className="font-mono text-legion-text-muted/70 group-hover:text-legion-text-muted transition-colors truncate">
                        {account.email}
                      </span>
                      <span className="ml-2 shrink-0 text-legion-amber/50 group-hover:text-legion-amber transition-colors">
                        →
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          <p className="text-legion-text-muted/50 font-mono text-[10px] pt-1">
            password: {PASSWORD} · dev only
          </p>
        </div>
      )}
    </div>
  );
}
