import { Navigate, Outlet } from "react-router";
import { useSession } from "../lib/auth-client";

export function ProtectedRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <div className="p-6 text-sm text-slate-600">Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
