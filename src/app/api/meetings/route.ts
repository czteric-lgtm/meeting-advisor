import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, created, badRequest, serverError } from "@/lib/api";
import { db, isMockDb } from "@/lib/db";
import { meetings, meetingTypes } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

// 内存存储
const mockMeetings: any[] = [];

const createMeetingSchema = z.object({
  title: z.string().min(1),
  meeting_type_id: z.string(),
  date: z.string().optional()
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    // 如果数据库不可用，使用内存存储
    if (isMockDb || !db) {
      let data = mockMeetings;
      if (status) {
        data = data.filter(m => m.status === status);
      }
      return ok({ data });
    }

    // 使用数据库
    try {
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
    } catch (dbError) {
      console.error("[DB] Query failed, using mock:", dbError);
      let data = mockMeetings;
      if (status) {
        data = data.filter(m => m.status === status);
      }
      return ok({ data });
    }
  } catch (error) {
    console.error("[API /meetings] GET error:", error);
    return ok({ data: mockMeetings });
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

    // 创建新会议对象
    const newMeeting = {
      id: randomUUID(),
      title,
      meeting_type_id: meetingTypeId,
      meeting_type: { name: "默认类型" },
      date: date || new Date().toISOString(),
      status: "pending",
      customGoals: ["了解客户需求", "达成合作意向"],
      customStrategies: [
        { id: "st-001", scenario: "客户询问价格", response: "先了解客户预算", category: "technique", source: "manual" },
        { id: "st-002", scenario: "客户对产品有疑虑", response: "用数据和案例支撑", category: "principle", source: "manual" }
      ],
      discussionPoints: [],
      aiSuggestions: [],
      minutes: "",
      createdAt: new Date().toISOString()
    };

    // 如果数据库可用，尝试插入
    if (!isMockDb && db) {
      try {
        const [dbMeeting] = await db
          .insert(meetings)
          .values({
            title,
            meetingTypeId: meetingTypeId,
            date: date ? new Date(date) : new Date(),
            status: "pending",
            customGoals: ["了解客户需求", "达成合作意向"],
            customStrategies: [],
            discussionPoints: [],
            aiSuggestions: [],
            minutes: "",
            summary: ""
          })
          .returning();
        
        // 获取会议类型信息
        const [meetingType] = await db
          .select()
          .from(meetingTypes)
          .where(eq(meetingTypes.id, meetingTypeId))
          .limit(1);

        return created({
          ...dbMeeting,
          meeting_type: meetingType
        });
      } catch (dbError) {
        console.error("[DB] Insert failed, using mock:", dbError);
      }
    }

    // 使用内存存储
    mockMeetings.push(newMeeting);
    return created(newMeeting);
  } catch (error) {
    console.error("[API /meetings] POST error:", error);
    return serverError("创建会议失败");
  }
}
