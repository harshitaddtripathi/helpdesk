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
        "A dashboard that keeps loading is commonly caused by stale browser state or a blocked network request.\n\n" +
        "Steps to try:\n" +
        "1. Refresh the page.\n" +
        "2. Sign out and sign back in.\n" +
        "3. Clear browser cache for the app domain.\n" +
        "4. Try a private browsing window.\n" +
        "5. Disable browser extensions that block scripts or cookies.\n\n" +
        "If the problem continues, collect the browser, device, approximate time, and any visible error message before escalating."
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
      title: "How to update account contact details",
      categorySlug: "general_question",
      body:
        "Customers can request changes to account contact details, but changes that affect ownership, billing, or security must be verified by a human agent.\n\n" +
        "For simple contact updates, ask for the current email, requested new contact value, and organization name. Do not request passwords or sensitive payment data in the ticket."
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
      title: "Cancellation request handling",
      categorySlug: "refund_request",
      body:
        "Cancellation and billing-change requests should be handled by a human agent when they affect subscription status, refunds, credits, or account ownership.\n\n" +
        "Ask the customer to provide the account email and the requested effective date. Do not ask for full payment card numbers or passwords."
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
