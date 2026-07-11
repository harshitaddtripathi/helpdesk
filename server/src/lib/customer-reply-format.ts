export const supportReplySignature = "Harshita Tripathi Support";

export function formatCustomerReply(reply: string, customerName: string) {
  const firstName = getCustomerFirstName(customerName);
  const normalizedReply = reply
    .trim()
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
  const body = removeOpeningGreeting(normalizedReply).trim();
  const signedBody = body.includes(supportReplySignature)
    ? body
    : [body, supportReplySignature].filter(Boolean).join("\n\n");

  return [`Hi ${firstName},`, signedBody].filter(Boolean).join("\n\n");
}

export function getCustomerFirstName(name: string) {
  const firstName = name.trim().split(/\s+/)[0];

  return firstName || "there";
}

function removeOpeningGreeting(reply: string) {
  const lines = reply.split("\n");
  const firstContentIndex = lines.findIndex((line) => line.trim());

  if (firstContentIndex === -1) {
    return "";
  }

  const firstLine = lines[firstContentIndex]?.trim() ?? "";

  if (!isGreetingLine(firstLine)) {
    return reply;
  }

  lines.splice(firstContentIndex, 1);

  return lines.join("\n");
}

function isGreetingLine(line: string) {
  return /^(hi|hello|dear)\b.{0,80}[,!]?$/.test(line.toLowerCase());
}
