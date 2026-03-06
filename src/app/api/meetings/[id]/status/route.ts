import { NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { meetings } from "@/db/schema";
import { ok, badRequest, notFound, serverError } from "@/lib/api";

const updateStatusSchema = z.object({
  status: z.enum(["pending", "in_progress", "completed"])
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!db) {
    return serverError("数据库未配置");
  }

  const json = await request.json();
  const parseResult = updateStatusSchema.safeParse(json);
  if (!parseResult.success) {
    return badRequest("无效的请求参数");
  }

  try {
    const [updated] = await db
      .update(meetings)
      .set({
        status: parseResult.data.status,
        updatedAt: new Date()
      })
      .where(eq(meetings.id, id))
      .returning();

    if (!updated) {
      return notFound("会议不存在");
    }

    return ok(updated);
  } catch (error) {
    return serverError((error as Error).message);
  }
}
