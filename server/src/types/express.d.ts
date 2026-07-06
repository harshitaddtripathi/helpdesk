import type { auth } from "../lib/auth";
import type { UserRole } from "../lib/auth";

type BetterAuthSession = typeof auth.$Infer.Session;

export type AuthenticatedUser = BetterAuthSession["user"] & {
  role: UserRole;
  active: boolean;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      session?: BetterAuthSession["session"];
    }
  }
}

export {};
