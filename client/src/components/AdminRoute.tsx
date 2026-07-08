import { Navigate, Outlet } from "react-router";
import { useSession } from "../lib/auth-client";
import { UserRole } from "../types";

export function AdminRoute() {
  const { data: session, isPending } = useSession();
  const userRole = (session?.user as { role?: string } | undefined)?.role;

  if (isPending) {
    return <div className="p-6 text-sm text-slate-600">Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (userRole !== UserRole.Admin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
