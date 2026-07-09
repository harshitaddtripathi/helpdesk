import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  name: z.string().trim().min(3, "Name must be at least 3 letters."),
  password: z.string().trim().min(8, "Password must be at least 8 letters.")
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateAgentSchema = z.object({
  email: createUserSchema.shape.email.optional(),
  name: z.string().trim().min(3, "Name must be at least 3 letters.").optional(),
  password: createUserSchema.shape.password.optional(),
  active: z.boolean().optional()
});

export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
