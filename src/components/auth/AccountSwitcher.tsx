import { useState } from "react";
import { supabase } from "../../db/supabase.client";
import { avatarLetter, type HouseholdAccount } from "../../lib/household";

interface AccountSwitcherProps {
  accounts: HouseholdAccount[];
  currentUserId: string;
}

export default function AccountSwitcher({ accounts, currentUserId }: AccountSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const current = accounts.find((account) => account.userId === currentUserId) ?? accounts[0];

  const switchTo = async (account: HouseholdAccount) => {
    if (account.userId === currentUserId) {
      setOpen(false);
      return;
    }

    setPendingId(account.userId);
    await supabase.auth.signOut();
    const params = new URLSearchParams({
      email: account.email,
      returnUrl: "/dashboard",
    });
    window.location.assign(`/auth/login?${params.toString()}`);
  };

  if (!current) return null;

  return (
    <div className="relative">
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((value) => !value)}
      >
        <AccountMark account={current} />
        <span className="max-w-36 truncate">{current.displayName}</span>
        <span className="text-xs text-slate-400">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-20 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {accounts.map((account) => {
            const active = account.userId === currentUserId;
            return (
              <li key={account.userId}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  disabled={pendingId !== null}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 disabled:opacity-60"
                  onClick={() => switchTo(account)}
                >
                  <AccountMark account={account} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">{account.displayName}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {account.role === "administrator" ? "Rodzic" : "Dziecko"}
                      {active ? " • zalogowany" : " • osobne logowanie"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function AccountMark({ account }: { account: HouseholdAccount }) {
  if (account.avatarUrl) {
    return <img src={account.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />;
  }

  return (
    <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
      {avatarLetter(account.displayName)}
    </span>
  );
}
