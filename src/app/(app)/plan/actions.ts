"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { TaskStatus } from "@/lib/validations/enums";
import { setTaskStatusFor } from "@/server/services/tasks";

export async function setTaskStatusAction(taskId: string, status: z.infer<typeof TaskStatus>) {
  const user = await requireUser();
  await setTaskStatusFor(user.id, z.string().min(1).parse(taskId), status);
  revalidatePath("/plan");
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}
