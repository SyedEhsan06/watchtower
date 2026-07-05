import { z } from "zod";

/** Restart requires the caller to explicitly echo the service name back — a lightweight confirmation gate. */
export const restartConfirmSchema = z.object({
  confirmServiceName: z.string().min(1),
});
