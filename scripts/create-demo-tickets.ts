import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, TicketStatus } from "@prisma/client";

function requireEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const adapter = new PrismaPg({ connectionString: requireEnv("DATABASE_URL") });
const prisma = new PrismaClient({ adapter });

const demoBatchPrefix = "demo-ticket-";

const categories = [
  { name: "General Question", slug: "general_question" },
  { name: "Technical Question", slug: "technical_question" },
  { name: "Refund Request", slug: "refund_request" }
];

const senders = [
  ["Aarav Mehta", "aarav.mehta@example.com"],
  ["Maya Chen", "maya.chen@example.com"],
  ["Noah Williams", "noah.williams@example.com"],
  ["Sofia Rodriguez", "sofia.rodriguez@example.com"],
  ["Liam Patel", "liam.patel@example.com"],
  ["Emma Johnson", "emma.johnson@example.com"],
  ["Lucas Brown", "lucas.brown@example.com"],
  ["Isabella Garcia", "isabella.garcia@example.com"],
  ["Ethan Davis", "ethan.davis@example.com"],
  ["Olivia Martinez", "olivia.martinez@example.com"],
  ["Benjamin Wilson", "benjamin.wilson@example.com"],
  ["Amelia Anderson", "amelia.anderson@example.com"],
  ["Henry Thomas", "henry.thomas@example.com"],
  ["Mia Taylor", "mia.taylor@example.com"],
  ["Alexander Moore", "alexander.moore@example.com"],
  ["Charlotte Jackson", "charlotte.jackson@example.com"],
  ["Daniel Martin", "daniel.martin@example.com"],
  ["Harper Lee", "harper.lee@example.com"],
  ["James Thompson", "james.thompson@example.com"],
  ["Evelyn White", "evelyn.white@example.com"]
] as const;

const scenarios = [
  ["Cannot reset password after receiving reset link", "technical_question"],
  ["Invoice download shows a blank PDF", "technical_question"],
  ["Need help changing company billing address", "general_question"],
  ["Refund requested for duplicate annual subscription charge", "refund_request"],
  ["Mobile app crashes when opening ticket details", "technical_question"],
  ["Question about upgrading from starter to business plan", "general_question"],
  ["Refund requested because order was canceled before shipment", "refund_request"],
  ["Two-factor authentication code arrives too late", "technical_question"],
  ["Need clarification on data export limits", "general_question"],
  ["Refund requested for accidental seat purchase", "refund_request"],
  ["Unable to attach screenshots larger than 5 MB", "technical_question"],
  ["Question about supported SSO providers", "general_question"],
  ["Refund requested after trial converted unexpectedly", "refund_request"],
  ["Search returns old archived tickets first", "technical_question"],
  ["Need help updating tax exemption certificate", "general_question"],
  ["Refund requested for missing promotional discount", "refund_request"],
  ["Webhook retries are not reaching our endpoint", "technical_question"],
  ["Question about monthly invoice email recipients", "general_question"],
  ["Refund requested for partial service outage", "refund_request"],
  ["Dashboard counters do not match ticket list", "technical_question"],
  ["Need a copy of the signed DPA", "general_question"],
  ["Refund requested because team switched vendors", "refund_request"],
  ["Email notifications are going to spam", "technical_question"],
  ["Question about adding contractors as agents", "general_question"],
  ["Refund requested for unused add-on package", "refund_request"],
  ["CSV export is missing closed tickets", "technical_question"],
  ["Need guidance on importing historical tickets", "general_question"],
  ["Refund requested for duplicate payment from bank retry", "refund_request"],
  ["Agent invitation link expires immediately", "technical_question"],
  ["Question about retention policy for attachments", "general_question"],
  ["Refund requested for wrong currency charge", "refund_request"],
  ["Knowledge base editor loses formatting after save", "technical_question"],
  ["Need help finding API rate limit documentation", "general_question"],
  ["Refund requested for invoice paid by previous admin", "refund_request"],
  ["Ticket assignment dropdown does not load users", "technical_question"],
  ["Question about custom SLA business hours", "general_question"],
  ["Refund requested after downgrade was not applied", "refund_request"],
  ["Cannot connect Gmail forwarding address", "technical_question"],
  ["Need confirmation on SOC 2 report availability", "general_question"],
  ["Refund requested for canceled training session", "refund_request"],
  ["Attachments fail only in Safari", "technical_question"],
  ["Question about creating a sandbox workspace", "general_question"],
  ["Refund requested for duplicate marketplace purchase", "refund_request"],
  ["API returns 401 after rotating token", "technical_question"],
  ["Need help changing account owner", "general_question"],
  ["Refund requested after billing cycle changed", "refund_request"],
  ["Live chat transcript is missing from ticket", "technical_question"],
  ["Question about whitelisting support email domains", "general_question"],
  ["Refund requested for add-on enabled by mistake", "refund_request"],
  ["Bulk status update times out for large queue", "technical_question"],
  ["Need help adding purchase order number", "general_question"],
  ["Refund requested for nonprofit discount not applied", "refund_request"],
  ["SAML login loops back to sign-in page", "technical_question"],
  ["Question about agent activity audit logs", "general_question"],
  ["Refund requested for duplicate renewal invoice", "refund_request"],
  ["Customer replies create new tickets instead of threading", "technical_question"],
  ["Need help understanding seat usage report", "general_question"],
  ["Refund requested after account was closed", "refund_request"],
  ["Ticket priority is not saved after refresh", "technical_question"],
  ["Question about exporting customer contact history", "general_question"],
  ["Refund requested for service not delivered", "refund_request"],
  ["Email parser strips inline images from messages", "technical_question"],
  ["Need clarification on enterprise onboarding timeline", "general_question"],
  ["Refund requested for charge during paused subscription", "refund_request"],
  ["Agent cannot see tickets assigned to their team", "technical_question"],
  ["Question about custom fields on ticket forms", "general_question"],
  ["Refund requested because coupon expired during checkout", "refund_request"],
  ["Login page shows unexpected locale", "technical_question"],
  ["Need help configuring notification preferences", "general_question"],
  ["Refund requested for second workspace created accidentally", "refund_request"],
  ["Ticket list loads slowly after opening filters", "technical_question"],
  ["Question about HIPAA-ready deployment options", "general_question"],
  ["Refund requested after reseller billed directly", "refund_request"],
  ["Outbound email reply bounces for one customer", "technical_question"],
  ["Need help setting default ticket categories", "general_question"],
  ["Refund requested for overage fees after limit increase", "refund_request"],
  ["Markdown preview differs from sent reply", "technical_question"],
  ["Question about changing invoice payment method", "general_question"],
  ["Refund requested for duplicate card authorization", "refund_request"],
  ["Browser freezes when opening long conversation", "technical_question"],
  ["Need details on admin permission levels", "general_question"],
  ["Refund requested for unused prepaid credits", "refund_request"],
  ["Cannot delete obsolete knowledge base article", "technical_question"],
  ["Question about regional data residency", "general_question"],
  ["Refund requested after failed migration", "refund_request"],
  ["Ticket tags disappear after merging records", "technical_question"],
  ["Need help inviting external auditors", "general_question"],
  ["Refund requested because service was unavailable at launch", "refund_request"],
  ["Slack integration posts duplicate updates", "technical_question"],
  ["Question about contract renewal notice period", "general_question"],
  ["Refund requested for prorated downgrade difference", "refund_request"],
  ["Customer portal shows incorrect company name", "technical_question"],
  ["Need help locating previous support conversations", "general_question"],
  ["Refund requested for mistakenly purchased premium support", "refund_request"],
  ["Reply editor cannot paste screenshots from clipboard", "technical_question"],
  ["Question about adding multiple billing contacts", "general_question"],
  ["Refund requested for tax charged on exempt account", "refund_request"],
  ["API pagination skips every fiftieth ticket", "technical_question"],
  ["Need help configuring auto-assignment rules", "general_question"],
  ["Refund requested after duplicate account merge", "refund_request"],
  ["Saved reply inserts outdated signature", "technical_question"],
  ["Question about recommended inbox forwarding setup", "general_question"],
  ["Refund requested for order placed by former employee", "refund_request"],
  ["Ticket detail page shows stale status", "technical_question"],
  ["Need help with annual security questionnaire", "general_question"],
  ["Refund requested for billing after cancellation confirmation", "refund_request"],
  ["Exported dates use the wrong timezone", "technical_question"],
  ["Question about volume pricing for 75 agents", "general_question"],
  ["Refund requested after duplicate ACH transfer", "refund_request"]
] as const;

