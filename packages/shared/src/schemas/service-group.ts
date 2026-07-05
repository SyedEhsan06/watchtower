import { z } from "zod";

export const createServiceGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});
export type CreateServiceGroupInput = z.infer<typeof createServiceGroupSchema>;

export const updateServiceGroupSchema = createServiceGroupSchema.partial();
export type UpdateServiceGroupInput = z.infer<typeof updateServiceGroupSchema>;
