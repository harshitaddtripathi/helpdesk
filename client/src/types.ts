export enum UserRole {
  Admin = "admin",
  Agent = "agent"
}
export type TicketStatus = "open" | "resolved" | "closed";
export type MessageDirection = "INBOUND" | "OUTBOUND";

export type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active?: boolean;
};

export type UserListItem = User & {
  createdAt: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
};

export type TicketMessage = {
  id: string;
  direction: MessageDirection;
  fromEmail: string;
  toEmail?: string | null;
  subject?: string | null;
  bodyText: string;
  createdAt: string;
};

export type Ticket = {
  id: number;
  subject: string;
  body: string;
  bodyHtml?: string | null;
  senderEmail: string;
  senderName: string;
  status: TicketStatus;
  category?: Category | null;
  messages?: TicketMessage[];
  createdAt: string;
  updatedAt: string;
};

export type DashboardData = {
  stats: {
    open: number;
    resolved: number;
    closed: number;
    total: number;
  };
  countsByCategory: Array<{
    categoryId: string | null;
    name: string;
    slug: string;
    count: number;
  }>;
  recentTickets: Ticket[];
};
