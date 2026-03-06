import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, created, badRequest, serverError } from "@/lib/api";
import { db } from "@/lib/db";
import { meetingTypes } from "@/db/schema";
import { desc } from "drizzle-orm";

const createMeetingTypeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(""),
  goals: z.array(z.string()).default([])
});

export async function GET() {
  try {
    const data = await db
      .select()
      .from(meetingTypes)
      .orderBy(desc(meetingTypes.createdAt));
    
    return ok({ data });
  } catch (error) {
    console.error("[API /meeting-types] GET error:", error);
    return serverError("查询会议类型失败");
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

    const [newItem] = await db
      .insert(meetingTypes)
      .values({
        name,
        description: description || "",
        goals: goals || []
      })
      .returning();

    return created({ data: newItem });
  } catch (error) {
    console.error("[API /meeting-types] POST error:", error);
    return serverError("创建会议类型失败");
  }
}
