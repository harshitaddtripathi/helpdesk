import { expect, test } from "@playwright/test";

const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin.e2e@example.com";
const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "password12345";

test("seeded admin can sign in and view the dashboard", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "AI Helpdesk" })).toBeVisible();

  await page.getByLabel("Email").fill(adminEmail);
  await page.getByLabel("Password").fill(adminPassword);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Admin")).toBeVisible();
  await expect(page.getByText("Total")).toBeVisible();
});
