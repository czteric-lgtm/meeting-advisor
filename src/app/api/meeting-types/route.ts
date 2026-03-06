import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, created, badRequest, serverError } from "@/lib/api";
import { db, isMockDb } from "@/lib/db";
import { meetingTypes } from "@/db/schema";
import { desc } from "drizzle-orm";
import { randomUUID } from "crypto";

// 内存存储
const mockMeetingTypes: any[] = [];

const createMeetingTypeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(""),
  goals: z.array(z.string()).default([])
});

export async function GET() {
  try {
    // 如果数据库不可用，使用内存存储
    if (isMockDb || !db) {
      return ok({ data: mockMeetingTypes });
    }

    const data = await db
      .select()
      .from(meetingTypes)
      .orderBy(desc(meetingTypes.createdAt));
    
    return ok({ data });
  } catch (error) {
    console.error("[API /meeting-types] GET error:", error);
    // 出错时返回内存数据
    return ok({ data: mockMeetingTypes });
  }
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parseResult = createMeetingTypeSchema.safeParse(json);

    if (!parseResult.success) {
      return badRequest("无效的请求参数: " + parseResult.error.message);
    }

    const { name, description, goals } = parseResult.data;

    // 创建新对象
    const newItem = {
      id: randomUUID(),
      name,
      description: description || "",
      goals: goals || [],
      createdAt: new Date().toISOString()
    };

    // 如果数据库可用，插入数据库
    if (!isMockDb && db) {
      try {
        const [dbItem] = await db
          .insert(meetingTypes)
          .values({
            name,
            description: description || "",
            goals: goals || []
          })
          .returning();
        return created(dbItem);
      } catch (dbError) {
        console.error("[DB] Insert failed, using mock:", dbError);
      }
    }

    // 使用内存存储
    mockMeetingTypes.push(newItem);
    return created(newItem);
  } catch (error) {
    console.error("[API /meeting-types] POST error:", error);
    return serverError("创建会议类型失败");
  }
}
