import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, created, badRequest, serverError } from "@/lib/api";
import { db } from "@/lib/db";
import { meetings, meetingTypes } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

const createMeetingSchema = z.object({
  title: z.string().min(1),
  meeting_type_id: z.string().uuid(),
  date: z.string().datetime().optional()
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let query = db
      .select({
        id: meetings.id,
        title: meetings.title,
        meeting_type_id: meetings.meetingTypeId,
        meeting_type_name: meetingTypes.name,
        date: meetings.date,
        status: meetings.status,
        created_at: meetings.createdAt
      })
      .from(meetings)
      .leftJoin(meetingTypes, eq(meetings.meetingTypeId, meetingTypes.id))
      .orderBy(desc(meetings.createdAt));

    if (status) {
      query = query.where(eq(meetings.status, status));
    }

    const data = await query;
    return ok({ data });
  } catch (error) {
    console.error("[API /meetings] GET error:", error);
    return serverError("数据库查询失败");
  }
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parseResult = createMeetingSchema.safeParse(json);

    if (!parseResult.success) {
      return badRequest("无效的请求参数: " + parseResult.error.message);
    }

    const { title, meeting_type_id: meetingTypeId, date } = parseResult.data;

    // 获取会议类型信息
    const [meetingType] = await db
      .select()
      .from(meetingTypes)
      .where(eq(meetingTypes.id, meetingTypeId))
      .limit(1);

    const newMeeting = await db
      .insert(meetings)
      .values({
        title,
        meetingTypeId: meetingTypeId,
        date: date ? new Date(date) : new Date(),
        status: "pending",
        customGoals: meetingType?.goals ?? [],
        customStrategies: [],
        discussionPoints: [],
        aiSuggestions: [],
        minutes: "",
        summary: ""
      })
      .returning();

    return created({ 
      data: {
        ...newMeeting[0],
        meeting_type: meetingType
      }
    });
  } catch (error) {
    console.error("[API /meetings] POST error:", error);
    return serverError("创建会议失败");
  }
}
