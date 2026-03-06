import { NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { meetings } from "@/db/schema";
import { ok, badRequest, notFound, serverError } from "@/lib/api";
import type { DiscussionPoint } from "@/lib/types";

const updateSchema = z.object({
  status: z.enum(["pending", "mentioned"]).optional(),
  mentionedAt: z.number().optional(),
  summary: z.string().optional()
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
  const parseResult = updateSchema.safeParse(json);
  if (!parseResult.success) {
    return badRequest("无效的请求参数");
  }

  const payload = parseResult.data;

  try {
    const allMeetings = await db.select().from(meetings);

    let targetMeetingId: string | null = null;
    let updatedPoints: DiscussionPoint[] | null = null;

    allMeetings.forEach((m) => {
      const points = (m.discussionPoints ?? []) as DiscussionPoint[];
      const exists = points.some((p) => p.id === id);
      if (exists) {
        targetMeetingId = m.id;
        updatedPoints = points.map((p) =>
          p.id === id
            ? {
                ...p,
                status: payload.status ?? p.status,
                mentionedAt: payload.mentionedAt ?? p.mentionedAt,
                summary: payload.summary ?? p.summary
              }
            : p
        );
      }
    });

    if (!targetMeetingId || !updatedPoints) {
      return notFound("待沟通点不存在");
    }

    await db
      .update(meetings)
      .set({
        discussionPoints: updatedPoints,
        updatedAt: new Date()
      })
      .where(eq(meetings.id, targetMeetingId));

    const updated = (updatedPoints as DiscussionPoint[]).find((p) => p.id === id);

    return ok(updated);
  } catch (error) {
    return serverError((error as Error).message);
  }
}

