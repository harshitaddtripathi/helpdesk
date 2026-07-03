import type { UserRole } from "@prisma/client";

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionToken?: string;
    }
  }
}

export {};