function statusForIndex(index: number) {
  const statuses = [TicketStatus.open, TicketStatus.resolved, TicketStatus.closed] as const;
  return statuses[index % statuses.length];
}

function bodyFor(subject: string, senderName: string, categorySlug: string | null) {
  const categoryContext = categorySlug?.replaceAll("_", " ") ?? "uncategorized";

  return [
    `Hi support team, ${subject.toLowerCase()}.`,
    `This is affecting our ${categoryContext} workflow and we need help understanding the next step.`,
    `Please review the account history and let me know what information you need from me.`,
    `Thanks, ${senderName}`
  ].join("\n\n");
}

async function main() {
  const categoryRecords = new Map<string, string>();

  for (const category of categories) {
    const record = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name },
      create: category
    });

    categoryRecords.set(record.slug, record.id);
  }

  const deleted = await prisma.ticket.deleteMany({
    where: {
      providerThreadId: {
        startsWith: demoBatchPrefix
      }
    }
  });

  const createdTickets = [];
  const baseDate = new Date("2026-07-10T09:00:00.000Z");

  for (let index = 0; index < 100; index += 1) {
    const [subject, categorySlug] = scenarios[index]!;
    const [senderName, senderEmail] = senders[index % senders.length]!;
    const isUncategorized = index % 17 === 0;
    const createdAt = new Date(baseDate);
    createdAt.setDate(baseDate.getDate() - index);
    createdAt.setHours(9 + (index % 9), (index * 7) % 60, 0, 0);

    createdTickets.push(
      prisma.ticket.create({
        data: {
          subject,
          body: bodyFor(subject, senderName, isUncategorized ? null : categorySlug),
          senderEmail,
          senderName,
          status: statusForIndex(index),
          categoryId: isUncategorized ? null : categoryRecords.get(categorySlug),
          providerThreadId: `${demoBatchPrefix}${String(index + 1).padStart(3, "0")}`,
          createdAt,
          updatedAt: createdAt,
          messages: {
            create: {
              direction: "INBOUND",
              fromEmail: senderEmail,
              subject,
              bodyText: bodyFor(subject, senderName, isUncategorized ? null : categorySlug),
              createdAt
            }
          }
        }
      })
    );
  }

  await prisma.$transaction(createdTickets);

  const counts = await prisma.ticket.groupBy({
    by: ["status"],
    _count: { _all: true },
    where: {
      providerThreadId: {
        startsWith: demoBatchPrefix
      }
    }
  });

  console.log(`Deleted ${deleted.count} previous demo tickets.`);
  console.log("Created 100 demo tickets.");
  for (const count of counts) {
    console.log(`${count.status}: ${count._count._all}`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
