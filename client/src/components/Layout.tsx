import { useState } from "react";
import type { ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { signOut, useSession } from "../lib/auth-client";
import { UserRole } from "../types";

export function Layout() {
  const navigate = useNavigate();
  const { data: session, refetch } = useSession();
  const [signingOut, setSigningOut] = useState(false);
  const userRole = (session?.user as { role?: string } | undefined)?.role;

  async function handleSignOut() {
    setSigningOut(true);

    try {
      const result = await signOut();

      if (result.error) {
        return;
      }

      await refetch();
      navigate("/login", { replace: true });
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <NavLink className="text-lg font-semibold text-slate-950" to="/">
              AI Helpdesk
            </NavLink>
            <p className="text-sm text-slate-500">{session?.user.name}</p>
          </div>
          <nav className="flex items-center gap-2 text-sm" aria-label="Primary">
            <NavItem to="/tickets">Tickets</NavItem>
            <NavItem to="/">Dashboard</NavItem>
            <NavItem to="/knowledge-base">Knowledge Base</NavItem>
            {userRole === UserRole.Admin ? <NavItem to="/users">Users</NavItem> : null}
            <button
              className="rounded-md border border-slate-300 px-3 py-2 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              type="button"
              disabled={signingOut}
              onClick={() => void handleSignOut()}
            >
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        [
          "rounded-md px-3 py-2",
          isActive
            ? "bg-slate-950 text-white"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
        ].join(" ")
      }
    >
      {children}
    </NavLink>
  );
}
