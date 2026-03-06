import { NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { meetingTypes } from "@/db/schema";
import { ok, badRequest, notFound, serverError } from "@/lib/api";

const updateMeetingTypeSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  goals: z.array(z.string()).optional()
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
  const parseResult = updateMeetingTypeSchema.safeParse(json);
  if (!parseResult.success) {
    return badRequest("无效的请求参数");
  }

  const updates = parseResult.data;

  try {
    const [updated] = await db
      .update(meetingTypes)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(meetingTypes.id, id))
      .returning();

    if (!updated) {
      return notFound("会议类型不存在");
    }

    return ok(updated);
  } catch (error) {
    return serverError((error as Error).message);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!db) {
    return serverError("数据库未配置");
  }

  try {
    const [deleted] = await db
      .delete(meetingTypes)
      .where(eq(meetingTypes.id, id))
      .returning();

    if (!deleted) {
      return notFound("会议类型不存在");
    }

    return ok({ id });
  } catch (error) {
    return serverError((error as Error).message);
  }
}

