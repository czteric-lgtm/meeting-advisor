import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, badRequest, notFound, serverError } from "@/lib/api";
import { db } from "@/lib/db";
import { meetings, meetingTypes } from "@/db/schema";
import { eq } from "drizzle-orm";

const updateMeetingSchema = z.object({
  title: z.string().optional(),
  date: z.string().datetime().optional(),
  summary: z.string().optional(),
  minutes: z.string().optional(),
  custom_goals: z.array(z.string()).optional(),
  custom_strategies: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      scenario: z.string(),
      response: z.string(),
      category: z.string(),
      source: z.enum(["library", "manual", "ai_parsed"])
    })
  ).optional()
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const [meeting] = await db
      .select()
      .from(meetings)
      .leftJoin(meetingTypes, eq(meetings.meetingTypeId, meetingTypes.id))
      .where(eq(meetings.id, id))
      .limit(1);

    if (!meeting) {
      return notFound("会议不存在");
    }

    return ok(meeting);
  } catch (error) {
    console.error("[API /meetings/:id] GET error:", error);
    return serverError("查询会议失败");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const json = await request.json();
    const parseResult = updateMeetingSchema.safeParse(json);
    
    if (!parseResult.success) {
      return badRequest("无效的请求参数: " + parseResult.error.message);
    }

    const payload = parseResult.data;
    const updates: Record<string, unknown> = {};
    
    if (payload.title !== undefined) updates.title = payload.title;
    if (payload.date !== undefined) updates.date = new Date(payload.date);
    if (payload.summary !== undefined) updates.summary = payload.summary;
    if (payload.minutes !== undefined) updates.minutes = payload.minutes;
    if (payload.custom_goals !== undefined) updates.customGoals = payload.custom_goals;
    if (payload.custom_strategies !== undefined) updates.customStrategies = payload.custom_strategies;
    updates.updatedAt = new Date();

    const [updated] = await db
      .update(meetings)
      .set(updates)
      .where(eq(meetings.id, id))
      .returning();

    if (!updated) {
      return notFound("会议不存在");
    }

    return ok(updated);
  } catch (error) {
    console.error("[API /meetings/:id] PUT error:", error);
    return serverError("更新会议失败");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const [deleted] = await db
      .delete(meetings)
      .where(eq(meetings.id, id))
      .returning();

    if (!deleted) {
      return notFound("会议不存在");
    }

    return ok({ id });
  } catch (error) {
    console.error("[API /meetings/:id] DELETE error:", error);
    return serverError("删除会议失败");
  }
}
