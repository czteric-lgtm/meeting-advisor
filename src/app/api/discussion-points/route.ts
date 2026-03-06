import { NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { meetings } from "@/db/schema";
import { ok, created, badRequest, serverError } from "@/lib/api";
import type { DiscussionPoint } from "@/lib/types";
import { randomUUID } from "node:crypto";

const createSchema = z.object({
  meeting_id: z.string().uuid(),
  content: z.string().min(1)
});

export async function POST(request: NextRequest) {
  if (!db) {
    return serverError("数据库未配置");
  }

  const json = await request.json();
  const parseResult = createSchema.safeParse(json);
  if (!parseResult.success) {
    return badRequest("无效的请求参数");
  }

  const { meeting_id: meetingId, content } = parseResult.data;

  try {
    const [meeting] = await db
      .select()
      .from(meetings)
      .where(eq(meetings.id, meetingId));

    if (!meeting) {
      return badRequest("会议不存在");
    }

    const newPoint: DiscussionPoint = {
      id: randomUUID(),
      content,
      status: "pending"
    };

    const updatedPoints = [...(meeting.discussionPoints ?? []), newPoint];

    await db
      .update(meetings)
      .set({
        discussionPoints: updatedPoints,
        updatedAt: new Date()
      })
      .where(eq(meetings.id, meetingId));

    return created(newPoint);
  } catch (error) {
    return serverError((error as Error).message);
  }
}

