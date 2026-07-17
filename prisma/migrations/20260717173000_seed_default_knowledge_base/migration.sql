INSERT INTO "Category" ("id", "name", "slug", "createdAt", "updatedAt")
VALUES
  ('seed-category-general', 'General Question', 'general_question', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-category-technical', 'Technical Question', 'technical_question', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-category-refund', 'Refund Request', 'refund_request', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "updatedAt" = CURRENT_TIMESTAMP;

CREATE TEMP TABLE "_seedKnowledgeBaseArticle" (
  "title" TEXT PRIMARY KEY,
  "body" TEXT NOT NULL,
  "categorySlug" TEXT NOT NULL
);

INSERT INTO "_seedKnowledgeBaseArticle" ("title", "body", "categorySlug")
VALUES
  (
    'Reset your password',
    $kb$Customers can reset their password from the login page.

Steps:
1. Open the login page.
2. Select Forgot Password.
3. Enter the account email address.
4. Open the reset email and follow the link within 30 minutes.
5. Create a new password with at least 8 characters.

If the email is not visible, ask the customer to check spam or promotions folders and confirm they entered the same email used for the account. Do not ask for the customer's password.$kb$,
    'technical_question'
  ),
  (
    'Troubleshoot login verification emails',
    $kb$Verification emails usually arrive within 2 minutes.

Recommended checks:
- Confirm the customer is using the correct email address.
- Ask them to check spam, junk, and promotions folders.
- Ask them to wait 2 minutes before requesting another code.
- If multiple codes were requested, only the newest code should be used.

If the customer still cannot receive email after these checks, the ticket should remain open for an agent to inspect mail delivery logs.$kb$,
    'technical_question'
  ),
  (
    'Fix a stuck loading dashboard',
    $kb$Use this article when a customer says the dashboard is stuck loading, keeps spinning, fails to open, shows a blank page, or never finishes loading.

A dashboard that keeps loading is commonly caused by stale browser state, blocked cookies, a browser extension, or a blocked network request.

Steps to try:
1. Refresh the page.
2. Sign out and sign back in.
3. Clear browser cache for the app domain.
4. Try a private browsing window.
5. Disable browser extensions that block scripts or cookies.
6. Confirm that third-party cookies and JavaScript are not blocked for the app.

If the problem continues, collect the browser, device, approximate time, screenshot, and any visible error message before escalating.$kb$,
    'technical_question'
  ),
  (
    'API timeout troubleshooting',
    $kb$API timeouts can happen when the request is too large, the network is unstable, or the service is temporarily slow.

Recommended response:
- Ask the customer for the endpoint, timestamp, and request ID if available.
- Confirm whether the issue happens once or repeatedly.
- Suggest retrying the request with exponential backoff.
- Suggest reducing payload size for large imports or uploads.

If the customer provides logs or the issue is reproducible, keep the ticket open for a technical agent.$kb$,
    'technical_question'
  ),
  (
    'File upload or import fails',
    $kb$Use this article when a customer cannot upload a file, import data, or complete an attachment upload.

Basic checks:
1. Confirm the file is in a supported format.
2. Rename the file to remove special characters such as #, %, &, or emoji.
3. Try uploading a smaller file to confirm whether file size is the issue.
4. Refresh the page and try again.
5. Try a different browser or private window.

If the upload still fails, ask for the file type, approximate file size, browser, timestamp, and any error message. Do not ask the customer to send sensitive files in the ticket unless an agent confirms it is appropriate.$kb$,
    'technical_question'
  ),
  (
    'Email notifications are not arriving',
    $kb$Use this article when customers say they are not receiving notifications, confirmation emails, or system emails.

Recommended checks:
- Confirm the destination email address is spelled correctly.
- Check spam, junk, promotions, and quarantine folders.
- Ask the customer to allowlist the support sender domain if their organization filters mail.
- Ask them to wait a few minutes before requesting another notification.
- If several emails were requested, use only the newest link or code.

If email still does not arrive, keep the ticket open for an agent to review delivery logs.$kb$,
    'technical_question'
  ),
  (
    'Browser compatibility checklist',
    $kb$The app works best in current versions of Chrome, Edge, Firefox, or Safari.

If a customer reports display issues, buttons not responding, or pages behaving strangely, ask them to:
1. Update the browser to the latest version.
2. Disable extensions that block scripts, cookies, or trackers.
3. Clear cached site data for the app domain.
4. Try a private window.
5. Try another supported browser.

If the issue continues, collect browser name, browser version, operating system, screenshot, and the page where the issue happens.$kb$,
    'technical_question'
  ),
  (
    'Business hours and response times',
    $kb$Support is available Monday through Friday during normal business hours.

Typical response targets:
- Urgent production-impacting issues: same business day.
- Standard technical questions: 1 business day.
- General account questions: 1 to 2 business days.

Customers can add details, screenshots, error messages, and timestamps to help the team respond faster.$kb$,
    'general_question'
  ),
  (
    'Request a copy of an invoice or receipt',
    $kb$Customers can request a copy of an invoice or receipt from support.

Ask the customer to provide:
- Account email.
- Company or organization name, if applicable.
- Invoice number, order ID, or approximate billing date if known.

Do not ask for full payment card numbers. If the customer needs billing ownership changes or tax details updated, keep the ticket open for a human agent.$kb$,
    'general_question'
  ),
  (
    'How to update account contact details',
    $kb$Customers can request changes to account contact details, but changes that affect ownership, billing, or security must be verified by a human agent.

For simple contact updates, ask for the current email, requested new contact value, and organization name. Do not request passwords or sensitive payment data in the ticket.$kb$,
    'general_question'
  ),
  (
    'Plan upgrade or downgrade questions',
    $kb$Customers can ask general questions about changing plans, but final billing changes should be handled by a human agent.

General guidance:
- Upgrades may change available features immediately.
- Downgrades may affect seats, limits, integrations, or stored data depending on the plan.
- Billing changes can depend on the current subscription term and account settings.

Ask the customer for their account email, current plan, desired plan, and preferred effective date. Do not promise pricing, credits, or refunds unless confirmed by an agent.$kb$,
    'general_question'
  ),
  (
    'Refund request handling policy',
    $kb$Refund requests require review by a human agent because eligibility can depend on account history, purchase date, usage, plan terms, and regional policy.

Collect these details before escalation:
- Customer account email.
- Order ID or invoice ID if available.
- Purchase date.
- Reason for the refund request.

Do not promise approval. Confirm that the support team will review the request and follow up.$kb$,
    'refund_request'
  ),
  (
    'Duplicate charge review',
    $kb$Duplicate charge reports require human review because the team must compare invoices, payment processor records, account ownership, and billing dates.

Ask the customer to provide:
- Account email.
- Last four digits of the payment method only, if they are comfortable sharing it.
- Dates and amounts of the charges.
- Invoice IDs or receipt numbers if available.

Do not request full card numbers, CVV codes, passwords, or bank credentials. Tell the customer a billing agent will review the duplicate charge report.$kb$,
    'refund_request'
  ),
  (
    'Cancellation request handling',
    $kb$Cancellation and billing-change requests should be handled by a human agent when they affect subscription status, refunds, credits, or account ownership.

Ask the customer to provide the account email and the requested effective date. Do not ask for full payment card numbers or passwords.$kb$,
    'refund_request'
  ),
  (
    'Trial cancellation before billing',
    $kb$Customers asking to cancel a trial before billing should be routed to a human agent if cancellation affects account access, subscription ownership, or billing status.

Collect:
- Account email.
- Organization name.
- Requested cancellation date.
- Whether they want to keep access until the trial ends.

Confirm that an agent will review and process the request. Do not guarantee cancellation timing unless confirmed by a billing agent.$kb$,
    'refund_request'
  );

UPDATE "KnowledgeBaseArticle" article
SET
  "body" = seed."body",
  "active" = true,
  "categoryId" = category."id",
  "updatedAt" = CURRENT_TIMESTAMP
FROM "_seedKnowledgeBaseArticle" seed
JOIN "Category" category ON category."slug" = seed."categorySlug"
WHERE article."title" = seed."title";

INSERT INTO "KnowledgeBaseArticle" ("id", "title", "body", "active", "categoryId", "createdAt", "updatedAt")
SELECT
  'seed-kb-' || regexp_replace(lower(seed."title"), '[^a-z0-9]+', '-', 'g'),
  seed."title",
  seed."body",
  true,
  category."id",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "_seedKnowledgeBaseArticle" seed
JOIN "Category" category ON category."slug" = seed."categorySlug"
WHERE NOT EXISTS (
  SELECT 1
  FROM "KnowledgeBaseArticle" article
  WHERE article."title" = seed."title"
);

DROP TABLE "_seedKnowledgeBaseArticle";
