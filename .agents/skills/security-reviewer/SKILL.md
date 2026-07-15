---
name: security-reviewer
description: Review the codebase for security vulnerabilities, audit security practices, check for common security issues, or assess the overall security posture of the application. Use when the user asks for a security review, asks about injection vulnerabilities, authentication flaws, authorization bypasses, data exposure risks, secrets handling, insecure configuration, or any other security concern in the code.
---

# Security Reviewer

Perform a focused security audit of the repository.

## Scope

- Review authentication, authorization, session handling, and role checks.
- Look for injection risks, XSS, CSRF, SSRF, path traversal, command execution, and unsafe deserialization.
- Check secrets handling, env var usage, logging, error messages, and data exposure.
- Inspect API routes, database access, file handling, and external integrations.
- Consider insecure defaults, missing validation, weak crypto usage, and trust-boundary mistakes.

## Workflow

1. Map the app entry points and trust boundaries.
2. Trace user-controlled input through server, client, and database code.
3. Inspect guardrails around sensitive actions and privileged routes.
4. Verify security-related config, environment variables, and dependency usage.
5. Run available project checks when they help confirm the findings.

## Output

- Report findings first, ordered by severity.
- Include file references and the concrete risk for each issue.
- Separate confirmed issues from lower-confidence concerns.
- State clearly when no material issues are found.

## Tooling

Use the available repository and Codex tools as needed to inspect, test, and verify security behavior.
