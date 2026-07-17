import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "@prisma/client";
import { generateId } from "@better-auth/core/utils/id";
import { hashPassword } from "better-auth/crypto";

const adapter = new PrismaPg({ connectionString: readEnv("DIRECT_URL") ?? requireEnv("DATABASE_URL") });
const prisma = new PrismaClient({ adapter });

type SeedUser = {
  email: string;
  name: string;
  password: string;
  role: UserRole;
};

type SeedCategory = {
  name: string;
  slug: string;
};

type SeedArticle = {
  title: string;
  body: string;
  categorySlug: string;
  active?: boolean;
};

function requireEnv(name: string) {
  const value = readEnv(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readEnv(name: string) {
  return process.env[name]?.trim();
}

async function ensureSeedUser({ email, name, password, role }: SeedUser) {
  const normalizedEmail = email.toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });
  const passwordHash = await hashPassword(password);

  if (existingUser) {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existingUser.id },
        data: {
          name,
          role,
          active: true
        }
      });

      await tx.account.upsert({
        where: {
          providerId_accountId: {
            providerId: "credential",
            accountId: existingUser.id
          }
        },
        update: {
          password: passwordHash,
          userId: existingUser.id
        },
        create: {
          id: generateId(),
          accountId: existingUser.id,
          providerId: "credential",
          userId: existingUser.id,
          password: passwordHash
        }
      });
    });

    console.log(`Seed user ${normalizedEmail} already exists; updated.`);
    return;
  }

  const userId = generateId();

  await prisma.$transaction(async (tx) => {
    await tx.user.create({
      data: {
        id: userId,
        email: normalizedEmail,
        name,
        role,
        active: true
      }
    });

    await tx.account.create({
      data: {
        id: generateId(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: passwordHash
      }
    });
  });

  console.log(`Created seed user ${normalizedEmail}.`);
}

async function ensureCategory({ name, slug }: SeedCategory) {
  await prisma.category.upsert({
    where: { slug },
    update: { name },
    create: { name, slug }
  });

  console.log(`Ensured category ${slug}.`);
}

async function ensureKnowledgeBaseArticle({ title, body, categorySlug, active = true }: SeedArticle) {
  const category = await prisma.category.findUnique({
    where: { slug: categorySlug },
    select: { id: true }
  });

  if (!category) {
    throw new Error(`Missing category for article ${title}: ${categorySlug}`);
  }

  const existingArticle = await prisma.knowledgeBaseArticle.findFirst({
    where: { title }
  });

  if (existingArticle) {
    await prisma.knowledgeBaseArticle.update({
      where: { id: existingArticle.id },
      data: {
        body,
        active,
        categoryId: category.id
      }
    });
    console.log(`Updated knowledge base article ${title}.`);
    return;
  }

  await prisma.knowledgeBaseArticle.create({
    data: {
      title,
      body,
      active,
      categoryId: category.id
    }
  });

  console.log(`Created knowledge base article ${title}.`);
}

