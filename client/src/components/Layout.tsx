import { useState } from "react";
import type { ReactNode } from "react";
import { BookOpen, Gauge, Inbox, LogOut, MailPlus, Sparkles, Users } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { signOut, useSession } from "../lib/auth-client";
import { emailSimulatorEnabled } from "../lib/feature-flags";
import { getSessionUser } from "../lib/session-user";
import { UserRole } from "../types";
import { ThemeToggle } from "./ThemeToggle";

export function Layout() {
  const navigate = useNavigate();
  const { data: session, refetch } = useSession();
  const [signingOut, setSigningOut] = useState(false);
  const user = getSessionUser(session);
  const userRole = user?.role;

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

  const navItems = [
    { to: "/", label: "Dashboard", icon: Gauge },
    { to: "/tickets", label: "Tickets", icon: Inbox },
    { to: "/knowledge-base", label: "Knowledge", icon: BookOpen },
    ...(userRole === UserRole.Admin
      ? [
          ...(emailSimulatorEnabled
            ? [{ to: "/email-simulator", label: "Simulator", icon: MailPlus }]
            : []),
          { to: "/users", label: "Users", icon: Users }
        ]
      : [])
  ];

  return (
    <div className="min-h-screen bg-[var(--color-page)] text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-slate-200/80 bg-slate-950 text-white lg:flex lg:flex-col">
        <div className="border-b border-white/10 px-5 py-5">
          <NavLink className="flex items-center gap-3" to="/">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500 text-white shadow-lg shadow-blue-950/30">
              <Sparkles aria-hidden="true" className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-base font-semibold tracking-tight">AI Helpdesk</span>
              <span className="block text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                Service desk
              </span>
            </span>
          </NavLink>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4 text-sm" aria-label="Primary">
          {navItems.map((item) => (
            <NavItem icon={item.icon} key={item.to} to={item.to}>
              {item.label}
            </NavItem>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <p className="truncate text-sm font-medium text-white">{user?.name ?? "Agent"}</p>
            <p className="mt-1 text-xs text-slate-400">{userRole ?? "Agent"}</p>
          </div>
          <button
            className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-white/10 px-3 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 disabled:opacity-60"
            type="button"
            disabled={signingOut}
            onClick={() => void handleSignOut()}
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <NavLink className="flex items-center gap-2 text-base font-semibold text-slate-950" to="/">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-white">
              <Sparkles aria-hidden="true" className="h-4 w-4" />
            </span>
            AI Helpdesk
          </NavLink>
          <div className="flex items-center gap-2">
            <ThemeToggle className="h-9 px-2.5" />
            <button
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700"
              type="button"
              disabled={signingOut}
              onClick={() => void handleSignOut()}
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
        <nav className="mt-3 flex gap-2 overflow-x-auto text-sm" aria-label="Primary">
          {navItems.map((item) => (
            <MobileNavItem key={item.to} to={item.to}>
              {item.label}
            </MobileNavItem>
          ))}
        </nav>
      </header>

      <main className="px-4 py-5 sm:px-6 lg:ml-72 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-5 hidden justify-end lg:flex">
            <ThemeToggle />
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function NavItem({
  to,
  icon: Icon,
  children
}: {
  to: string;
  icon: typeof Gauge;
  children: ReactNode;
}) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        [
          "flex items-center gap-3 rounded-md px-3 py-2.5 font-medium transition-colors",
          isActive
            ? "bg-white text-slate-950 shadow-sm"
            : "text-slate-300 hover:bg-white/10 hover:text-white"
        ].join(" ")
      }
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      {children}
    </NavLink>
  );
}

function MobileNavItem({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        [
          "shrink-0 rounded-md px-3 py-2 font-medium",
          isActive
            ? "bg-slate-950 text-white"
            : "border border-slate-200 bg-white text-slate-600"
        ].join(" ")
      }
    >
      {children}
    </NavLink>
  );
}
