import { UserRole } from "@prisma/client";
import { prisma } from "./prisma";

export const aiAgentEmail = "ai-agent@example.com";
export const aiAgentName = "AI-Agent";

export async function findAiAgentId() {
  const aiAgent = await prisma.user.findFirst({
    where: {
      email: aiAgentEmail,
      role: UserRole.agent,
      active: true,
      deletedAt: null
    },
    select: { id: true }
  });

  return aiAgent?.id ?? null;
}

export async function assignTicketToAiAgent(ticketId: number) {
  const aiAgentId = await findAiAgentId();

  if (!aiAgentId) {
    return false;
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      assignedToId: aiAgentId
    }
  });

  return true;
}

export async function unassignTicketFromAiAgent(ticketId: number) {
  const aiAgentId = await findAiAgentId();

  if (!aiAgentId) {
    return false;
  }

  const result = await prisma.ticket.updateMany({
    where: {
      id: ticketId,
      assignedToId: aiAgentId
    },
    data: {
      assignedToId: null
    }
  });

  return result.count > 0;
}
