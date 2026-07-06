import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { authClient } from "./lib/auth-client";
import type { User } from "./types";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    data: session,
    isPending,
    refetch
  } = authClient.useSession();

  const user = useMemo(() => mapSessionUser(session?.user), [session?.user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading: isPending,
      async login(email, password) {
        const result = await authClient.signIn.email({
          email,
          password
        });

        if (result.error) {
          throw new Error(result.error.message ?? "Login failed.");
        }

        await refetch();
      },
      async logout() {
        const result = await authClient.signOut();

        if (result.error) {
          throw new Error(result.error.message ?? "Sign out failed.");
        }

        await refetch();
      }
    }),
    [isPending, refetch, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function mapSessionUser(sessionUser: unknown): User | null {
  if (!sessionUser || typeof sessionUser !== "object") {
    return null;
  }

  const user = sessionUser as Partial<User>;

  if (!user.id || !user.email || !user.name || !user.role) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    active: user.active
  };
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return value;
}
