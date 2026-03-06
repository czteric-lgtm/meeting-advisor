import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, badRequest, notFound, serverError } from "@/lib/api";
import { db } from "@/lib/db";
import { meetings } from "@/db/schema";
import { eq } from "drizzle-orm";

const updateStatusSchema = z.object({
  status: z.enum(["pending", "in_progress", "completed"])
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const json = await request.json();
    const parseResult = updateStatusSchema.safeParse(json);
    if (!parseResult.success) {
      return badRequest("无效的请求参数: " + parseResult.error.message);
    }

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
    console.error("[API /meetings/:id/status] PUT error:", error);
    return serverError("更新会议状态失败");
  }
}