async function main() {
  const adminEmail = requireEnv("SEED_ADMIN_EMAIL").toLowerCase();
  const adminPassword = requireEnv("SEED_ADMIN_PASSWORD");
  const agentPassword = process.env.SEED_AGENT_PASSWORD?.trim() || adminPassword;

  const seedUsers: SeedUser[] = [
    {
      email: adminEmail,
      name: "Admin",
      password: adminPassword,
      role: UserRole.admin
    },
    {
      email: "ai-agent@example.com",
      name: "AI-Agent",
      password: agentPassword,
      role: UserRole.agent
    },
    {
      email: "alex.agent@example.com",
      name: "Alex Morgan",
      password: agentPassword,
      role: UserRole.agent
    },
    {
      email: "jordan.agent@example.com",
      name: "Jordan Lee",
      password: agentPassword,
      role: UserRole.agent
    },
    {
      email: "priya.agent@example.com",
      name: "Priya Shah",
      password: agentPassword,
      role: UserRole.agent
    }
  ];

  for (const seedUser of seedUsers) {
    await ensureSeedUser(seedUser);
  }

  const seedCategories: SeedCategory[] = [
    { name: "General Question", slug: "general_question" },
    { name: "Technical Question", slug: "technical_question" },
    { name: "Refund Request", slug: "refund_request" }
  ];

  for (const category of seedCategories) {
    await ensureCategory(category);
  }

  const seedArticles: SeedArticle[] = [
    {
      title: "Reset your password",
      categorySlug: "technical_question",
      body:
        "Customers can reset their password from the login page.\n\n" +
        "Steps:\n" +
        "1. Open the login page.\n" +
        "2. Select Forgot Password.\n" +
        "3. Enter the account email address.\n" +
        "4. Open the reset email and follow the link within 30 minutes.\n" +
        "5. Create a new password with at least 8 characters.\n\n" +
        "If the email is not visible, ask the customer to check spam or promotions folders and confirm they entered the same email used for the account. Do not ask for the customer's password."
    },
    {
      title: "Troubleshoot login verification emails",
      categorySlug: "technical_question",
      body:
        "Verification emails usually arrive within 2 minutes.\n\n" +
        "Recommended checks:\n" +
        "- Confirm the customer is using the correct email address.\n" +
        "- Ask them to check spam, junk, and promotions folders.\n" +
        "- Ask them to wait 2 minutes before requesting another code.\n" +
        "- If multiple codes were requested, only the newest code should be used.\n\n" +
        "If the customer still cannot receive email after these checks, the ticket should remain open for an agent to inspect mail delivery logs."
    },
    {
      title: "Fix a stuck loading dashboard",
      categorySlug: "technical_question",
      body:
        "Use this article when a customer says the dashboard is stuck loading, keeps spinning, fails to open, shows a blank page, or never finishes loading.\n\n" +
        "A dashboard that keeps loading is commonly caused by stale browser state, blocked cookies, a browser extension, or a blocked network request.\n\n" +
        "Steps to try:\n" +
        "1. Refresh the page.\n" +
        "2. Sign out and sign back in.\n" +
        "3. Clear browser cache for the app domain.\n" +
        "4. Try a private browsing window.\n" +
        "5. Disable browser extensions that block scripts or cookies.\n" +
        "6. Confirm that third-party cookies and JavaScript are not blocked for the app.\n\n" +
        "If the problem continues, collect the browser, device, approximate time, screenshot, and any visible error message before escalating."
    },
    {
      title: "API timeout troubleshooting",
      categorySlug: "technical_question",
      body:
        "API timeouts can happen when the request is too large, the network is unstable, or the service is temporarily slow.\n\n" +
        "Recommended response:\n" +
        "- Ask the customer for the endpoint, timestamp, and request ID if available.\n" +
        "- Confirm whether the issue happens once or repeatedly.\n" +
        "- Suggest retrying the request with exponential backoff.\n" +
        "- Suggest reducing payload size for large imports or uploads.\n\n" +
        "If the customer provides logs or the issue is reproducible, keep the ticket open for a technical agent."
    },
    {
      title: "File upload or import fails",
      categorySlug: "technical_question",
      body:
        "Use this article when a customer cannot upload a file, import data, or complete an attachment upload.\n\n" +
        "Basic checks:\n" +
        "1. Confirm the file is in a supported format.\n" +
        "2. Rename the file to remove special characters such as #, %, &, or emoji.\n" +
        "3. Try uploading a smaller file to confirm whether file size is the issue.\n" +
        "4. Refresh the page and try again.\n" +
        "5. Try a different browser or private window.\n\n" +
        "If the upload still fails, ask for the file type, approximate file size, browser, timestamp, and any error message. Do not ask the customer to send sensitive files in the ticket unless an agent confirms it is appropriate."
    },
    {
      title: "Email notifications are not arriving",
      categorySlug: "technical_question",
      body:
        "Use this article when customers say they are not receiving notifications, confirmation emails, or system emails.\n\n" +
        "Recommended checks:\n" +
        "- Confirm the destination email address is spelled correctly.\n" +
        "- Check spam, junk, promotions, and quarantine folders.\n" +
        "- Ask the customer to allowlist the support sender domain if their organization filters mail.\n" +
        "- Ask them to wait a few minutes before requesting another notification.\n" +
        "- If several emails were requested, use only the newest link or code.\n\n" +
        "If email still does not arrive, keep the ticket open for an agent to review delivery logs."
    },
    {
      title: "Browser compatibility checklist",
      categorySlug: "technical_question",
      body:
        "The app works best in current versions of Chrome, Edge, Firefox, or Safari.\n\n" +
        "If a customer reports display issues, buttons not responding, or pages behaving strangely, ask them to:\n" +
        "1. Update the browser to the latest version.\n" +
        "2. Disable extensions that block scripts, cookies, or trackers.\n" +
        "3. Clear cached site data for the app domain.\n" +
        "4. Try a private window.\n" +
        "5. Try another supported browser.\n\n" +
        "If the issue continues, collect browser name, browser version, operating system, screenshot, and the page where the issue happens."
    },
    {
      title: "Business hours and response times",
      categorySlug: "general_question",
      body:
        "Support is available Monday through Friday during normal business hours.\n\n" +
        "Typical response targets:\n" +
        "- Urgent production-impacting issues: same business day.\n" +
        "- Standard technical questions: 1 business day.\n" +
        "- General account questions: 1 to 2 business days.\n\n" +
        "Customers can add details, screenshots, error messages, and timestamps to help the team respond faster."
    },
    {
      title: "Request a copy of an invoice or receipt",
      categorySlug: "general_question",
      body:
        "Customers can request a copy of an invoice or receipt from support.\n\n" +
        "Ask the customer to provide:\n" +
        "- Account email.\n" +
        "- Company or organization name, if applicable.\n" +
        "- Invoice number, order ID, or approximate billing date if known.\n\n" +
        "Do not ask for full payment card numbers. If the customer needs billing ownership changes or tax details updated, keep the ticket open for a human agent."
    },
    {
      title: "How to update account contact details",
      categorySlug: "general_question",
      body:
        "Customers can request changes to account contact details, but changes that affect ownership, billing, or security must be verified by a human agent.\n\n" +
        "For simple contact updates, ask for the current email, requested new contact value, and organization name. Do not request passwords or sensitive payment data in the ticket."
    },
    {
      title: "Plan upgrade or downgrade questions",
      categorySlug: "general_question",
      body:
        "Customers can ask general questions about changing plans, but final billing changes should be handled by a human agent.\n\n" +
        "General guidance:\n" +
        "- Upgrades may change available features immediately.\n" +
        "- Downgrades may affect seats, limits, integrations, or stored data depending on the plan.\n" +
        "- Billing changes can depend on the current subscription term and account settings.\n\n" +
        "Ask the customer for their account email, current plan, desired plan, and preferred effective date. Do not promise pricing, credits, or refunds unless confirmed by an agent."
    },
    {
      title: "Refund request handling policy",
      categorySlug: "refund_request",
      body:
        "Refund requests require review by a human agent because eligibility can depend on account history, purchase date, usage, plan terms, and regional policy.\n\n" +
        "Collect these details before escalation:\n" +
        "- Customer account email.\n" +
        "- Order ID or invoice ID if available.\n" +
        "- Purchase date.\n" +
        "- Reason for the refund request.\n\n" +
        "Do not promise approval. Confirm that the support team will review the request and follow up."
    },
    {
      title: "Duplicate charge review",
      categorySlug: "refund_request",
      body:
        "Duplicate charge reports require human review because the team must compare invoices, payment processor records, account ownership, and billing dates.\n\n" +
        "Ask the customer to provide:\n" +
        "- Account email.\n" +
        "- Last four digits of the payment method only, if they are comfortable sharing it.\n" +
        "- Dates and amounts of the charges.\n" +
        "- Invoice IDs or receipt numbers if available.\n\n" +
        "Do not request full card numbers, CVV codes, passwords, or bank credentials. Tell the customer a billing agent will review the duplicate charge report."
    },
    {
      title: "Cancellation request handling",
      categorySlug: "refund_request",
      body:
        "Cancellation and billing-change requests should be handled by a human agent when they affect subscription status, refunds, credits, or account ownership.\n\n" +
        "Ask the customer to provide the account email and the requested effective date. Do not ask for full payment card numbers or passwords."
    },
    {
      title: "Trial cancellation before billing",
      categorySlug: "refund_request",
      body:
        "Customers asking to cancel a trial before billing should be routed to a human agent if cancellation affects account access, subscription ownership, or billing status.\n\n" +
        "Collect:\n" +
        "- Account email.\n" +
        "- Organization name.\n" +
        "- Requested cancellation date.\n" +
        "- Whether they want to keep access until the trial ends.\n\n" +
        "Confirm that an agent will review and process the request. Do not guarantee cancellation timing unless confirmed by a billing agent."
    }
  ];

  for (const article of seedArticles) {
    await ensureKnowledgeBaseArticle(article);
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
