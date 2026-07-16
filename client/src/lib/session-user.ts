import { UserRole, type User } from "../types";

type SessionUser = Partial<User> & {
  role?: string;
};

export function getSessionUser(session: unknown): User | null {
  if (!session || typeof session !== "object" || !("user" in session)) {
    return null;
  }

  const user = (session as { user?: unknown }).user;

  if (!user || typeof user !== "object") {
    return null;
  }

  const sessionUser = user as SessionUser;

  if (!sessionUser.id || !sessionUser.email) {
    return null;
  }

  return {
    id: sessionUser.id,
    email: sessionUser.email,
    name: sessionUser.name || sessionUser.email,
    role: sessionUser.role === UserRole.Admin ? UserRole.Admin : UserRole.Agent,
    active: sessionUser.active
  };
}
