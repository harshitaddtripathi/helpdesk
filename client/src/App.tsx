import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "./auth";
import { DashboardPage } from "./pages/DashboardPage";
import { KnowledgeBasePage } from "./pages/KnowledgeBasePage";
import { LoginPage } from "./pages/LoginPage";
import { TicketDetailPage } from "./pages/TicketDetailPage";
import { TicketsPage } from "./pages/TicketsPage";
import { UsersPage } from "./pages/UsersPage";

export function App() {
  const [healthMessage, setHealthMessage] = useState("Checking API health...");

  useEffect(() => {
    let active = true;

    async function checkHealth() {
      try {
        const response = await fetch("/health");

        if (!response.ok) {
          throw new Error(`Health check failed with ${response.status}`);
        }

        const data = (await response.json()) as { status?: string };

        if (active) {
          setHealthMessage(`API health: ${data.status ?? "unknown"}`);
        }
      } catch {
        if (active) {
          setHealthMessage("API health check failed");
        }
      }
    }

    void checkHealth();

    return () => {
      active = false;
    };
  }, []);

  return (
    <AuthProvider>
      <div className="fixed bottom-4 right-4 z-50 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
        {healthMessage}
      </div>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <Shell />
            </RequireAuth>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-6 text-sm text-slate-600">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function Shell() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-950">AI Helpdesk</h1>
            <p className="text-sm text-slate-500">{user?.name}</p>
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <NavItem to="/">Dashboard</NavItem>
            <NavItem to="/tickets">Tickets</NavItem>
            <NavItem to="/knowledge-base">Knowledge Base</NavItem>
            {user?.role === "ADMIN" ? <NavItem to="/users">Users</NavItem> : null}
            <button
              className="rounded-md border border-slate-300 px-3 py-2 text-slate-700 hover:bg-slate-50"
              type="button"
              onClick={() => void logout()}
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        <Routes>
          <Route index element={<DashboardPage />} />
          <Route path="tickets" element={<TicketsPage />} />
          <Route path="tickets/:ticketId" element={<TicketDetailPage />} />
          <Route path="knowledge-base" element={<KnowledgeBasePage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function NavItem({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
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
