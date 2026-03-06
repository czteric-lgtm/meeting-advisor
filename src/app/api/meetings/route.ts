import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, created, badRequest } from "@/lib/api";
import { randomUUID } from "crypto";

// 内存存储用于快速演示
const mockMeetings: any[] = [];

const createMeetingSchema = z.object({
  title: z.string().min(1),
  meeting_type_id: z.string(),
  date: z.string().optional()
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let data = mockMeetings;
  if (status) {
    data = data.filter(m => m.status === status);
  }

  return ok(data);
}

export async function POST(request: NextRequest) {
  const json = await request.json();
  const parseResult = createMeetingSchema.safeParse(json);

  if (!parseResult.success) {
    return badRequest("无效的请求参数");
  }

  const { title, meeting_type_id: meetingTypeId, date } = parseResult.data;

  const newMeeting = {
    id: randomUUID(),
    title,
    meeting_type_id: meetingTypeId,
    meeting_type: { name: "客户谈判" },
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

  mockMeetings.push(newMeeting);
  return created({ data: newMeeting });
}
