import { Navigate, Outlet } from "react-router";
import { useSession } from "../lib/auth-client";
import { getSessionUser } from "../lib/session-user";
import { UserRole } from "../types";

export function AdminRoute() {
  const { data: session, isPending } = useSession();
  const user = getSessionUser(session);

  if (isPending) {
    return <div className="p-6 text-sm text-slate-600">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== UserRole.Admin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
